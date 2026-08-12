# Engine — Agent Instructions

This directory contains the pure TypeScript adaptation engine. It has **zero** React, Supabase, or UI dependencies.

For the full specification, read `docs/06_ALGORITHM_SPECIFICATION.md`.

## Core Types

```typescript
type MovementPattern = "trunk_flexion" | "anti_extension" | "anti_rotation" | "rotation" | "lateral_stability" | "hip_control";

type SessionOutcome = "easy" | "appropriate" | "hard" | "incomplete" | "pain";

type ExplanationCode =
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

## Feedback Reducer Rules

Apply the **first matching rule** — lower rules cannot override:

| Priority | Outcome | Exercise Action | Pattern Action |
|---|---|---|---|
| 1 | Pain | Exclude exercise, open-ended | No capacity change |
| 2 | Incomplete | If completion < 75%: regress. Else: reduce 1 step | Capacity −0.5, fatigue +3 |
| 3 | Hard | Hold load, add 15s rest (capped) | Fatigue +3, increment hard count |
| 4 | Appropriate | Hold everything | Capacity +0.5, fatigue +1 |
| 5 | Easy | Increment consecutiveEasy. On 2nd: progress 1 step | Capacity +1, fatigue +1 |

## Progression Policy (v0.1)

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

## Mandatory Test Scenarios

Every PR touching engine code must verify:

1. Easy → no more than one small progression
2. Appropriate → same exercise, load, and rest
3. Hard → never increases load
4. Incomplete → reduces or regresses
5. Pain → immediate exclusion, never progresses
6. Repeated hard → lighter/recovery workout
7. Missed days → fatigue decays, no catch-up volume
8. Replacement → preserves movement pattern
9. No substitute → shortens workout safely
10. Every workout fits time tolerance
11. Same inputs + seed = same output
12. No output violates equipment, exclusion, or load constraints

## Rules

- All engine functions must be pure (no side effects)
- Engine code must not import from React, Expo, Supabase, or PostHog
- Use deterministic randomness with a stored seed
- Store engine_version, policy_version, catalog_version with every prescription
