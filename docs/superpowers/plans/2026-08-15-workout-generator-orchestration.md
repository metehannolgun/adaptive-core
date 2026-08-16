# Workout Generator Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing pure engine stages behind one deterministic `generateNextWorkout` entry point that returns a versioned prescription or an explicit safe failure.

**Architecture:** A single pure orchestration function receives catalog, constraints, adaptation state, history, time, and seed as plain values. It derives recovery, invokes the existing engine stages in canonical order, stops at the first safe failure, and attaches engine-owned versions only to successful immutable prescriptions.

**Tech Stack:** TypeScript 5.9 strict mode, Jest 29 with jest-expo, existing pure engine modules

**Spec:** `docs/superpowers/specs/2026-08-15-workout-generator-orchestration-design.md`

## Global Constraints

- The generator imports no React, Expo, Supabase, PostHog, localization, database, or network module.
- Same complete input plus same seed must return a deeply equal result.
- `ENGINE_VERSION` and `POLICY_VERSION` are engine-owned constants with value `"0.1.0"`.
- `catalogVersion`, `now`, and `seed` are caller-provided and the generator never reads ambient time or randomness.
- Equipment remains fixed to the single `bodyweight` marker for MVP.
- Expected generation failures are returned as typed results; they are not thrown.
- A failure contains no partial prescription.
- No safety constraint is relaxed to make generation succeed.
- Existing untracked `.superpowers/` and `docs/superpowers/plans/2026-08-14-feedback-reducer.md` are outside scope and must not be staged.
- Use TDD: write all generator integration tests, watch them fail for the expected missing behavior, then write production code.

---

## File Structure

- Create `src/engine/versions.ts`: owns `ENGINE_VERSION` and `POLICY_VERSION`.
- Create `src/engine/generate-next-workout.ts`: owns generator input/result types, explanation collection, failure precedence, and orchestration.
- Create `src/engine/generate-next-workout.test.ts`: uses complete real catalog fixtures and real engine stages; no mocks.
- Modify `docs/06_ALGORITHM_SPECIFICATION.md`: replace conceptual generator names with the implemented public function/result terminology if the final code differs from the current pseudocode.

---

### Task 1: Implement the Pure Workout Generator Entry Point

**Files:**

- Create: `src/engine/versions.ts`
- Create: `src/engine/generate-next-workout.ts`
- Test: `src/engine/generate-next-workout.test.ts`
- Modify only if needed for exact name alignment: `docs/06_ALGORITHM_SPECIFICATION.md`

**Interfaces:**

- Consumes:
  - `assessPatternRecovery(patternState, recentOutcomes, now)`
  - `filterEligibleExercises(entries, constraints)`
  - `selectPatternTargets(input)`
  - `selectExercisesForPatterns(input)`
  - `prescribeConservativeLoads(input)`
  - `orderExercises(prescriptions)`
  - `fitToTimeBudget(input)`
  - `validateWorkoutSafety(input)`
- Produces:

```typescript
export const ENGINE_VERSION = "0.1.0";
export const POLICY_VERSION = "0.1.0";

export type GenerateNextWorkoutInput = {
  durationMinutes: WorkoutDurationMinutes;
  now: string;
  seed: string;
  catalogVersion: string;
  catalogEntries: readonly CatalogEntry[];
  maxLevel: ExerciseLevel;
  excludedExerciseIds: readonly string[];
  reviewedRegressionExerciseIds: readonly string[];
  patternStateByPattern: Readonly<
    Record<MovementPattern, PatternState>
  >;
  recentOutcomesByPattern: Readonly<
    Partial<Record<MovementPattern, readonly SessionOutcome[]>>
  >;
  exerciseStateById: Readonly<Record<string, ExerciseState>>;
  restSecondsByExerciseId: Readonly<Record<string, number>>;
  recentPatternExposureCounts: Readonly<
    Partial<Record<MovementPattern, number>>
  >;
  currentExerciseIdByPattern: Readonly<
    Partial<Record<MovementPattern, string>>
  >;
  recentExerciseExposureCounts: Readonly<Record<string, number>>;
};

export type WorkoutGenerationSuccess = {
  kind: "success";
  prescription: {
    durationMinutes: WorkoutDurationMinutes;
    estimatedDurationSeconds: number;
    shortened: boolean;
    items: readonly ExercisePrescription[];
    explanationCodes: readonly ExplanationCode[];
    engineVersion: typeof ENGINE_VERSION;
    policyVersion: typeof POLICY_VERSION;
    catalogVersion: string;
    seed: string;
  };
};

export type WorkoutGenerationFailure =
  | { kind: "failure"; reason: "NO_ELIGIBLE_EXERCISES" }
  | {
      kind: "failure";
      reason: "INSUFFICIENT_DURATION_COVERAGE";
    }
  | {
      kind: "failure";
      reason: "SAFETY_VIOLATION";
      violations: readonly WorkoutSafetyViolation[];
    };

export type WorkoutGenerationResult =
  | WorkoutGenerationSuccess
  | WorkoutGenerationFailure;

export function generateNextWorkout(
  input: GenerateNextWorkoutInput,
): WorkoutGenerationResult;
```

