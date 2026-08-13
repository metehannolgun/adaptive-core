import type {
  CatalogValidationCode,
  ExerciseMedia,
  MediaFile,
} from "./types";

export function validateExerciseMedia(
  media: ExerciseMedia,
): CatalogValidationCode[] {
  const issues: CatalogValidationCode[] = [];
  const mediaFiles: MediaFile[] = [];

  if (media.presentation.kind === "single") {
    mediaFiles.push(media.presentation.main);

    if (isBlank(media.presentation.main.localPath)) {
      issues.push("MISSING_MAIN_MEDIA");
    }
  } else {
    mediaFiles.push(media.presentation.start, media.presentation.peak);

    if (isBlank(media.presentation.start.localPath)) {
      issues.push("MISSING_START_MEDIA");
    }

    if (isBlank(media.presentation.peak.localPath)) {
      issues.push("MISSING_PEAK_MEDIA");
    }
  }

  if (mediaFiles.some((file) => isBlank(file.sourcePath))) {
    issues.push("MISSING_MEDIA_SOURCE_PATH");
  }

  if (isBlank(media.sourceUrl)) {
    issues.push("MISSING_MEDIA_SOURCE");
  }

  if (isBlank(media.creator)) {
    issues.push("MISSING_MEDIA_CREATOR");
  }

  if (isBlank(media.licenseId)) {
    issues.push("MISSING_LICENSE_ID");
  }

  if (isBlank(media.licenseUrl)) {
    issues.push("MISSING_LICENSE_URL");
  }

  if (!media.commercialUseAllowed) {
    issues.push("COMMERCIAL_USE_NOT_ALLOWED");
  }

  const hasUnlicensedModification = media.appliedModifications.some(
    (modification) =>
      !media.allowedModifications.includes(modification),
  );

  if (hasUnlicensedModification) {
    issues.push("UNLICENSED_MEDIA_MODIFICATION");
  }

  if (media.attributionRequired) {
    if (isBlank(media.attributionText)) {
      issues.push("MISSING_ATTRIBUTION_TEXT");
    }

    if (isBlank(media.attributionUrl)) {
      issues.push("MISSING_ATTRIBUTION_URL");
    }
  }

  if (isBlank(media.acquiredAt)) {
    issues.push("MISSING_ACQUISITION_DATE");
  }

  if (mediaFiles.some((file) => isBlank(file.checksum))) {
    issues.push("MISSING_MEDIA_CHECKSUM");
  }

  if (media.approvalStatus !== "approved") {
    issues.push("MEDIA_NOT_APPROVED");
  }

  if (isBlank(media.reviewedBy) || isBlank(media.reviewedAt)) {
    issues.push("MISSING_MEDIA_REVIEW");
  }

  return issues;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}
