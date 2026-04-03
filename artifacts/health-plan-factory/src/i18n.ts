import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

const savedLang = localStorage.getItem("hpf_lang");
const browserLang = navigator.language?.startsWith("es") ? "es" : "en";
const detectedLang = savedLang || browserLang;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: detectedLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("hpf_lang", lng);
});

export default i18n;