- [ ] **Step 1: Create complete test fixtures before production code**

Create `src/engine/generate-next-workout.test.ts`. Import real catalog and
engine types plus the not-yet-created `generateNextWorkout` function:

```typescript
import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  MovementPattern,
} from "../catalog/types";
import { MOVEMENT_PATTERNS } from "./policy";
import type { PatternState } from "./types";
import {
  generateNextWorkout,
  type GenerateNextWorkoutInput,
} from "./generate-next-workout";
```

Build each `CatalogEntry` with the complete production shape. The helper must
accept only the fields the scenarios intentionally vary:

```typescript
const reviewedAt = "2026-08-15T18:00:00.000Z";
const reviewedBy = "internal-review";

type EntryOptions = {
  primaryPattern: MovementPattern;
  defaultLoad?: number;
  fatigueScore?: Exercise["fatigueScore"];
};

function createEntry(id: string, options: EntryOptions): CatalogEntry {
  const englishContent: ExerciseContent = {
    exerciseId: id,
    locale: "en",
    name: id,
    setupInstruction: "Use the reviewed setup instruction.",
    cues: ["Use the reviewed movement cue."],
    breathingCue: "Use the reviewed breathing cue.",
    commonMistakes: ["Avoid the reviewed common mistake."],
    stopConditions: ["Stop if you feel pain."],
    altText: `A person performing ${id}.`,
    contentVersion: 1,
    status: "active",
    reviewedBy,
    reviewedAt,
  };
  const exercise: Exercise = {
    id,
    slug: id,
    status: "active",
    primaryPattern: options.primaryPattern,
    secondaryPatterns: [],
    userFocusLabels: ["deep_core"],
    loadMode: "seconds",
    level: 1,
    strengthDemand: 1,
    coordinationDemand: 1,
    fatigueScore: options.fatigueScore ?? 1,
    equipment: ["bodyweight"],
    minLoad: 10,
    defaultLoad: options.defaultLoad ?? 25,
    maxLoad: 40,
    loadStep: 5,
    estimatedSecondsPerUnit: 1,
    defaultSets: 2,
    minRestSeconds: 20,
    maxRestSeconds: 60,
    setupSeconds: 10,
    bilateral: false,
    contraindicationTags: [],
    mediaId: `repdb-${id}`,
    metadataVersion: 1,
    reviewedBy,
    reviewedAt,
  };

  return {
    exercise,
    contents: [
      englishContent,
      { ...englishContent, locale: "tr", name: `${id} TR` },
    ],
    media: {
      id: `repdb-${id}`,
      exerciseId: id,
      type: "webp",
      presentation: {
        kind: "single",
        main: {
          localPath: `assets/exercises/repdb/${id}.webp`,
          sourcePath: `images/flat/${id}.webp`,
          checksum: `sha256:${id}`,
        },
        fallbackRole: "main",
      },
      sourceUrl: "https://github.com/RepDB/exercise-dataset",
      creator: "RepDB",
      licenseId: "RepDB Free Tier License v1.0",
      licenseUrl:
        "https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md",
      commercialUseAllowed: true,
      allowedModifications: ["resize", "crop", "recolor"],
      appliedModifications: [],
      attributionRequired: true,
      attributionText: "Exercise data by RepDB (repdb.co)",
      attributionUrl: "https://repdb.co",
      acquiredAt: reviewedAt,
      approvalStatus: "approved",
      reviewedBy,
      reviewedAt,
    },
  };
}
```

