import type {
  CatalogValidationCode,
  ExerciseContent,
  SupportedLocale,
} from "./types";

const REQUIRED_LOCALES: readonly SupportedLocale[] = ["en", "tr"];

export function validateExerciseLocales(
  contents: readonly ExerciseContent[],
): CatalogValidationCode[] {
  return REQUIRED_LOCALES.flatMap((locale) => {
    const contentCount = contents.filter(
      (content) => content.locale === locale,
    ).length;

    if (contentCount === 0) {
      return [
        locale === "en"
          ? "MISSING_EN_CONTENT"
          : "MISSING_TR_CONTENT",
      ];
    }

    if (contentCount > 1) {
      return [
        locale === "en"
          ? "DUPLICATE_EN_CONTENT"
          : "DUPLICATE_TR_CONTENT",
      ];
    }

    return [];
  });
}