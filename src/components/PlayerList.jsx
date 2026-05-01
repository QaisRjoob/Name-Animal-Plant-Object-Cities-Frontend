import { useTranslation } from "../i18n";

export function PlayerList({ players, ownerId, selectorPlayerId, stopPressedBy, currentUserId }) {
  const { t } = useTranslation();

  if (!players?.length) {
    return <p className="text-sm subtle-text">{t("game.waitingPlayers")}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {players.map((player) => {
        const isOwner = player.id === ownerId;
        const isSelector = player.id === selectorPlayerId;
        const isStopper = player.id === stopPressedBy;
        const isCurrent = player.id === currentUserId;

        const isDisconnected = !!player.disconnected;

        const base =
          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition";
        const tone = isSelector
          ? "border-accent bg-accent/20 text-foreground animate-pulse-ring"
          : isStopper
            ? "border-danger/60 bg-danger/15 text-danger"
            : isDisconnected
              ? "border-border/40 bg-muted/30 text-foreground/40 opacity-60"
              : "border-border bg-muted text-foreground";

        return (
          <li key={player.id} className={`${base} ${tone}`}>
            <span className="font-semibold">
              {player.name ?? player.username ?? t("common.player")}
            </span>
            {player.isBot ? (
              <span className="rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-bold text-warn">
                {t("common.bot")}
              </span>
            ) : null}
            {isCurrent ? <span className="text-[10px] subtle-text">({t("common.you")})</span> : null}
            {isOwner ? (
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                {t("common.owner")}
              </span>
            ) : null}
            {isSelector ? (
              <span className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                {t("badges.letterPicker")}
              </span>
            ) : null}
            {isStopper ? (
              <span className="rounded bg-danger/30 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                {t("badges.stop")}
              </span>
            ) : null}
            {isDisconnected ? (
              <span className="text-[11px]" title="Reconnecting...">⏳</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