Create a complete six-pattern state record and a baseline generator input:

```typescript
function createPatternState(
  pattern: MovementPattern,
  fatigue = 0,
): PatternState {
  return {
    pattern,
    capacity: 1,
    fatigue,
    lastTrainedAt: null,
    recentHardCount: 0,
  };
}

function createPatternStates(): Record<MovementPattern, PatternState> {
  return Object.fromEntries(
    MOVEMENT_PATTERNS.map((pattern) => [
      pattern,
      createPatternState(pattern),
    ]),
  ) as Record<MovementPattern, PatternState>;
}

const baseEntries = [
  createEntry("anti-extension", { primaryPattern: "anti_extension" }),
  createEntry("rotation", { primaryPattern: "rotation" }),
  createEntry("trunk-flexion", { primaryPattern: "trunk_flexion" }),
];

function createInput(
  overrides: Partial<GenerateNextWorkoutInput> = {},
): GenerateNextWorkoutInput {
  return {
    durationMinutes: 5,
    now: "2026-08-15T18:00:00.000Z",
    seed: "generator-seed",
    catalogVersion: "repdb-core-v1",
    catalogEntries: baseEntries,
    maxLevel: 5,
    excludedExerciseIds: [],
    reviewedRegressionExerciseIds: [],
    patternStateByPattern: createPatternStates(),
    recentOutcomesByPattern: {},
    exerciseStateById: {},
    restSecondsByExerciseId: {},
    recentPatternExposureCounts: {},
    currentExerciseIdByPattern: {},
    recentExerciseExposureCounts: {},
    ...overrides,
  };
}
```

- [ ] **Step 2: Write every required integration test before implementation**

Add these real-behavior tests to the same file:

```typescript
it("returns a duration-valid versioned prescription", () => {
  const result = generateNextWorkout(createInput());

  expect(result.kind).toBe("success");
  if (result.kind !== "success") throw new Error("Expected success");

  expect(
    result.prescription.items
      .map((item) => item.entry.exercise.id)
      .sort(),
  ).toEqual(["anti-extension", "rotation", "trunk-flexion"]);
  expect(result.prescription).toMatchObject({
    durationMinutes: 5,
    estimatedDurationSeconds: 260,
    shortened: false,
    explanationCodes: ["DURATION_USER_SELECTION"],
    engineVersion: "0.1.0",
    policyVersion: "0.1.0",
    catalogVersion: "repdb-core-v1",
    seed: "generator-seed",
  });
});

it("returns a deeply equal result for the same input and seed", () => {
  const input = createInput();
  expect(generateNextWorkout(input)).toEqual(generateNextWorkout(input));
});

it("does not depend on the original catalog array order", () => {
  const forward = generateNextWorkout(createInput());
  const reversed = generateNextWorkout(
    createInput({ catalogEntries: [...baseEntries].reverse() }),
  );
  expect(reversed).toEqual(forward);
});

it("returns NO_ELIGIBLE_EXERCISES when every candidate is excluded", () => {
  expect(
    generateNextWorkout(
      createInput({
        excludedExerciseIds: baseEntries.map(
          (entry) => entry.exercise.id,
        ),
      }),
    ),
  ).toEqual({ kind: "failure", reason: "NO_ELIGIBLE_EXERCISES" });
});

it("returns INSUFFICIENT_DURATION_COVERAGE without a partial workout", () => {
  expect(
    generateNextWorkout(
      createInput({ catalogEntries: baseEntries.slice(0, 2) }),
    ),
  ).toEqual({
    kind: "failure",
    reason: "INSUFFICIENT_DURATION_COVERAGE",
  });
});

it("returns typed safety violations for a misaligned default load", () => {
  const unsafeEntries = [
    createEntry("anti-extension", {
      primaryPattern: "anti_extension",
      defaultLoad: 27,
    }),
    baseEntries[1],
    baseEntries[2],
  ];

  expect(
    generateNextWorkout(createInput({ catalogEntries: unsafeEntries })),
  ).toEqual({
    kind: "failure",
    reason: "SAFETY_VIOLATION",
    violations: [
      {
        code: "LOAD_STEP_MISMATCH",
        exerciseId: "anti-extension",
      },
    ],
  });
});

it("uses low-fatigue choices and deduplicates recovery explanations", () => {
  const patternStates = createPatternStates();
  patternStates.anti_extension = createPatternState("anti_extension", 8);
  patternStates.rotation = createPatternState("rotation", 8);
  const recoveryEntries = [
    createEntry("anti-high", {
      primaryPattern: "anti_extension",
      fatigueScore: 3,
    }),
    createEntry("anti-low", {
      primaryPattern: "anti_extension",
      fatigueScore: 1,
    }),
    createEntry("rotation-low", {
      primaryPattern: "rotation",
      fatigueScore: 1,
    }),
    createEntry("trunk-low", {
      primaryPattern: "trunk_flexion",
      fatigueScore: 1,
    }),
  ];
  const result = generateNextWorkout(
    createInput({
      catalogEntries: recoveryEntries,
      patternStateByPattern: patternStates,
    }),
  );

  expect(result.kind).toBe("success");
  if (result.kind !== "success") throw new Error("Expected success");
  expect(
    result.prescription.items.map((item) => item.entry.exercise.id),
  ).not.toContain("anti-high");
  expect(result.prescription.explanationCodes).toEqual([
    "RECOVERY_RECENT_FATIGUE",
    "DURATION_USER_SELECTION",
  ]);
});

it("does not mutate caller-owned inputs", () => {
  const input = createInput();
  const before = JSON.stringify(input);
  generateNextWorkout(input);
  expect(JSON.stringify(input)).toBe(before);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm test -- generate-next-workout
```

