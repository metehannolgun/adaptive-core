import { resolveLocale } from "./resolve-locale";

describe("resolveLocale", () => {
  it("uses Turkish when the device language is Turkish", () => {
    expect(resolveLocale("tr")).toBe("tr");
  });

  it.each(["en", "pt", "de", null])(
    "uses English when the device language is %s",
    (languageCode) => {
      expect(resolveLocale(languageCode)).toBe("en");
    },
  );
});