import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  MovementPattern,
} from "../catalog/types";
import { selectExercisesForPatterns } from "./select-exercises-for-patterns";

const reviewedAt = "2026-08-15T09:00:00.000Z";
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

function summarizeSelections(
  result: ReturnType<typeof selectExercisesForPatterns>,
) {
  return result.selections.map((selection) => ({
    pattern: selection.pattern,
    exerciseId: selection.entry.exercise.id,
    explanationCode: selection.explanationCode,
  }));
}

describe("selectExercisesForPatterns", () => {
  it("keeps the current exercise when it remains eligible", () => {
    const current = createEntry("current", "anti_extension", {
      level: 3,
      strengthDemand: 3,
      coordinationDemand: 3,
      fatigueScore: 3,
    });
    const freshFoundation = createEntry(
      "fresh-foundation",
      "anti_extension",
    );

    const result = selectExercisesForPatterns({
      eligibleEntries: [freshFoundation, current],
      targetPatterns: ["anti_extension"],
      currentExerciseIdByPattern: {
        anti_extension: "current",
      },
      recentExerciseExposureCounts: {
        current: 8,
        "fresh-foundation": 0,
      },
      seed: "continuity-seed",
    });

    expect(summarizeSelections(result)).toEqual([
      {
        pattern: "anti_extension",
        exerciseId: "current",
        explanationCode: null,
      },
    ]);
    expect(result.missingPatterns).toEqual([]);
  });

  it("selects only exercises matching the target primary pattern", () => {
    const result = selectExercisesForPatterns({
      eligibleEntries: [
        createEntry("anti-extension", "anti_extension"),
        createEntry("rotation", "rotation"),
      ],
      targetPatterns: ["anti_extension"],
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {},
      seed: "pattern-seed",
    });

    expect(summarizeSelections(result)).toEqual([
      {
        pattern: "anti_extension",
        exerciseId: "anti-extension",
        explanationCode: null,
      },
    ]);
  });

  it("reports a target pattern when no eligible exercise remains", () => {
    const result = selectExercisesForPatterns({
      eligibleEntries: [
        createEntry("anti-extension", "anti_extension"),
      ],
      targetPatterns: ["anti_extension", "rotation"],
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {},
      seed: "missing-seed",
    });

    expect(summarizeSelections(result)).toEqual([
      {
        pattern: "anti_extension",
        exerciseId: "anti-extension",
        explanationCode: null,
      },
    ]);
    expect(result.missingPatterns).toEqual(["rotation"]);
  });

  it("prefers the least recently exposed candidate when no current exercise is eligible", () => {
    const result = selectExercisesForPatterns({
      eligibleEntries: [
        createEntry("repeated", "anti_extension"),
        createEntry("fresh", "anti_extension"),
      ],
      targetPatterns: ["anti_extension"],
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {
        repeated: 5,
        fresh: 0,
      },
      seed: "exposure-seed",
    });

    expect(summarizeSelections(result)).toEqual([
      {
        pattern: "anti_extension",
        exerciseId: "fresh",
        explanationCode: "VARIATION_RECENT_EXPOSURE",
      },
    ]);
  });

  it("prefers lower total demand when exposure counts are equal", () => {
    const result = selectExercisesForPatterns({
      eligibleEntries: [
        createEntry("higher-demand", "anti_extension", {
          level: 3,
          strengthDemand: 3,
          coordinationDemand: 3,
          fatigueScore: 3,
        }),
        createEntry("foundation", "anti_extension"),
      ],
      targetPatterns: ["anti_extension"],
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {},
      seed: "demand-seed",
    });

    expect(summarizeSelections(result)).toEqual([
      {
        pattern: "anti_extension",
        exerciseId: "foundation",
        explanationCode: null,
      },
    ]);
  });

  it("does not depend on eligible catalog array order", () => {
    const entries = [
      createEntry("candidate-a", "anti_extension"),
      createEntry("candidate-b", "anti_extension"),
      createEntry("candidate-c", "anti_extension"),
    ];
    const input = {
      targetPatterns: ["anti_extension"] as const,
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {},
      seed: "seed-0",
    };

    const forward = selectExercisesForPatterns({
      ...input,
      eligibleEntries: entries,
    });
    const reversed = selectExercisesForPatterns({
      ...input,
      eligibleEntries: [...entries].reverse(),
    });

    expect(summarizeSelections(reversed)).toEqual(
      summarizeSelections(forward),
    );
  });

  it("allows seed to vary otherwise equal candidates", () => {
    const entries = [
      createEntry("candidate-a", "anti_extension"),
      createEntry("candidate-b", "anti_extension"),
      createEntry("candidate-c", "anti_extension"),
    ];
    const baseInput = {
      eligibleEntries: entries,
      targetPatterns: ["anti_extension"] as const,
      currentExerciseIdByPattern: {},
      recentExerciseExposureCounts: {},
    };

    const seedZero = selectExercisesForPatterns({
      ...baseInput,
      seed: "seed-0",
    });
    const seedOne = selectExercisesForPatterns({
      ...baseInput,
      seed: "seed-1",
    });

    expect(summarizeSelections(seedZero)).not.toEqual(
      summarizeSelections(seedOne),
    );
  });
});
