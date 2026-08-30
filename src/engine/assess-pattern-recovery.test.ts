import type { PatternState } from "./types";
import { assessPatternRecovery } from "./assess-pattern-recovery";

const patternState: PatternState = {
  pattern: "anti_extension",
  capacity: 3,
  fatigue: 4,
  lastTrainedAt: "2026-08-14T09:00:00.000Z",
  recentHardCount: 0,
};

describe("assessPatternRecovery", () => {
  it("decays fatigue once per full 24 hours without advancing capacity", () => {
    expect(
      assessPatternRecovery(
        patternState,
        [],
        "2026-08-16T10:00:00.000Z",
      ),
    ).toEqual({
      patternState: {
        pattern: "anti_extension",
        capacity: 3,
        fatigue: 2,
        lastTrainedAt: "2026-08-14T09:00:00.000Z",
        recentHardCount: 0,
      },
      directive: "standard",
      explanationCode: null,
    });
  });

  it("requires lighter choices after two recent hard or incomplete outcomes", () => {
    expect(
      assessPatternRecovery(
        patternState,
        ["incomplete", "hard"],
        "2026-08-14T10:00:00.000Z",
      ),
    ).toEqual({
      patternState,
      directive: "lighter_only",
      explanationCode: "RECOVERY_RECENT_FATIGUE",
    });
  });

  it("requires lighter choices when recovered fatigue remains high", () => {
    expect(
      assessPatternRecovery(
        {
          ...patternState,
          fatigue: 8,
        },
        ["appropriate"],
        "2026-08-15T09:00:00.000Z",
      ),
    ).toEqual({
      patternState: {
        ...patternState,
        fatigue: 7,
      },
      directive: "lighter_only",
      explanationCode: "RECOVERY_RECENT_FATIGUE",
    });
  });

  it("keeps fatigue unchanged when recovery timestamps are invalid", () => {
    expect(
      assessPatternRecovery(patternState, [], "invalid-date"),
    ).toEqual({
      patternState,
      directive: "standard",
      explanationCode: null,
    });
  });
});
