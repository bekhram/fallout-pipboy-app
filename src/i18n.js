import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/common.json";
import ru from "./locales/ru/common.json";
import uk from "./locales/uk/common.json";
import pl from "./locales/pl/common.json";

const LANGUAGE_STORAGE_KEY = "fallout_pipboy_language";

const savedLanguage =
  localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      uk: { translation: uk },
      pl: { translation: pl },
    },
    lng: savedLanguage,
    fallbackLng: "en",
    debug: true,
    returnNull: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;