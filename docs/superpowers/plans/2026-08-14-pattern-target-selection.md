# Pattern Target Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select a safe, duration-appropriate, balanced, and reproducible set of unique movement-pattern targets from already eligible catalog entries.

**Architecture:** Add one pure engine pipeline stage after `filterEligibleExercises`. The first task establishes the duration policy and safe-shortening contract; the second adds recent-exposure scoring and seed-based deterministic tie-breaking without weakening eligibility.

**Tech Stack:** TypeScript strict mode, Jest, existing catalog and engine types

**Spec:** `docs/superpowers/specs/2026-08-14-pattern-target-selection-design.md`

## Global Constraints

- Supported workout durations are exactly `5 | 10 | 15` minutes.
- Target pattern counts are exactly `3 | 4 | 6` for those durations.
- Every selected target is a unique primary movement pattern represented by an eligible entry.
- Fewer safe patterns shorten the result; selection never weakens an upstream safety rule.
- Same inputs and seed must produce the same result regardless of catalog array order.
- Seed breaks equal safe choices only; lower recent exposure always wins first.
- Do not use `Math.random()` or add a dependency.
- Engine code stays pure and imports no React, Expo, Supabase, PostHog, localization, or database code.
- Push is out of scope.

---

### Task 1: Duration policy and safe pattern-selection contract

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/policy.ts`
- Create: `src/engine/select-pattern-targets.ts`
- Create: `src/engine/select-pattern-targets.test.ts`

**Interfaces:**
- Consumes: `CatalogEntry`, `MovementPattern`, and already filtered catalog entries
- Produces: `selectPatternTargets(input: SelectPatternTargetsInput): PatternSelectionResult`
- Produces: `PATTERN_TARGET_COUNT_BY_DURATION` and `MOVEMENT_PATTERNS`

- [ ] **Step 1: Add the final public types to `src/engine/types.ts`**

Add `WorkoutDurationMinutes` and the two selection explanation codes before `ExplanationCode`, then extend the shared union and add the result shape:

```ts
export type WorkoutDurationMinutes = 5 | 10 | 15;

export type PatternSelectionExplanationCode =
  | "DURATION_USER_SELECTION"
  | "VARIATION_PATTERN_BALANCE";

export type ExplanationCode =
  | PatternSelectionExplanationCode
  | "LOAD_HOLD_EASY_STREAK"
  | "LOAD_UP_EASY_SUCCESS"
  | "LOAD_HOLD_APPROPRIATE"
  | "LOAD_HOLD_HARD"
  | "LOAD_DOWN_INCOMPLETE"
  | "REGRESSION_INCOMPLETE"
  | "EXERCISE_EXCLUDED_PAIN"
  | "RECOVERY_RECENT_FATIGUE";

export type PatternSelectionResult = {
  patterns: MovementPattern[];
  requestedTargetCount: number;
  shortened: boolean;
  explanationCodes: PatternSelectionExplanationCode[];
};
```

Keep the existing feedback and recovery types unchanged.

- [ ] **Step 2: Add stable policy values to `src/engine/policy.ts`**

Add the imports and constants alongside `FEEDBACK_POLICY`:

```ts
import type { MovementPattern } from "../catalog/types";
import type { WorkoutDurationMinutes } from "./types";

export const MOVEMENT_PATTERNS = [
  "trunk_flexion",
  "anti_extension",
  "anti_rotation",
  "rotation",
  "lateral_stability",
  "hip_control",
] as const satisfies readonly MovementPattern[];

export const PATTERN_TARGET_COUNT_BY_DURATION = {
  5: 3,
  10: 4,
  15: 6,
} as const satisfies Record<WorkoutDurationMinutes, number>;
```

- [ ] **Step 3: Create the test file and catalog-entry fixture**

Create `src/engine/select-pattern-targets.test.ts` with this fixture. It is intentionally complete so strict TypeScript verifies the same catalog contract used in production:

```ts
import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  MovementPattern,
} from "../catalog/types";
import { selectPatternTargets } from "./select-pattern-targets";

