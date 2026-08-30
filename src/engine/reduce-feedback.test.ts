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

  it("holds load and adds capped rest after hard feedback", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "hard",
          currentRestSeconds: 50,
          maxRestSeconds: 60,
          patternState: {
            pattern: "anti_extension",
            capacity: 2,
            fatigue: 9,
            lastTrainedAt: null,
            recentHardCount: 1,
          },
        }),
      ),
    ).toEqual({
      exerciseState: {
        exerciseId: "dead-bug",
        currentLoad: 10,
        currentSets: 2,
        consecutiveEasy: 0,
        lastOutcome: "hard",
        excludedUntil: null,
      },
      patternState: {
        pattern: "anti_extension",
        capacity: 2,
        fatigue: 10,
        lastTrainedAt: null,
        recentHardCount: 2,
      },
      nextRestSeconds: 60,
      action: "increase_rest",
      explanationCode: "LOAD_HOLD_HARD",
    });
  });

  it("reduces one load step when completion is at least 75 percent", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "easy",
          exerciseOutcome: "incomplete",
          performedLoad: 8,
        }),
      ),
    ).toMatchObject({
      exerciseState: {
        exerciseId: "dead-bug",
        currentLoad: 5,
        currentSets: 2,
        consecutiveEasy: 0,
        lastOutcome: "incomplete",
        excludedUntil: null,
      },
      nextRestSeconds: 30,
      action: "decrease_load",
      explanationCode: "LOAD_DOWN_INCOMPLETE",
    });
  });

  it("treats exactly 75 percent completion as a one-step reduction", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "incomplete",
          performedLoad: 7.5,
        }),
      ),
    ).toMatchObject({
      exerciseState: {
        currentLoad: 5,
        lastOutcome: "incomplete",
      },
      action: "decrease_load",
      explanationCode: "LOAD_DOWN_INCOMPLETE",
    });
  });

  it("uses the reviewed regression below 75 percent completion", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "incomplete",
          performedLoad: 7,
          regression: {
            exerciseId: "dead-bug-heel-tap",
            minLoad: 4,
          },
        }),
      ),
    ).toMatchObject({
      exerciseState: {
        exerciseId: "dead-bug-heel-tap",
        currentLoad: 4,
        currentSets: 2,
        consecutiveEasy: 0,
        lastOutcome: "incomplete",
        excludedUntil: null,
      },
      nextRestSeconds: 30,
      action: "regress",
      explanationCode: "REGRESSION_INCOMPLETE",
    });
  });

  it("excludes pain immediately without changing pattern capacity", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "easy",
          exerciseOutcome: "pain",
        }),
      ),
    ).toEqual({
      exerciseState: {
        exerciseId: "dead-bug",
        currentLoad: 10,
        currentSets: 2,
        consecutiveEasy: 0,
        lastOutcome: "pain",
        excludedUntil: null,
      },
      patternState: {
        pattern: "anti_extension",
        capacity: 2,
        fatigue: 2,
        lastTrainedAt: "2026-08-14T09:00:00.000Z",
        recentHardCount: 0,
      },
      nextRestSeconds: 30,
      action: "exclude",
      explanationCode: "EXERCISE_EXCLUDED_PAIN",
    });
  });

  it("holds load after the first consecutive easy result", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "easy",
          exerciseState: {
            exerciseId: "dead-bug",
            currentLoad: 10,
            currentSets: 2,
            consecutiveEasy: 0,
            lastOutcome: null,
            excludedUntil: null,
          },
        }),
      ),
    ).toMatchObject({
      exerciseState: {
        currentLoad: 10,
        consecutiveEasy: 1,
        lastOutcome: "easy",
      },
      nextRestSeconds: 30,
      action: "hold",
      explanationCode: "LOAD_HOLD_EASY_STREAK",
    });
  });

  it("increases only one load step after the second consecutive easy result", () => {
    expect(reduceFeedback(createInput({ sessionOutcome: "easy" })))
      .toMatchObject({
        exerciseState: {
          exerciseId: "dead-bug",
          currentLoad: 15,
          currentSets: 2,
          consecutiveEasy: 0,
          lastOutcome: "easy",
        },
        nextRestSeconds: 30,
        action: "increase_load",
        explanationCode: "LOAD_UP_EASY_SUCCESS",
      });
  });

  it("uses one reviewed progression when load is already at maximum", () => {
    expect(
      reduceFeedback(
        createInput({
          sessionOutcome: "easy",
          exerciseState: {
            exerciseId: "dead-bug",
            currentLoad: 20,
            currentSets: 2,
            consecutiveEasy: 1,
            lastOutcome: "easy",
            excludedUntil: null,
          },
          progression: {
            exerciseId: "dead-bug-longer-lever",
            minLoad: 6,
          },
        }),
      ),
    ).toMatchObject({
      exerciseState: {
        exerciseId: "dead-bug-longer-lever",
        currentLoad: 6,
        consecutiveEasy: 0,
      },
      action: "progress",
      explanationCode: "LOAD_UP_EASY_SUCCESS",
    });
  });
});
