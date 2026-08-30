import type {
  CatalogSeed,
  CatalogValidationCode,
} from "./types";
import { validateCatalogEntry } from "./validate-catalog-entry";
import { validateExerciseRelations } from "./validate-exercise-relation";

export function validateCatalogRelease(
  seed: CatalogSeed,
): CatalogValidationCode[] {
  const issues = seed.entries.flatMap(validateCatalogEntry);
  const exercises = seed.entries.map((entry) => entry.exercise);

  if (hasDuplicates(exercises.map((exercise) => exercise.id))) {
    issues.push("DUPLICATE_EXERCISE_ID");
  }

  if (hasDuplicates(exercises.map((exercise) => exercise.slug))) {
    issues.push("DUPLICATE_EXERCISE_SLUG");
  }

  if (hasDuplicates(seed.entries.map((entry) => entry.media.id))) {
    issues.push("DUPLICATE_MEDIA_ID");
  }

  issues.push(...validateExerciseRelations(seed.relations, exercises));

  return [...new Set(issues)];
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}
