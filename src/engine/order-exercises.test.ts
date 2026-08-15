import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  MovementPattern,
} from "../catalog/types";
import type { ExercisePrescription } from "./prescribe-conservative-loads";
import { orderExercises } from "./order-exercises";

const reviewedAt = "2026-08-15T12:00:00.000Z";
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
      defaultLoad: 20,
      maxLoad: 40,
      loadStep: 5,
      defaultSets: 2,
      minRestSeconds: 30,
      maxRestSeconds: 60,
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

function createPrescription(
  id: string,
  primaryPattern: MovementPattern,
  coordinationDemand: Exercise["coordinationDemand"],
): ExercisePrescription {
  const entry = createEntry(id, primaryPattern, {
    coordinationDemand,
  });

  return {
    pattern: primaryPattern,
    entry,
    explanationCode: null,
    loadMode: entry.exercise.loadMode,
    load: entry.exercise.defaultLoad,
    sets: entry.exercise.defaultSets,
    restSeconds: entry.exercise.minRestSeconds,
    setupSeconds: entry.exercise.setupSeconds,
  };
}

function getExerciseIds(
  prescriptions: readonly ExercisePrescription[],
): string[] {
  return prescriptions.map((item) => item.entry.exercise.id);
}

describe("orderExercises", () => {
  it("places greater coordination demand first while the user is fresh", () => {
    const result = orderExercises([
      createPrescription("simple", "trunk_flexion", 1),
      createPrescription("complex", "anti_extension", 5),
      createPrescription("moderate", "rotation", 3),
    ]);

    expect(getExerciseIds(result)).toEqual([
      "complex",
      "moderate",
      "simple",
    ]);
  });

  it("separates repeated primary patterns when another pattern is available", () => {
    const result = orderExercises([
      createPrescription("anti-extension-a", "anti_extension", 5),
      createPrescription("anti-extension-b", "anti_extension", 4),
      createPrescription("rotation", "rotation", 3),
    ]);

    expect(getExerciseIds(result)).toEqual([
      "anti-extension-a",
      "rotation",
      "anti-extension-b",
    ]);
  });

  it("keeps the upstream order when coordination demand is equal", () => {
    const result = orderExercises([
      createPrescription("first", "anti_rotation", 3),
      createPrescription("second", "hip_control", 3),
      createPrescription("third", "lateral_stability", 3),
    ]);

    expect(getExerciseIds(result)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("does not mutate the prescribed exercise array", () => {
    const prescriptions = [
      createPrescription("simple", "trunk_flexion", 1),
      createPrescription("complex", "anti_extension", 5),
    ];
    const originalOrder = getExerciseIds(prescriptions);

    orderExercises(prescriptions);

    expect(getExerciseIds(prescriptions)).toEqual(originalOrder);
  });
});
