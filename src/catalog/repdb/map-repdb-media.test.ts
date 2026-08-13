import { mapRepDbMedia } from "./map-repdb-media";
import type {
  RepDbExerciseRecord,
  RepDbMediaManifest,
} from "./types";

const acquiredAt = "2026-08-13";

const startPeakRecord: RepDbExerciseRecord = {
  id: "dead-bug",
  images: {
    flat: {
      start: "images/flat/dead-bug-start.webp",
      peak: "images/flat/dead-bug-peak.webp",
    },
  },
};

const startPeakManifest: RepDbMediaManifest = {
  "images/flat/dead-bug-start.webp": {
    localPath: "assets/exercises/dead-bug-start.webp",
    checksum: "sha256:start",
  },
  "images/flat/dead-bug-peak.webp": {
    localPath: "assets/exercises/dead-bug-peak.webp",
    checksum: "sha256:peak",
  },
};

describe("mapRepDbMedia", () => {
  it("maps a start and peak record to pending licensed media", () => {
    expect(
      mapRepDbMedia(startPeakRecord, startPeakManifest, acquiredAt),
    ).toEqual({
      ok: true,
      media: {
        id: "repdb-dead-bug",
        exerciseId: "dead-bug",
        type: "webp",
        presentation: {
          kind: "start_peak",
          start: {
            localPath: "assets/exercises/dead-bug-start.webp",
            sourcePath: "images/flat/dead-bug-start.webp",
            checksum: "sha256:start",
          },
          peak: {
            localPath: "assets/exercises/dead-bug-peak.webp",
            sourcePath: "images/flat/dead-bug-peak.webp",
            checksum: "sha256:peak",
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
        acquiredAt,
        approvalStatus: "pending",
        reviewedBy: null,
        reviewedAt: null,
      },
    });
  });

  it("maps a main image record to a single presentation", () => {
    const record: RepDbExerciseRecord = {
      id: "plank",
      images: {
        flat: {
          main: "images/flat/plank-main.webp",
        },
      },
    };

    expect(
      mapRepDbMedia(
        record,
        {
          "images/flat/plank-main.webp": {
            localPath: "assets/exercises/plank-main.webp",
            checksum: "sha256:main",
          },
        },
        acquiredAt,
      ),
    ).toMatchObject({
      ok: true,
      media: {
        presentation: {
          kind: "single",
          main: {
            sourcePath: "images/flat/plank-main.webp",
          },
          fallbackRole: "main",
        },
      },
    });
  });

  it("rejects a mixed image shape", () => {
    expect(
      mapRepDbMedia(
        {
          ...startPeakRecord,
          images: {
            flat: {
              main: "images/flat/dead-bug-main.webp",
              start: "images/flat/dead-bug-start.webp",
              peak: "images/flat/dead-bug-peak.webp",
            },
          },
        },
        startPeakManifest,
        acquiredAt,
      ),
    ).toEqual({ ok: false, issues: ["INVALID_IMAGE_SHAPE"] });
  });

  it("rejects premium preview media", () => {
    expect(
      mapRepDbMedia(
        {
          id: "preview",
          images: {
            flat: {
              main: "premium-samples/preview.webp",
            },
          },
        },
        {
          "premium-samples/preview.webp": {
            localPath: "assets/exercises/preview.webp",
            checksum: "sha256:preview",
          },
        },
        acquiredAt,
      ),
    ).toEqual({
      ok: false,
      issues: ["PREMIUM_MEDIA_NOT_ALLOWED"],
    });
  });

  it("rejects a missing manifest entry", () => {
    expect(
      mapRepDbMedia(startPeakRecord, {}, acquiredAt),
    ).toEqual({
      ok: false,
      issues: ["MISSING_MEDIA_MANIFEST_ENTRY"],
    });
  });

  it("rejects blank local paths and checksums", () => {
    expect(
      mapRepDbMedia(
        startPeakRecord,
        {
          ...startPeakManifest,
          "images/flat/dead-bug-start.webp": {
            localPath: " ",
            checksum: "",
          },
        },
        acquiredAt,
      ),
    ).toEqual({
      ok: false,
      issues: [
        "MISSING_MEDIA_LOCAL_PATH",
        "MISSING_MEDIA_CHECKSUM",
      ],
    });
  });
});
