import type { FeedbackInput } from "./types";
import { reduceFeedback } from "./reduce-feedback";

function createInput(
  overrides: Partial<FeedbackInput> = {},
): FeedbackInput {
  return {
    exerciseState: {
      exerciseId: "dead-bug",
      currentLoad: 10,
      currentSets: 2,
      consecutiveEasy: 1,
      lastOutcome: "easy",
      excludedUntil: null,
    },
    patternState: {
      pattern: "anti_extension",
      capacity: 2,
      fatigue: 2,
      lastTrainedAt: "2026-08-14T09:00:00.000Z",
      recentHardCount: 0,
    },
    sessionOutcome: "appropriate",
    exerciseOutcome: null,
    performedLoad: 10,
    minLoad: 5,
    maxLoad: 20,
    loadStep: 5,
    currentRestSeconds: 30,
    maxRestSeconds: 60,
    progression: null,
    regression: null,
    ...overrides,
  };
}

describe("reduceFeedback", () => {
  it("holds exercise, load, sets, and rest after appropriate feedback", () => {
    expect(reduceFeedback(createInput({ sessionOutcome: "appropriate" })))
      .toEqual({
        exerciseState: {
          exerciseId: "dead-bug",
          currentLoad: 10,
          currentSets: 2,
          consecutiveEasy: 0,
          lastOutcome: "appropriate",
          excludedUntil: null,
        },
        patternState: {
          pattern: "anti_extension",
          capacity: 2.5,
          fatigue: 3,
          lastTrainedAt: "2026-08-14T09:00:00.000Z",
          recentHardCount: 0,
        },
        nextRestSeconds: 30,
        action: "hold",
        explanationCode: "LOAD_HOLD_APPROPRIATE",
      });
  });
});
