import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
} from "../catalog/types";
import type { EligibilityConstraints } from "./filter-eligible-exercises";
import { fitToTimeBudget } from "./fit-to-time-budget";
import type { ExercisePrescription } from "./prescribe-conservative-loads";
import { validateWorkoutSafety } from "./validate-workout-safety";

const reviewedAt = "2026-08-15T16:00:00.000Z";
const reviewedBy = "internal-review";

type PrescriptionOptions = {
  load?: number;
  exerciseOverrides?: Partial<Exercise>;
};

const defaultConstraints: EligibilityConstraints = {
  maxLevel: 5,
  excludedExerciseIds: [],
  recoveryByPattern: {},
  reviewedRegressionExerciseIds: [],
};

function createEntry(
  id: string,
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
      primaryPattern: "anti_extension",
      secondaryPatterns: [],
      userFocusLabels: ["deep_core"],
      loadMode: "seconds",
      level: 1,
      strengthDemand: 1,
      coordinationDemand: 1,
      fatigueScore: 1,
      equipment: ["bodyweight"],
      minLoad: 10,
      defaultLoad: 25,
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

function createPrescription(
  id: string,
  options: PrescriptionOptions = {},
): ExercisePrescription {
  const entry = createEntry(id, options.exerciseOverrides);

  return {
    pattern: entry.exercise.primaryPattern,
    entry,
    explanationCode: null,
    loadMode: entry.exercise.loadMode,
    load: options.load ?? 25,
    sets: 2,
    restSeconds: 20,
    setupSeconds: 10,
  };
}

function createFitResult(
  firstOptions: PrescriptionOptions = {},
) {
  return fitToTimeBudget({
    prescriptions: [
      createPrescription("first", firstOptions),
      createPrescription("second"),
      createPrescription("third"),
    ],
    durationMinutes: 5,
  });
}

describe("validateWorkoutSafety", () => {
  it("accepts a release-ready workout inside every safety boundary", () => {
    expect(
      validateWorkoutSafety({
        fitResult: createFitResult(),
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([]);
  });

  it("reports an exercise excluded after pain or a limitation", () => {
    expect(
      validateWorkoutSafety({
        fitResult: createFitResult(),
        eligibilityConstraints: {
          ...defaultConstraints,
          excludedExerciseIds: ["second"],
        },
      }),
    ).toEqual([
      {
        code: "INELIGIBLE_EXERCISE",
        exerciseId: "second",
      },
    ]);
  });

  it("reports an exercise outside the equipment-free catalog", () => {
    expect(
      validateWorkoutSafety({
        fitResult: createFitResult({
          exerciseOverrides: { equipment: [] },
        }),
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([
      {
        code: "INELIGIBLE_EXERCISE",
        exerciseId: "first",
      },
    ]);
  });

  it("reports a prescribed load above the reviewed maximum", () => {
    expect(
      validateWorkoutSafety({
        fitResult: createFitResult({ load: 45 }),
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([
      {
        code: "LOAD_OUT_OF_BOUNDS",
        exerciseId: "first",
      },
    ]);
  });

  it("reports a prescribed load that skips the reviewed step", () => {
    expect(
      validateWorkoutSafety({
        fitResult: createFitResult({ load: 27 }),
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([
      {
        code: "LOAD_STEP_MISMATCH",
        exerciseId: "first",
      },
    ]);
  });

  it("recalculates duration instead of trusting fit metadata", () => {
    const fitResult = createFitResult();

    expect(
      validateWorkoutSafety({
        fitResult: {
          ...fitResult,
          estimatedDurationSeconds:
            fitResult.estimatedDurationSeconds - 1,
        },
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([
      {
        code: "TIME_BUDGET_VIOLATION",
        exerciseId: null,
      },
    ]);
  });

  it("reports a workout below the minimum duration coverage", () => {
    const fitResult = fitToTimeBudget({
      prescriptions: [
        createPrescription("first"),
        createPrescription("second"),
      ],
      durationMinutes: 5,
    });

    expect(
      validateWorkoutSafety({
        fitResult,
        eligibilityConstraints: defaultConstraints,
      }),
    ).toEqual([
      {
        code: "TIME_BUDGET_VIOLATION",
        exerciseId: null,
      },
    ]);
  });
});
