import {
  validateRepDbCandidateAssessments,
} from "./validate-repdb-candidate-assessments";
import type { RepDbCandidateAssessment } from "./types";

const exactAssessment: RepDbCandidateAssessment = {
  repDbExerciseId: "dead-bug",
  canonicalExerciseId: "dead-bug",
  match: "exact",
  reason: "DOCUMENTED_CANDIDATE_MATCH",
};

const outsideAssessment: RepDbCandidateAssessment = {
  repDbExerciseId: "sit-ups",
  canonicalExerciseId: null,
  match: "outside_candidate_set",
  reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
};

describe("validateRepDbCandidateAssessments", () => {
  it("accepts one complete and consistent assessment per selected record", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug", "sit-ups"],
        [exactAssessment, outsideAssessment],
      ),
    ).toEqual([]);
  });

  it("reports missing and unknown source assessments", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug", "sit-ups"],
        [
          exactAssessment,
          {
            ...outsideAssessment,
            repDbExerciseId: "unknown-source",
          },
        ],
      ),
    ).toEqual([
      "MISSING_SOURCE_ASSESSMENT",
      "UNKNOWN_SOURCE_ASSESSMENT",
    ]);
  });

  it("reports duplicate source assessments", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug"],
        [exactAssessment, exactAssessment],
      ),
    ).toEqual(["DUPLICATE_SOURCE_ASSESSMENT"]);
  });

  it("requires candidate IDs for exact and variant matches", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug"],
        [{ ...exactAssessment, canonicalExerciseId: null }],
      ),
    ).toEqual(["MISSING_CANONICAL_EXERCISE_ID"]);
  });

  it("forbids candidate IDs for records outside the candidate set", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["sit-ups"],
        [{ ...outsideAssessment, canonicalExerciseId: "sit-ups" }],
      ),
    ).toEqual(["UNEXPECTED_CANONICAL_EXERCISE_ID"]);
  });

  it("rejects duplicate exact matches for one canonical exercise", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug", "dead-bug-copy"],
        [
          exactAssessment,
          { ...exactAssessment, repDbExerciseId: "dead-bug-copy" },
        ],
      ),
    ).toEqual(["DUPLICATE_EXACT_CANONICAL_MATCH"]);
  });

  it("rejects a reason code that contradicts the match type", () => {
    expect(
      validateRepDbCandidateAssessments(
        ["dead-bug"],
        [
          {
            ...exactAssessment,
            reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
          },
        ],
      ),
    ).toEqual(["MATCH_REASON_MISMATCH"]);
  });
});
