import { useState } from "react";
import { CATEGORIES } from "../constants/game";
import { useTranslation } from "../i18n";

/**
 * Lets a player initiate voting on any answer cell from any player.
 * Renders a button that opens an inline picker; calling onLaunch with
 * { playerId, playerName, category, answer } when confirmed.
 */
export function VotingLauncher({
  players,
  answersByPlayer,
  catScoresByPlayer,
  disabled,
  onLaunch,
  triggerClassName = "game-btn-secondary",
  panelClassName = "game-card animate-fade-in space-y-3 border-accent/40",
  confirmButtonClassName = "game-btn-primary w-full",
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pickerPlayerId, setPickerPlayerId] = useState("");
  const [pickerCategory, setPickerCategory] = useState("");

  if (!open) {
      return (
        <button
          type="button"
          className={triggerClassName}
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
        {t("game.startVoting")}
      </button>
    );
  }

  const playerOptions = (players ?? []).filter((player) => player?.id);
  const selectedAnswer =
    pickerPlayerId && pickerCategory
      ? answersByPlayer?.[pickerPlayerId]?.[pickerCategory] ?? ""
      : "";

  const selectedCs = pickerPlayerId && pickerCategory
    ? catScoresByPlayer?.[pickerPlayerId]?.[pickerCategory]
    : null;
  const isAnswerEmpty = selectedAnswer.trim() === "";
  const isAlreadyIncorrect = selectedCs?.votedIncorrect === true;
  const canLaunch = pickerPlayerId && pickerCategory && !isAnswerEmpty && !isAlreadyIncorrect;

  const launch = () => {
    if (!canLaunch) return;
    const player = playerOptions.find((p) => p.id === pickerPlayerId);
    onLaunch({
      playerId: pickerPlayerId,
      playerName: player?.name ?? player?.username ?? t("common.player"),
      category: pickerCategory,
      answer: selectedAnswer,
    });
    setOpen(false);
    setPickerPlayerId("");
    setPickerCategory("");
  };

  return (
    <div className={panelClassName}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-accent">{t("game.pickAnswerToVote")}</h3>
        <button
          type="button"
          className="game-btn-ghost !px-2 !py-1 text-xs"
          onClick={() => setOpen(false)}
        >
          {t("game.cancelVoting")}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs subtle-text">
          {t("common.player")}
          <select
            className="game-input mt-1"
            value={pickerPlayerId}
            onChange={(event) => setPickerPlayerId(event.target.value)}
          >
            <option value="">--</option>
            {playerOptions.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name ?? player.username ?? t("common.player")}
                {player.isBot ? ` [${t("common.bot")}]` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs subtle-text">
          {t("game.letterSelection")}
          <select
            className="game-input mt-1"
            value={pickerCategory}
            onChange={(event) => setPickerCategory(event.target.value)}
          >
            <option value="">--</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pickerPlayerId && pickerCategory ? (
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="subtle-text">{t(`categories.${pickerCategory}`)}:</span>{" "}
          <span className="font-semibold text-accent">{selectedAnswer || "-"}</span>
          {isAnswerEmpty && (
            <p className="mt-1 text-[11px] text-warn">{t("voting.emptyAnswer")}</p>
          )}
          {isAlreadyIncorrect && (
            <p className="mt-1 text-[11px] text-danger">{t("voting.alreadyIncorrect")}</p>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className={confirmButtonClassName}
        disabled={!canLaunch}
        onClick={launch}
      >
        {t("game.startVoting")}
      </button>
    </div>
  );
}
