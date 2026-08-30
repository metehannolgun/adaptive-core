import type { CatalogEntry, MovementPattern } from "../catalog/types";
import { stableSeedRank } from "./stable-seed-rank";
import type { ExerciseSelectionExplanationCode } from "./types";

export type SelectExercisesForPatternsInput = {
  eligibleEntries: readonly CatalogEntry[];
  targetPatterns: readonly MovementPattern[];
  currentExerciseIdByPattern: Readonly<
    Partial<Record<MovementPattern, string>>
  >;
  recentExerciseExposureCounts: Readonly<Record<string, number>>;
  seed: string;
};

export type ExerciseSelection = {
  pattern: MovementPattern;
  entry: CatalogEntry;
  explanationCode: ExerciseSelectionExplanationCode | null;
};

export type ExerciseSelectionResult = {
  selections: ExerciseSelection[];
  missingPatterns: MovementPattern[];
};

function getRecentExposureCount(
  exerciseId: string,
  counts: SelectExercisesForPatternsInput["recentExerciseExposureCounts"],
): number {
  return counts[exerciseId] ?? 0;
}

function getDemandScore(entry: CatalogEntry): number {
  const { exercise } = entry;

  return (
    exercise.level +
    exercise.strengthDemand +
    exercise.coordinationDemand +
    exercise.fatigueScore
  );
}

function compareExerciseIds(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function selectExercisesForPatterns(
  input: SelectExercisesForPatternsInput,
): ExerciseSelectionResult {
  const selections: ExerciseSelection[] = [];
  const missingPatterns: MovementPattern[] = [];

  for (const pattern of input.targetPatterns) {
    const candidates = input.eligibleEntries.filter(
      (entry) => entry.exercise.primaryPattern === pattern,
    );

    if (candidates.length === 0) {
      missingPatterns.push(pattern);
      continue;
    }

    const currentExerciseId =
      input.currentExerciseIdByPattern[pattern];
    const currentEntry = candidates.find(
      (entry) => entry.exercise.id === currentExerciseId,
    );
    const rankedCandidates = [...candidates].sort((left, right) => {
      const exposureDifference =
        getRecentExposureCount(
          left.exercise.id,
          input.recentExerciseExposureCounts,
        ) -
        getRecentExposureCount(
          right.exercise.id,
          input.recentExerciseExposureCounts,
        );

      if (exposureDifference !== 0) {
        return exposureDifference;
      }

      const demandDifference =
        getDemandScore(left) - getDemandScore(right);

      if (demandDifference !== 0) {
        return demandDifference;
      }

      const seedDifference =
        stableSeedRank(input.seed, pattern, left.exercise.id) -
        stableSeedRank(input.seed, pattern, right.exercise.id);

      if (seedDifference !== 0) {
        return seedDifference;
      }

      return compareExerciseIds(left.exercise.id, right.exercise.id);
    });
    const exposureScores = new Set(
      candidates.map((entry) =>
        getRecentExposureCount(
          entry.exercise.id,
          input.recentExerciseExposureCounts,
        ),
      ),
    );
    const explanationCode =
      currentEntry === undefined && exposureScores.size > 1
        ? "VARIATION_RECENT_EXPOSURE"
        : null;

    selections.push({
      pattern,
      entry: currentEntry ?? rankedCandidates[0],
      explanationCode,
    });
  }

  return {
    selections,
    missingPatterns,
  };
}
