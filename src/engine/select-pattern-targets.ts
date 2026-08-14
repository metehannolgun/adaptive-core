import type { CatalogEntry, MovementPattern } from "../catalog/types";
import {
  MOVEMENT_PATTERNS,
  PATTERN_TARGET_COUNT_BY_DURATION,
} from "./policy";
import type {
  PatternSelectionResult,
  WorkoutDurationMinutes,
} from "./types";

export type SelectPatternTargetsInput = {
  eligibleEntries: readonly CatalogEntry[];
  durationMinutes: WorkoutDurationMinutes;
  recentExposureCounts: Readonly<
    Partial<Record<MovementPattern, number>>
  >;
  seed: string;
};

function stableSeedRank(
  seed: string,
  pattern: MovementPattern,
): number {
  let hash = 2_166_136_261;

  for (const character of `${seed}:${pattern}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function getExposureCount(
  pattern: MovementPattern,
  counts: SelectPatternTargetsInput["recentExposureCounts"],
): number {
  return counts[pattern] ?? 0;
}

export function selectPatternTargets(
  input: SelectPatternTargetsInput,
): PatternSelectionResult {
  const requestedTargetCount =
    PATTERN_TARGET_COUNT_BY_DURATION[input.durationMinutes];
  const representedPatterns = new Set(
    input.eligibleEntries.map(
      (entry) => entry.exercise.primaryPattern,
    ),
  );
  const uniquePatterns = MOVEMENT_PATTERNS.filter((pattern) =>
    representedPatterns.has(pattern),
  );
  const rankedPatterns = [...uniquePatterns].sort((left, right) => {
    const exposureDifference =
      getExposureCount(left, input.recentExposureCounts) -
      getExposureCount(right, input.recentExposureCounts);

    if (exposureDifference !== 0) {
      return exposureDifference;
    }

    const seedDifference =
      stableSeedRank(input.seed, left) -
      stableSeedRank(input.seed, right);

    if (seedDifference !== 0) {
      return seedDifference;
    }

    return (
      MOVEMENT_PATTERNS.indexOf(left) -
      MOVEMENT_PATTERNS.indexOf(right)
    );
  });
  const patterns = rankedPatterns.slice(0, requestedTargetCount);
  const exposureScores = new Set(
    uniquePatterns.map((pattern) =>
      getExposureCount(pattern, input.recentExposureCounts),
    ),
  );
  const balanceAffectedSelection =
    uniquePatterns.length > requestedTargetCount &&
    exposureScores.size > 1;
  const explanationCodes: PatternSelectionResult["explanationCodes"] = [
    "DURATION_USER_SELECTION",
  ];

  if (balanceAffectedSelection) {
    explanationCodes.push("VARIATION_PATTERN_BALANCE");
  }

  return {
    patterns,
    requestedTargetCount,
    shortened: patterns.length < requestedTargetCount,
    explanationCodes,
  };
}
