import { CATEGORIES } from "../constants/game";
import { useTranslation } from "../i18n";

const CATEGORY_COLORS = {
  name:   { box: "bg-blue-500/15",   header: "text-blue-400",   dup: "bg-amber-400/35",  bad: "bg-red-500/30"  },
  plant:  { box: "bg-green-500/15",  header: "text-green-400",  dup: "bg-yellow-400/35", bad: "bg-red-600/30"  },
  animal: { box: "bg-orange-500/15", header: "text-orange-400", dup: "bg-yellow-500/35", bad: "bg-red-400/30"  },
  object: { box: "bg-violet-500/15", header: "text-violet-400", dup: "bg-amber-300/35",  bad: "bg-rose-500/30" },
  city:   { box: "bg-cyan-500/15",   header: "text-cyan-400",   dup: "bg-yellow-300/35", bad: "bg-red-500/30"  },
};

function getCellHighlight(catScoresByPlayer, playerId, category) {
  const cs = catScoresByPlayer?.[playerId]?.[category];
  if (!cs) return "";
  const colors = CATEGORY_COLORS[category];
  if (cs.duplicate) return colors?.dup ?? "bg-amber-400/35";
  if (cs.valid) return "bg-green-500/15";
  return colors?.bad ?? "bg-red-500/30";
}

export function AnswersTable({
  players,
  answersByPlayer,
  currentUserId,
  canEdit,
  onChange,
  highlightVotingTarget = null,
  catScoresByPlayer = null,
  onCellClick = null,
  selectedCell = null,
}) {
  const { t } = useTranslation();

  return (
    <div className="game-card overflow-x-auto scrollbar-thin">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide subtle-text">
            <th className="px-3 py-2">{t("common.player")}</th>
            {CATEGORIES.map((category) => (
              <th key={category} className={`px-3 py-2 ${CATEGORY_COLORS[category]?.header ?? ""}`}>
                {t(`categories.${category}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const row = answersByPlayer?.[player.id] ?? {};
            const isCurrentPlayer = player.id === currentUserId;
            return (
              <tr key={player.id} className="border-b border-border/60 align-top">
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-col">
                      <span className="font-medium">
                        {player.name ?? player.username ?? t("common.player")}
                      </span>
                    <span className="text-[10px] subtle-text">
                      {player.isBot ? t("common.bot") : ""}
                      {isCurrentPlayer ? (player.isBot ? " · " : "") + `(${t("common.you")})` : ""}
                    </span>
                  </div>
                </td>
                {CATEGORIES.map((category) => {
                  const isHighlighted =
                    highlightVotingTarget &&
                    highlightVotingTarget.playerId === player.id &&
                    highlightVotingTarget.category === category;
                  const cellExtra = isHighlighted
                    ? "ring-2 ring-accent/70 rounded-lg"
                    : "";
                  const cellHighlight = getCellHighlight(catScoresByPlayer, player.id, category);
                  return (
                    <td
                      key={`${player.id}-${category}`}
                      className={`px-3 py-2 ${cellExtra}`}
                    >
                      {isCurrentPlayer ? (
                        <input
                          value={row[category] ?? ""}
                          onChange={(event) => onChange(category, event.target.value)}
                          disabled={!canEdit}
                          className={`game-input min-w-36 ${cellHighlight || (CATEGORY_COLORS[category]?.box ?? "")}`}
                          placeholder={t(`categories.${category}`)}
                          maxLength={32}
                        />
                      ) : (() => {
                        const answer = row[category] ?? "";
                        const isSelected =
                          selectedCell?.playerId === player.id &&
                          selectedCell?.category === category;
                        const cs = catScoresByPlayer?.[player.id]?.[category];
                        const isVotedIncorrect = cs?.votedIncorrect === true;
                        const isClickable =
                          !!onCellClick && answer.trim() !== "" && !isVotedIncorrect;
                        return (
                          <div
                            className={`min-h-10 rounded-lg border px-3 py-2 transition-all
                              ${cellHighlight || CATEGORY_COLORS[category]?.box || "bg-muted/50"}
                              ${isSelected ? "ring-2 ring-accent" : ""}
                              ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-accent/50" : "border-border"}
                            `}
                            onClick={isClickable ? () => onCellClick({
                              playerId: player.id,
                              playerName: player.name ?? player.username,
                              category,
                              answer,
                            }) : undefined}
                          >
                            {answer}
                          </div>
                        );
                      })()}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
