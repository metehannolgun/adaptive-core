import type { Exercise } from "./types";
import { validateExercise } from "./validate-exercise";

const validExercise: Exercise = {
  id: "dead-bug",
  slug: "dead-bug",
  status: "active",
  primaryPattern: "anti_extension",
  secondaryPatterns: ["hip_control"],
  userFocusLabels: ["deep_core", "stability"],
  loadMode: "alternating_reps",
  level: 1,
  strengthDemand: 2,
  coordinationDemand: 2,
  fatigueScore: 1,
  equipment: ["bodyweight"],
  minLoad: 4,
  defaultLoad: 6,
  maxLoad: 12,
  loadStep: 2,
  defaultSets: 2,
  minRestSeconds: 15,
  maxRestSeconds: 45,
  setupSeconds: 20,
  bilateral: true,
  contraindicationTags: [],
  mediaId: "repdb-dead-bug",
  metadataVersion: 1,
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

describe("validateExercise", () => {
  it("requires exercise identity and a media reference", () => {
    expect(
      validateExercise({
        ...validExercise,
        id: " ",
        slug: "",
        mediaId: "  ",
      }),
    ).toEqual([
      "MISSING_EXERCISE_ID",
      "MISSING_EXERCISE_SLUG",
      "MISSING_EXERCISE_MEDIA",
    ]);
  });

  it.each([
    {
      caseName: "zero minimum load",
      minLoad: 0,
      defaultLoad: 6,
      maxLoad: 12,
    },
    {
      caseName: "default below minimum",
      minLoad: 4,
      defaultLoad: 2,
      maxLoad: 12,
    },
    {
      caseName: "default above maximum",
      minLoad: 4,
      defaultLoad: 14,
      maxLoad: 12,
    },
  ])("rejects $caseName", ({ minLoad, defaultLoad, maxLoad }) => {
    expect(
      validateExercise({
        ...validExercise,
        minLoad,
        defaultLoad,
        maxLoad,
      }),
    ).toEqual(["INVALID_LOAD_RANGE"]);
  });

  it("requires positive prescription values", () => {
    expect(
      validateExercise({
        ...validExercise,
        loadStep: 0,
        defaultSets: 0,
        setupSeconds: -1,
        metadataVersion: 0,
      }),
    ).toEqual([
      "INVALID_LOAD_STEP",
      "INVALID_DEFAULT_SETS",
      "INVALID_SETUP_SECONDS",
      "INVALID_METADATA_VERSION",
    ]);
  });

  it("rejects an inverted rest range", () => {
    expect(
      validateExercise({
        ...validExercise,
        minRestSeconds: 60,
        maxRestSeconds: 30,
      }),
    ).toEqual(["INVALID_REST_RANGE"]);
  });

  it("requires internal review before activation", () => {
    expect(
      validateExercise({
        ...validExercise,
        reviewedBy: null,
        reviewedAt: null,
      }),
    ).toEqual(["MISSING_EXERCISE_REVIEW"]);
  });
});
