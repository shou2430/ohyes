import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zhTW from "./zh-TW.json";

const LANG_STORAGE_KEY = "ohyes_lang";
const SUPPORTED_LANGUAGES = ["en", "zh-TW"];

// D-01: no browser-language detection — resolve solely from the persisted
// key, validated against the allow-list, else default to zh-TW (D-03).
// This is the concrete mitigation for T-05-01 (tampered/unknown stored
// value falls back to zh-TW instead of breaking rendering).
function resolveInitialLanguage() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : "zh-TW";
}

const initialLanguage = resolveInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLanguage;

// Centralized persistence + html-lang sync: any caller of changeLanguage
// (e.g. LanguageToggle) gets both localStorage persistence and
// document.documentElement.lang sync for free.
i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANG_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

export default i18n;
