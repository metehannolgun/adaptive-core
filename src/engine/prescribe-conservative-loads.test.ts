import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
} from "../catalog/types";
import type { ExerciseSelection } from "./select-exercises-for-patterns";
import { prescribeConservativeLoads } from "./prescribe-conservative-loads";

const reviewedAt = "2026-08-15T10:00:00.000Z";
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
      defaultLoad: 20,
      maxLoad: 40,
      loadStep: 5,
      estimatedSecondsPerUnit: 1,
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

function createSelection(entry: CatalogEntry): ExerciseSelection {
  return {
    pattern: entry.exercise.primaryPattern,
    entry,
    explanationCode: null,
  };
}

function summarizePrescription(
  result: ReturnType<typeof prescribeConservativeLoads>,
) {
  return result.map((item) => ({
    exerciseId: item.entry.exercise.id,
    pattern: item.pattern,
    loadMode: item.loadMode,
    load: item.load,
    sets: item.sets,
    restSeconds: item.restSeconds,
    setupSeconds: item.setupSeconds,
  }));
}

describe("prescribeConservativeLoads", () => {
  it("uses reviewed catalog defaults for a new exercise", () => {
    const entry = createEntry("new-exercise");

    const result = prescribeConservativeLoads({
      selections: [createSelection(entry)],
      exerciseStateById: {},
      restSecondsByExerciseId: {},
    });

    expect(summarizePrescription(result)).toEqual([
      {
        exerciseId: "new-exercise",
        pattern: "anti_extension",
        loadMode: "seconds",
        load: 20,
        sets: 2,
        restSeconds: 30,
        setupSeconds: 15,
      },
    ]);
  });

  it("preserves valid existing load, sets, and rest", () => {
    const entry = createEntry("existing-exercise");

    const result = prescribeConservativeLoads({
      selections: [createSelection(entry)],
      exerciseStateById: {
        "existing-exercise": {
          exerciseId: "existing-exercise",
          currentLoad: 25,
          currentSets: 3,
          consecutiveEasy: 1,
          lastOutcome: "easy",
          excludedUntil: null,
        },
      },
      restSecondsByExerciseId: {
        "existing-exercise": 45,
      },
    });

    expect(summarizePrescription(result)).toEqual([
      {
        exerciseId: "existing-exercise",
        pattern: "anti_extension",
        loadMode: "seconds",
        load: 25,
        sets: 3,
        restSeconds: 45,
        setupSeconds: 15,
      },
    ]);
  });

  it("normalizes stale stored values into reviewed catalog bounds", () => {
    const entry = createEntry("stale-exercise");

    const result = prescribeConservativeLoads({
      selections: [createSelection(entry)],
      exerciseStateById: {
        "stale-exercise": {
          exerciseId: "stale-exercise",
          currentLoad: 38,
          currentSets: 0,
          consecutiveEasy: 0,
          lastOutcome: "appropriate",
          excludedUntil: null,
        },
      },
      restSecondsByExerciseId: {
        "stale-exercise": 80,
      },
    });

    expect(summarizePrescription(result)).toEqual([
      {
        exerciseId: "stale-exercise",
        pattern: "anti_extension",
        loadMode: "seconds",
        load: 35,
        sets: 2,
        restSeconds: 60,
        setupSeconds: 15,
      },
    ]);
  });

  it("falls back safely when stored values are not finite", () => {
    const entry = createEntry("invalid-exercise");

    const result = prescribeConservativeLoads({
      selections: [createSelection(entry)],
      exerciseStateById: {
        "invalid-exercise": {
          exerciseId: "invalid-exercise",
          currentLoad: Number.NaN,
          currentSets: Number.POSITIVE_INFINITY,
          consecutiveEasy: 0,
          lastOutcome: null,
          excludedUntil: null,
        },
      },
      restSecondsByExerciseId: {
        "invalid-exercise": Number.NaN,
      },
    });

    expect(summarizePrescription(result)).toEqual([
      {
        exerciseId: "invalid-exercise",
        pattern: "anti_extension",
        loadMode: "seconds",
        load: 20,
        sets: 2,
        restSeconds: 30,
        setupSeconds: 15,
      },
    ]);
  });

  it("ignores a stored state that belongs to another exercise", () => {
    const entry = createEntry("selected-exercise");

    const result = prescribeConservativeLoads({
      selections: [createSelection(entry)],
      exerciseStateById: {
        "selected-exercise": {
          exerciseId: "different-exercise",
          currentLoad: 35,
          currentSets: 4,
          consecutiveEasy: 0,
          lastOutcome: null,
          excludedUntil: null,
        },
      },
      restSecondsByExerciseId: {},
    });

    expect(summarizePrescription(result)).toEqual([
      {
        exerciseId: "selected-exercise",
        pattern: "anti_extension",
        loadMode: "seconds",
        load: 20,
        sets: 2,
        restSeconds: 30,
        setupSeconds: 15,
      },
    ]);
  });
});
