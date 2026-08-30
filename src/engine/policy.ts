import type { MovementPattern } from "../catalog/types";
import type { WorkoutDurationMinutes } from "./types";

export const MOVEMENT_PATTERNS = [
  "trunk_flexion",
  "anti_extension",
  "anti_rotation",
  "rotation",
  "lateral_stability",
  "hip_control",
] as const satisfies readonly MovementPattern[];

export const PATTERN_TARGET_COUNT_BY_DURATION = {
  5: 3,
  10: 4,
  15: 6,
} as const satisfies Record<WorkoutDurationMinutes, number>;

export const TIME_BUDGET_POLICY = {
  transitionSeconds: 10,
  minimumFillRatio: 0.8,
} as const;

export const FEEDBACK_POLICY = {
  requiredConsecutiveEasyForProgression: 2,
  maxPrimaryChangesPerExposure: 1,
  incompleteRegressionThreshold: 0.75,
  hardRestStepSeconds: 15,
  fatigueMax: 10,
  fatigueDecayPer24Hours: 1,
  highFatigueThreshold: 7,
} as const;
