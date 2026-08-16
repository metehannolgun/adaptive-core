# Workout Generator Orchestration Design

**Date:** 2026-08-15
**Status:** Approved
**Scope:** Pure TypeScript orchestration for the existing Adaptive Core workout-generation stages

## 1. Purpose

Adaptive Core already has independently tested functions for recovery,
eligibility, pattern targeting, exercise selection, load prescription,
ordering, duration fitting, and final safety validation. The missing piece is
one public domain entry point that runs these stages in the canonical order
and returns either a complete immutable prescription or an explicit safe
failure.

The orchestrator must remain deterministic and independent of React, Expo,
Supabase, PostHog, localization, and the network.

## 2. Chosen Approach

Add one pure function:

```typescript
generateNextWorkout(input: GenerateNextWorkoutInput): WorkoutGenerationResult
```

All dependencies are explicit input values. The function does not retain
state between calls and does not read the clock itself. This keeps the rule:
the same input and seed produce the same result.

Rejected alternatives:

- A stateful `WorkoutGenerator` class adds lifecycle and hidden-state
  complexity without an MVP requirement.
- Calling domain stages from React or the application layer would distribute
  safety and determinism responsibilities outside the engine.

## 3. Version Ownership

The engine owns these constants:

```typescript
ENGINE_VERSION = "0.1.0"
POLICY_VERSION = "0.1.0"
```

The caller must provide a `catalogVersion` that identifies the
catalog snapshot supplied to the generator. Every successful prescription
stores `engineVersion`, `policyVersion`, `catalogVersion`, and `seed`.

The caller cannot override engine or policy versions. This prevents a saved
prescription from claiming it was produced by rules that did not actually
run.

## 4. Input Contract

`GenerateNextWorkoutInput` groups the complete generation state without
introducing application-layer objects.

### 4.1 Request

- `durationMinutes`: `5 | 10 | 15`
- `now`: caller-provided ISO timestamp used for fatigue decay
- `seed`: stored deterministic tie-break seed
- `catalogVersion`: required opaque catalog snapshot identifier

### 4.2 Catalog and Constraints

- `catalogEntries`: reviewed catalog candidates
- `maxLevel`: maximum allowed exercise complexity
- `excludedExerciseIds`: pain, limitation, or user-choice exclusions
- `reviewedRegressionExerciseIds`: explicit recovery-safe exceptions

Equipment is not configurable in MVP. Eligibility continues to require the
single `bodyweight` marker.

### 4.3 Adaptation State

- `patternStateByPattern`: a complete record for all six movement patterns
- `recentOutcomesByPattern`: recent outcomes used to detect repeated strain
- `exerciseStateById`: stored load and set state
- `restSecondsByExerciseId`: stored rest prescription

The complete pattern-state record is required because onboarding/baseline is
responsible for establishing initial state before generation.

### 4.4 Controlled Variation History

- `recentPatternExposureCounts`
- `currentExerciseIdByPattern`
- `recentExerciseExposureCounts`

Missing history values use the existing module defaults of zero or no current
exercise.

## 5. Result Contract

`WorkoutGenerationResult` is a discriminated union keyed by `kind`.

### 5.1 Success

```typescript
type WorkoutGenerationSuccess = {
  kind: "success";
  prescription: {
    durationMinutes: WorkoutDurationMinutes;
    estimatedDurationSeconds: number;
    shortened: boolean;
    items: readonly ExercisePrescription[];
    explanationCodes: readonly ExplanationCode[];
    engineVersion: string;
    policyVersion: string;
    catalogVersion: string;
    seed: string;
  };
};
```

The ordered items retain full catalog entries so the application can create
immutable exercise/content/media snapshots when saving the prescription.

`explanationCodes` are deduplicated in first-observed pipeline order:

1. Recovery explanations
2. Pattern-target explanations
3. Exercise-selection explanations

`shortened` is true when pattern targeting, missing safe selections, or time
fitting reduces the requested composition. A shortened result is still a
success only when duration and every safety invariant pass.

### 5.2 Failure

```typescript
type WorkoutGenerationFailure =
  | {
      kind: "failure";
      reason: "INVALID_CATALOG";
      issues: CatalogValidationCode[];
    }
  | { kind: "failure"; reason: "NO_ELIGIBLE_EXERCISES" }
  | {
      kind: "failure";
      reason: "INSUFFICIENT_DURATION_COVERAGE";
    }
  | {
      kind: "failure";
      reason: "SAFETY_VIOLATION";
      violations: WorkoutSafetyViolation[];
    };
```