const reviewedAt = "2026-08-14T09:00:00.000Z";
const reviewedBy = "internal-review";

function createEntry(
  id: string,
  primaryPattern: MovementPattern,
  exerciseOverrides: Partial<Exercise> = {},
): CatalogEntry {
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

  return {
    exercise: {
      id,
      slug: id,
      status: "active",
      primaryPattern,
      secondaryPatterns: [],
      userFocusLabels: ["deep_core"],
      loadMode: "seconds",
      level: 1,
      strengthDemand: 1,
      coordinationDemand: 1,
      fatigueScore: 1,
      equipment: ["bodyweight"],
      minLoad: 10,
      defaultLoad: 15,
      maxLoad: 30,
      loadStep: 5,
      defaultSets: 1,
      minRestSeconds: 15,
      maxRestSeconds: 45,
      setupSeconds: 15,
      bilateral: false,
      contraindicationTags: [],
      mediaId: `repdb-${id}`,
      metadataVersion: 1,
      reviewedBy,
      reviewedAt,
      ...exerciseOverrides,
    },
    contents: [
      englishContent,
      {
        ...englishContent,
        locale: "tr",
        name: `${id} TR`,
      },
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

const allPatternEntries = [
  createEntry("trunk-flexion", "trunk_flexion"),
  createEntry("anti-extension", "anti_extension"),
  createEntry("anti-rotation", "anti_rotation"),
  createEntry("rotation", "rotation"),
  createEntry("lateral-stability", "lateral_stability"),
  createEntry("hip-control", "hip_control"),
];
```

- [ ] **Step 4: Write failing tests for duration targets, uniqueness, shortening, and empty input**

Append these tests:

```ts
describe("selectPatternTargets", () => {
  it.each([
    [5, 3],
    [10, 4],
    [15, 6],
  ] as const)(
    "uses a %i-minute policy target of %i unique patterns",
    (durationMinutes, expectedCount) => {
      const result = selectPatternTargets({
        eligibleEntries: allPatternEntries,
        durationMinutes,
        recentExposureCounts: {},
        seed: "duration-seed",
      });

      expect(result.patterns).toHaveLength(expectedCount);
      expect(new Set(result.patterns).size).toBe(expectedCount);
      expect(result.requestedTargetCount).toBe(expectedCount);
      expect(result.shortened).toBe(false);
      expect(result.explanationCodes).toEqual([
        "DURATION_USER_SELECTION",
      ]);
    },
  );

  it("deduplicates eligible primary patterns and shortens safely", () => {
    const result = selectPatternTargets({
      eligibleEntries: [
        createEntry("anti-extension-a", "anti_extension"),
        createEntry("anti-extension-b", "anti_extension"),
        createEntry("rotation-a", "rotation"),
      ],
      durationMinutes: 5,
      recentExposureCounts: {},
      seed: "shortened-seed",
    });

    expect(result.patterns).toEqual([
      "anti_extension",
      "rotation",
    ]);
    expect(result.requestedTargetCount).toBe(3);
    expect(result.shortened).toBe(true);
  });

  it("returns an explicit empty shortened result", () => {
    expect(
      selectPatternTargets({
        eligibleEntries: [],
        durationMinutes: 5,
        recentExposureCounts: {},
        seed: "empty-seed",
      }),
    ).toEqual({
      patterns: [],
      requestedTargetCount: 3,
      shortened: true,
      explanationCodes: ["DURATION_USER_SELECTION"],
    });
  });
});
```

- [ ] **Step 5: Run the focused test and verify RED**

Run: `npm test -- select-pattern-targets`

Expected: FAIL because `./select-pattern-targets` does not exist.

- [ ] **Step 6: Implement the minimum safe selector**

Create `src/engine/select-pattern-targets.ts`:

```ts
import type { CatalogEntry, MovementPattern } from "../catalog/types";
import {
  MOVEMENT_PATTERNS,
  PATTERN_TARGET_COUNT_BY_DURATION,
} from "./policy";
import type {
  PatternSelectionResult,
  WorkoutDurationMinutes,
} from "./types";

export type SelectPatternTargetsInput = {
  eligibleEntries: readonly CatalogEntry[];
  durationMinutes: WorkoutDurationMinutes;
  recentExposureCounts: Readonly<
    Partial<Record<MovementPattern, number>>
  >;
  seed: string;
};

export function selectPatternTargets(
  input: SelectPatternTargetsInput,
): PatternSelectionResult {
  const requestedTargetCount =
    PATTERN_TARGET_COUNT_BY_DURATION[input.durationMinutes];
  const representedPatterns = new Set(
    input.eligibleEntries.map(
      (entry) => entry.exercise.primaryPattern,
    ),
  );
  const uniquePatterns = MOVEMENT_PATTERNS.filter((pattern) =>
    representedPatterns.has(pattern),
  );
  const patterns = uniquePatterns.slice(0, requestedTargetCount);

  return {
    patterns,
    requestedTargetCount,
    shortened: patterns.length < requestedTargetCount,
    explanationCodes: ["DURATION_USER_SELECTION"],
  };
}
```

- [ ] **Step 7: Run focused tests and type checking to verify GREEN**

Run: `npm test -- select-pattern-targets && npm run typecheck`

Expected: the new suite passes and TypeScript exits with code 0.

- [ ] **Step 8: Commit the safe duration selector**

```bash
git add src/engine/types.ts src/engine/policy.ts src/engine/select-pattern-targets.ts src/engine/select-pattern-targets.test.ts
git commit -m "feat: select safe duration pattern targets"
```

---

### Task 2: Recent-exposure balance and deterministic seed tie-breaking

**Files:**
- Modify: `src/engine/select-pattern-targets.ts`
- Modify: `src/engine/select-pattern-targets.test.ts`

**Interfaces:**
- Consumes: the final `SelectPatternTargetsInput` created in Task 1
- Produces: the same `selectPatternTargets` signature with balanced, input-order-independent selection

- [ ] **Step 1: Add failing tests for balance and explanation codes**

Append inside the existing `describe` block:

```ts
it("prefers less-exposed patterns before seeded variation", () => {
  const result = selectPatternTargets({
    eligibleEntries: allPatternEntries.slice(0, 4),
    durationMinutes: 5,
    recentExposureCounts: {
      trunk_flexion: 8,
      anti_extension: 0,
      anti_rotation: 1,
      rotation: 2,
    },
    seed: "balance-seed",
  });

  expect(result.patterns).toEqual([
    "anti_extension",
    "anti_rotation",
    "rotation",
  ]);
  expect(result.explanationCodes).toEqual([
    "DURATION_USER_SELECTION",
    "VARIATION_PATTERN_BALANCE",
  ]);
});

it("does not claim pattern balance when equal exposure leaves the choice to seed", () => {
  const result = selectPatternTargets({
    eligibleEntries: allPatternEntries,
    durationMinutes: 5,
    recentExposureCounts: {},
    seed: "seed-a",
  });

  expect(result.explanationCodes).toEqual([
    "DURATION_USER_SELECTION",
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- select-pattern-targets`

Expected: FAIL because Task 1 still follows canonical order and never emits `VARIATION_PATTERN_BALANCE`.

- [ ] **Step 3: Add failing determinism and input-order tests**

Append inside the existing `describe` block:

```ts
it("returns the same targets for the same input and seed", () => {
  const input = {
    eligibleEntries: allPatternEntries,
    durationMinutes: 5 as const,
    recentExposureCounts: {},
    seed: "seed-a",
  };

  expect(selectPatternTargets(input)).toEqual(
    selectPatternTargets(input),
  );
});

it("does not depend on eligible catalog array order", () => {
  const forward = selectPatternTargets({
    eligibleEntries: allPatternEntries,
    durationMinutes: 5,
    recentExposureCounts: {},
    seed: "seed-a",
  });
  const reversed = selectPatternTargets({
    eligibleEntries: [...allPatternEntries].reverse(),
    durationMinutes: 5,
    recentExposureCounts: {},
    seed: "seed-a",
  });

  expect(reversed).toEqual(forward);
});

it("allows different seeds to vary equal-exposure choices", () => {
  const seedA = selectPatternTargets({
    eligibleEntries: allPatternEntries,
    durationMinutes: 5,
    recentExposureCounts: {},
    seed: "seed-a",
  });
  const seedB = selectPatternTargets({
    eligibleEntries: allPatternEntries,
    durationMinutes: 5,
    recentExposureCounts: {},
    seed: "seed-b",
  });

  expect(seedA.patterns).not.toEqual(seedB.patterns);
});
```

- [ ] **Step 4: Implement stable seeded ranking after exposure score**

Replace the canonical-only selection inside `src/engine/select-pattern-targets.ts` and add these helpers:

```ts
function stableSeedRank(seed: string, pattern: MovementPattern): number {
  let hash = 2_166_136_261;

  for (const character of `${seed}:${pattern}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function getExposureCount(
  pattern: MovementPattern,
  counts: SelectPatternTargetsInput["recentExposureCounts"],
): number {
  return counts[pattern] ?? 0;
}
```

After building `uniquePatterns`, replace the `patterns` assignment and return preparation with:

```ts
const rankedPatterns = [...uniquePatterns].sort((left, right) => {
  const exposureDifference =
    getExposureCount(left, input.recentExposureCounts) -
    getExposureCount(right, input.recentExposureCounts);

  if (exposureDifference !== 0) {
    return exposureDifference;
  }

  const seedDifference =
    stableSeedRank(input.seed, left) -
    stableSeedRank(input.seed, right);

  if (seedDifference !== 0) {
    return seedDifference;
  }

  return (
    MOVEMENT_PATTERNS.indexOf(left) -
    MOVEMENT_PATTERNS.indexOf(right)
  );
});
const patterns = rankedPatterns.slice(0, requestedTargetCount);
const exposureScores = new Set(
  uniquePatterns.map((pattern) =>
    getExposureCount(pattern, input.recentExposureCounts),
  ),
);
const balanceAffectedSelection =
  uniquePatterns.length > requestedTargetCount &&
  exposureScores.size > 1;
const explanationCodes: PatternSelectionResult["explanationCodes"] = [
  "DURATION_USER_SELECTION",
];

if (balanceAffectedSelection) {
  explanationCodes.push("VARIATION_PATTERN_BALANCE");
}
```

Return `explanationCodes` instead of the Task 1 literal array.

- [ ] **Step 5: Run focused tests and type checking to verify GREEN**

Run: `npm test -- select-pattern-targets && npm run typecheck`

Expected: all pattern-selection tests pass and TypeScript exits with code 0.

- [ ] **Step 6: Commit controlled pattern variation**

```bash
git add src/engine/select-pattern-targets.ts src/engine/select-pattern-targets.test.ts
git commit -m "feat: balance pattern targets deterministically"
```

---

### Task 3: Full engine and project verification

**Files:**
- Verify only; no expected file changes

**Interfaces:**
- Consumes: both implementation commits from Tasks 1 and 2
- Produces: fresh evidence that the complete branch remains healthy

- [ ] **Step 1: Inspect the final scoped diff**

Run:

```bash
git diff HEAD~2..HEAD -- src/engine/types.ts src/engine/policy.ts src/engine/select-pattern-targets.ts src/engine/select-pattern-targets.test.ts
git status --short
```

Expected: only the four scoped engine files appear in the two implementation commits; unrelated untracked files remain unstaged.

- [ ] **Step 2: Run all project tests**

Run: `npm test`

Expected: all suites and tests pass with zero failures.

- [ ] **Step 3: Run strict TypeScript checking**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 4: Run Expo project health checks**

Run: `npx expo-doctor`

Expected: `18/18 checks passed. No issues detected!`

- [ ] **Step 5: Confirm commit and push boundary**

Run: `git log -3 --oneline && git status --short`

Expected: the design commit plus two implementation commits are present locally. Do not push.
