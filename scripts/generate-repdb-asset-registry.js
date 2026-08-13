const fs = require("node:fs/promises");
const path = require("node:path");

const {
  createAssetRegistrySource,
} = require("./repdb-import-core");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(
  PROJECT_ROOT,
  "src",
  "catalog",
  "repdb",
  "generated",
  "media-manifest.json",
);
const REGISTRY_PATH = path.join(
  PROJECT_ROOT,
  "src",
  "catalog",
  "repdb",
  "generated",
  "repdb-assets.ts",
);

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));

  for (const entry of Object.values(manifest)) {
    await fs.access(path.join(PROJECT_ROOT, entry.localPath));
  }

  await fs.writeFile(
    REGISTRY_PATH,
    createAssetRegistrySource(manifest),
  );
  console.log(
    `Generated ${Object.keys(manifest).length} static RepDB asset references.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
