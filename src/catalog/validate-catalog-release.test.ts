import type {
  CatalogEntry,
  ExerciseContent,
  ExerciseRelation,
} from "./types";
import { validateCatalogRelease } from "./validate-catalog-release";

const reviewedAt = "2026-08-13";
const reviewedBy = "internal-review";

function createEntry(
  id: string,
  slug: string = id,
  mediaId: string = `repdb-${id}`,
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
      slug,
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
      defaultSets: 1,
      minRestSeconds: 15,
      maxRestSeconds: 45,
      setupSeconds: 15,
      bilateral: false,
      contraindicationTags: [],
      mediaId,
      metadataVersion: 1,
      reviewedBy,
      reviewedAt,
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
      id: mediaId,
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

const firstEntry = createEntry("first");
const secondEntry = createEntry("second");
const relation: ExerciseRelation = {
  fromExerciseId: "first",
  toExerciseId: "second",
  type: "progression",
  reason: "Move to the reviewed next exercise.",
  status: "active",
  cycleApproved: false,
  reviewedBy,
  reviewedAt,
};

describe("validateCatalogRelease", () => {
  it("accepts a complete release catalog", () => {
    expect(
      validateCatalogRelease({
        entries: [firstEntry, secondEntry],
        relations: [relation],
      }),
    ).toEqual([]);
  });

  it("collects validation issues from catalog entries", () => {
    expect(
      validateCatalogRelease({
        entries: [{ ...firstEntry, contents: [firstEntry.contents[0]] }],
        relations: [],
      }),
    ).toContain("MISSING_TR_CONTENT");
  });

  it("rejects duplicate exercise IDs, slugs, and media IDs", () => {
    expect(
      validateCatalogRelease({
        entries: [firstEntry, createEntry("first")],
        relations: [],
      }),
    ).toEqual([
      "DUPLICATE_EXERCISE_ID",
      "DUPLICATE_EXERCISE_SLUG",
      "DUPLICATE_MEDIA_ID",
    ]);
  });

  it("validates relations against all release exercises", () => {
    expect(
      validateCatalogRelease({
        entries: [firstEntry],
        relations: [relation],
      }),
    ).toEqual(["RELATION_EXERCISE_NOT_FOUND"]);
  });
});
