import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
} from "../catalog/types";
import { filterEligibleExercises } from "./filter-eligible-exercises";

const reviewedAt = "2026-08-14T09:00:00.000Z";
const reviewedBy = "internal-review";

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
      defaultLoad: 15,
      maxLoad: 30,
      loadStep: 5,
      estimatedSecondsPerUnit: 1,
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

describe("filterEligibleExercises", () => {
  it("removes exercises excluded by pain or user limitation", () => {
    const allowedEntry = createEntry("allowed");
    const excludedEntry = createEntry("excluded");

    expect(
      filterEligibleExercises([allowedEntry, excludedEntry], {
        maxLevel: 5,
        excludedExerciseIds: ["excluded"],
        recoveryByPattern: {},
        reviewedRegressionExerciseIds: [],
      }).map((entry) => entry.exercise.id),
    ).toEqual(["allowed"]);
  });

  it("removes exercises above the allowed complexity level", () => {
    expect(
      filterEligibleExercises(
        [
          createEntry("foundation", { level: 1 }),
          createEntry("advanced", { level: 4 }),
        ],
        {
          maxLevel: 2,
          excludedExerciseIds: [],
          recoveryByPattern: {},
          reviewedRegressionExerciseIds: [],
        },
      ).map((entry) => entry.exercise.id),
    ).toEqual(["foundation"]);
  });

  it("removes catalog entries that are not release ready", () => {
    const approvedEntry = createEntry("approved");
    const pendingMediaEntry = createEntry("pending-media");

    expect(
      filterEligibleExercises(
        [
          approvedEntry,
          {
            ...pendingMediaEntry,
            media: {
              ...pendingMediaEntry.media,
              approvalStatus: "pending",
              reviewedBy: null,
              reviewedAt: null,
            },
          },
        ],
        {
          maxLevel: 5,
          excludedExerciseIds: [],
          recoveryByPattern: {},
          reviewedRegressionExerciseIds: [],
        },
      ).map((entry) => entry.exercise.id),
    ).toEqual(["approved"]);
  });

  it("requires the bodyweight marker for the equipment-free MVP", () => {
    expect(
      filterEligibleExercises(
        [
          createEntry("bodyweight"),
          createEntry("missing-equipment-marker", {
            equipment: [],
          }),
        ],
        {
          maxLevel: 5,
          excludedExerciseIds: [],
          recoveryByPattern: {},
          reviewedRegressionExerciseIds: [],
        },
      ).map((entry) => entry.exercise.id),
    ).toEqual(["bodyweight"]);
  });

  it("keeps only low-fatigue or reviewed regression choices during recovery", () => {
    expect(
      filterEligibleExercises(
        [
          createEntry("low-fatigue", { fatigueScore: 1 }),
          createEntry("reviewed-regression", { fatigueScore: 3 }),
          createEntry("high-fatigue", { fatigueScore: 3 }),
        ],
        {
          maxLevel: 5,
          excludedExerciseIds: [],
          recoveryByPattern: {
            anti_extension: "lighter_only",
          },
          reviewedRegressionExerciseIds: ["reviewed-regression"],
        },
      ).map((entry) => entry.exercise.id),
    ).toEqual(["low-fatigue", "reviewed-regression"]);
  });
});
