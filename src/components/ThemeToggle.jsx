import { useUIStore } from "../store/uiStore";
import { useTranslation } from "../i18n";

export function ThemeToggle({ className = "" }) {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { t } = useTranslation();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("ui.toggleTheme")}
      title={t("ui.toggleTheme")}
      className={`game-btn-ghost !px-2 !py-2 ${className}`.trim()}
    >
      <span className="text-base" aria-hidden="true">
        {isDark ? "\u2600\uFE0F" : "\u{1F319}"}
      </span>
      <span className="hidden sm:inline">{isDark ? t("ui.light") : t("ui.dark")}</span>
    </button>
  );
}
