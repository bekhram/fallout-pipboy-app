import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/common.json";

const LANGUAGES = ["en", "ru", "uk", "pl"];
const LANGUAGE_STORAGE_KEY = "fallout_pipboy_language";
const loaders = import.meta.glob("./locales/{ru,uk,pl}/common.json", { import: "default" });

const backend = {
  type: "backend",
  read(language, _namespace, callback) {
    const load = loaders[`./locales/${language}/common.json`];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then((data) => callback(null, data), (error) => callback(error, false));
  },
};

function normalizeLanguage(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return LANGUAGES.includes(code) ? code : "en";
}

function applyDocumentLanguage(language) {
  if (typeof document !== "undefined") document.documentElement.lang = normalizeLanguage(language);
}

const savedLanguage = typeof localStorage === "undefined"
  ? "en"
  : normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));

export const i18nReady = i18n.use(backend).use(initReactI18next).init({
  resources: { en: { translation: en } },
  partialBundledLanguages: true,
  supportedLngs: LANGUAGES,
  load: "languageOnly",
  lng: savedLanguage,
  fallbackLng: "en",
  debug: false,
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  const language = normalizeLanguage(lng);
  if (typeof localStorage !== "undefined") localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  applyDocumentLanguage(language);
});

applyDocumentLanguage(savedLanguage);
export default i18n;
