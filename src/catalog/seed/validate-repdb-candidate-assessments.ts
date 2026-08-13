import type {
  RepDbCandidateAssessment,
  RepDbCandidateAssessmentIssue,
  RepDbCandidateAssessmentReason,
  RepDbCandidateMatch,
} from "./types";

const EXPECTED_REASON_BY_MATCH: Readonly<
  Record<RepDbCandidateMatch, RepDbCandidateAssessmentReason>
> = {
  exact: "DOCUMENTED_CANDIDATE_MATCH",
  variant_review_required: "SOURCE_VARIANT_DIFFERS_FROM_CANDIDATE",
  outside_candidate_set: "NOT_LISTED_IN_CANONICAL_CANDIDATES",
};

export function validateRepDbCandidateAssessments(
  selectedRepDbExerciseIds: readonly string[],
  assessments: readonly RepDbCandidateAssessment[],
): RepDbCandidateAssessmentIssue[] {
  const issues: RepDbCandidateAssessmentIssue[] = [];
  const selectedIds = new Set(selectedRepDbExerciseIds);
  const sourceCounts = countValues(
    assessments.map((assessment) => assessment.repDbExerciseId),
  );

  if (
    selectedRepDbExerciseIds.some(
      (exerciseId) => !sourceCounts.has(exerciseId),
    )
  ) {
    issues.push("MISSING_SOURCE_ASSESSMENT");
  }

  if (
    assessments.some(
      (assessment) => !selectedIds.has(assessment.repDbExerciseId),
    )
  ) {
    issues.push("UNKNOWN_SOURCE_ASSESSMENT");
  }

  if ([...sourceCounts.values()].some((count) => count > 1)) {
    issues.push("DUPLICATE_SOURCE_ASSESSMENT");
  }

  if (
    assessments.some(
      (assessment) =>
        assessment.match !== "outside_candidate_set" &&
        !isNonBlank(assessment.canonicalExerciseId),
    )
  ) {
    issues.push("MISSING_CANONICAL_EXERCISE_ID");
  }

  if (
    assessments.some(
      (assessment) =>
        assessment.match === "outside_candidate_set" &&
        assessment.canonicalExerciseId !== null,
    )
  ) {
    issues.push("UNEXPECTED_CANONICAL_EXERCISE_ID");
  }

  const uniqueAssessments = assessments.filter(
    (assessment, index) =>
      assessments.findIndex(
        (candidate) =>
          candidate.repDbExerciseId === assessment.repDbExerciseId,
      ) === index,
  );
  const exactCanonicalIds = uniqueAssessments
    .filter(
      (assessment) =>
        assessment.match === "exact" &&
        isNonBlank(assessment.canonicalExerciseId),
    )
    .map((assessment) => assessment.canonicalExerciseId as string);
  const exactCanonicalCounts = countValues(exactCanonicalIds);

  if ([...exactCanonicalCounts.values()].some((count) => count > 1)) {
    issues.push("DUPLICATE_EXACT_CANONICAL_MATCH");
  }

  if (
    assessments.some(
      (assessment) =>
        assessment.reason !== EXPECTED_REASON_BY_MATCH[assessment.match],
    )
  ) {
    issues.push("MATCH_REASON_MISMATCH");
  }

  return issues;
}

function countValues(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function isNonBlank(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}
