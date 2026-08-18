import { useTranslation } from "react-i18next";

// Text toggle (繁 / EN) — D-01/D-02. Only calls i18n.changeLanguage; the
// centralized "languageChanged" listener in src/i18n/index.js owns
// localStorage persistence and document.documentElement.lang sync.
export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isZhTW = i18n.language === "zh-TW";

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        type="button"
        onClick={() => i18n.changeLanguage("zh-TW")}
        aria-pressed={isZhTW}
        className={`rounded-md px-2 py-1 transition-colors ${
          isZhTW
            ? "text-text-primary opacity-100"
            : "text-text-secondary opacity-60 hover:opacity-100"
        }`}
      >
        繁
      </button>
      <span className="text-text-secondary">/</span>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        aria-pressed={!isZhTW}
        className={`rounded-md px-2 py-1 transition-colors ${
          !isZhTW
            ? "text-text-primary opacity-100"
            : "text-text-secondary opacity-60 hover:opacity-100"
        }`}
      >
        EN
      </button>
    </div>
  );
}
