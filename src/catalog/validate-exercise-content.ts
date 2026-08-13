import type {
  CatalogValidationCode,
  ExerciseContent,
} from "./types";

export function validateExerciseContent(
  content: ExerciseContent,
): CatalogValidationCode[] {
  const issues: CatalogValidationCode[] = [];

  if (content.name.trim().length === 0) {
    issues.push("MISSING_NAME");
  }

  if (content.setupInstruction.trim().length === 0) {
    issues.push("MISSING_SETUP_INSTRUCTION");
  }

  if (content.cues.length === 0) {
    issues.push("MISSING_CUE");
  } else if (content.cues.length > 3) {
    issues.push("TOO_MANY_CUES");
  }

  if (content.breathingCue.trim().length === 0) {
    issues.push("MISSING_BREATHING_CUE");
  }

  if (content.commonMistakes.length === 0) {
    issues.push("MISSING_COMMON_MISTAKE");
  }

  if (content.stopConditions.length === 0) {
    issues.push("MISSING_STOP_CONDITION");
  }

  if (content.altText.trim().length === 0) {
    issues.push("MISSING_ALT_TEXT");
  }

  return issues;
}
