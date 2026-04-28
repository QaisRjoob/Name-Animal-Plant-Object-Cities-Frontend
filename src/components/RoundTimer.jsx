import { formatSeconds } from "../utils/format";
import { useTranslation } from "../i18n";

export function RoundTimer({ seconds, totalSeconds = 120, paused = false }) {
  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.max(0, Math.min(100, (seconds / safeTotal) * 100));
  const low = seconds <= 10;
  const { t } = useTranslation();

  return (
    <div className="game-card">
      <div className="mb-2 flex items-center justify-between text-xs subtle-text">
        <span>
          {t("states.PLAYING")}
          {paused ? " (\u23F8)" : ""}
        </span>
        <span className={low ? "font-bold text-danger" : "text-foreground"}>
          {formatSeconds(seconds)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${low ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
