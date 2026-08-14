import { FEEDBACK_POLICY } from "./policy";
import type {
  PatternRecoveryResult,
  PatternState,
  SessionOutcome,
} from "./types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function assessPatternRecovery(
  patternState: PatternState,
  recentOutcomes: readonly SessionOutcome[],
  now: string,
): PatternRecoveryResult {
  const elapsedDays = calculateElapsedDays(
    patternState.lastTrainedAt,
    now,
  );
  const recoveredState = {
    ...patternState,
    fatigue: Math.max(
      0,
      patternState.fatigue -
        elapsedDays * FEEDBACK_POLICY.fatigueDecayPer24Hours,
    ),
  };
  const hasRepeatedStrain =
    recentOutcomes.length >= 2 &&
    recentOutcomes
      .slice(0, 2)
      .every(
        (outcome) => outcome === "hard" || outcome === "incomplete",
      );
  const requiresLighterChoices =
    recoveredState.fatigue >= FEEDBACK_POLICY.highFatigueThreshold ||
    hasRepeatedStrain;

  return {
    patternState: recoveredState,
    directive: requiresLighterChoices ? "lighter_only" : "standard",
    explanationCode: requiresLighterChoices
      ? "RECOVERY_RECENT_FATIGUE"
      : null,
  };
}

function calculateElapsedDays(
  lastTrainedAt: string | null,
  now: string,
): number {
  if (lastTrainedAt === null) {
    return 0;
  }

  const startTime = Date.parse(lastTrainedAt);
  const endTime = Date.parse(now);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((endTime - startTime) / MILLISECONDS_PER_DAY),
  );
}
