import type {
  CatalogEntry,
  Exercise,
  ExerciseContent,
  ExerciseMedia,
} from "./types";
import { validateCatalogEntry } from "./validate-catalog-entry";

const exercise: Exercise = {
  id: "dead-bug",
  slug: "dead-bug",
  status: "active",
  primaryPattern: "anti_extension",
  secondaryPatterns: ["hip_control"],
  userFocusLabels: ["deep_core", "stability"],
  loadMode: "alternating_reps",
  level: 1,
  strengthDemand: 2,
  coordinationDemand: 2,
  fatigueScore: 1,
  equipment: ["bodyweight"],
  minLoad: 4,
  defaultLoad: 6,
  maxLoad: 12,
  loadStep: 2,
  defaultSets: 2,
  minRestSeconds: 15,
  maxRestSeconds: 45,
  setupSeconds: 20,
  bilateral: true,
  contraindicationTags: [],
  mediaId: "repdb-dead-bug",
  metadataVersion: 1,
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

const englishContent: ExerciseContent = {
  exerciseId: "dead-bug",
  locale: "en",
  name: "Dead bug",
  setupInstruction: "Lie on your back with your knees bent.",
  cues: ["Keep your lower back gently supported."],
  breathingCue: "Exhale as you extend.",
  commonMistakes: ["Arching the lower back."],
  stopConditions: ["Stop if you feel pain."],
  altText: "A person performing a dead bug exercise.",
  contentVersion: 1,
  status: "active",
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

const turkishContent: ExerciseContent = {
  ...englishContent,
  locale: "tr",
  name: "Dead bug",
  setupInstruction: "Dizlerin bükülü şekilde sırtüstü uzan.",
  cues: ["Bel boşluğunu kontrollü tut."],
  breathingCue: "Uzuvlarını uzatırken nefes ver.",
  commonMistakes: ["Belin aşırı kavislenmesi."],
  stopConditions: ["Ağrı hissedersen dur."],
  altText: "Dead bug hareketini yapan bir kişi.",
};

const media: ExerciseMedia = {
  id: "repdb-dead-bug",
  exerciseId: "dead-bug",
  type: "webp",
  presentation: {
    kind: "start_peak",
    start: {
      localPath: "assets/exercises/dead-bug-start.webp",
      sourcePath: "images/flat/dead-bug-start.webp",
      checksum: "sha256:start-fixture",
    },
    peak: {
      localPath: "assets/exercises/dead-bug-peak.webp",
      sourcePath: "images/flat/dead-bug-peak.webp",
      checksum: "sha256:peak-fixture",
    },
    fallbackRole: "start",
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
  acquiredAt: "2026-08-13",
  approvalStatus: "approved",
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

const validEntry: CatalogEntry = {
  exercise,
  contents: [englishContent, turkishContent],
  media,
};

describe("validateCatalogEntry", () => {
  it("collects validation issues from all catalog parts", () => {
    expect(
      validateCatalogEntry({
        ...validEntry,
        contents: [englishContent],
        media: {
          ...media,
          commercialUseAllowed: false,
        },
      }),
    ).toEqual([
      "MISSING_TR_CONTENT",
      "COMMERCIAL_USE_NOT_ALLOWED",
    ]);
  });

  it("blocks mismatched exercise and media references", () => {
    expect(
      validateCatalogEntry({
        exercise: {
          ...exercise,
          mediaId: "different-media",
        },
        contents: [
          {
            ...englishContent,
            exerciseId: "different-exercise",
          },
          turkishContent,
        ],
        media: {
          ...media,
          exerciseId: "different-exercise",
        },
      }),
    ).toEqual([
      "CONTENT_EXERCISE_MISMATCH",
      "MEDIA_EXERCISE_MISMATCH",
      "MEDIA_REFERENCE_MISMATCH",
    ]);
  });

  it("requires active and reviewed catalog records", () => {
    expect(
      validateCatalogEntry({
        ...validEntry,
        exercise: {
          ...exercise,
          status: "reviewed",
        },
        contents: [
          {
            ...englishContent,
            status: "reviewed",
            reviewedBy: null,
            reviewedAt: null,
          },
          turkishContent,
        ],
      }),
    ).toEqual([
      "EXERCISE_NOT_ACTIVE",
      "CONTENT_NOT_ACTIVE",
      "MISSING_CONTENT_REVIEW",
    ]);
  });

  it("accepts a complete active catalog entry", () => {
    expect(validateCatalogEntry(validEntry)).toEqual([]);
  });
});
