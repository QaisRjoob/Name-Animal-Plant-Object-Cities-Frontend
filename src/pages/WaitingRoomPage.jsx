import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GAME_STATES } from "../constants/game";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useGameActions } from "../hooks/useGameActions";
import { roomsApi } from "../services/apiClient";
import { roomDetailsToSnapshot } from "../utils/backendAdapters";
import { useTranslation } from "../i18n";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";

const PLAYER_COLORS = [
  "#7c3aed", "#0891b2", "#d97706", "#059669", "#dc2626",
  "#c026d3", "#0284c7", "#65a30d", "#ea580c", "#9333ea",
];

const ACTIVE_STATES = [
  GAME_STATES.STARTING, GAME_STATES.SELECTING_LETTER, GAME_STATES.PLAYING,
  GAME_STATES.STOPPED, GAME_STATES.VOTING, GAME_STATES.SCORING,
  GAME_STATES.NEXT_ROUND, GAME_STATES.FINISHED,
];

export function WaitingRoomPage() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const { t }      = useTranslation();

  const authUser       = useAuthStore((s) => s.user);
  const token          = useAuthStore((s) => s.token);
  const room           = useGameStore((s) => s.room);
  const game           = useGameStore((s) => s.game);
  const currentUserId  = useGameStore((s) => s.currentUserId || authUser?.id);
  const setRoom        = useGameStore((s) => s.setRoom);
  const applySnapshot  = useGameStore((s) => s.applySnapshot);
  const setError       = useGameStore((s) => s.setError);
  const removePlayer   = useGameStore((s) => s.removePlayer);

  const { startGame, leaveRoom, kickPlayer, reconnectGame, addBots } = useGameActions();
  const [starting, setStarting] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const players    = room.players ?? [];
  const isOwner    = !!room.ownerId && room.ownerId === currentUserId;
  const maxPlayers = room.settings?.maxPlayers ?? 0;
  const emptySeats = maxPlayers > 0 ? Math.max(0, maxPlayers - players.length) : 0;

  // Sync room ID into store and re-establish socket membership on refresh.
  useEffect(() => {
    if (!roomId) return;
    setRoom({ id: roomId });
    reconnectGame(roomId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Load current room snapshot from REST API so the player list is always fresh.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!roomId) return;
      try {
        const payload = await roomsApi.getById(roomId);
        if (cancelled || !payload?.room) return;
        applySnapshot(roomDetailsToSnapshot(payload.room));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [applySnapshot, roomId, setError, token]);

  // Navigate to the game room the moment the game transitions out of WAITING.
  useEffect(() => {
    if (ACTIVE_STATES.includes(game.state)) {
      navigate(`/room/${roomId}`, { replace: true });
    }
  }, [game.state, navigate, roomId]);

  // Detect when the current user is kicked: once confirmed in the room,
  // any disappearance from the player list means they were removed.
  const wasInRoomRef = useRef(false);
  useEffect(() => {
    if (!currentUserId) return;
    const inRoom = players.some((p) => p.id === currentUserId);
    if (inRoom) {
      wasInRoomRef.current = true;
      return;
    }
    if (wasInRoomRef.current) {
      navigate("/lobby", { replace: true });
    }
  }, [players, currentUserId, navigate]);

  const handleStartGame = () => {
    if (!room.id || starting) return;
    setStarting(true);
    if (emptySeats > 0) {
      addBots(room.id, emptySeats);
      // Give the server a moment to register the bots before starting.
      setTimeout(() => startGame(room.id), 700);
    } else {
      startGame(room.id);
    }
    // Navigation to /room/:roomId is driven by the game.state effect above.
  };

  const handleLeave = () => {
    leaveRoom(roomId);
    navigate("/lobby");
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold">{t("lobby.roomOverview")}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <button type="button" className="game-btn-secondary text-sm" onClick={handleLeave}>
              {t("nav.leave")}
            </button>
          </div>
        </div>

        {/* Room ID card */}
        <div className="game-card text-center space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest subtle-text">
            {t("lobby.roomId")}
          </p>
          <p className="select-all font-mono text-4xl sm:text-5xl font-black tracking-widest text-accent">
            {roomId}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="game-btn-secondary mx-auto text-xs"
          >
            {copied ? `✓ ${t("lobby.copied")}` : `📋 ${t("lobby.copyRoomId")}`}
          </button>
        </div>

        {/* Players list */}
        <div className="game-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {t("common.players")}{" "}
              <span className="font-black text-accent">({players.length})</span>
            </p>
            <span className="flex items-center gap-1.5 text-[11px] subtle-text">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
              {t("game.waitingPlayers")}
            </span>
          </div>

          <div className="space-y-2">
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                  p.id === currentUserId
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                    style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                  >
                    {(p.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {p.name ?? p.username}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {p.id === currentUserId && (
                        <span className="text-[10px] font-bold text-accent">
                          ({t("common.you")})
                        </span>
                      )}
                      {p.id === room.ownerId && (
                        <span className="text-[10px] font-bold text-warn">
                          ♛ {t("common.owner")}
                        </span>
                      )}
                      {p.isBot && (
                        <span className="text-[10px] font-bold text-good">
                          {t("common.bot")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && p.id !== currentUserId && !p.isBot && (
                  <button
                    type="button"
                    className="game-btn-danger !px-2 !py-1 text-xs"
                    onClick={() => { kickPlayer(room.id, p.id); removePlayer(p.id); }}
                  >
                    {t("lobby.kick")}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Empty seats indicator — only visible to the owner */}
          {isOwner && emptySeats > 0 && (
            <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-center text-[11px] font-medium text-accent">
              {emptySeats} empty seat{emptySeats !== 1 ? "s" : ""} — will be filled with bots when you start
            </p>
          )}
        </div>

        {/* Action area */}
        {isOwner ? (
          <button
            type="button"
            disabled={starting || (players.length + emptySeats) < 2}
            onClick={handleStartGame}
            className="game-btn-primary w-full py-3 text-base font-bold"
          >
            {starting ? `${t("common.loading")}` : `▶ ${t("lobby.startGame")}`}
          </button>
        ) : (
          <div className="game-card py-5 text-center">
            <div className="mb-2 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-accent/60"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
            <p className="text-sm subtle-text">{t("lobby.waitingForOwner")}</p>
          </div>
        )}

      </div>
    </main>
  );
}
