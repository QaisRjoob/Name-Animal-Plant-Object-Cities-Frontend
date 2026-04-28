import { useTranslation } from "../i18n";

export function GameStateBadge({ state }) {
  const { t } = useTranslation();
  const label = t(`states.${state}`);
  const display = label && label !== `states.${state}` ? label : state;

  const tone =
    state === "PLAYING"
      ? "border-good/50 bg-good/15 text-good"
      : state === "VOTING"
        ? "border-accent/50 bg-accent/15 text-accent"
        : state === "STOPPED"
          ? "border-danger/50 bg-danger/15 text-danger"
          : state === "FINISHED"
            ? "border-warn/50 bg-warn/15 text-warn"
            : "border-border bg-muted text-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      {display}
    </span>
  );
}
