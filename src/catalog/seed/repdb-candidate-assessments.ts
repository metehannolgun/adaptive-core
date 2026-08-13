import type { RepDbCandidateAssessment } from "./types";

// "exact" only means the source media matches a named canonical candidate.
// It does not approve exercise safety, instructions, metadata, or activation.
export const REPDB_CANDIDATE_ASSESSMENTS = [
  {
    repDbExerciseId: "dead-bug",
    canonicalExerciseId: "dead-bug",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "plank",
    canonicalExerciseId: "forearm-plank",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "high-plank",
    canonicalExerciseId: "high-plank",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "side-plank",
    canonicalExerciseId: "side-plank",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "bird-dog-hold",
    canonicalExerciseId: "bird-dog",
    match: "variant_review_required",
    reason: "SOURCE_VARIANT_DIFFERS_FROM_CANDIDATE",
  },
  {
    repDbExerciseId: "crunches",
    canonicalExerciseId: "crunch",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "sit-ups",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "bicycle-crunch",
    canonicalExerciseId: "bicycle-crunch",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "russian-twist",
    canonicalExerciseId: "russian-twist-feet-supported",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "mountain-climbers",
    canonicalExerciseId: "slow-mountain-climber",
    match: "variant_review_required",
    reason: "SOURCE_VARIANT_DIFFERS_FROM_CANDIDATE",
  },
  {
    repDbExerciseId: "flutter-kicks",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "lying-leg-raise",
    canonicalExerciseId: "leg-raise-straight-leg",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
  {
    repDbExerciseId: "glute-bridge",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "glute-kickback",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "clamshells",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "side-lying-hip-abduction",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "bodyweight-good-morning",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
  {
    repDbExerciseId: "superman",
    canonicalExerciseId: null,
    match: "outside_candidate_set",
    reason: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
  },
] as const satisfies readonly RepDbCandidateAssessment[];
