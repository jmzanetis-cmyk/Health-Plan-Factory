import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "../locales/en.json";
import es from "../locales/es.json";

export const LANG_STORAGE_KEY = "hpf_lang";
export const SUPPORTED_LANGS = ["en", "es"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function getDeviceLocale(): SupportedLang {
  try {
    const locales = Localization.getLocales();
    const tag = locales?.[0]?.languageTag ?? "en";
    return tag.toLowerCase().startsWith("es") ? "es" : "en";
  } catch {
    return "en";
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getDeviceLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export async function applyStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "es" || stored === "en") {
      await i18n.changeLanguage(stored);
    }
  } catch {
  }
}

export async function changeLanguage(lang: SupportedLang): Promise<void> {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
