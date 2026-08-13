export type RepDbCandidateMatch =
  | "exact"
  | "variant_review_required"
  | "outside_candidate_set";

export type RepDbCandidateAssessmentReason =
  | "DOCUMENTED_CANDIDATE_MATCH"
  | "SOURCE_VARIANT_DIFFERS_FROM_CANDIDATE"
  | "NOT_LISTED_IN_CANONICAL_CANDIDATES";

export type RepDbCandidateAssessment = {
  repDbExerciseId: string;
  canonicalExerciseId: string | null;
  match: RepDbCandidateMatch;
  reason: RepDbCandidateAssessmentReason;
};

export type RepDbCandidateAssessmentIssue =
  | "MISSING_SOURCE_ASSESSMENT"
  | "UNKNOWN_SOURCE_ASSESSMENT"
  | "DUPLICATE_SOURCE_ASSESSMENT"
  | "MISSING_CANONICAL_EXERCISE_ID"
  | "UNEXPECTED_CANONICAL_EXERCISE_ID"
  | "DUPLICATE_EXACT_CANONICAL_MATCH"
  | "MATCH_REASON_MISMATCH";
