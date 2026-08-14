import { FEEDBACK_POLICY } from "./policy";
import type {
  FeedbackInput,
  FeedbackResult,
  PatternState,
  SessionOutcome,
} from "./types";

export function reduceFeedback(input: FeedbackInput): FeedbackResult {
  const outcome = resolveEffectiveOutcome(input);

  if (outcome === "pain") {
    return {
      exerciseState: {
        ...input.exerciseState,
        consecutiveEasy: 0,
        lastOutcome: "pain",
        excludedUntil: null,
      },
      patternState: input.patternState,
      nextRestSeconds: input.currentRestSeconds,
      action: "exclude",
      explanationCode: "EXERCISE_EXCLUDED_PAIN",
    };
  }

  if (outcome === "easy") {
    const easyCount = input.exerciseState.consecutiveEasy + 1;
    const canProgress =
      easyCount >=
      FEEDBACK_POLICY.requiredConsecutiveEasyForProgression;
    const canIncreaseLoad =
      input.exerciseState.currentLoad + input.loadStep <= input.maxLoad;

    if (canProgress && canIncreaseLoad) {
      return {
        exerciseState: {
          ...input.exerciseState,
          currentLoad: input.exerciseState.currentLoad + input.loadStep,
          consecutiveEasy: 0,
          lastOutcome: "easy",
        },
        patternState: updatePattern(input.patternState, 1, 1),
        nextRestSeconds: input.currentRestSeconds,
        action: "increase_load",
        explanationCode: "LOAD_UP_EASY_SUCCESS",
      };
    }

    if (canProgress && input.progression !== null) {
      return {
        exerciseState: {
          ...input.exerciseState,
          exerciseId: input.progression.exerciseId,
          currentLoad: input.progression.minLoad,
          consecutiveEasy: 0,
          lastOutcome: "easy",
        },
        patternState: updatePattern(input.patternState, 1, 1),
        nextRestSeconds: input.currentRestSeconds,
        action: "progress",
        explanationCode: "LOAD_UP_EASY_SUCCESS",
      };
    }

    return {
      exerciseState: {
        ...input.exerciseState,
        consecutiveEasy: easyCount,
        lastOutcome: "easy",
      },
      patternState: updatePattern(input.patternState, 1, 1),
      nextRestSeconds: input.currentRestSeconds,
      action: "hold",
      explanationCode: "LOAD_HOLD_EASY_STREAK",
    };
  }

  if (outcome === "incomplete") {
    const completionRatio =
      input.performedLoad / input.exerciseState.currentLoad;
    const shouldRegress =
      completionRatio < FEEDBACK_POLICY.incompleteRegressionThreshold &&
      input.regression !== null;

    const nextExerciseId = shouldRegress
      ? input.regression!.exerciseId
      : input.exerciseState.exerciseId;
    const nextLoad = shouldRegress
      ? input.regression!.minLoad
      : Math.max(
          input.minLoad,
          input.exerciseState.currentLoad -
            input.loadStep *
              (completionRatio <
              FEEDBACK_POLICY.incompleteRegressionThreshold
                ? 2
                : 1),
        );

    return {
      exerciseState: {
        ...input.exerciseState,
        exerciseId: nextExerciseId,
        currentLoad: nextLoad,
        consecutiveEasy: 0,
        lastOutcome: "incomplete",
      },
      patternState: updatePattern(input.patternState, -0.5, 3),
      nextRestSeconds: input.currentRestSeconds,
      action: shouldRegress ? "regress" : "decrease_load",
      explanationCode: shouldRegress
        ? "REGRESSION_INCOMPLETE"
        : "LOAD_DOWN_INCOMPLETE",
    };
  }

  if (outcome === "hard") {
    return {
      exerciseState: {
        ...input.exerciseState,
        consecutiveEasy: 0,
        lastOutcome: "hard",
      },
      patternState: {
        ...updatePattern(input.patternState, 0, 3),
        recentHardCount: input.patternState.recentHardCount + 1,
      },
      nextRestSeconds: Math.min(
        input.maxRestSeconds,
        input.currentRestSeconds + FEEDBACK_POLICY.hardRestStepSeconds,
      ),
      action: "increase_rest",
      explanationCode: "LOAD_HOLD_HARD",
    };
  }

  if (outcome === "appropriate") {
    return {
      exerciseState: {
        ...input.exerciseState,
        consecutiveEasy: 0,
        lastOutcome: "appropriate",
      },
      patternState: updatePattern(input.patternState, 0.5, 1),
      nextRestSeconds: input.currentRestSeconds,
      action: "hold",
      explanationCode: "LOAD_HOLD_APPROPRIATE",
    };
  }

  throw new Error(`Unsupported feedback outcome: ${outcome}`);
}

function resolveEffectiveOutcome(input: FeedbackInput): SessionOutcome {
  return input.exerciseOutcome ?? input.sessionOutcome;
}

function updatePattern(
  state: PatternState,
  capacityDelta: number,
  fatigueDelta: number,
): PatternState {
  return {
    ...state,
    capacity: state.capacity + capacityDelta,
    fatigue: Math.min(
      FEEDBACK_POLICY.fatigueMax,
      Math.max(0, state.fatigue + fatigueDelta),
    ),
  };
}
