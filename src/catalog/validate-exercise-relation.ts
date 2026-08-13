import type {
  CatalogValidationCode,
  Exercise,
  ExerciseRelation,
} from "./types";

export function validateExerciseRelation(
  relation: ExerciseRelation,
): CatalogValidationCode[] {
  const issues: CatalogValidationCode[] = [];

  if (isBlank(relation.fromExerciseId)) {
    issues.push("MISSING_RELATION_SOURCE");
  }

  if (isBlank(relation.toExerciseId)) {
    issues.push("MISSING_RELATION_TARGET");
  }

  if (isBlank(relation.reason)) {
    issues.push("MISSING_RELATION_REASON");
  }

  if (
    !isBlank(relation.fromExerciseId) &&
    !isBlank(relation.toExerciseId) &&
    relation.fromExerciseId === relation.toExerciseId
  ) {
    issues.push("SELF_REFERENCING_RELATION");
  }

  if (
    relation.status === "active" &&
    (isBlank(relation.reviewedBy) || isBlank(relation.reviewedAt))
  ) {
    issues.push("MISSING_RELATION_REVIEW");
  }

  return issues;
}

export function validateExerciseRelations(
  relations: readonly ExerciseRelation[],
  exercises: readonly Exercise[],
): CatalogValidationCode[] {
  const issues = relations.flatMap(validateExerciseRelation);
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const relationKeys = new Set<string>();

  for (const relation of relations) {
    const fromExercise = exerciseById.get(relation.fromExerciseId);
    const toExercise = exerciseById.get(relation.toExerciseId);

    if (
      (!isBlank(relation.fromExerciseId) && !fromExercise) ||
      (!isBlank(relation.toExerciseId) && !toExercise)
    ) {
      issues.push("RELATION_EXERCISE_NOT_FOUND");
    }

    const relationKey = [
      relation.fromExerciseId,
      relation.toExerciseId,
      relation.type,
    ].join(":");

    if (relationKeys.has(relationKey)) {
      issues.push("DUPLICATE_RELATION");
    } else {
      relationKeys.add(relationKey);
    }

    if (
      relation.type === "substitute" &&
      fromExercise &&
      toExercise
    ) {
      if (fromExercise.primaryPattern !== toExercise.primaryPattern) {
        issues.push("SUBSTITUTE_PATTERN_MISMATCH");
      }

      const increasesDemand =
        toExercise.strengthDemand > fromExercise.strengthDemand ||
        toExercise.coordinationDemand >
          fromExercise.coordinationDemand ||
        toExercise.fatigueScore > fromExercise.fatigueScore;

      if (increasesDemand) {
        issues.push("SUBSTITUTE_DEMAND_INCREASE");
      }
    }
  }

  const progressionRelations = relations.filter(
    (relation) => relation.type === "progression",
  );

  const hasUnapprovedCycle = progressionRelations.some((relation) => {
    const reverseRelation = progressionRelations.find(
      (candidate) =>
        candidate.fromExerciseId === relation.toExerciseId &&
        candidate.toExerciseId === relation.fromExerciseId,
    );

    return (
      reverseRelation !== undefined &&
      (!relation.cycleApproved || !reverseRelation.cycleApproved)
    );
  });

  if (hasUnapprovedCycle) {
    issues.push("UNAPPROVED_PROGRESSION_CYCLE");
  }

  return [...new Set(issues)];
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}
