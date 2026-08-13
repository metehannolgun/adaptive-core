import type {
  ExerciseMedia,
  ExerciseMediaPresentation,
} from "./types";
import { validateExerciseMedia } from "./validate-exercise-media";

const validPresentation: Extract<
  ExerciseMediaPresentation,
  { kind: "start_peak" }
> = {
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
};

const validMedia: ExerciseMedia = {
  id: "repdb-dead-bug",
  exerciseId: "dead-bug",
  type: "webp",
  presentation: validPresentation,
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

describe("validateExerciseMedia", () => {
  it("requires a main image for a single-pose presentation", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        presentation: {
          kind: "single",
          main: {
            localPath: " ",
            sourcePath: "images/flat/dead-bug-main.webp",
            checksum: "sha256:main-fixture",
          },
          fallbackRole: "main",
        },
      }),
    ).toEqual(["MISSING_MAIN_MEDIA"]);
  });

  it("requires a start image for a two-pose presentation", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        presentation: {
          ...validPresentation,
          start: {
            ...validPresentation.start,
            localPath: "",
          },
        },
      }),
    ).toEqual(["MISSING_START_MEDIA"]);
  });

  it("requires a peak image for a two-pose presentation", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        presentation: {
          ...validPresentation,
          peak: {
            ...validPresentation.peak,
            localPath: "",
          },
        },
      }),
    ).toEqual(["MISSING_PEAK_MEDIA"]);
  });

  it("requires the original source path for every media file", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        presentation: {
          ...validPresentation,
          start: {
            ...validPresentation.start,
            sourcePath: "",
          },
        },
      }),
    ).toEqual(["MISSING_MEDIA_SOURCE_PATH"]);
  });

  it("requires a checksum for every media file", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        presentation: {
          ...validPresentation,
          peak: {
            ...validPresentation.peak,
            checksum: "",
          },
        },
      }),
    ).toEqual(["MISSING_MEDIA_CHECKSUM"]);
  });

  it("blocks media with missing traceability metadata", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        sourceUrl: "",
        creator: "",
        licenseId: "",
        licenseUrl: "",
        acquiredAt: "",
      }),
    ).toEqual([
      "MISSING_MEDIA_SOURCE",
      "MISSING_MEDIA_CREATOR",
      "MISSING_LICENSE_ID",
      "MISSING_LICENSE_URL",
      "MISSING_ACQUISITION_DATE",
    ]);
  });

  it("blocks media without commercial-use permission", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        commercialUseAllowed: false,
      }),
    ).toEqual(["COMMERCIAL_USE_NOT_ALLOWED"]);
  });

  it("blocks a modification that the license does not allow", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        appliedModifications: ["generative_derivation"],
      }),
    ).toEqual(["UNLICENSED_MEDIA_MODIFICATION"]);
  });

  it("requires visible attribution details", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        attributionText: " ",
        attributionUrl: null,
      }),
    ).toEqual([
      "MISSING_ATTRIBUTION_TEXT",
      "MISSING_ATTRIBUTION_URL",
    ]);
  });

  it("blocks media that has not completed internal review", () => {
    expect(
      validateExerciseMedia({
        ...validMedia,
        approvalStatus: "pending",
        reviewedBy: null,
        reviewedAt: null,
      }),
    ).toEqual([
      "MEDIA_NOT_APPROVED",
      "MISSING_MEDIA_REVIEW",
    ]);
  });
});
