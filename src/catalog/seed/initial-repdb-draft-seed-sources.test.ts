import { INITIAL_REPDB_DRAFT_SEED_SOURCES } from "./initial-repdb-draft-seed-sources";

describe("INITIAL_REPDB_DRAFT_SEED_SOURCES", () => {
  it("contains the first three exact candidates in the approved order", () => {
    expect(INITIAL_REPDB_DRAFT_SEED_SOURCES).toEqual([
      {
        canonicalExerciseId: "dead-bug",
        repDbExerciseId: "dead-bug",
        mediaId: "repdb-dead-bug",
        status: "draft",
      },
      {
        canonicalExerciseId: "forearm-plank",
        repDbExerciseId: "plank",
        mediaId: "repdb-plank",
        status: "draft",
      },
      {
        canonicalExerciseId: "side-plank",
        repDbExerciseId: "side-plank",
        mediaId: "repdb-side-plank",
        status: "draft",
      },
    ]);
  });
});
