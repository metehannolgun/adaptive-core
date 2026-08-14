import { FEEDBACK_POLICY } from "./policy";
import type {
  FeedbackInput,
  FeedbackResult,
  PatternState,
  SessionOutcome,
} from "./types";

export function reduceFeedback(input: FeedbackInput): FeedbackResult {
  const outcome = resolveEffectiveOutcome(input);

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
