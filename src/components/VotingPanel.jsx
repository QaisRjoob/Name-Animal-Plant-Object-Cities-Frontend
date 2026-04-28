import { useEffect, useState } from "react";
import { formatSeconds } from "../utils/format";
import { useTranslation } from "../i18n";

const VOTE_TYPES = ["correct", "incorrect", "duplicate"];

export function VotingPanel({ voting, onSubmit, hasVoted = false, players = [] }) {
  const { t } = useTranslation();
  const [voteType, setVoteType] = useState("");
  const [duplicateTargetId, setDuplicateTargetId] = useState("");
  const [now, setNow] = useState(Date.now());

  const resolveName = (id) => players.find((p) => p.id === id)?.name ?? null;

  useEffect(() => {
    if (!voting?.active) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [voting?.active]);

  // Reset local selection every time a new vote begins.
  useEffect(() => {
    setVoteType("");
    setDuplicateTargetId("");
  }, [voting?.target?.playerId, voting?.target?.category, voting?.active]);

  if (!voting?.active) return null;

  const remaining = voting.endsAt
    ? Math.max(0, Math.ceil((voting.endsAt - now) / 1000))
    : 0;

  const categoryLabel = voting.target?.category
    ? t(`categories.${voting.target.category}`)
    : t("categories.name");

  const hasCandidates = (voting.candidateDuplicates?.length ?? 0) > 0;

  // Submit is valid when:
  // - a vote type is chosen AND
  // - if duplicate + candidates exist, an original owner is selected
  const canSubmit =
    !!voteType &&
    !hasVoted &&
    (voteType !== "duplicate" || !hasCandidates || !!duplicateTargetId);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(voteType, duplicateTargetId ? [duplicateTargetId] : []);
  };

  return (
    <section className="game-card animate-fade-in border-accent/40">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-accent">{t("voting.title")}</h3>
        <span className="chip-accent">
          <span aria-hidden="true">{"⏱"}</span>
          {formatSeconds(remaining)}
        </span>
      </div>

      {/* Answer under review */}
      <div className="mb-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest subtle-text">
          {t("voting.answerUnderReview")}
        </p>
        <p className="text-lg font-bold text-accent">
          &ldquo;{voting.target?.answer || "-"}&rdquo;
        </p>
        <p className="mt-1 text-xs subtle-text">
          {t("voting.by")}{" "}
          <strong className="text-foreground">
            {resolveName(voting.target?.playerId) ?? voting.target?.playerName ?? "?"}
          </strong>
          {" · "}
          {categoryLabel}
        </p>
        {voting.initiatorId && resolveName(voting.initiatorId) && (
          <p className="mt-2 border-t border-accent/20 pt-2 text-xs subtle-text">
            {t("voting.startedBy")}:{" "}
            <strong className="text-foreground">{resolveName(voting.initiatorId)}</strong>
          </p>
        )}
      </div>

      {/* Vote type buttons */}
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {VOTE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => { setVoteType(type); if (type !== "duplicate") setDuplicateTargetId(""); }}
            className={`game-btn ${
              voteType === type
                ? "bg-accent text-white shadow-md shadow-accent/30"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {t(`voting.${type}`)}
          </button>
        ))}
      </div>

      {/* Duplicate: select the original owner (radio list) */}
      {voteType === "duplicate" && hasCandidates && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <p className="font-medium">{t("voting.selectOriginal")}</p>
          {voting.candidateDuplicates.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 subtle-text hover:text-foreground"
            >
              <input
                type="radio"
                name="duplicateOriginal"
                className="accent-[color:rgb(var(--color-accent))]"
                checked={duplicateTargetId === item.id}
                onChange={() => setDuplicateTargetId(item.id)}
              />
              <span>
                <span className="font-medium text-foreground">{item.playerName}</span>:{" "}
                {item.answer}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs subtle-text">
          {t("voting.progress")}: {voting.progress?.voted ?? 0}/{voting.progress?.total ?? 0}{" "}
          {t("voting.voted")}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="game-btn-primary"
        >
          {hasVoted ? `✓ ${t("voting.voted")}` : t("voting.submitVote")}
        </button>
      </div>
    </section>
  );
}
