export const FEEDBACK_POLICY = {
  requiredConsecutiveEasyForProgression: 2,
  maxPrimaryChangesPerExposure: 1,
  incompleteRegressionThreshold: 0.75,
  hardRestStepSeconds: 15,
  fatigueMax: 10,
  fatigueDecayPer24Hours: 1,
  highFatigueThreshold: 7,
} as const;
