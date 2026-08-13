import { buildRepDbMediaCatalog } from "./build-repdb-media-catalog";
import type {
  RepDbExerciseRecord,
  RepDbMediaManifest,
} from "./types";

const records: RepDbExerciseRecord[] = [
  {
    id: "plank",
    images: {
      flat: { main: "images/flat/plank-main.webp" },
    },
  },
  {
    id: "dead-bug",
    images: {
      flat: {
        start: "images/flat/dead-bug-start.webp",
        peak: "images/flat/dead-bug-peak.webp",
      },
    },
  },
];

const manifest: RepDbMediaManifest = {
  "images/flat/plank-main.webp": {
    localPath: "assets/exercises/repdb/plank-main.webp",
    checksum: "sha256:plank",
  },
  "images/flat/dead-bug-start.webp": {
    localPath: "assets/exercises/repdb/dead-bug-start.webp",
    checksum: "sha256:start",
  },
  "images/flat/dead-bug-peak.webp": {
    localPath: "assets/exercises/repdb/dead-bug-peak.webp",
    checksum: "sha256:peak",
  },
};

describe("buildRepDbMediaCatalog", () => {
  it("maps every selected record into pending media", () => {
    const result = buildRepDbMediaCatalog(
      records,
      manifest,
      "2026-08-13",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a valid RepDB media catalog");
    }

    expect(result.media).toHaveLength(2);
    expect(result.media.map((media) => media.exerciseId)).toEqual([
      "plank",
      "dead-bug",
    ]);
    expect(result.media.every((media) => media.approvalStatus === "pending"))
      .toBe(true);
  });

  it("rejects the whole catalog when one record cannot be mapped", () => {
    expect(
      buildRepDbMediaCatalog(records, {
        "images/flat/plank-main.webp": manifest[
          "images/flat/plank-main.webp"
        ],
      }, "2026-08-13"),
    ).toEqual({
      ok: false,
      failures: [
        {
          exerciseId: "dead-bug",
          issues: ["MISSING_MEDIA_MANIFEST_ENTRY"],
        },
      ],
    });
  });
});
