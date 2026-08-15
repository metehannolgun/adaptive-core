# Algorithm Specification — Implementation Reference

## Inputs

### User Constraints
- Experience tier, available equipment, selected duration (5/10/15 min)
- Movement/exercise exclusions, current discomfort flags
- Last training timestamp, optional energy/soreness state

### Performance History
- Prescribed vs completed reps/seconds/sets
- Session outcome: `easy | appropriate | hard | incomplete | pain`
- Exercise replacements/skips, recent exposure by exercise and pattern
- Personal bests and capability state

### Exercise Metadata
- Movement pattern, level, load mode (reps/seconds)
- Min/max prescription, default sets/rest
- Progression/regression/substitute edges
- Fatigue demand, equipment tags, contraindication tags

## State Model

```typescript
type MovementPattern = "trunk_flexion" | "anti_extension" | "anti_rotation" | "rotation" | "lateral_stability" | "hip_control";

type PatternState = {
  pattern: MovementPattern;
  capacity: number;       // ordinal, not medical
  fatigue: number;        // 0..10
  lastTrainedAt: string | null;
  recentHardCount: number;
};

type ExerciseState = {
  exerciseId: string;
  currentLoad: number;
  currentSets: number;
  consecutiveEasy: number;
  lastOutcome: "easy" | "appropriate" | "hard" | "incomplete" | "pain" | null;
  excludedUntil: string | null;
};
```

## Feedback Reducer

### Transition Precedence (first match wins)

| # | Outcome | Exercise Action | Pattern Action |
|---|---|---|---|
| 1 | **Pain** | Exclude exercise (open-ended), select reviewed substitute | No capacity change |
| 2 | **Incomplete** | `completionRatio = performed/prescribed`. Below 0.75: first regression edge or reduce 2 steps. ≥0.75: reduce 1 step. Clamp to minLoad | Capacity −0.5, fatigue +3 |
| 3 | **Hard** | Hold load. Add 15s rest (capped at maxRestSeconds) | Fatigue +3, increment hardCount |
| 4 | **Appropriate** | Hold load, rest, clear consecutiveEasy | Capacity +0.5, fatigue +1 |
| 5 | **Easy** | Increment consecutiveEasy. If <2: hold. On 2: increase 1 loadStep (if ≤maxLoad) or traverse progression edge (prescribe its minLoad). Reset consecutiveEasy after progression | Capacity +1, fatigue +1 |

- Exercise-level pain/incomplete always overrides session outcome
- Only one primary dimension changes per exposure (reps/seconds OR rest OR complexity)

## Progression Policy v0.1

```typescript
const POLICY = {
  requiredConsecutiveEasyForProgression: 2,
  maxPrimaryChangesPerExposure: 1,
  incompleteRegressionThreshold: 0.75,
  hardRestStepSeconds: 15,
  fatigueMax: 10,
  fatigueDecayPer24Hours: 1,
  highFatigueThreshold: 7,
} as const;
```

## Recovery Logic

- Fatigue: ordinal 0..10. After feedback, clamp. Before generation, subtract 1 per 24h since last trained, clamp at 0.
- Pain → exclude exercise, do not test through pain.
- 2 most recent exposures both hard/incomplete → treat pattern as high-fatigue regardless of numeric score.
- High-fatigue pattern → only regression or fatigueScore=1 exercises, no progression.
- Elapsed time reduces fatigue but never advances capability.
- Missed day never creates catch-up volume.
- All eligible patterns high-fatigue → recovery/mobility content or explicit rest prescription.

## Eligibility Filter

Exercise eligible only if ALL true:
- Matches available equipment
- At or below allowed complexity
- Not excluded (pain, limitation, user choice)
- Has approved guidance media
- Fits progression/regression graph
- No recent-exposure or pattern-fatigue violation
- Fits remaining time budget

Empty eligible set → relax variety constraints before safety/exclusion constraints.

## Workout Composition

### Pattern Targets
`trunk_flexion`, `anti_extension`, `anti_rotation`, `rotation`, `lateral_stability`, `hip_control`

