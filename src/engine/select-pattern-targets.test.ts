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
