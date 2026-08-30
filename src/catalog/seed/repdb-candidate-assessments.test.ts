import selectedRecordsJson from "../repdb/generated/selected-records.json";
import {
  REPDB_CANDIDATE_ASSESSMENTS,
} from "./repdb-candidate-assessments";
import {
  validateRepDbCandidateAssessments,
} from "./validate-repdb-candidate-assessments";

describe("REPDB_CANDIDATE_ASSESSMENTS", () => {
  it("assesses every selected RepDB record exactly once", () => {
    expect(
      validateRepDbCandidateAssessments(
        selectedRecordsJson.records.map((record) => record.id),
        REPDB_CANDIDATE_ASSESSMENTS,
      ),
    ).toEqual([]);
  });
});
