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
  const patterns = uniquePatterns.slice(0, requestedTargetCount);

  return {
    patterns,
    requestedTargetCount,
    shortened: patterns.length < requestedTargetCount,
    explanationCodes: ["DURATION_USER_SELECTION"],
  };
}
