import type { Exercise, ExerciseRelation } from "./types";
import {
  validateExerciseRelation,
  validateExerciseRelations,
} from "./validate-exercise-relation";

const deadBug: Exercise = {
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

const longLeverDeadBug: Exercise = {
  ...deadBug,
  id: "long-lever-dead-bug",
  slug: "long-lever-dead-bug",
  level: 2,
  strengthDemand: 3,
  coordinationDemand: 3,
  fatigueScore: 2,
  mediaId: "repdb-long-lever-dead-bug",
};

const sidePlank: Exercise = {
  ...deadBug,
  id: "side-plank",
  slug: "side-plank",
  primaryPattern: "lateral_stability",
  secondaryPatterns: ["anti_rotation"],
  mediaId: "repdb-side-plank",
};

const progression: ExerciseRelation = {
  fromExerciseId: "dead-bug",
  toExerciseId: "long-lever-dead-bug",
  type: "progression",
  reason: "Increase lever length after the foundation variation.",
  status: "active",
  cycleApproved: false,
  reviewedBy: "internal-review",
  reviewedAt: "2026-08-13",
};

describe("validateExerciseRelation", () => {
  it("requires source, target, and reason", () => {
    expect(
      validateExerciseRelation({
        ...progression,
        fromExerciseId: " ",
        toExerciseId: "",
        reason: "  ",
      }),
    ).toEqual([
      "MISSING_RELATION_SOURCE",
      "MISSING_RELATION_TARGET",
      "MISSING_RELATION_REASON",
    ]);
  });

  it("blocks a relation that points to itself", () => {
    expect(
      validateExerciseRelation({
        ...progression,
        toExerciseId: "dead-bug",
      }),
    ).toEqual(["SELF_REFERENCING_RELATION"]);
  });

  it("requires internal review before activation", () => {
    expect(
      validateExerciseRelation({
        ...progression,
        reviewedBy: null,
        reviewedAt: null,
      }),
    ).toEqual(["MISSING_RELATION_REVIEW"]);
  });
});

describe("validateExerciseRelations", () => {
  const exercises = [deadBug, longLeverDeadBug, sidePlank];

  it("requires both related exercises to exist", () => {
    expect(
      validateExerciseRelations(
        [
          {
            ...progression,
            toExerciseId: "unknown-exercise",
          },
        ],
        exercises,
      ),
    ).toEqual(["RELATION_EXERCISE_NOT_FOUND"]);
  });

  it("blocks duplicate relations", () => {
    expect(
      validateExerciseRelations(
        [progression, { ...progression }],
        exercises,
      ),
    ).toEqual(["DUPLICATE_RELATION"]);
  });

  it("blocks an unapproved two-way progression cycle", () => {
    expect(
      validateExerciseRelations(
        [
          progression,
          {
            ...progression,
            fromExerciseId: "long-lever-dead-bug",
            toExerciseId: "dead-bug",
          },
        ],
        exercises,
      ),
    ).toEqual(["UNAPPROVED_PROGRESSION_CYCLE"]);
  });

  it("allows an explicitly approved progression cycle", () => {
    expect(
      validateExerciseRelations(
        [
          { ...progression, cycleApproved: true },
          {
            ...progression,
            fromExerciseId: "long-lever-dead-bug",
            toExerciseId: "dead-bug",
            cycleApproved: true,
          },
        ],
        exercises,
      ),
    ).toEqual([]);
  });

  it("requires substitutes to preserve the primary pattern", () => {
    expect(
      validateExerciseRelations(
        [
          {
            ...progression,
            toExerciseId: "side-plank",
            type: "substitute",
          },
        ],
        exercises,
      ),
    ).toEqual(["SUBSTITUTE_PATTERN_MISMATCH"]);
  });

  it("blocks a substitute that increases demand", () => {
    expect(
      validateExerciseRelations(
        [{ ...progression, type: "substitute" }],
        exercises,
      ),
    ).toEqual(["SUBSTITUTE_DEMAND_INCREASE"]);
  });

  it("allows a progression with a matching regression path", () => {
    expect(
      validateExerciseRelations(
        [
          progression,
          {
            ...progression,
            fromExerciseId: "long-lever-dead-bug",
            toExerciseId: "dead-bug",
            type: "regression",
            reason: "Return to the foundation variation.",
          },
        ],
        exercises,
      ),
    ).toEqual([]);
  });
});
