import type { ExerciseMedia } from "../types";
import type { RepDbCandidateAssessment } from "./types";
import { buildRepDbDraftSeedSources } from "./build-repdb-draft-seed-sources";

const assessments: RepDbCandidateAssessment[] = [
  {
    repDbExerciseId: "dead-bug",
    canonicalExerciseId: "dead-bug",
    match: "exact",
    reason: "DOCUMENTED_CANDIDATE_MATCH",
  },
];

const mediaCatalog = [
  {
    id: "repdb-dead-bug",
    exerciseId: "dead-bug",
  },
] as ExerciseMedia[];

describe("buildRepDbDraftSeedSources", () => {
  it("links an exact canonical candidate to its RepDB media as a draft source", () => {
    expect(
      buildRepDbDraftSeedSources(
        ["dead-bug"],
        assessments,
        mediaCatalog,
      ),
    ).toEqual({
      ok: true,
      sources: [
        {
          canonicalExerciseId: "dead-bug",
          repDbExerciseId: "dead-bug",
          mediaId: "repdb-dead-bug",
          status: "draft",
        },
      ],
    });
  });

  it("rejects a selected exercise without an exact candidate match", () => {
    expect(
      buildRepDbDraftSeedSources(
        ["bird-dog"],
        [
          {
            repDbExerciseId: "bird-dog-hold",
            canonicalExerciseId: "bird-dog",
            match: "variant_review_required",
            reason: "SOURCE_VARIANT_DIFFERS_FROM_CANDIDATE",
          },
        ],
        mediaCatalog,
      ),
    ).toEqual({
      ok: false,
      issues: [
        {
          canonicalExerciseId: "bird-dog",
          code: "MISSING_EXACT_CANDIDATE_MATCH",
        },
      ],
    });
  });

  it("rejects an exact candidate when its RepDB media is missing", () => {
    expect(
      buildRepDbDraftSeedSources(
        ["dead-bug"],
        assessments,
        [],
      ),
    ).toEqual({
      ok: false,
      issues: [
        {
          canonicalExerciseId: "dead-bug",
          code: "MISSING_REPDB_MEDIA",
        },
      ],
    });
  });
});
