import { useUIStore } from "../store/uiStore";
import { useTranslation } from "../i18n";

export function LanguageToggle({ className = "" }) {
  const language = useUIStore((state) => state.language);
  const toggleLanguage = useUIStore((state) => state.toggleLanguage);
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={t("ui.toggleLanguage")}
      title={t("ui.toggleLanguage")}
      className={`game-btn-ghost !px-3 !py-2 font-semibold ${className}`.trim()}
    >
      <span className="text-base" aria-hidden="true">{"\u{1F310}"}</span>
      <span>{language === "en" ? "AR" : "EN"}</span>
    </button>
  );
}