Expected first result: FAIL because `./generate-next-workout` does not exist.
Add only a typed stub that returns
`{ kind: "failure", reason: "NO_ELIGIBLE_EXERCISES" }`, rerun, and verify the
success, insufficient-duration, safety, and recovery tests fail on behavior
rather than import errors. If the no-eligible test passes against the stub,
temporarily return `INSUFFICIENT_DURATION_COVERAGE` and run only that test once
to prove it can fail before writing the real implementation.

- [ ] **Step 4: Add engine-owned version constants**

Create `src/engine/versions.ts`:

```typescript
export const ENGINE_VERSION = "0.1.0" as const;
export const POLICY_VERSION = "0.1.0" as const;
```

- [ ] **Step 5: Implement the exact public types and explanation collector**

Create the types from the **Interfaces** block at the top of
`src/engine/generate-next-workout.ts`. Import all consumed types with
`import type`.

Add a local helper that preserves the first-observed explanation order:

```typescript
function addExplanationCode(
  codes: ExplanationCode[],
  code: ExplanationCode | null,
): void {
  if (code !== null && !codes.includes(code)) {
    codes.push(code);
  }
}
```

- [ ] **Step 6: Implement recovery and eligibility orchestration**

Use the canonical movement-pattern order so explanation ordering is stable:

```typescript
const explanationCodes: ExplanationCode[] = [];
const recoveryByPattern: Partial<
  Record<MovementPattern, RecoveryDirective>
> = {};

for (const pattern of MOVEMENT_PATTERNS) {
  const recovery = assessPatternRecovery(
    input.patternStateByPattern[pattern],
    input.recentOutcomesByPattern[pattern] ?? [],
    input.now,
  );
  recoveryByPattern[pattern] = recovery.directive;
  addExplanationCode(explanationCodes, recovery.explanationCode);
}

const eligibilityConstraints: EligibilityConstraints = {
  maxLevel: input.maxLevel,
  excludedExerciseIds: input.excludedExerciseIds,
  recoveryByPattern,
  reviewedRegressionExerciseIds:
    input.reviewedRegressionExerciseIds,
};
const eligibleEntries = filterEligibleExercises(
  input.catalogEntries,
  eligibilityConstraints,
);

if (eligibleEntries.length === 0) {
  return { kind: "failure", reason: "NO_ELIGIBLE_EXERCISES" };
}
```