Each workout uses a duration-appropriate subset. Across sessions, avoid persistent omission/domination of one pattern.

### Duration Budget
```
exercise work + inter-set rest + transitions + instruction allowance = estimated duration
```

Exercise work is estimated from `prescribed load × estimatedSecondsPerUnit × sets`.
For `seconds` load mode, `estimatedSecondsPerUnit` is `1`; rep-based modes use
the reviewed exercise-specific catalog value.

Use 10 seconds between exercises. A valid composition fills at least 80% of
the selected duration and never exceeds it. If an ordered composition exceeds
the budget, remove trailing exercises until it fits. Never add load or sets to
fill time. If the remaining composition is below 80%, return
`INSUFFICIENT_DURATION_COVERAGE` instead of presenting it as a valid workout.

### Ordering
- Greater coordination first (user is fresh)
- No adjacent redundant high-demand on same pattern
- Simpler/lower-risk later
- Predictable flow

## Controlled Variation Scoring

```
movement-pattern need + capability fit + progression-chain relevance
+ preference/success + novelty within safe bounds
- recent repetition penalty - fatigue penalty - substitution/pain penalty
```

Randomness breaks ties only with stored reproducible seed.

## Replacement Flow

1. Capture reason: discomfort | too_difficult | equipment | preference | other (no free text)
2. Remove from prescription
3. Find substitute: same primary pattern, comparable/lower demand
4. Recalculate duration
5. Record relation and reason
6. If discomfort/pain → create exclusion, follow pain path
7. No safe substitute → shorten workout

## Explanation Codes

```typescript
type ExplanationCode =
  | "LOAD_HOLD_EASY_STREAK"
  | "LOAD_UP_EASY_SUCCESS"
  | "LOAD_HOLD_APPROPRIATE"
  | "LOAD_HOLD_HARD"
  | "LOAD_DOWN_INCOMPLETE"
  | "REGRESSION_INCOMPLETE"
  | "EXERCISE_EXCLUDED_PAIN"
  | "RECOVERY_RECENT_FATIGUE"
  | "VARIATION_PATTERN_BALANCE"
  | "VARIATION_RECENT_EXPOSURE"
  | "DURATION_USER_SELECTION"
  | "RETURN_AFTER_BREAK";
```

- `LOAD_HOLD_EASY_STREAK`: first consecutive easy result, or a later easy result when no reviewed load/complexity progression is available.
- `LOAD_UP_EASY_SUCCESS`: emitted only when load increases by one step or one reviewed progression edge is traversed.

## Generator Pseudocode

```typescript
function generateNextWorkout(input: GeneratorInput): WorkoutPrescription {
  const recovered = decayFatigueByElapsedTime(input.state, input.now);
  const eligible = filterEligibleExercises(input.catalog, input.constraints, recovered);
  const targets = choosePatternTargets(eligible, recovered, input.durationMinutes);
  const selected = selectControlledVariation(eligible, targets, input.history, input.seed);
  const loaded = prescribeConservativeLoads(selected, recovered, input.policy);
  const ordered = orderExercises(loaded, input.policy);
  const fitted = fitToTimeBudget(ordered, input.durationMinutes, input.policy);
  const safetyViolations = validateWorkoutSafety(fitted, input.constraints);
  if (safetyViolations.length > 0) {
    return buildSafeGenerationFailure(safetyViolations);
  }
  return attachVersionsAndExplanations(fitted, input);
}
```

Safety validation returns typed violation codes instead of throwing. A result
with any violation must not be published as a workout; orchestration returns a
safe generation failure so the UI can choose an explicit fallback.

## Mandatory Test Scenarios

1. Easy → ≤1 small progression
2. Appropriate → same exercise, load, rest
3. Hard → never increases load
4. Incomplete → reduces or regresses
5. Pain → immediate exclusion, never progresses
6. Repeated hard → lighter/recovery choice
7. Missed days → fatigue decays, no catch-up volume
8. Replacement → preserves pattern when safe
9. No substitute → shortens safely
10. Every workout fits time tolerance
11. Same inputs + seed = same output
12. No output violates equipment/exclusion/load constraints
