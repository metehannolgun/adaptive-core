export type SupportedLocale = "en" | "tr";

export function resolveLocale(
  languageCode: string | null,
): SupportedLocale {
  return languageCode === "tr" ? "tr" : "en";
}