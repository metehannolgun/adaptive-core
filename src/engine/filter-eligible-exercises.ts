import type {
  CatalogEntry,
  ExerciseLevel,
  MovementPattern,
} from "../catalog/types";
import { validateCatalogEntry } from "../catalog/validate-catalog-entry";
import type { RecoveryDirective } from "./types";

export type EligibilityConstraints = {
  maxLevel: ExerciseLevel;
  excludedExerciseIds: readonly string[];
  recoveryByPattern: Readonly<
    Partial<Record<MovementPattern, RecoveryDirective>>
  >;
  reviewedRegressionExerciseIds: readonly string[];
};

function isRecoveryEligible(
  entry: CatalogEntry,
  constraints: EligibilityConstraints,
  reviewedRegressionExerciseIds: ReadonlySet<string>,
): boolean {
  const recoveryDirective =
    constraints.recoveryByPattern[entry.exercise.primaryPattern] ??
    "standard";

  if (recoveryDirective === "standard") {
    return true;
  }

  // Reviewed regressions are explicit exceptions: the filter must not guess
  // that every higher-fatigue exercise is safe during recovery.
  return (
    entry.exercise.fatigueScore === 1 ||
    reviewedRegressionExerciseIds.has(entry.exercise.id)
  );
}

export function filterEligibleExercises(
  entries: readonly CatalogEntry[],
  constraints: EligibilityConstraints,
): CatalogEntry[] {
  const excludedExerciseIds = new Set(
    constraints.excludedExerciseIds,
  );
  const reviewedRegressionExerciseIds = new Set(
    constraints.reviewedRegressionExerciseIds,
  );

  return entries.filter(
    (entry) =>
      validateCatalogEntry(entry).length === 0 &&
      entry.exercise.equipment.length === 1 &&
      entry.exercise.equipment[0] === "bodyweight" &&
      !excludedExerciseIds.has(entry.exercise.id) &&
      entry.exercise.level <= constraints.maxLevel &&
      isRecoveryEligible(
        entry,
        constraints,
        reviewedRegressionExerciseIds,
      ),
  );
}
