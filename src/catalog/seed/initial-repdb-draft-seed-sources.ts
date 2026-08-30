import { REPDB_MEDIA_CATALOG } from "../repdb/repdb-media-catalog";
import { buildRepDbDraftSeedSources } from "./build-repdb-draft-seed-sources";
import { REPDB_CANDIDATE_ASSESSMENTS } from "./repdb-candidate-assessments";

const INITIAL_CANONICAL_EXERCISE_IDS = [
  "dead-bug",
  "forearm-plank",
  "side-plank",
] as const;

const result = buildRepDbDraftSeedSources(
  INITIAL_CANONICAL_EXERCISE_IDS,
  REPDB_CANDIDATE_ASSESSMENTS,
  REPDB_MEDIA_CATALOG,
);

if (!result.ok) {
  throw new Error(
    `Initial RepDB draft seed sources are invalid: ${JSON.stringify(result.issues)}`,
  );
}

// Draft status prevents source media from being mistaken for reviewed content.
export const INITIAL_REPDB_DRAFT_SEED_SOURCES = result.sources;
