import type { Exercise, LoadMode } from "../catalog/types";
import type { ExerciseSelection } from "./select-exercises-for-patterns";
import type { ExerciseState } from "./types";

export type PrescribeConservativeLoadsInput = {
  selections: readonly ExerciseSelection[];
  exerciseStateById: Readonly<Record<string, ExerciseState>>;
  restSecondsByExerciseId: Readonly<Record<string, number>>;
};

export type ExercisePrescription = ExerciseSelection & {
  loadMode: LoadMode;
  load: number;
  sets: number;
  restSeconds: number;
  setupSeconds: number;
};

function normalizeStoredLoad(value: number, exercise: Exercise): number {
  if (!Number.isFinite(value)) {
    return exercise.defaultLoad;
  }

  const boundedLoad = Math.min(
    exercise.maxLoad,
    Math.max(exercise.minLoad, value),
  );

  // We round down so repairing stale data can never make a workout harder.
  const completedSteps = Math.floor(
    (boundedLoad - exercise.minLoad) / exercise.loadStep,
  );

  return exercise.minLoad + completedSteps * exercise.loadStep;
}

function normalizeStoredSets(value: number, defaultSets: number): number {
  return Number.isInteger(value) && value > 0 ? value : defaultSets;
}

function normalizeStoredRest(
  value: number | undefined,
  minRestSeconds: number,
  maxRestSeconds: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return minRestSeconds;
  }

  return Math.min(
    maxRestSeconds,
    Math.max(minRestSeconds, Math.floor(value)),
  );
}

export function prescribeConservativeLoads(
  input: PrescribeConservativeLoadsInput,
): ExercisePrescription[] {
  return input.selections.map((selection) => {
    const { exercise } = selection.entry;
    const candidateState = input.exerciseStateById[exercise.id];
    const storedState =
      candidateState?.exerciseId === exercise.id
        ? candidateState
        : undefined;

    return {
      ...selection,
      loadMode: exercise.loadMode,
      load:
        storedState === undefined
          ? exercise.defaultLoad
          : normalizeStoredLoad(storedState.currentLoad, exercise),
      sets:
        storedState === undefined
          ? exercise.defaultSets
          : normalizeStoredSets(
              storedState.currentSets,
              exercise.defaultSets,
            ),
      restSeconds: normalizeStoredRest(
        input.restSecondsByExerciseId[exercise.id],
        exercise.minRestSeconds,
        exercise.maxRestSeconds,
      ),
      setupSeconds: exercise.setupSeconds,
    };
  });
}
