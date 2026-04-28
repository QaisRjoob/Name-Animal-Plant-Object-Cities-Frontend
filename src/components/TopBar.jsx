import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

/**
 * Reusable top bar for the app. Renders the app title, a slot for page-specific
 * actions, and theme/language togglers on the opposite side.
 */
export function TopBar({ title, subtitle, actions = null }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        {title ? <h1 className="text-2xl font-bold">{title}</h1> : null}
        {subtitle ? <p className="text-sm subtle-text">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