- [ ] **Step 7: Implement selection, prescription, ordering, and time fitting**

```typescript
const targetResult = selectPatternTargets({
  eligibleEntries,
  durationMinutes: input.durationMinutes,
  recentExposureCounts: input.recentPatternExposureCounts,
  seed: input.seed,
});
targetResult.explanationCodes.forEach((code) =>
  addExplanationCode(explanationCodes, code),
);

const selectionResult = selectExercisesForPatterns({
  eligibleEntries,
  targetPatterns: targetResult.patterns,
  currentExerciseIdByPattern: input.currentExerciseIdByPattern,
  recentExerciseExposureCounts:
    input.recentExerciseExposureCounts,
  seed: input.seed,
});
selectionResult.selections.forEach((selection) =>
  addExplanationCode(explanationCodes, selection.explanationCode),
);

const loaded = prescribeConservativeLoads({
  selections: selectionResult.selections,
  exerciseStateById: input.exerciseStateById,
  restSecondsByExerciseId: input.restSecondsByExerciseId,
});
const ordered = orderExercises(loaded);
const fitted = fitToTimeBudget({
  prescriptions: ordered,
  durationMinutes: input.durationMinutes,
});

if (!fitted.fits) {
  return {
    kind: "failure",
    reason: "INSUFFICIENT_DURATION_COVERAGE",
  };
}
```

- [ ] **Step 8: Implement final safety and success results**

```typescript
const violations = validateWorkoutSafety({
  fitResult: fitted,
  eligibilityConstraints,
});

if (violations.length > 0) {
  return {
    kind: "failure",
    reason: "SAFETY_VIOLATION",
    violations,
  };
}

return {
  kind: "success",
  prescription: {
    durationMinutes: input.durationMinutes,
    estimatedDurationSeconds: fitted.estimatedDurationSeconds,
    shortened:
      targetResult.shortened ||
      selectionResult.missingPatterns.length > 0 ||
      fitted.shortened,
    items: fitted.prescriptions,
    explanationCodes,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    catalogVersion: input.catalogVersion,
    seed: input.seed,
  },
};
```

- [ ] **Step 9: Run focused tests and type checking**

Run:

```bash
npm test -- generate-next-workout
npm run typecheck
```

Expected: generator suite PASS with all eight tests; TypeScript exits 0.

If the safety-violation test unexpectedly returns
`INSUFFICIENT_DURATION_COVERAGE`, verify the hand calculation: the three
items should estimate to `264` seconds, which remains inside the 5-minute
`240..300` range. Do not weaken the duration or safety policy to make it pass.

- [ ] **Step 10: Perform the mutation and scope review**

Check these realistic mutations mentally against named tests:

- Remove `filterEligibleExercises` → no-eligible/recovery tests fail.
- Hard-code a seed or depend on catalog array order → determinism/order tests
  fail.
- Skip `fitToTimeBudget` → insufficient-duration test fails.
- Skip `validateWorkoutSafety` → load-step safety test fails.
- Append duplicate recovery codes → explanation test fails.
- Sort or mutate caller arrays in place → immutability test fails.
- Replace engine/policy versions → success contract test fails.

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the files listed in this task plus the
pre-existing protected untracked files appear.

- [ ] **Step 11: Run complete verification**

Run:

```bash
npm test
npm run typecheck
npx expo-doctor
```

Expected: all Jest suites pass, TypeScript exits 0, and Expo Doctor reports
`18/18 checks passed`. The project currently has no `lint` script; report that
fact without adding lint dependencies in this task.

- [ ] **Step 12: Commit the implementation**

Stage only the generator files, version module, test, and any exact canonical
doc alignment made in Step 10:

```bash
git add src/engine/versions.ts \
  src/engine/generate-next-workout.ts \
  src/engine/generate-next-workout.test.ts \
  docs/06_ALGORITHM_SPECIFICATION.md
git diff --cached --check
git commit -m "feat: orchestrate workout generation"
```

If `docs/06_ALGORITHM_SPECIFICATION.md` did not change, omit it from `git add`.
Do not push.
