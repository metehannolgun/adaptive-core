import { resolveRepDbAsset } from "./resolve-repdb-asset";
import { REPDB_MEDIA_CATALOG } from "./repdb-media-catalog";

describe("REPDB_MEDIA_CATALOG", () => {
  it("contains all selected exercises with unique media IDs", () => {
    expect(REPDB_MEDIA_CATALOG).toHaveLength(18);
    expect(new Set(REPDB_MEDIA_CATALOG.map((media) => media.id)).size)
      .toBe(18);
  });

  it("resolves every media file to a bundled React Native asset", () => {
    const localPaths = REPDB_MEDIA_CATALOG.flatMap((media) =>
      media.presentation.kind === "single"
        ? [media.presentation.main.localPath]
        : [
            media.presentation.start.localPath,
            media.presentation.peak.localPath,
          ],
    );

    expect(localPaths).toHaveLength(32);
    expect(localPaths.every((localPath) => resolveRepDbAsset(localPath)))
      .toBe(true);
  });
});
