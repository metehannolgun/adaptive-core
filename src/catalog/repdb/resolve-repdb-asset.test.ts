import { REPDB_ASSETS } from "./generated/repdb-assets";
import { resolveRepDbAsset } from "./resolve-repdb-asset";

describe("resolveRepDbAsset", () => {
  it("returns the bundled source for a registered local path", () => {
    const localPath = "assets/exercises/repdb/plank-main.webp";

    expect(resolveRepDbAsset(localPath)).toBe(REPDB_ASSETS[localPath]);
  });

  it("returns null for an unknown local path", () => {
    expect(
      resolveRepDbAsset("assets/exercises/repdb/not-registered.webp"),
    ).toBeNull();
  });
});
