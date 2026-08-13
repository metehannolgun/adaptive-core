import type {
  CatalogValidationCode,
  Exercise,
} from "./types";

export function validateExercise(
  exercise: Exercise,
): CatalogValidationCode[] {
  const issues: CatalogValidationCode[] = [];

  if (isBlank(exercise.id)) {
    issues.push("MISSING_EXERCISE_ID");
  }

  if (isBlank(exercise.slug)) {
    issues.push("MISSING_EXERCISE_SLUG");
  }

  if (isBlank(exercise.mediaId)) {
    issues.push("MISSING_EXERCISE_MEDIA");
  }

  const hasInvalidLoadRange =
    !Number.isFinite(exercise.minLoad) ||
    !Number.isFinite(exercise.defaultLoad) ||
    !Number.isFinite(exercise.maxLoad) ||
    exercise.minLoad <= 0 ||
    exercise.minLoad > exercise.defaultLoad ||
    exercise.defaultLoad > exercise.maxLoad;

  if (hasInvalidLoadRange) {
    issues.push("INVALID_LOAD_RANGE");
  }

  if (!isPositiveInteger(exercise.loadStep)) {
    issues.push("INVALID_LOAD_STEP");
  }

  if (!isPositiveInteger(exercise.defaultSets)) {
    issues.push("INVALID_DEFAULT_SETS");
  }

  const hasInvalidRestRange =
    !isNonNegativeInteger(exercise.minRestSeconds) ||
    !isNonNegativeInteger(exercise.maxRestSeconds) ||
    exercise.minRestSeconds > exercise.maxRestSeconds;

  if (hasInvalidRestRange) {
    issues.push("INVALID_REST_RANGE");
  }

  if (!isNonNegativeInteger(exercise.setupSeconds)) {
    issues.push("INVALID_SETUP_SECONDS");
  }

  if (!isPositiveInteger(exercise.metadataVersion)) {
    issues.push("INVALID_METADATA_VERSION");
  }

  if (
    exercise.status === "active" &&
    (isBlank(exercise.reviewedBy) || isBlank(exercise.reviewedAt))
  ) {
    issues.push("MISSING_EXERCISE_REVIEW");
  }

  return issues;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
