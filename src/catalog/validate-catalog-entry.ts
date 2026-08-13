import type {
  CatalogEntry,
  CatalogValidationCode,
} from "./types";
import { validateExerciseContent } from "./validate-exercise-content";
import { validateExerciseLocales } from "./validate-exercise-locales";
import { validateExerciseMedia } from "./validate-exercise-media";
import { validateExercise } from "./validate-exercise";

export function validateCatalogEntry(
  entry: CatalogEntry,
): CatalogValidationCode[] {
  const issues: CatalogValidationCode[] = [
    ...validateExercise(entry.exercise),
    ...validateExerciseLocales(entry.contents),
    ...entry.contents.flatMap(validateExerciseContent),
    ...validateExerciseMedia(entry.media),
  ];

  if (entry.exercise.status !== "active") {
    issues.push("EXERCISE_NOT_ACTIVE");
  }

  if (entry.contents.some((content) => content.status !== "active")) {
    issues.push("CONTENT_NOT_ACTIVE");
  }

  const hasMissingContentReview = entry.contents.some(
    (content) =>
      isBlank(content.reviewedBy) || isBlank(content.reviewedAt),
  );

  if (hasMissingContentReview) {
    issues.push("MISSING_CONTENT_REVIEW");
  }

  if (
    entry.contents.some(
      (content) => content.exerciseId !== entry.exercise.id,
    )
  ) {
    issues.push("CONTENT_EXERCISE_MISMATCH");
  }

  if (entry.media.exerciseId !== entry.exercise.id) {
    issues.push("MEDIA_EXERCISE_MISMATCH");
  }

  if (entry.exercise.mediaId !== entry.media.id) {
    issues.push("MEDIA_REFERENCE_MISMATCH");
  }

  return [...new Set(issues)];
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}
