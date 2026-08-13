const { createHash } = require("node:crypto");
const path = require("node:path");

function validateAndSelectRecords(
  dataset,
  selectedIds,
  expectedSchemaVersion,
) {
  if (dataset?.schema_version !== expectedSchemaVersion) {
    throw new Error(
      `Unexpected RepDB schema version: ${String(dataset?.schema_version)}`,
    );
  }

  if (!Array.isArray(dataset.exercises)) {
    throw new Error("RepDB dataset does not contain an exercises array");
  }

  const recordsById = new Map(
    dataset.exercises.map((record) => [record?.id, record]),
  );
  const missingIds = selectedIds.filter((id) => !recordsById.has(id));

  if (missingIds.length > 0) {
    throw new Error(
      `Selected RepDB exercises are missing: ${missingIds.join(", ")}`,
    );
  }

  return selectedIds.map((id) => recordsById.get(id));
}

function extractFlatImagePaths(record) {
  const flat = record?.images?.flat;
  const hasMain = isNonBlank(flat?.main);
  const hasStart = isNonBlank(flat?.start);
  const hasPeak = isNonBlank(flat?.peak);
  const isSingle = hasMain && !hasStart && !hasPeak;
  const isStartPeak = !hasMain && hasStart && hasPeak;

  if (!isSingle && !isStartPeak) {
    throw new Error(`Invalid flat image shape for RepDB exercise: ${record?.id}`);
  }

  const sourcePaths = isSingle
    ? [flat.main]
    : [flat.start, flat.peak];

  for (const sourcePath of sourcePaths) {
    validateFlatImagePath(sourcePath, record.id);
  }

  return sourcePaths;
}

function validateFlatImagePath(sourcePath, exerciseId) {
  const normalizedPath = path.posix.normalize(sourcePath);
  const isSafeFlatWebp =
    sourcePath === normalizedPath &&
    sourcePath.startsWith("images/flat/") &&
    sourcePath.endsWith(".webp") &&
    !sourcePath.includes("premium-samples/") &&
    !sourcePath.includes("..") &&
    path.posix.basename(sourcePath) === sourcePath.slice("images/flat/".length);

  if (!isSafeFlatWebp) {
    throw new Error(
      `Unsafe or unsupported RepDB image path for ${exerciseId}: ${sourcePath}`,
    );
  }
}

function checksumBuffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function isWebpBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function buildManifest(entries) {
  const manifest = {};

  for (const entry of [...entries].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath),
  )) {
    if (manifest[entry.sourcePath]) {
      throw new Error(`Duplicate manifest source path: ${entry.sourcePath}`);
    }

    manifest[entry.sourcePath] = {
      localPath: entry.localPath,
      checksum: entry.checksum,
    };
  }

  return manifest;
}

function createAssetRegistrySource(manifest) {
  const localPaths = Object.values(manifest)
    .map((entry) => entry.localPath)
    .sort();

  for (const localPath of localPaths) {
    if (!/^assets\/exercises\/repdb\/[a-z0-9][a-z0-9-]*\.webp$/.test(localPath)) {
      throw new Error(`Unsafe RepDB local asset path: ${localPath}`);
    }
  }

  if (new Set(localPaths).size !== localPaths.length) {
    throw new Error("RepDB manifest contains duplicate local asset paths");
  }

  const entries = localPaths.map(
    (localPath) =>
      `  "${localPath}": require("../../../../${localPath}"),`,
  );

  return [
    "// Generated from media-manifest.json. Do not edit manually.",
    'import type { ImageSourcePropType } from "react-native";',
    "",
    "export const REPDB_ASSETS = {",
    ...entries,
    "} as const satisfies Readonly<Record<string, ImageSourcePropType>>;",
    "",
    "export type RepDbAssetPath = keyof typeof REPDB_ASSETS;",
    "",
  ].join("\n");
}

function createSelectedRecordsSnapshot(records) {
  return records.map((record) => {
    const sourcePaths = extractFlatImagePaths(record);

    return {
      id: record.id,
      images: {
        flat:
          sourcePaths.length === 1
            ? { main: sourcePaths[0] }
            : { start: sourcePaths[0], peak: sourcePaths[1] },
      },
    };
  });
}

function isNonBlank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

module.exports = {
  buildManifest,
  checksumBuffer,
  createAssetRegistrySource,
  createSelectedRecordsSnapshot,
  extractFlatImagePaths,
  isWebpBuffer,
  validateAndSelectRecords,
};
