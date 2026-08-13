import { getLocales } from "expo-localization";
import { createInstance } from "i18next";

import en from "./en.json";
import tr from "./tr.json";

import {
  resolveLocale,
  type SupportedLocale,
} from "./resolve-locale";

export type { SupportedLocale } from "./resolve-locale";
export type TranslationKey = keyof typeof en;

const deviceLanguage = getLocales()[0]?.languageCode;

export const activeLocale: SupportedLocale =
  resolveLocale(deviceLanguage);

export const i18n = createInstance();

void i18n.init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: activeLocale,
  fallbackLng: "en",
  supportedLngs: ["en", "tr"],
  keySeparator: false,
  initAsync: false,
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
});

export function translate(
  key: TranslationKey,
  values: Record<string, string | number> = {},
) {
  return i18n.t(key, values);
}