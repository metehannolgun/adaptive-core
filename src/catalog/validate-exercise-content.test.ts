import type { ExerciseContent } from "./types";
import { validateExerciseContent } from "./validate-exercise-content";

const validContent: ExerciseContent = {
  exerciseId: "dead-bug",
  locale: "en",
  name: "Dead bug",
  setupInstruction: "Lie on your back with your knees bent.",
  cues: ["Keep your lower back gently supported."],
  breathingCue: "Exhale as you extend.",
  commonMistakes: ["Arching the lower back."],
  stopConditions: ["Stop if you feel pain."],
  altText: "A person performing a dead bug exercise.",
  contentVersion: 1,
  status: "active",
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

describe("validateExerciseContent", () => {
  it("blocks blank required text fields", () => {
    expect(
      validateExerciseContent({
        ...validContent,
        name: " ",
        setupInstruction: "",
        breathingCue: "  ",
        altText: "",
      }),
    ).toEqual([
      "MISSING_NAME",
      "MISSING_SETUP_INSTRUCTION",
      "MISSING_BREATHING_CUE",
      "MISSING_ALT_TEXT",
    ]);
  });

  it("requires at least one movement cue", () => {
    expect(
      validateExerciseContent({
        ...validContent,
        cues: [],
      }),
    ).toEqual(["MISSING_CUE"]);
  });

  it("allows no more than three movement cues", () => {
    expect(
      validateExerciseContent({
        ...validContent,
        cues: ["First", "Second", "Third", "Fourth"],
      }),
    ).toEqual(["TOO_MANY_CUES"]);
  });

  it("requires a common mistake and a stop condition", () => {
    expect(
      validateExerciseContent({
        ...validContent,
        commonMistakes: [],
        stopConditions: [],
      }),
    ).toEqual([
      "MISSING_COMMON_MISTAKE",
      "MISSING_STOP_CONDITION",
    ]);
  });
});
