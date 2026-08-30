import type { ExerciseMedia } from "../types";
import type { RepDbCandidateAssessment } from "./types";

type RepDbDraftSeedSourceIssue = {
  canonicalExerciseId: string;
  code:
    | "MISSING_EXACT_CANDIDATE_MATCH"
    | "MISSING_REPDB_MEDIA";
};

export function buildRepDbDraftSeedSources(
  canonicalExerciseIds: readonly string[],
  assessments: readonly RepDbCandidateAssessment[],
  mediaCatalog: readonly ExerciseMedia[],
) {
  const issues: RepDbDraftSeedSourceIssue[] =
    canonicalExerciseIds.flatMap((canonicalExerciseId) =>
      assessments.some(
        (candidate) =>
          candidate.match === "exact" &&
          candidate.canonicalExerciseId === canonicalExerciseId,
      )
        ? []
        : [
            {
              canonicalExerciseId,
              code: "MISSING_EXACT_CANDIDATE_MATCH" as const,
            },
          ],
    );

  const mediaIssues = canonicalExerciseIds.flatMap(
    (canonicalExerciseId) => {
      const assessment = assessments.find(
        (candidate) =>
          candidate.match === "exact" &&
          candidate.canonicalExerciseId === canonicalExerciseId,
      );

      if (
        !assessment ||
        mediaCatalog.some(
          (media) => media.exerciseId === assessment.repDbExerciseId,
        )
      ) {
        return [];
      }

      return [
        {
          canonicalExerciseId,
          code: "MISSING_REPDB_MEDIA" as const,
        },
      ];
    },
  );

  issues.push(...mediaIssues);

  if (issues.length > 0) {
    return {
      ok: false as const,
      issues,
    };
  }

  const sources = canonicalExerciseIds.flatMap((canonicalExerciseId) => {
    const assessment = assessments.find(
      (candidate) =>
        candidate.match === "exact" &&
        candidate.canonicalExerciseId === canonicalExerciseId,
    );

    if (!assessment) {
      return [];
    }

    const media = mediaCatalog.find(
      (candidate) =>
        candidate.exerciseId === assessment.repDbExerciseId,
    );

    if (!media) {
      return [];
    }

    return [
      {
        canonicalExerciseId,
        repDbExerciseId: assessment.repDbExerciseId,
        mediaId: media.id,
        status: "draft" as const,
      },
    ];
  });

  return {
    ok: true as const,
    sources,
  };
}
