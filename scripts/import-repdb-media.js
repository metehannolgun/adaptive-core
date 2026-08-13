const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  buildManifest,
  checksumBuffer,
  createAssetRegistrySource,
  createSelectedRecordsSnapshot,
  extractFlatImagePaths,
  isWebpBuffer,
  validateAndSelectRecords,
} = require("./repdb-import-core");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const REPDB_REPOSITORY = "RepDB/exercise-dataset";
const REPDB_COMMIT = "045845b61e4aefd9e684fa84518b84c665ea3cd3";
const EXPECTED_SCHEMA_VERSION = 3;
const RAW_ROOT = `https://raw.githubusercontent.com/${REPDB_REPOSITORY}/${REPDB_COMMIT}`;
const DATASET_URL = `${RAW_ROOT}/exercises.json`;
const OUTPUT_DIRECTORY = path.join(
  PROJECT_ROOT,
  "assets",
  "exercises",
  "repdb",
);
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
const SELECTED_RECORDS_PATH = path.join(
  PROJECT_ROOT,
  "src",
  "catalog",
  "repdb",
  "generated",
  "selected-records.json",
);

const SELECTED_EXERCISE_IDS = [
  "dead-bug",
  "plank",
  "high-plank",
  "side-plank",
  "bird-dog-hold",
  "crunches",
  "sit-ups",
  "bicycle-crunch",
  "russian-twist",
  "mountain-climbers",
  "flutter-kicks",
  "lying-leg-raise",
  "glute-bridge",
  "glute-kickback",
  "clamshells",
  "side-lying-hip-abduction",
  "bodyweight-good-morning",
  "superman",
];

async function main() {
  const force = process.argv.includes("--force");
  validateArguments(process.argv.slice(2));
  await refuseExistingOutputUnlessForced(force);

  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "adaptive-core-repdb-"),
  );
  const temporaryAssets = path.join(temporaryRoot, "assets");

  try {
    const dataset = await downloadJson(DATASET_URL);
    const records = validateAndSelectRecords(
      dataset,
      SELECTED_EXERCISE_IDS,
      EXPECTED_SCHEMA_VERSION,
    );
    const sourcePaths = [
      ...new Set(records.flatMap(extractFlatImagePaths)),
    ].sort();

    await fs.mkdir(temporaryAssets, { recursive: true });
    const manifestEntries = [];
    const localNames = new Map();

    for (const sourcePath of sourcePaths) {
      const fileName = path.posix.basename(sourcePath);
      const previousSourcePath = localNames.get(fileName);

      if (previousSourcePath && previousSourcePath !== sourcePath) {
        throw new Error(
          `Two RepDB paths share the same local filename: ${previousSourcePath}, ${sourcePath}`,
        );
      }

      localNames.set(fileName, sourcePath);
      const fileBuffer = await downloadBuffer(`${RAW_ROOT}/${sourcePath}`);

      if (!isWebpBuffer(fileBuffer)) {
        throw new Error(`Downloaded file is not WebP: ${sourcePath}`);
      }

      await fs.writeFile(path.join(temporaryAssets, fileName), fileBuffer);
      manifestEntries.push({
        sourcePath,
        localPath: `assets/exercises/repdb/${fileName}`,
        checksum: checksumBuffer(fileBuffer),
      });
    }

    const manifest = buildManifest(manifestEntries);
    const registrySource = createAssetRegistrySource(manifest);
    const selectedRecordsSnapshot = {
      source: {
        repository: REPDB_REPOSITORY,
        commit: REPDB_COMMIT,
        acquiredAt: new Date().toISOString().slice(0, 10),
      },
      records: createSelectedRecordsSnapshot(records),
    };
    await publishOutput(
      temporaryAssets,
      manifest,
      registrySource,
      selectedRecordsSnapshot,
      force,
    );

    console.log(
      `Imported ${records.length} exercises and ${sourcePaths.length} WebP files from RepDB commit ${REPDB_COMMIT}.`,
    );
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

function validateArguments(arguments_) {
  const unsupportedArguments = arguments_.filter(
    (argument) => argument !== "--force",
  );

  if (unsupportedArguments.length > 0) {
    throw new Error(`Unsupported arguments: ${unsupportedArguments.join(", ")}`);
  }
}

async function refuseExistingOutputUnlessForced(force) {
  if (force) {
    return;
  }

  const existingPaths = [];

  if (await pathExists(OUTPUT_DIRECTORY)) {
    existingPaths.push(path.relative(PROJECT_ROOT, OUTPUT_DIRECTORY));
  }

  if (await pathExists(MANIFEST_PATH)) {
    existingPaths.push(path.relative(PROJECT_ROOT, MANIFEST_PATH));
  }

  if (await pathExists(REGISTRY_PATH)) {
    existingPaths.push(path.relative(PROJECT_ROOT, REGISTRY_PATH));
  }

  if (await pathExists(SELECTED_RECORDS_PATH)) {
    existingPaths.push(path.relative(PROJECT_ROOT, SELECTED_RECORDS_PATH));
  }

  if (existingPaths.length > 0) {
    throw new Error(
      `Import output already exists: ${existingPaths.join(", ")}. Re-run with --force to replace it.`,
    );
  }
}

async function publishOutput(
  temporaryAssets,
  manifest,
  registrySource,
  selectedRecordsSnapshot,
  force,
) {
  if (force) {
    await fs.rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
    await fs.rm(MANIFEST_PATH, { force: true });
    await fs.rm(REGISTRY_PATH, { force: true });
    await fs.rm(SELECTED_RECORDS_PATH, { force: true });
  }

  await fs.mkdir(path.dirname(OUTPUT_DIRECTORY), { recursive: true });
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.cp(temporaryAssets, OUTPUT_DIRECTORY, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  await fs.writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  await fs.writeFile(REGISTRY_PATH, registrySource, { flag: "wx" });
  await fs.writeFile(
    SELECTED_RECORDS_PATH,
    `${JSON.stringify(selectedRecordsSnapshot, null, 2)}\n`,
    { flag: "wx" },
  );
}

async function downloadJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  return response.json();
}

async function downloadBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
