import type {
  RepDbDownloadedMediaFile,
  RepDbExerciseRecord,
  RepDbMediaManifest,
  RepDbMediaMapIssue,
  RepDbMediaMapResult,
} from "./types";
import type { ExerciseMedia, MediaFile } from "../types";

const REPDB_SOURCE_URL =
  "https://github.com/RepDB/exercise-dataset";
const REPDB_LICENSE_URL =
  "https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md";

export function mapRepDbMedia(
  record: RepDbExerciseRecord,
  manifest: RepDbMediaManifest,
  acquiredAt: string,
): RepDbMediaMapResult {
  const flatImages = record.images.flat;
  const hasMain = isNonBlank(flatImages.main);
  const hasStart = isNonBlank(flatImages.start);
  const hasPeak = isNonBlank(flatImages.peak);
  const isSingle = hasMain && !hasStart && !hasPeak;
  const isStartPeak = !hasMain && hasStart && hasPeak;

  if (!isSingle && !isStartPeak) {
    return { ok: false, issues: ["INVALID_IMAGE_SHAPE"] };
  }

  const sourcePaths = isSingle
    ? [flatImages.main as string]
    : [flatImages.start as string, flatImages.peak as string];

  if (sourcePaths.some(isPremiumPreviewPath)) {
    return { ok: false, issues: ["PREMIUM_MEDIA_NOT_ALLOWED"] };
  }

  const manifestIssues = validateManifest(sourcePaths, manifest);

  if (manifestIssues.length > 0) {
    return { ok: false, issues: manifestIssues };
  }

  const mediaFiles = sourcePaths.map((sourcePath) =>
    createMediaFile(sourcePath, manifest[sourcePath]),
  );
  const presentation: ExerciseMedia["presentation"] = isSingle
    ? {
        kind: "single",
        main: mediaFiles[0],
        fallbackRole: "main",
      }
    : {
        kind: "start_peak",
        start: mediaFiles[0],
        peak: mediaFiles[1],
        fallbackRole: "start",
      };

  return {
    ok: true,
    media: {
      id: `repdb-${record.id}`,
      exerciseId: record.id,
      type: "webp",
      presentation,
      sourceUrl: REPDB_SOURCE_URL,
      creator: "RepDB",
      licenseId: "RepDB Free Tier License v1.0",
      licenseUrl: REPDB_LICENSE_URL,
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
  };
}

function validateManifest(
  sourcePaths: readonly string[],
  manifest: RepDbMediaManifest,
): RepDbMediaMapIssue[] {
  if (sourcePaths.some((sourcePath) => !manifest[sourcePath])) {
    return ["MISSING_MEDIA_MANIFEST_ENTRY"];
  }

  const issues: RepDbMediaMapIssue[] = [];
  const downloadedFiles = sourcePaths.map(
    (sourcePath) => manifest[sourcePath],
  );

  if (downloadedFiles.some((file) => !isNonBlank(file.localPath))) {
    issues.push("MISSING_MEDIA_LOCAL_PATH");
  }

  if (downloadedFiles.some((file) => !isNonBlank(file.checksum))) {
    issues.push("MISSING_MEDIA_CHECKSUM");
  }

  return issues;
}

function createMediaFile(
  sourcePath: string,
  downloadedFile: RepDbDownloadedMediaFile,
): MediaFile {
  return {
    localPath: downloadedFile.localPath,
    sourcePath,
    checksum: downloadedFile.checksum,
  };
}

function isPremiumPreviewPath(sourcePath: string): boolean {
  return sourcePath.includes("premium-samples/");
}

function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}
