import type { ExercisePrescription } from "./prescribe-conservative-loads";
import { TIME_BUDGET_POLICY } from "./policy";
import type { WorkoutDurationMinutes } from "./types";

export type TimeBudgetFailureReason =
  "INSUFFICIENT_DURATION_COVERAGE";

export type FitToTimeBudgetInput = {
  prescriptions: readonly ExercisePrescription[];
  durationMinutes: WorkoutDurationMinutes;
};

export type TimeBudgetFitResult = {
  prescriptions: ExercisePrescription[];
  estimatedDurationSeconds: number;
  budgetSeconds: number;
  minimumDurationSeconds: number;
  fits: boolean;
  shortened: boolean;
  failureReason: TimeBudgetFailureReason | null;
};

function estimatePrescriptionSeconds(
  prescription: ExercisePrescription,
): number {
  const workSeconds =
    prescription.load *
    prescription.entry.exercise.estimatedSecondsPerUnit *
    prescription.sets;
  const interSetRestSeconds =
    prescription.restSeconds * Math.max(0, prescription.sets - 1);

  return (
    workSeconds +
    interSetRestSeconds +
    prescription.setupSeconds
  );
}

function estimateWorkoutSeconds(
  prescriptions: readonly ExercisePrescription[],
): number {
  const exerciseSeconds = prescriptions.reduce(
    (total, prescription) =>
      total + estimatePrescriptionSeconds(prescription),
    0,
  );
  const transitionCount = Math.max(0, prescriptions.length - 1);

  return (
    exerciseSeconds +
    transitionCount * TIME_BUDGET_POLICY.transitionSeconds
  );
}

export function fitToTimeBudget(
  input: FitToTimeBudgetInput,
): TimeBudgetFitResult {
  const budgetSeconds = input.durationMinutes * 60;
  const minimumDurationSeconds =
    budgetSeconds * TIME_BUDGET_POLICY.minimumFillRatio;
  const prescriptions = [...input.prescriptions];

  while (
    prescriptions.length > 0 &&
    estimateWorkoutSeconds(prescriptions) > budgetSeconds
  ) {
    prescriptions.pop();
  }

  const estimatedDurationSeconds =
    estimateWorkoutSeconds(prescriptions);
  const fits = estimatedDurationSeconds >= minimumDurationSeconds;

  return {
    prescriptions,
    estimatedDurationSeconds,
    budgetSeconds,
    minimumDurationSeconds,
    fits,
    shortened: prescriptions.length < input.prescriptions.length,
    failureReason: fits ? null : "INSUFFICIENT_DURATION_COVERAGE",
  };
}
