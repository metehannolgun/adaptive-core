const {
  buildManifest,
  checksumBuffer,
  createAssetRegistrySource,
  createSelectedRecordsSnapshot,
  extractFlatImagePaths,
  isWebpBuffer,
  validateAndSelectRecords,
} = require("./repdb-import-core");

const singleImageRecord = {
  id: "plank",
  images: {
    flat: {
      main: "images/flat/plank.webp",
    },
  },
};

describe("RepDB import core", () => {
  it("selects records in the requested order", () => {
    const dataset = {
      schema_version: 3,
      exercises: [
        { ...singleImageRecord, id: "dead-bug" },
        singleImageRecord,
      ],
    };

    expect(
      validateAndSelectRecords(dataset, ["plank", "dead-bug"], 3).map(
        (record) => record.id,
      ),
    ).toEqual(["plank", "dead-bug"]);
  });

  it("rejects an unexpected dataset schema", () => {
    expect(() =>
      validateAndSelectRecords(
        { schema_version: 4, exercises: [singleImageRecord] },
        ["plank"],
        3,
      ),
    ).toThrow("Unexpected RepDB schema version: 4");
  });

  it("rejects missing selected exercise IDs", () => {
    expect(() =>
      validateAndSelectRecords(
        { schema_version: 3, exercises: [singleImageRecord] },
        ["plank", "dead-bug"],
        3,
      ),
    ).toThrow("Selected RepDB exercises are missing: dead-bug");
  });

  it("accepts a single flat image", () => {
    expect(extractFlatImagePaths(singleImageRecord)).toEqual([
      "images/flat/plank.webp",
    ]);
  });

  it("accepts a start and peak image pair", () => {
    expect(
      extractFlatImagePaths({
        id: "dead-bug",
        images: {
          flat: {
            start: "images/flat/dead-bug-start.webp",
            peak: "images/flat/dead-bug-peak.webp",
          },
        },
      }),
    ).toEqual([
      "images/flat/dead-bug-start.webp",
      "images/flat/dead-bug-peak.webp",
    ]);
  });

  it.each([
    [
      "mixed image roles",
      {
        main: "images/flat/plank.webp",
        start: "images/flat/plank-start.webp",
        peak: "images/flat/plank-peak.webp",
      },
    ],
    ["an incomplete pair", { start: "images/flat/plank-start.webp" }],
    ["premium samples", { main: "premium-samples/plank.webp" }],
    ["a path outside flat images", { main: "images/animated/plank.webp" }],
    ["path traversal", { main: "images/flat/../secret.webp" }],
    ["a non-WebP file", { main: "images/flat/plank.png" }],
  ])("rejects %s", (_description, flat) => {
    expect(() =>
      extractFlatImagePaths({ id: "plank", images: { flat } }),
    ).toThrow();
  });

  it("builds a deterministic manifest with SHA-256 checksums", () => {
    const sourcePath = "images/flat/plank.webp";
    const checksum = checksumBuffer(Buffer.from("fixture"));

    expect(
      buildManifest([
        {
          sourcePath,
          localPath: "assets/exercises/repdb/plank.webp",
          checksum,
        },
      ]),
    ).toEqual({
      [sourcePath]: {
        localPath: "assets/exercises/repdb/plank.webp",
        checksum:
          "sha256:f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d",
      },
    });
  });

  it("recognizes WebP file signatures", () => {
    const webpHeader = Buffer.from("RIFF0000WEBP", "ascii");

    expect(isWebpBuffer(webpHeader)).toBe(true);
    expect(isWebpBuffer(Buffer.from("not-an-image"))).toBe(false);
  });

  it("generates a deterministic React Native asset registry", () => {
    const source = createAssetRegistrySource({
      "images/flat/plank.webp": {
        localPath: "assets/exercises/repdb/plank.webp",
        checksum: "sha256:plank",
      },
      "images/flat/dead-bug.webp": {
        localPath: "assets/exercises/repdb/dead-bug.webp",
        checksum: "sha256:dead-bug",
      },
    });

    expect(source).toContain(
      '"assets/exercises/repdb/dead-bug.webp": require("../../../../assets/exercises/repdb/dead-bug.webp")',
    );
    expect(source).toContain(
      '"assets/exercises/repdb/plank.webp": require("../../../../assets/exercises/repdb/plank.webp")',
    );
    expect(source.indexOf("dead-bug.webp")).toBeLessThan(
      source.indexOf("plank.webp"),
    );
  });

  it.each([
    "assets/exercises/repdb/plank.png",
    "assets/exercises/other/plank.webp",
    "../assets/exercises/repdb/plank.webp",
  ])("rejects an unsafe registry path: %s", (localPath) => {
    expect(() =>
      createAssetRegistrySource({
        "images/flat/plank.webp": {
          localPath,
          checksum: "sha256:plank",
        },
      }),
    ).toThrow(`Unsafe RepDB local asset path: ${localPath}`);
  });

  it("creates a minimal selected-record snapshot without unrelated fields", () => {
    expect(
      createSelectedRecordsSnapshot([
        {
          id: "plank",
          name: "Plank",
          images: {
            flat: { main: "images/flat/plank.webp" },
            animated: { main: "images/animated/plank.gif" },
          },
        },
      ]),
    ).toEqual([
      {
        id: "plank",
        images: {
          flat: { main: "images/flat/plank.webp" },
        },
      },
    ]);
  });
});
