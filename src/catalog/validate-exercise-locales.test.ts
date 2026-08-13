import type { ExerciseContent } from "./types";
import { validateExerciseLocales } from "./validate-exercise-locales";

const englishContent: ExerciseContent = {
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

const turkishContent: ExerciseContent = {
  ...englishContent,
  locale: "tr",
  name: "Dead bug",
  setupInstruction: "Dizlerin bükülü şekilde sırtüstü uzan.",
  cues: ["Bel boşluğunu kontrollü tut."],
  breathingCue: "Uzuvlarını uzatırken nefes ver.",
  commonMistakes: ["Belin aşırı kavislenmesi."],
  stopConditions: ["Ağrı hissedersen dur."],
  altText: "Dead bug hareketini yapan bir kişi.",
};

describe("validateExerciseLocales", () => {
  it("blocks an exercise when Turkish content is missing", () => {
    expect(validateExerciseLocales([englishContent])).toEqual([
      "MISSING_TR_CONTENT",
    ]);
  });

  it("blocks an exercise when English content is missing", () => {
    expect(validateExerciseLocales([turkishContent])).toEqual([
      "MISSING_EN_CONTENT",
    ]);
  });

  it("blocks an exercise when English content is duplicated", () => {
    expect(
      validateExerciseLocales([
        englishContent,
        { ...englishContent },
        turkishContent,
      ]),
    ).toEqual(["DUPLICATE_EN_CONTENT"]);
  });
});
