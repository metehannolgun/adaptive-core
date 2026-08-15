import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
} from "../catalog/types";
import type { ExercisePrescription } from "./prescribe-conservative-loads";
import { fitToTimeBudget } from "./fit-to-time-budget";

const reviewedAt = "2026-08-15T14:00:00.000Z";
const reviewedBy = "internal-review";

type PrescriptionOptions = {
  load?: number;
  sets?: number;
  restSeconds?: number;
  setupSeconds?: number;
  estimatedSecondsPerUnit?: number;
  maxLoad?: number;
};

function createEntry(
  id: string,
  options: PrescriptionOptions,
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
  const exercise: Exercise = {
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
    maxLoad: options.maxLoad ?? 40,
    loadStep: 5,
    estimatedSecondsPerUnit:
      options.estimatedSecondsPerUnit ?? 1,
    defaultSets: 2,
    minRestSeconds: 20,
    maxRestSeconds: 60,
    setupSeconds: options.setupSeconds ?? 10,
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
  const entry = createEntry(id, options);

  return {
    pattern: entry.exercise.primaryPattern,
    entry,
    explanationCode: null,
    loadMode: entry.exercise.loadMode,
    load: options.load ?? 25,
    sets: options.sets ?? 2,
    restSeconds: options.restSeconds ?? 20,
    setupSeconds: options.setupSeconds ?? 10,
  };
}

function summarize(result: ReturnType<typeof fitToTimeBudget>) {
  return {
    exerciseIds: result.prescriptions.map(
      (item) => item.entry.exercise.id,
    ),
    estimatedDurationSeconds: result.estimatedDurationSeconds,
    budgetSeconds: result.budgetSeconds,
    minimumDurationSeconds: result.minimumDurationSeconds,
    fits: result.fits,
    shortened: result.shortened,
    failureReason: result.failureReason,
  };
}

describe("fitToTimeBudget", () => {
  it("counts work, inter-set rest, setup, and transitions", () => {
    const result = fitToTimeBudget({
      prescriptions: [
        createPrescription("controlled-reps", {
          load: 10,
          estimatedSecondsPerUnit: 3,
        }),
        createPrescription("timed-hold"),
        createPrescription("short-hold", { load: 20 }),
      ],
      durationMinutes: 5,
    });

    expect(summarize(result)).toEqual({
      exerciseIds: ["controlled-reps", "timed-hold", "short-hold"],
      estimatedDurationSeconds: 260,
      budgetSeconds: 300,
      minimumDurationSeconds: 240,
      fits: true,
      shortened: false,
      failureReason: null,
    });
  });

  it("removes trailing exercises until the upper limit is respected", () => {
    const result = fitToTimeBudget({
      prescriptions: [
        createPrescription("first"),
        createPrescription("second"),
        createPrescription("third"),
        createPrescription("fourth"),
      ],
      durationMinutes: 5,
    });

    expect(summarize(result)).toEqual({
      exerciseIds: ["first", "second", "third"],
      estimatedDurationSeconds: 260,
      budgetSeconds: 300,
      minimumDurationSeconds: 240,
      fits: true,
      shortened: true,
      failureReason: null,
    });
  });

  it("reports insufficient coverage instead of adding workload", () => {
    const result = fitToTimeBudget({
      prescriptions: [
        createPrescription("first"),
        createPrescription("second"),
      ],
      durationMinutes: 5,
    });

    expect(summarize(result)).toEqual({
      exerciseIds: ["first", "second"],
      estimatedDurationSeconds: 170,
      budgetSeconds: 300,
      minimumDurationSeconds: 240,
      fits: false,
      shortened: false,
      failureReason: "INSUFFICIENT_DURATION_COVERAGE",
    });
  });

  it("returns no exercises when even the first one exceeds the budget", () => {
    const result = fitToTimeBudget({
      prescriptions: [
        createPrescription("too-long", {
          load: 300,
          sets: 1,
          setupSeconds: 10,
          maxLoad: 400,
        }),
      ],
      durationMinutes: 5,
    });

    expect(summarize(result)).toEqual({
      exerciseIds: [],
      estimatedDurationSeconds: 0,
      budgetSeconds: 300,
      minimumDurationSeconds: 240,
      fits: false,
      shortened: true,
      failureReason: "INSUFFICIENT_DURATION_COVERAGE",
    });
  });
});
