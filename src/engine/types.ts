import type { MovementPattern } from "../catalog/types";

export type SessionOutcome =
  | "easy"
  | "appropriate"
  | "hard"
  | "incomplete"
  | "pain";

export type ExerciseOverrideOutcome = "incomplete" | "pain";

export type WorkoutDurationMinutes = 5 | 10 | 15;

export type PatternSelectionExplanationCode =
  | "DURATION_USER_SELECTION"
  | "VARIATION_PATTERN_BALANCE";

export type ExplanationCode =
  | PatternSelectionExplanationCode
  | "LOAD_HOLD_EASY_STREAK"
  | "LOAD_UP_EASY_SUCCESS"
  | "LOAD_HOLD_APPROPRIATE"
  | "LOAD_HOLD_HARD"
  | "LOAD_DOWN_INCOMPLETE"
  | "REGRESSION_INCOMPLETE"
  | "EXERCISE_EXCLUDED_PAIN"
  | "RECOVERY_RECENT_FATIGUE";

export type RecoveryDirective = "standard" | "lighter_only";

export type FeedbackAction =
  | "hold"
  | "increase_load"
  | "increase_rest"
  | "decrease_load"
  | "regress"
  | "progress"
  | "exclude";

export type PatternState = {
  pattern: MovementPattern;
  capacity: number;
  fatigue: number;
  lastTrainedAt: string | null;
  recentHardCount: number;
};

export type ExerciseState = {
  exerciseId: string;
  currentLoad: number;
  currentSets: number;
  consecutiveEasy: number;
  lastOutcome: SessionOutcome | null;
  excludedUntil: string | null;
};

export type ExerciseRelationTarget = {
  exerciseId: string;
  minLoad: number;
};

export type FeedbackInput = {
  exerciseState: ExerciseState;
  patternState: PatternState;
  sessionOutcome: SessionOutcome;
  exerciseOutcome: ExerciseOverrideOutcome | null;
  performedLoad: number;
  minLoad: number;
  maxLoad: number;
  loadStep: number;
  currentRestSeconds: number;
  maxRestSeconds: number;
  progression: ExerciseRelationTarget | null;
  regression: ExerciseRelationTarget | null;
};

export type FeedbackResult = {
  exerciseState: ExerciseState;
  patternState: PatternState;
  nextRestSeconds: number;
  action: FeedbackAction;
  explanationCode: ExplanationCode;
};

export type PatternRecoveryResult = {
  patternState: PatternState;
  directive: RecoveryDirective;
  explanationCode: "RECOVERY_RECENT_FATIGUE" | null;
};

export type PatternSelectionResult = {
  patterns: MovementPattern[];
  requestedTargetCount: number;
  shortened: boolean;
  explanationCodes: PatternSelectionExplanationCode[];
};
