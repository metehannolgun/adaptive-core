import {
  filterEligibleExercises,
  type EligibilityConstraints,
} from "./filter-eligible-exercises";
import {
  estimateWorkoutDurationSeconds,
  type TimeBudgetFitResult,
} from "./fit-to-time-budget";
import { TIME_BUDGET_POLICY } from "./policy";

export type WorkoutSafetyViolation =
  | {
      code:
        | "INELIGIBLE_EXERCISE"
        | "LOAD_OUT_OF_BOUNDS"
        | "LOAD_STEP_MISMATCH";
      exerciseId: string;
    }
  | {
      code: "TIME_BUDGET_VIOLATION";
      exerciseId: null;
    };

export type ValidateWorkoutSafetyInput = {
  fitResult: TimeBudgetFitResult;
  eligibilityConstraints: EligibilityConstraints;
};

export function validateWorkoutSafety(
  input: ValidateWorkoutSafetyInput,
): WorkoutSafetyViolation[] {
  const violations: WorkoutSafetyViolation[] = [];
  const eligibleEntries = new Set(
    filterEligibleExercises(
      input.fitResult.prescriptions.map(
        (prescription) => prescription.entry,
      ),
      input.eligibilityConstraints,
    ),
  );

  for (const prescription of input.fitResult.prescriptions) {
    const { exercise } = prescription.entry;

    if (!eligibleEntries.has(prescription.entry)) {
      violations.push({
        code: "INELIGIBLE_EXERCISE",
        exerciseId: exercise.id,
      });
    }

    const loadIsInBounds =
      Number.isFinite(prescription.load) &&
      prescription.load >= exercise.minLoad &&
      prescription.load <= exercise.maxLoad;

    if (!loadIsInBounds) {
      violations.push({
        code: "LOAD_OUT_OF_BOUNDS",
        exerciseId: exercise.id,
      });
      continue;
    }

    const completedLoadSteps =
      (prescription.load - exercise.minLoad) / exercise.loadStep;

    if (!Number.isInteger(completedLoadSteps)) {
      violations.push({
        code: "LOAD_STEP_MISMATCH",
        exerciseId: exercise.id,
      });
    }
  }

  const actualDurationSeconds = estimateWorkoutDurationSeconds(
    input.fitResult.prescriptions,
  );
  const expectedMinimumDurationSeconds =
    input.fitResult.budgetSeconds *
    TIME_BUDGET_POLICY.minimumFillRatio;
  const timeBudgetIsValid =
    input.fitResult.fits &&
    input.fitResult.failureReason === null &&
    input.fitResult.estimatedDurationSeconds ===
      actualDurationSeconds &&
    input.fitResult.minimumDurationSeconds ===
      expectedMinimumDurationSeconds &&
    actualDurationSeconds >= expectedMinimumDurationSeconds &&
    actualDurationSeconds <= input.fitResult.budgetSeconds;

  if (!timeBudgetIsValid) {
    violations.push({
      code: "TIME_BUDGET_VIOLATION",
      exerciseId: null,
    });
  }

  return violations;
}
