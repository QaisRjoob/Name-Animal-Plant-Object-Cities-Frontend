import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CATEGORIES, GAME_STATES, LETTER_MODES } from "../constants/game";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useGameActions } from "../hooks/useGameActions";
import { roomsApi } from "../services/apiClient";
import { roomDetailsToSnapshot } from "../utils/backendAdapters";
import { isValidLetter, normalizeLetter } from "../utils/letters";
import {
  initSoundEffects,
  playCountdownGo,
  playCountdownTick,
  playGameFinished,
  playRoundTransition,
  playStopPressed,
  playVotingStart,
} from "../utils/soundEffects";
import { useTranslation } from "../i18n";
import { GameStateBadge } from "../components/GameStateBadge";
import { AnswersTable } from "../components/AnswersTable";
import { VotingPanel } from "../components/VotingPanel";
import { VotingLauncher } from "../components/VotingLauncher";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";

// ── Full-page countdown before the game starts ────────────────────────────────
function CountdownOverlay({ onDone }) {
  const [count, setCount] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (count <= 0) {
      playCountdownGo();
      const id = setTimeout(() => onDoneRef.current?.(), 800);
      return () => clearTimeout(id);
    }
    playCountdownTick(count);
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count]);

  const isGo = count === 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgb(var(--color-surface))" }}
    >
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="h-[50vmin] w-[50vmin] rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div
        key={`ring-${count}`}
        className="pointer-events-none absolute h-[30vmin] w-[30vmin] rounded-full border-4 border-accent/50"
        style={{ animation: "countdown-ring 900ms ease-out forwards" }}
        aria-hidden="true"
      />

      {isGo ? (
        <span
          key="go"
          className="relative select-none font-black text-good"
          style={{
            fontSize: "18vmin",
            lineHeight: 1,
            animation: "countdown-go 500ms cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          GO!
        </span>
      ) : (
        <span
          key={count}
          className="relative select-none bg-gradient-to-br from-accent to-accent-hover bg-clip-text font-black text-transparent"
          style={{
            fontSize: "30vmin",
            lineHeight: 1,
            animation: "countdown-pop 1000ms cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          {count}
        </span>
      )}

      <p
        className="relative mt-6 text-sm subtle-text"
        style={{ animation: "fade-in 400ms ease-out" }}
      >
        Get ready…
      </p>
    </div>
  );
}

// ── Round transition overlay ───────────────────────────────────────────────────
function RoundTransitionOverlay({ roundNumber }) {
  useEffect(() => {
    playRoundTransition();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgb(var(--color-surface))" }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="h-[60vmin] w-[60vmin] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute h-[32vmin] w-[32vmin] rounded-full border-4 border-accent/40"
        style={{ animation: "round-ring-pulse 1.4s ease-out infinite" }}
        aria-hidden="true"
      />

      <p
        className="relative text-sm font-bold uppercase tracking-[0.5em] text-accent/80"
        style={{ animation: "round-label-in 400ms cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        Round
      </p>

      <span
        className="relative select-none bg-gradient-to-br from-accent to-accent-hover bg-clip-text font-black text-transparent"
        style={{
          fontSize: "28vmin",
          lineHeight: 1,
          animation: "round-number-pop 600ms 80ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {roundNumber}
      </span>

      <div className="relative mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-accent/60 animate-bounce"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Voting start overlay ───────────────────────────────────────────────────────
function VotingStartOverlay({ target, initiatorId, players, t }) {
  const targetPlayer =
    players?.find((p) => p.id === target?.playerId)?.name ?? "?";
  const initiatorName =
    players?.find((p) => p.id === initiatorId)?.name ?? null;

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden pb-[28vh]"
      style={{ background: "rgba(var(--color-surface), 0.93)", animation: "fade-in 180ms ease-out" }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[50vmin] w-[50vmin] rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute h-[28vmin] w-[28vmin] rounded-full border-4 border-accent/40"
        style={{ animation: "round-ring-pulse 1.2s ease-out infinite" }}
      />
      <span
        className="relative text-5xl"
        style={{ animation: "countdown-pop 500ms cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        ⚖️
      </span>
      <p
        className="relative mt-3 text-xl font-black uppercase tracking-[0.4em] text-accent"
        style={{ animation: "round-label-in 400ms 80ms cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {t("voting.title")}
      </p>
      {initiatorName && (
        <p
          className="relative mt-2 text-sm subtle-text"
          style={{ animation: "round-label-in 400ms 160ms cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {t("voting.startedBy")}: <strong className="text-foreground">{initiatorName}</strong>
        </p>
      )}
      {target?.answer && (
        <div
          className="relative mt-5 rounded-2xl border border-border bg-card px-8 py-4 text-center shadow-lg"
          style={{ animation: "round-label-in 400ms 260ms cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest subtle-text">
            {t("voting.answerUnderReview")}
          </p>
          <p className="text-2xl font-bold">&ldquo;{target.answer}&rdquo;</p>
          <p className="mt-2 text-sm subtle-text">
            {t("voting.by")} <strong className="text-foreground">{targetPlayer}</strong>
            {" · "}
            {t(`categories.${target.category}`)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Avatar colour palette ──────────────────────────────────────────────────────
const PLAYER_COLORS = [
  "#7c3aed", "#0891b2", "#d97706", "#059669", "#dc2626",
  "#c026d3", "#0284c7", "#65a30d", "#ea580c", "#9333ea",
];
function getPlayerColor(idx) {
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

function createEmptyAnswerRow() {
  return CATEGORIES.reduce((accumulator, category) => {
    accumulator[category] = "";
    return accumulator;
  }, {});
}

// ── Slim sidebar with live player indicators ───────────────────────────────────
function PlayerSidebar({ players, ownerId, selectorPlayerId, stopPressedBy, currentUserId, answersByPlayer, onLeaderboard, t }) {
  return (
    <aside className="hidden sm:flex w-36 flex-shrink-0 flex-col gap-3">
      <div className="game-card flex-1 overflow-y-auto p-3 scrollbar-thin">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest subtle-text">
            {t("common.players")}
          </span>
          <span className="text-[10px] subtle-text">{players.length}/10</span>
        </div>
        <ul className="space-y-1">
          {players.map((player, i) => {
            const isOwner    = player.id === ownerId;
            const isSelector = player.id === selectorPlayerId;
            const isStopper  = player.id === stopPressedBy;
            const isCurrent  = player.id === currentUserId;
            const answers    = answersByPlayer?.[player.id] ?? {};
            const isTyping   = Object.values(answers).some((v) => v && v.trim());
            const color      = getPlayerColor(i);

            return (
              <li
                key={player.id}
                className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors ${
                  isCurrent ? "bg-accent/10" : "hover:bg-muted/40"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ background: color }}
                  >
                    {(player.name ?? player.username ?? "?")[0].toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                      isSelector ? "animate-pulse bg-accent" :
                      isStopper  ? "bg-danger" :
                      isTyping   ? "bg-good" :
                      "bg-border"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold leading-tight">
                    {player.name ?? player.username ?? t("common.player")}
                  </p>
                  <p className="text-[9px] leading-tight subtle-text">
                    {isSelector ? "✦ picker" :
                     isStopper  ? "✋ stop" :
                     isTyping   ? "✍ typing" :
                     player.isBot ? t("common.bot") : " "}
                    {isCurrent ? ` (${t("common.you")})` : ""}
                  </p>
                </div>

                {isOwner && <span className="flex-shrink-0 text-[9px] text-accent">♛</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        className="game-btn-secondary flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold"
        onClick={onLeaderboard}
      >
        <span className="text-base">🏆</span>
        <span>{t("results.leaderboard")}</span>
      </button>
    </aside>
  );
}

// ── Thin animated progress bar (replaces RoundTimer box) ──────────────────────
function TimerBar({ seconds, totalSeconds = 120, paused }) {
  const safeTotal = Math.max(1, totalSeconds);
  const pct       = Math.max(0, Math.min(100, ((seconds ?? 0) / safeTotal) * 100));
  const low       = (seconds ?? 0) <= 10;
  const veryLow   = (seconds ?? 0) <= 5;

  return (
    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          veryLow ? "animate-pulse bg-danger" :
          low     ? "bg-warn" :
          paused  ? "bg-border" :
          "bg-accent"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Round results popup ────────────────────────────────────────────────────────
function RoundResultsModal({
  players, answersByPlayer, roundResultAnswersByPlayer, scoresByPlayer, catScoresByPlayer,
  roundNumber, totalRounds,
  onNext, readyCount, totalPlayers,
  voting, onStartVoting, hasVoted, onSubmitVote,
  isFinished, onClose, t,
  currentUserId,
}) {
  const [selectedCell, setSelectedCell] = useState(null);

  const ranked = [...(players ?? [])]
    .map((p, i) => ({ ...p, _idx: i, score: Number(scoresByPlayer?.[p.id] ?? 0) }))
    .sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  const baseAnswers =
    roundResultAnswersByPlayer && Object.keys(roundResultAnswersByPlayer).length > 0
      ? roundResultAnswersByPlayer
      : answersByPlayer;
  const hasCatScores = catScoresByPlayer && Object.keys(catScoresByPlayer).length > 0;
  const displayAnswers = hasCatScores
    ? Object.fromEntries(
        (players ?? []).map((player) => [
          player.id,
          Object.fromEntries(
            CATEGORIES.map((category) => [
              category,
              catScoresByPlayer?.[player.id]?.[category]?.answer ??
                baseAnswers?.[player.id]?.[category] ??
                "",
            ])
          ),
        ])
      )
    : baseAnswers;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="game-card animate-fade-in w-full max-w-6xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="mb-4">
          <h2 className="text-lg font-bold">
            🎯 {t("game.round")} {roundNumber} {t("game.of")} {totalRounds} — {t("nav.results")}
          </h2>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-2 lg:w-44 lg:flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest subtle-text">Scores</span>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {ranked.map((p, rank) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2"
                >
                  <span className="w-5 flex-shrink-0 text-center text-base">{medals[rank] ?? rank + 1}</span>
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ background: getPlayerColor(p._idx) }}
                  >
                    {(p.name ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-xs font-medium">{p.name ?? p.username}</span>
                  <span className="flex-shrink-0 font-black text-accent">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              {!isFinished && !voting?.active && (
                <p className="text-[11px] subtle-text">
                  💡 {t("game.clickAnswerToVote")}
                </p>
              )}
              {!isFinished && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex flex-wrap justify-end gap-2">
                    <VotingLauncher
                      players={players}
                      answersByPlayer={displayAnswers}
                      catScoresByPlayer={catScoresByPlayer}
                      disabled={voting?.active}
                      onLaunch={(cell) => { onStartVoting(cell); setSelectedCell(null); }}
                      triggerClassName="game-btn-secondary"
                      panelClassName="game-card animate-fade-in space-y-3 border-accent/40"
                      confirmButtonClassName="game-btn-primary w-full"
                    />
                    <button
                      type="button"
                      className="game-btn-primary"
                      onClick={onNext}
                      disabled={voting?.active}
                    >
                      {t("game.nextRound")}
                      {readyCount > 0 && (
                        <span className="ms-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                          {readyCount}/{totalPlayers}
                        </span>
                      )}
                    </button>
                  </div>
                  {readyCount > 0 && readyCount < totalPlayers && (
                    <span className="text-xs subtle-text">
                      {t("game.waitingFor")} {Math.max(0, totalPlayers - readyCount)} {t("game.morePlayers")}
                    </span>
                  )}
                </div>
              )}
            </div>
            <AnswersTable
              players={players}
              answersByPlayer={displayAnswers}
              currentUserId={currentUserId}
              canEdit={false}
              onChange={() => {}}
              catScoresByPlayer={catScoresByPlayer}
              onCellClick={!isFinished && !voting?.active ? (cell) => setSelectedCell(cell) : null}
              selectedCell={selectedCell}
            />
          </div>
        </div>

        {selectedCell && !voting?.active && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 animate-fade-in">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-accent">
                {t("game.startVoting")}:{" "}
                <span className="text-foreground font-normal">
                  <strong>{selectedCell.playerName}</strong> — {t(`categories.${selectedCell.category}`)}: &ldquo;{selectedCell.answer}&rdquo;
                </span>
              </p>
            </div>
            <button
              type="button"
              className="game-btn-primary text-sm"
              onClick={() => { onStartVoting(selectedCell); setSelectedCell(null); }}
            >
              {t("game.startVoting")}
            </button>
            <button
              type="button"
              className="game-btn-ghost text-sm"
              onClick={() => setSelectedCell(null)}
            >
              {t("game.cancelVoting")}
            </button>
          </div>
        )}

        {voting?.active && (
          <div className="mt-4">
            <VotingPanel voting={voting} onSubmit={onSubmitVote} hasVoted={hasVoted} players={players} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {!isFinished && (
            <>
              <VotingLauncher
                players={players}
                answersByPlayer={displayAnswers}
                catScoresByPlayer={catScoresByPlayer}
                disabled={voting?.active}
                onLaunch={(cell) => { onStartVoting(cell); setSelectedCell(null); }}
                triggerClassName="game-btn-primary"
                panelClassName="game-card animate-fade-in space-y-3 border-good/40"
                confirmButtonClassName="game-btn-secondary w-full"
              />
              <button
                type="button"
                className="game-btn bg-good text-white shadow-md shadow-good/30 hover:brightness-110"
                onClick={onNext}
                disabled={voting?.active}
              >
                {t("game.nextRound")}
                {readyCount > 0 && (
                  <span className="ms-2 rounded bg-border/40 px-1.5 py-0.5 text-[10px]">
                    {readyCount}/{totalPlayers}
                  </span>
                )}
              </button>
              {readyCount > 0 && readyCount < totalPlayers && (
                <span className="text-xs subtle-text">
                  {t("game.waitingFor")} {Math.max(0, totalPlayers - readyCount)} {t("game.morePlayers")}
                </span>
              )}
            </>
          )}
          {isFinished && (
            <Link to="/results" className="game-btn-primary">
              {t("nav.finishViewResults")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Letter picker popup (WITH DEBUG LOGS) ─────────────────────────────────────
function LetterPickerModal({
  usedLetters,
  letterMode,
  alphabet = "en",
  onSelectLetter,
  onRandomLetter,
  onLetterChosen,
  t
}) {
  const [letter, setLetter] = useState("");

  const handleSubmit = () => {
    console.log("[LetterPicker] Submit clicked, letter:", letter, "alphabet:", alphabet);
    const candidate = normalizeLetter(letter, alphabet);
    const rawCodePoints = Array.from(letter ?? "").map(
      (char) => `U+${char.codePointAt(0).toString(16).toUpperCase()}`
    );
    const normalizedCodePoints = Array.from(candidate ?? "").map(
      (char) => `U+${char.codePointAt(0).toString(16).toUpperCase()}`
    );
    console.log("[LetterPicker] Input diagnostics", {
      raw: letter,
      rawLength: letter?.length ?? 0,
      rawCodePoints,
      normalized: candidate,
      normalizedLength: candidate?.length ?? 0,
      normalizedCodePoints
    });
    if (!candidate) {
      console.log("[LetterPicker] No letter or invalid length");
      return;
    }
    if (!isValidLetter(candidate, alphabet)) {
      console.log("[LetterPicker] Invalid letter for alphabet:", candidate, alphabet);
      return;
    }

    console.log("[LetterPicker] Candidate after normalization:", candidate);

    if (usedLetters.has(candidate)) {
      console.log("[LetterPicker] Letter already used:", candidate, "usedLetters:", [...usedLetters]);
      return;
    }

    console.log("[LetterPicker] Calling onSelectLetter with", candidate);
    onLetterChosen?.();
    onSelectLetter(candidate);
    setLetter("");
  };

  const handleRandom = () => {
    console.log("[LetterPicker] Random button clicked");
    onLetterChosen?.();
    onRandomLetter();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="game-card animate-fade-in w-full max-w-sm">
        <h2 className="mb-1 text-center text-xl font-bold">🎲 {t("game.letterSelection")}</h2>
        <p className="mb-5 text-center text-sm subtle-text">
          {alphabet === 'ar' ? 'اختر حرفاً للجولة القادمة' : 'Pick the letter for the next round'}
        </p>

        <div className="space-y-3">
          {letterMode !== LETTER_MODES.RANDOM_ONLY && (
            <div className="flex gap-2">
              <input
                value={letter}
                onChange={(e) => {
                  const val = normalizeLetter(e.target.value, alphabet);
                  console.log("[LetterPicker] Input changed:", val);
                  setLetter(val);
                }}
                className="game-input text-center text-3xl font-black tracking-widest"
                maxLength={1}
                placeholder={alphabet === 'ar' ? 'حرف' : '?'}
                autoFocus
                inputMode="text"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
                }}
              />
              <button type="button" className="game-btn-primary px-5" onClick={handleSubmit}>
                {t("game.select")}
              </button>
            </div>
          )}
          {letterMode !== LETTER_MODES.MANUAL_ONLY && (
            <button type="button" className="game-btn-secondary w-full" onClick={handleRandom}>
              🎲 {t("game.randomLetter")}
            </button>
          )}
        </div>

        {usedLetters.size > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest subtle-text">
              {t("game.letter")}s used
            </p>
            <div className="flex flex-wrap gap-1">
              {[...usedLetters].map((l) => (
                <span key={l} className="rounded bg-muted px-2 py-0.5 text-xs opacity-60 subtle-text line-through">
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leaderboard popup ─────────────────────────────────────────────────────────
function LeaderboardModal({ players, scoresByPlayer, currentUserId, onClose, t }) {
  const rows = [...(players ?? [])]
    .map((p, i) => ({ ...p, _idx: i, score: Number(scoresByPlayer?.[p.id] ?? 0) }))
    .sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="game-card animate-fade-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🏆 {t("results.leaderboard")}</h2>
          <button type="button" className="game-btn-ghost px-2 py-1 text-base leading-none" onClick={onClose}>
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {rows.map((p, rank) => {
            const isMe = p.id === currentUserId;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  isMe ? "border border-accent/30 bg-accent/10" : "bg-muted/40"
                }`}
              >
                <span className="w-7 text-center text-base">{medals[rank] ?? rank + 1}</span>
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{ background: getPlayerColor(p._idx) }}
                >
                  {(p.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.name ?? p.username}
                    {isMe && <span className="ms-1 text-[10px] subtle-text">({t("common.you")})</span>}
                  </p>
                  {p.isBot && <p className="text-[9px] subtle-text">{t("common.bot")}</p>}
                </div>
                <span className="text-sm font-black text-accent">{p.score}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GameRoomPage() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation();

  const authUser         = useAuthStore((s) => s.user);
  const token            = useAuthStore((s) => s.token);
  const room             = useGameStore((s) => s.room);
  const game             = useGameStore((s) => s.game);
  const voting           = useGameStore((s) => s.voting);
  const scoresByPlayer   = useGameStore((s) => s.scoresByPlayer);
  const answersByPlayer  = useGameStore((s) => s.answersByPlayer);
  const nextRoundReady   = useGameStore((s) => s.nextRoundReadyPlayerIds);
  const roundResults     = useGameStore((s) => s.roundResults);
  const currentUserId    = useGameStore((s) => s.currentUserId || authUser?.id);
  const setRoom          = useGameStore((s) => s.setRoom);
  const setCurrentUserId = useGameStore((s) => s.setCurrentUserId);
  const updatePlayerInputs = useGameStore((s) => s.updatePlayerInputs);
  const setStopPressed = useGameStore((s) => s.setStopPressed);
  const setTimer = useGameStore((s) => s.setTimer);
  const markNextRoundReady = useGameStore((s) => s.markNextRoundReady);
  const applySnapshot    = useGameStore((s) => s.applySnapshot);
  const setError         = useGameStore((s) => s.setError);
  const resetGameStore   = useGameStore((s) => s.resetGameStore);

  const {
    leaveRoom,
    pauseGame,
    submitCurrentRow,
    pressStop,
    selectLetter,
    chooseRandomLetter,
    submitVote,
    nextRound,
    startVoting,
  } = useGameActions();

  const [now, setNow] = useState(Date.now());
  const [hasVoted, setHasVoted] = useState(false);
  const [votingJustStarted, setVotingJustStarted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [preRoundCountdown, setPreRoundCountdown] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState(createEmptyAnswerRow());
  const [lastPopupTurn, setLastPopupTurn] = useState("");
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const prevGameStateRef = useRef(game.state);
  const letterAtSelectionStartRef = useRef(game.currentLetter ?? null);
  const prevVotingActiveRef = useRef(voting?.active ?? false);
  const selectorCountdownFiredRef = useRef(false);
  const saveTimer = useRef();


  // ── Other effects (unchanged) ──────────────────────────────────────────────────
  useEffect(() => {
    initSoundEffects();
  }, []);

  useEffect(() => {
    if (currentUserId) setCurrentUserId(currentUserId);
  }, [currentUserId, setCurrentUserId]);

  useEffect(() => {
    if (roomId && room.id !== roomId) setRoom({ id: roomId });
  }, [room.id, roomId, setRoom]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!roomId) return;
      try {
        const payload = await roomsApi.getById(roomId);
        if (cancelled || !payload?.room) return;
        applySnapshot(roomDetailsToSnapshot(payload.room));
      } catch (error) {
        if (!cancelled) setError(error.message);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [applySnapshot, roomId, setError, token]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = game.state;

    const wasPrePlay =
      prev === GAME_STATES.SELECTING_LETTER || prev === GAME_STATES.STARTING;

    if (
      wasPrePlay &&
      game.state === GAME_STATES.PLAYING &&
      !selectorCountdownFiredRef.current
    ) {
      setPreRoundCountdown(true);
    }

    if (prev !== GAME_STATES.FINISHED && game.state === GAME_STATES.FINISHED) {
      playGameFinished();
    }

    if (
      game.state === GAME_STATES.SELECTING_LETTER ||
      game.state === GAME_STATES.STARTING
    ) {
      setSelectorModalOpen(false);
      selectorCountdownFiredRef.current = false;

      if (game.selectorPlayerId) {
        letterAtSelectionStartRef.current = game.currentLetter ?? null;
      }

      if (
        game.state === GAME_STATES.SELECTING_LETTER &&
        !game.selectorPlayerId &&
        game.currentLetter
      ) {
        selectorCountdownFiredRef.current = true;
        setPreRoundCountdown(true);
      }
    }
  }, [game.state]);

  useEffect(() => {
    console.log("STATE:", game.state, "ROUND:", game.roundNumber);
  }, [game.state, game.roundNumber]);

  const currentTurnKey = `${game.roundNumber}-${game.selectorPlayerId ?? ""}`;
  const shouldTriggerLetterModal =
    game.state === GAME_STATES.SELECTING_LETTER &&
    !!game.selectorPlayerId &&
    game.selectorPlayerId === currentUserId &&
    lastPopupTurn !== currentTurnKey;

  useEffect(() => {
    if (!shouldTriggerLetterModal) {
      return;
    }
    setSelectorModalOpen(true);
    setLastPopupTurn(currentTurnKey);
  }, [shouldTriggerLetterModal, currentTurnKey]);

  useEffect(() => {
    if (
      game.state !== GAME_STATES.SELECTING_LETTER ||
      game.selectorPlayerId !== currentUserId
    ) {
      setSelectorModalOpen(false);
    }
  }, [game.state, game.selectorPlayerId, currentUserId]);

  // Auto-close the letter picker 2 seconds before the server's 30s timeout fires.
  // Without this, the modal stays open after the server auto-picks, and a late click
  // sends a pick the server silently rejects while showing the wrong letter locally.
  useEffect(() => {
    if (!selectorModalOpen) return;
    const id = setTimeout(() => setSelectorModalOpen(false), 28000);
    return () => clearTimeout(id);
  }, [selectorModalOpen]);

  useEffect(() => {
    if (
      [GAME_STATES.STOPPED, GAME_STATES.SCORING, GAME_STATES.FINISHED].includes(
        game.state
      )
    ) {
      setResultsDismissed(false);
    }
  }, [game.state, game.roundNumber]);

  useEffect(() => {
    if (game.state === GAME_STATES.PLAYING) {
      setHasVoted(false);
    }
    if (game.state === GAME_STATES.VOTING) {
      setHasVoted(false);
    }
  }, [game.state, game.roundNumber]);

  useEffect(() => {
    const wasActive = prevVotingActiveRef.current;
    const isActive = voting?.active ?? false;
    prevVotingActiveRef.current = isActive;
    if (isActive && !wasActive) {
      playVotingStart();
      setVotingJustStarted(true);
      const id = setTimeout(() => setVotingJustStarted(false), 1800);
      return () => clearTimeout(id);
    }
  }, [voting?.active]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  useEffect(() => {
    setDraftAnswers(createEmptyAnswerRow());
  }, [game.roundNumber, game.state, currentUserId]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const players    = room.players ?? [];
  const isOwner    = !!room.ownerId && room.ownerId === currentUserId;
  const isSelector = !!game.selectorPlayerId && game.selectorPlayerId === currentUserId;
  const showRoundTimer =
    game.state === GAME_STATES.SELECTING_LETTER ||
    game.state === GAME_STATES.PLAYING;
  const showStopButton =
    game.state === GAME_STATES.SELECTING_LETTER ||
    game.state === GAME_STATES.PLAYING;
  const visibleTimerSeconds = Number(
    game.timerSeconds ?? room.settings?.timeLimitSeconds ?? 0
  );

  const timeLimitSeconds  = room.settings?.timeLimitSeconds || 60;
  const roundSecondsLeft  = Number(game.timerSeconds ?? timeLimitSeconds);
  const roundTimedOut     = game.state === GAME_STATES.PLAYING && roundSecondsLeft <= 0;

  const stopGraceLeft     = game.stopGraceEndsAt
    ? Math.max(0, Math.ceil((game.stopGraceEndsAt - now) / 1000))
    : 0;
  const stopGraceTotal    = 3;
  const stopGraceProgress = stopGraceLeft > 0 ? (stopGraceLeft / stopGraceTotal) * 100 : 0;

  const canEdit =
    (game.state === GAME_STATES.SELECTING_LETTER ||
      game.state === GAME_STATES.PLAYING) &&
    !roundTimedOut &&
    game.state !== GAME_STATES.SCORING &&
    game.state !== GAME_STATES.FINISHED;

  const usedLetters = useMemo(
    () => new Set(game.usedLetters ?? []),
    [game.usedLetters]
  );

  const totalRounds = Number(game.totalRounds || room.settings?.rounds || 1);
  const uiRoundNumber = Number(game.roundNumber || 1);

  const selectedRoundResult = useMemo(() => {
    if (!Array.isArray(roundResults) || !roundResults.length) return null;
    const targetRound = Math.max(
      1,
      Math.min(
        game.state === GAME_STATES.FINISHED ? totalRounds : uiRoundNumber,
        totalRounds
      )
    );

    for (let index = roundResults.length - 1; index >= 0; index -= 1) {
      const candidate = roundResults[index];
      if (Number(candidate?.roundNumber) === targetRound) {
        return candidate;
      }
    }

    if (game.state === GAME_STATES.FINISHED) {
      for (let index = roundResults.length - 1; index >= 0; index -= 1) {
        if (roundResults[index]?.rows?.length) {
          return roundResults[index];
        }
      }
    }

    return null;
  }, [roundResults, game.state, totalRounds, uiRoundNumber]);

  const displayRoundNumber =
    Number(selectedRoundResult?.roundNumber) ||
    Math.max(
      1,
      Math.min(game.state === GAME_STATES.FINISHED ? totalRounds : uiRoundNumber, totalRounds)
    );

  const roundResultAnswersByPlayer = useMemo(() => {
    if (!selectedRoundResult?.rows?.length) return {};
    return Object.fromEntries(
      selectedRoundResult.rows.map((row) => [row.playerId, row.answers ?? {}])
    );
  }, [selectedRoundResult]);

  const catScoresByPlayer = useMemo(() => {
    if (!selectedRoundResult?.rows?.length) return {};
    return Object.fromEntries(
      selectedRoundResult.rows.map((row) => [row.playerId, row.catScores ?? {}])
    );
  }, [selectedRoundResult]);

  const selectorName = players.find((p) => p.id === game.selectorPlayerId)?.name ?? "-";
  const stopperName  = players.find((p) => p.id === game.stopPressedBy)?.name ?? t("game.aPlayer");

  const totalPlayers      = players.length || 1;
  const readyCount        = nextRoundReady.length;
  const isFinished        = game.state === GAME_STATES.FINISHED;
  const showResultsModal  = !resultsDismissed &&
    [GAME_STATES.STOPPED, GAME_STATES.SCORING, GAME_STATES.FINISHED].includes(game.state);
  const showLetterModal =
    selectorModalOpen &&
    game.state === GAME_STATES.SELECTING_LETTER &&
    !!game.selectorPlayerId &&
    game.selectorPlayerId === currentUserId;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateMyInput = (category, value) => {
    if (!currentUserId) return;
    setDraftAnswers((current) => ({
      ...current,
      [category]: value
    }));
    updatePlayerInputs(currentUserId, { [category]: value });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => submitCurrentRow(roomId), 250);
  };

  const handleStop = () => {
    console.log("STOP CLICKED");
    playStopPressed();
    const ok = pressStop(roomId);
    console.log("pressStop result:", ok);
    if (ok) {
      const stopperId = currentUserId || authUser?.id || "";
      setTimer(0);
      setPreRoundCountdown(false);
      setStopPressed(stopperId, 0);
      submitCurrentRow(roomId);
      return;
    }
  };

  const handleNextRound = () => {
    markNextRoundReady(currentUserId);
    nextRound(roomId);
  };

  const handleSubmitVote = (voteType, duplicateTargets) => {
    if (!voteType || hasVoted) return;
    submitVote(roomId, voteType, duplicateTargets);
    setHasVoted(true);
  };

  const leaveCurrentRoom = () => {
    leaveRoom(roomId);
    resetGameStore();
    navigate("/lobby");
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const myAnswers = draftAnswers;

  return (
    <main className="flex min-h-screen flex-col">
      {preRoundCountdown && (
        <CountdownOverlay onDone={() => setPreRoundCountdown(false)} />
      )}

      {game.state === GAME_STATES.NEXT_ROUND && (
        <RoundTransitionOverlay roundNumber={game.roundNumber} />
      )}

      {votingJustStarted && (
        <VotingStartOverlay
          target={voting?.target}
          initiatorId={voting?.initiatorId}
          players={players}
          t={t}
        />
      )}

      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border bg-card/90 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold leading-tight">{t("game.gameRoom")}</h1>
            <p className="text-[11px] subtle-text">
              {t("nav.room")}: <span className="font-mono">{roomId}</span>
              {" · "}{t("game.round")} {game.roundNumber || 1} {t("game.of")}{" "}
              {game.totalRounds || room.settings?.rounds || 1}
            </p>
          </div>
          <GameStateBadge state={game.state} />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile-only: player count + leaderboard shortcut */}
          <button
            type="button"
            className="game-btn-ghost !px-2 !py-1.5 sm:hidden"
            onClick={() => setShowLeaderboard(true)}
            aria-label="Players / Leaderboard"
          >
            <span>👥</span>
            <span className="text-xs font-semibold">{players.length}</span>
          </button>
          <LanguageToggle />
          <ThemeToggle />
          {isOwner && !isFinished && (
            <button
              type="button"
              className="game-btn-secondary px-3 py-1.5 text-xs"
              onClick={() => pauseGame(roomId, !game.paused)}
            >
              {game.paused ? t("game.resume") : t("game.pause")}
            </button>
          )}
          <button
            type="button"
            className="game-btn-secondary px-3 py-1.5 text-xs"
            onClick={leaveCurrentRoom}
          >
            {t("nav.leave")}
          </button>
          {isFinished && (
            <Link to="/results" className="game-btn-secondary px-3 py-1.5 text-xs">
              {t("nav.results")}
            </Link>
          )}
        </div>
      </header>

      {game.paused && (
        <div className="border-b border-warn/40 bg-warn/10 px-4 py-2 text-center text-xs text-warn">
          {t("game.pausedBanner")}
        </div>
      )}

      <div className="flex flex-1 gap-3 p-2 sm:p-4">
        <PlayerSidebar
          players={players}
          ownerId={room.ownerId}
          selectorPlayerId={game.selectorPlayerId}
          stopPressedBy={game.stopPressedBy}
          currentUserId={currentUserId}
          answersByPlayer={answersByPlayer}
          onLeaderboard={() => setShowLeaderboard(true)}
          t={t}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {showRoundTimer && (
            <TimerBar
              seconds={visibleTimerSeconds}
              totalSeconds={room.settings?.timeLimitSeconds}
              paused={game.paused}
            />
          )}

          <div className="mb-4 flex items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card px-3 sm:px-5 py-2 sm:py-3">
            <p
              key={game.currentLetter || "empty"}
              className="animate-letter-pop flex h-14 w-14 sm:h-[4.75rem] sm:w-20 flex-shrink-0 items-center justify-center bg-gradient-to-br from-accent to-accent-hover bg-clip-text text-center text-5xl sm:text-6xl font-black leading-[1.2] text-transparent"
              style={{ fontFamily: "\"Noto Sans Arabic\", \"Segoe UI\", Inter, system-ui, sans-serif" }}
            >
              {game.currentLetter || "–"}
            </p>

            <div className="h-10 sm:h-12 w-px flex-shrink-0 bg-border" />

            {showRoundTimer && (
              <div className="flex w-12 sm:w-14 flex-shrink-0 flex-col items-center">
                {roundTimedOut ? (
                  <span className="text-3xl sm:text-4xl font-black leading-none animate-pulse text-danger">🔒</span>
                ) : (
                    <span
                      className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${
                      visibleTimerSeconds <= 5  ? "animate-pulse text-danger" :
                      visibleTimerSeconds <= 10 ? "text-warn" :
                      "text-foreground"
                    }`}
                  >
                    {visibleTimerSeconds}
                  </span>
                )}
                <span className="mt-0.5 text-[9px] uppercase tracking-widest subtle-text">sec</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {roundTimedOut ? (
                <p className="text-sm font-medium text-danger animate-pulse">
                  ⏰ Time's up — round ending…
                </p>
              ) : game.state === GAME_STATES.STOPPED ? (
                <>
                  <p className="text-sm font-medium text-warn">
                    ✋ {t("game.stopPressedBy")} <strong>{stopperName}</strong>
                  </p>
                  {stopGraceLeft > 0 ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-warn transition-all duration-300"
                          style={{ width: `${stopGraceProgress}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs text-warn">{stopGraceLeft}s</span>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs subtle-text">{t("game.inputsLocked")}</p>
                  )}
                </>
              ) : game.state === GAME_STATES.SELECTING_LETTER && !isSelector &&
                  game.currentLetter === letterAtSelectionStartRef.current ? (
                <>
                  <p className="text-sm font-semibold animate-pulse">
                    🎲 <strong>{selectorName}</strong> {t("game.isChoosing")}
                  </p>
                  <p className="mt-0.5 text-xs subtle-text">{t("game.getReadyHint")}</p>
                </>
              ) : (
                <p className="text-sm capitalize subtle-text">
                  {t(`states.${game.state}`) || game.state || ""}
                </p>
              )}
            </div>

            {(game.usedLetters?.length ?? 0) > 0 && (
              <div className="hidden flex-col items-end gap-1 sm:flex">
                <span className="text-[9px] uppercase tracking-widest subtle-text">used</span>
                <div className="flex max-w-[5rem] flex-wrap justify-end gap-1">
                  {game.usedLetters.map((l) => (
                    <span key={l} className="rounded bg-muted px-1.5 py-0.5 text-[9px] subtle-text">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {game.state === GAME_STATES.SELECTING_LETTER && !isSelector &&
            game.currentLetter === letterAtSelectionStartRef.current && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3">
              <span className="text-2xl animate-bounce">🎲</span>
              <div>
                <p className="text-sm font-semibold text-accent">
                  <strong>{selectorName}</strong> {t("game.isChoosing")}
                </p>
                <p className="text-xs subtle-text">{t("game.getReadyHint")}</p>
              </div>
            </div>
          )}

          <div className="game-card mb-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest subtle-text">
                Your answers
              </span>
              {game.currentLetter && (
                <span className="chip-accent text-[11px] font-black">{game.currentLetter}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-accent">
                    {t(`categories.${cat}`)}
                  </label>
                  <input
                    value={myAnswers[cat] ?? ""}
                    onChange={(e) => updateMyInput(cat, e.target.value)}
                    disabled={!canEdit}
                    className="game-input text-sm"
                    placeholder="…"
                    maxLength={32}
                  />
                </div>
              ))}
            </div>
            {showStopButton && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  className="game-btn-danger flex w-full max-w-lg items-center justify-center rounded-2xl py-4 text-2xl font-black shadow-lg"
                  onClick={handleStop}
                >
                  ✋ {t("game.stopBtn")}
                </button>
                <p className="text-xs subtle-text">
                  Press STOP as soon as you finish all answers.
                </p>
              </div>
            )}
          </div>

          {voting?.active && [GAME_STATES.VOTING, GAME_STATES.STOPPED].includes(game.state) && (
            <div className="mt-4">
              <VotingPanel voting={voting} onSubmit={handleSubmitVote} hasVoted={hasVoted} players={players} />
            </div>
          )}
        </div>
      </div>

      {showResultsModal && (
        <RoundResultsModal
          players={players}
          answersByPlayer={answersByPlayer}
          roundResultAnswersByPlayer={roundResultAnswersByPlayer}
          scoresByPlayer={scoresByPlayer}
          catScoresByPlayer={catScoresByPlayer}
          roundNumber={displayRoundNumber}
          totalRounds={totalRounds}
          onNext={handleNextRound}
          readyCount={readyCount}
          totalPlayers={totalPlayers}
          voting={voting}
          onStartVoting={(target) => startVoting(roomId, target)}
          hasVoted={hasVoted}
          onSubmitVote={handleSubmitVote}
          isFinished={isFinished}
          onClose={() => {
            if (game.state !== GAME_STATES.STOPPED) {
              setResultsDismissed(true);
            }
          }}
          t={t}
          currentUserId={currentUserId}
        />
      )}

      {showLetterModal && (
        <LetterPickerModal
          usedLetters={usedLetters}
          letterMode={room.settings?.letterMode ?? LETTER_MODES.BOTH}
          alphabet={room.settings?.alphabet ?? "en"}
          // FIXED: Pass the alphabet to selectLetter
          onSelectLetter={(letter) => selectLetter(roomId, letter, room.settings?.alphabet ?? "en")}
          onRandomLetter={() => chooseRandomLetter(roomId)}
          onLetterChosen={() => {
            console.log("[GameRoom] Letter chosen, closing modal and starting countdown");
            selectorCountdownFiredRef.current = true;
            setLastPopupTurn(currentTurnKey);
            setSelectorModalOpen(false);
            setPreRoundCountdown(true);
          }}
          t={t}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          players={players}
          scoresByPlayer={scoresByPlayer}
          currentUserId={currentUserId}
          onClose={() => setShowLeaderboard(false)}
          t={t}
        />
      )}
    </main>
  );
}
