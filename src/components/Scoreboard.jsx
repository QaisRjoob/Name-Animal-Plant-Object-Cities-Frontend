import { useTranslation } from "../i18n";

export function Scoreboard({ players, scoresByPlayer, highlightUserId }) {
  const { t } = useTranslation();
  const rows = (players ?? [])
    .map((player) => ({
      ...player,
      score: Number(scoresByPlayer?.[player.id] ?? 0)
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="game-card overflow-x-auto">
      <h3 className="mb-3 text-lg font-semibold">{t("results.leaderboard")}</h3>
      {rows.length === 0 ? (
        <p className="text-sm subtle-text">{t("game.waitingPlayers")}</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide subtle-text">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">{t("common.player")}</th>
              <th className="px-3 py-2">{t("results.type")}</th>
              <th className="px-3 py-2 text-end">{t("results.score")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((player, index) => {
              const isMe = highlightUserId && player.id === highlightUserId;
              return (
                <tr
                  key={player.id}
                  className={`border-b border-border/60 ${isMe ? "bg-accent/5" : ""}`}
                >
                  <td className="px-3 py-2 subtle-text">
                    {index === 0 ? "\u{1F947}" : index === 1 ? "\u{1F948}" : index === 2 ? "\u{1F949}" : index + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {player.name ?? player.username ?? t("common.player")}
                    {isMe ? <span className="ms-2 text-[10px] subtle-text">({t("common.you")})</span> : null}
                  </td>
                  <td className="px-3 py-2 subtle-text">
                    {player.isBot ? t("results.botLabel") : t("results.human")}
                  </td>
                  <td className="px-3 py-2 text-end text-base font-bold text-accent">
                    {player.score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