A failure never contains a partial workout. The engine does not throw for
expected generation failures. This lets the application choose an explicit
localized fallback without risking accidental publication of unsafe items.

## 6. Pipeline

`generateNextWorkout` runs these stages in order:

1. Validate the complete catalog snapshot and return `INVALID_CATALOG` with
   stable issue codes when release invariants fail.
2. Assess recovery for all six movement patterns using `now`, pattern state,
   and recent outcomes.
3. Build `EligibilityConstraints` from caller constraints plus the derived
   recovery directives.
4. Filter catalog entries through `filterEligibleExercises`.
5. Return `NO_ELIGIBLE_EXERCISES` if the filtered set is empty.
6. Choose duration-appropriate pattern targets.
7. Select one safe exercise for each available target pattern.
8. Prescribe conservative load, sets, and rest.
9. Order exercises by coordination demand while avoiding adjacent repeated
   patterns when possible.
10. Fit the ordered prescription to the selected duration.
11. Return `INSUFFICIENT_DURATION_COVERAGE` when the fitted result is invalid.
12. Validate the final result with `validateWorkoutSafety`.
13. Return `SAFETY_VIOLATION` with typed violations if the safety list is not
    empty.
14. Deduplicate explanation codes and attach version metadata.
15. Return the immutable success result.

No stage mutates caller-owned arrays, records, catalog entries, or state.

## 7. Recovery Data Flow

Recovery is derived inside the generator rather than accepted as a caller
decision. For each movement pattern:

- `assessPatternRecovery` decays fatigue by elapsed full days.
- Repeated `hard` or `incomplete` outcomes can require lighter choices even
  when the numeric fatigue value is below the threshold.
- The derived directive feeds eligibility filtering.
- A non-null recovery explanation joins the prescription explanation list.

The orchestrator does not persist recovered state. Persistence belongs to the
application/database boundary and can be designed separately. This keeps the
generator pure and avoids silently changing user state merely because a
preview was requested.

## 8. Failure Precedence

Failures use pipeline order:

1. `INVALID_CATALOG`
2. `NO_ELIGIBLE_EXERCISES`
3. `INSUFFICIENT_DURATION_COVERAGE`
4. `SAFETY_VIOLATION`

The first reached failure is returned. Lower stages do not run after a
failure. Safety constraints are never relaxed to convert a failure into a
workout.

## 9. Testing Strategy

Integration tests use the real engine functions and complete catalog
fixtures. They do not mock internal stages.

Required scenarios:

1. Valid input returns an ordered, duration-valid, versioned prescription.
2. Repeating the same input and seed returns a deeply equal result.
3. Excluding every candidate returns `NO_ELIGIBLE_EXERCISES`.
4. Too little safe work for the selected duration returns
   `INSUFFICIENT_DURATION_COVERAGE`.
5. A final load-step mismatch that passes catalog release validation is caught
   as `SAFETY_VIOLATION`.
6. High fatigue or repeated strain limits selection to a low-fatigue exercise
   or an explicitly reviewed regression.
7. Explanation codes are deduplicated without changing first-observed order.
8. Reordering the original catalog array does not change the result for the
   same input and seed.
9. Caller-owned input arrays and records remain unchanged.
10. Duplicate catalog identities return stable `INVALID_CATALOG` issues before
    eligibility is evaluated.
11. Non-finite persisted fatigue fails toward recovery-safe selection.

All existing engine tests, full Jest suite, TypeScript checking, and Expo
Doctor remain required before completion.

## 10. Files and Boundaries

Planned production changes:

- Add `src/engine/generate-next-workout.ts`.
- Add orchestration result/input types beside the generator unless another
  engine module needs them.
- Add `ENGINE_VERSION` and `POLICY_VERSION` to
  `src/engine/versions.ts`.
- Reuse existing engine stages without moving them into React/application
  code.

Planned tests:

- Add `src/engine/generate-next-workout.test.ts`.

No database schema, Supabase call, UI screen, persistence implementation,
analytics event, or localization key is part of this change.

## 11. Non-goals

- Saving prescriptions or recovered state
- Generating IDs or timestamps internally
- Workout replacement during an active session
- UI fallback copy or navigation
- Baseline-state creation
- Catalog authoring or media approval
- Feedback persistence
- Monetization or account behavior
