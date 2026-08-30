import type {
  CatalogEntry,
  CatalogValidationCode,
  ExerciseLevel,
  MovementPattern,
} from "../catalog/types";
import { validateCatalogRelease } from "../catalog/validate-catalog-release";
import { assessPatternRecovery } from "./assess-pattern-recovery";
import {
  filterEligibleExercises,
  type EligibilityConstraints,
} from "./filter-eligible-exercises";
import { fitToTimeBudget } from "./fit-to-time-budget";
import { orderExercises } from "./order-exercises";
import { MOVEMENT_PATTERNS } from "./policy";
import {
  prescribeConservativeLoads,
  type ExercisePrescription,
} from "./prescribe-conservative-loads";
import { selectExercisesForPatterns } from "./select-exercises-for-patterns";
import { selectPatternTargets } from "./select-pattern-targets";
import type {
  ExerciseState,
  ExplanationCode,
  PatternState,
  RecoveryDirective,
  SessionOutcome,
  WorkoutDurationMinutes,
} from "./types";
import {
  validateWorkoutSafety,
  type WorkoutSafetyViolation,
} from "./validate-workout-safety";
import { ENGINE_VERSION, POLICY_VERSION } from "./versions";

export type GenerateNextWorkoutInput = {
  durationMinutes: WorkoutDurationMinutes;
  now: string;
  seed: string;
  catalogVersion: string;
  catalogEntries: readonly CatalogEntry[];
  maxLevel: ExerciseLevel;
  excludedExerciseIds: readonly string[];
  reviewedRegressionExerciseIds: readonly string[];
  patternStateByPattern: Readonly<Record<MovementPattern, PatternState>>;
  recentOutcomesByPattern: Readonly<
    Partial<Record<MovementPattern, readonly SessionOutcome[]>>
  >;
  exerciseStateById: Readonly<Record<string, ExerciseState>>;
  restSecondsByExerciseId: Readonly<Record<string, number>>;
  recentPatternExposureCounts: Readonly<
    Partial<Record<MovementPattern, number>>
  >;
  currentExerciseIdByPattern: Readonly<
    Partial<Record<MovementPattern, string>>
  >;
  recentExerciseExposureCounts: Readonly<Record<string, number>>;
};

export type WorkoutGenerationSuccess = {
  kind: "success";
  prescription: {
    durationMinutes: WorkoutDurationMinutes;
    estimatedDurationSeconds: number;
    shortened: boolean;
    items: readonly ExercisePrescription[];
    explanationCodes: readonly ExplanationCode[];
    engineVersion: typeof ENGINE_VERSION;
    policyVersion: typeof POLICY_VERSION;
    catalogVersion: string;
    seed: string;
  };
};

export type WorkoutGenerationFailure =
  | {
      kind: "failure";
      reason: "INVALID_CATALOG";
      issues: readonly CatalogValidationCode[];
    }
  | { kind: "failure"; reason: "NO_ELIGIBLE_EXERCISES" }
  | { kind: "failure"; reason: "INSUFFICIENT_DURATION_COVERAGE" }
  | {
      kind: "failure";
      reason: "SAFETY_VIOLATION";
      violations: readonly WorkoutSafetyViolation[];
    };

export type WorkoutGenerationResult =
  | WorkoutGenerationSuccess
  | WorkoutGenerationFailure;

function addExplanationCode(
  codes: ExplanationCode[],
  code: ExplanationCode | null,
): void {
  // First-observed order makes the user explanation stable while avoiding
  // repeated recovery messages from multiple fatigued movement patterns.
  if (code !== null && !codes.includes(code)) {
    codes.push(code);
  }
}

export function generateNextWorkout(
  input: GenerateNextWorkoutInput,
): WorkoutGenerationResult {
  const catalogIssues = validateCatalogRelease({
    entries: [...input.catalogEntries],
    relations: [],
  });

  if (catalogIssues.length > 0) {
    return {
      kind: "failure",
      reason: "INVALID_CATALOG",
      issues: [...catalogIssues].sort(),
    };
  }

  const explanationCodes: ExplanationCode[] = [];
  const recoveryByPattern: Partial<
    Record<MovementPattern, RecoveryDirective>
  > = {};

  // Canonical pattern order prevents object insertion order from changing a
  // deterministic prescription or its explanation sequence.
  for (const pattern of MOVEMENT_PATTERNS) {
    const recovery = assessPatternRecovery(
      input.patternStateByPattern[pattern],
      input.recentOutcomesByPattern[pattern] ?? [],
      input.now,
    );
    recoveryByPattern[pattern] = recovery.directive;
    addExplanationCode(explanationCodes, recovery.explanationCode);
  }

  const eligibilityConstraints: EligibilityConstraints = {
    maxLevel: input.maxLevel,
    excludedExerciseIds: input.excludedExerciseIds,
    recoveryByPattern,
    reviewedRegressionExerciseIds:
      input.reviewedRegressionExerciseIds,
  };
  const eligibleEntries = filterEligibleExercises(
    input.catalogEntries,
    eligibilityConstraints,
  );

  if (eligibleEntries.length === 0) {
    return { kind: "failure", reason: "NO_ELIGIBLE_EXERCISES" };
  }

  const targetResult = selectPatternTargets({
    eligibleEntries,
    durationMinutes: input.durationMinutes,
    recentExposureCounts: input.recentPatternExposureCounts,
    seed: input.seed,
  });
  targetResult.explanationCodes.forEach((code) =>
    addExplanationCode(explanationCodes, code),
  );

  const selectionResult = selectExercisesForPatterns({
    eligibleEntries,
    targetPatterns: targetResult.patterns,
    currentExerciseIdByPattern: input.currentExerciseIdByPattern,
    recentExerciseExposureCounts:
      input.recentExerciseExposureCounts,
    seed: input.seed,
  });
  selectionResult.selections.forEach((selection) =>
    addExplanationCode(explanationCodes, selection.explanationCode),
  );

  const loaded = prescribeConservativeLoads({
    selections: selectionResult.selections,
    exerciseStateById: input.exerciseStateById,
    restSecondsByExerciseId: input.restSecondsByExerciseId,
  });
  const ordered = orderExercises(loaded);
  const fitted = fitToTimeBudget({
    prescriptions: ordered,
    durationMinutes: input.durationMinutes,
  });

  if (!fitted.fits) {
    return {
      kind: "failure",
      reason: "INSUFFICIENT_DURATION_COVERAGE",
    };
  }

  const violations = validateWorkoutSafety({
    fitResult: fitted,
    eligibilityConstraints,
  });

  if (violations.length > 0) {
    return {
      kind: "failure",
      reason: "SAFETY_VIOLATION",
      violations,
    };
  }

  return {
    kind: "success",
    prescription: {
      durationMinutes: input.durationMinutes,
      estimatedDurationSeconds: fitted.estimatedDurationSeconds,
      shortened:
        targetResult.shortened ||
        selectionResult.missingPatterns.length > 0 ||
        fitted.shortened,
      items: fitted.prescriptions,
      explanationCodes,
      engineVersion: ENGINE_VERSION,
      policyVersion: POLICY_VERSION,
      catalogVersion: input.catalogVersion,
      seed: input.seed,
    },
  };
}
