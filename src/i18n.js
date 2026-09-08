import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/common.json";
import ru from "./locales/ru/common.json";
import uk from "./locales/uk/common.json";
import pl from "./locales/pl/common.json";

const LANGUAGE_STORAGE_KEY = "fallout_pipboy_language";

function normalizeLanguage(language) {
  const code = String(language || "en")
    .toLowerCase()
    .split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

function applyDocumentLanguage(language) {
  if (typeof document !== "undefined")
    document.documentElement.lang = normalizeLanguage(language);
}

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    uk: { translation: uk },
    pl: { translation: pl },
  },
  lng: normalizeLanguage(savedLanguage),
  fallbackLng: "en",
  debug: true,
  returnNull: false,
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  const language = normalizeLanguage(lng);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  applyDocumentLanguage(language);
});

applyDocumentLanguage(i18n.language || savedLanguage);

export default i18n;
