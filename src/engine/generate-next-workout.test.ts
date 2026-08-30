import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  MovementPattern,
} from "../catalog/types";
import {
  generateNextWorkout,
  type GenerateNextWorkoutInput,
} from "./generate-next-workout";
import { MOVEMENT_PATTERNS } from "./policy";
import type { PatternState } from "./types";

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

describe("generateNextWorkout", () => {
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

  it("rejects duplicate exercise identities before eligibility", () => {
    const conflictingEntry = createEntry("conflicting-entry", {
      primaryPattern: "rotation",
    });
    const duplicateIdEntry: CatalogEntry = {
      ...conflictingEntry,
      exercise: {
        ...conflictingEntry.exercise,
        id: "anti-extension",
      },
      contents: conflictingEntry.contents.map((content) => ({
        ...content,
        exerciseId: "anti-extension",
      })),
      media: {
        ...conflictingEntry.media,
        exerciseId: "anti-extension",
      },
    };
    const catalogEntries = [
      baseEntries[0],
      duplicateIdEntry,
      baseEntries[2],
    ];
    const expected = {
      kind: "failure",
      reason: "INVALID_CATALOG",
      issues: ["DUPLICATE_EXERCISE_ID"],
    };

    expect(
      generateNextWorkout(
        createInput({
          catalogEntries,
          excludedExerciseIds: ["anti-extension", "trunk-flexion"],
        }),
      ),
    ).toEqual(expected);
    expect(
      generateNextWorkout(
        createInput({
          catalogEntries: [...catalogEntries].reverse(),
          excludedExerciseIds: ["anti-extension", "trunk-flexion"],
        }),
      ),
    ).toEqual(expected);
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

  it("treats non-finite fatigue as requiring recovery", () => {
    const patternStates = createPatternStates();
    patternStates.anti_extension = createPatternState(
      "anti_extension",
      Number.NaN,
    );
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
        currentExerciseIdByPattern: {
          anti_extension: "anti-high",
        },
      }),
    );

    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("Expected success");
    expect(
      result.prescription.items.map((item) => item.entry.exercise.id),
    ).not.toContain("anti-high");
    expect(result.prescription.explanationCodes).toContain(
      "RECOVERY_RECENT_FATIGUE",
    );
  });

  it("does not mutate caller-owned inputs", () => {
    const input = createInput();
    const before = JSON.stringify(input);
    generateNextWorkout(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
