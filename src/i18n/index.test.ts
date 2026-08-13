import en from "./en.json";
import tr from "./tr.json";
import { i18n, translate } from "./index";

describe("i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates a flat dotted key in English", async () => {
    await i18n.changeLanguage("en");

    expect(translate("welcome.headline")).toBe(
      "Your next workout adapts to how you perform.",
    );
  });

  it("translates the same key in Turkish", async () => {
    await i18n.changeLanguage("tr");

    expect(translate("welcome.headline")).toBe(
      "Bir sonraki antrenmanın performansına göre şekillenir.",
    );
  });

  it("replaces runtime tokens", async () => {
    await i18n.changeLanguage("tr");

    expect(
      translate("today.meta", {
        duration_minutes: 10,
        movement_count: 4,
      }),
    ).toBe("10 dakika · 4 hareket · Ekipman gerekmez");
  });

  it("keeps English and Turkish catalog keys identical", () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });
});