import type { ExercisePrescription } from "./prescribe-conservative-loads";

export function orderExercises(
  prescriptions: readonly ExercisePrescription[],
): ExercisePrescription[] {
  const remaining = prescriptions
    .map((prescription, originalIndex) => ({
      prescription,
      originalIndex,
    }))
    .sort((left, right) => {
      const coordinationDifference =
        right.prescription.entry.exercise.coordinationDemand -
        left.prescription.entry.exercise.coordinationDemand;

      return coordinationDifference || left.originalIndex - right.originalIndex;
    });
  const ordered: ExercisePrescription[] = [];

  while (remaining.length > 0) {
    const previousPattern = ordered.at(-1)?.pattern;
    const differentPatternIndex = remaining.findIndex(
      ({ prescription }) => prescription.pattern !== previousPattern,
    );
    const nextIndex = differentPatternIndex === -1 ? 0 : differentPatternIndex;
    const [next] = remaining.splice(nextIndex, 1);

    ordered.push(next.prescription);
  }

  return ordered;
}
