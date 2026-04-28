import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LETTER_MODES } from "../constants/game";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { useGameActions } from "../hooks/useGameActions";
import { authApi, roomsApi } from "../services/apiClient";
import { useTranslation } from "../i18n";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";

/* ── Decorative background items ─────────────────────────────────────────── */
const LOBBY_DECO = [
  { label: "N", color: "#7c3aed", bg: "#ede9fe", top: "4%",  left: "1%",  size: 48, anim: "float-slow",   delay: "0s"   },
  { label: "A", color: "#0891b2", bg: "#cffafe", top: "8%",  left: "96%", size: 44, anim: "float-medium", delay: "1s"   },
  { label: "P", color: "#d97706", bg: "#fef3c7", top: "50%", left: "98%", size: 52, anim: "float-slow",   delay: "0.5s" },
  { label: "O", color: "#059669", bg: "#d1fae5", top: "80%", left: "0%",  size: 44, anim: "float-medium", delay: "1.5s" },
  { label: "C", color: "#dc2626", bg: "#fee2e2", top: "90%", left: "97%", size: 40, anim: "float-fast",   delay: "0.8s" },
  { label: "♥", color: "#f43f5e", top: "3%",    left: "48%", isDoodle: true, fontSize: "1.6rem", anim: "float-slow",   delay: "2s"   },
  { label: "✦", color: "#7c3aed", top: "92%",   left: "50%", isDoodle: true, fontSize: "2rem",   anim: "float-medium", delay: "0.3s" },
  { label: "✦", color: "#d97706", top: "45%",   left: "0.5%",isDoodle: true, fontSize: "1.8rem", anim: "sway",         delay: "1.2s" },
  { label: "✶", color: "#0891b2", top: "25%",   left: "98%", isDoodle: true, fontSize: "2rem",   anim: "sway",         delay: "0.7s" },
  { label: "Name",   color: "#7c3aed", bg: "#ede9fe", top: "15%", left: "0.5%", isWord: true, anim: "float-slow",   delay: "1.8s" },
  { label: "Animal", color: "#0891b2", bg: "#cffafe", top: "65%", left: "0.5%", isWord: true, anim: "float-medium", delay: "0.6s" },
  { label: "Plant",  color: "#059669", bg: "#d1fae5", top: "35%", left: "97%",  isWord: true, anim: "float-fast",   delay: "1.4s" },
  { label: "City",   color: "#dc2626", bg: "#fee2e2", top: "70%", left: "96%",  isWord: true, anim: "float-slow",   delay: "2.2s" },
];

const TITLE_WORDS_BY_LANG = {
  en: ["Name", "Animal", "Plant", "Object", "Cities"],
  ar: ["اسم", "نبات", "حيوان", "جماد", "بلاد"],
};
const TITLE_COLORS = ["#7c3aed", "#0891b2", "#d97706", "#059669", "#dc2626"];
const AR_TITLE_FONT_STACK = "'Noto Kufi Arabic', 'Cairo', 'Tajawal', 'Noto Sans Arabic', sans-serif";

function animDuration(a) {
  if (a === "sway")         return "3s";
  if (a === "float-slow")   return "6s";
  if (a === "float-medium") return "4.5s";
  return "3.5s";
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function LobbyPage() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const titleWords = TITLE_WORDS_BY_LANG[language] ?? TITLE_WORDS_BY_LANG.en;

  const authUser     = useAuthStore((s) => s.user);
  const token        = useAuthStore((s) => s.token);
  const clearSession = useAuthStore((s) => s.clearSession);

  const room           = useGameStore((s) => s.room);
  const currentUserId  = useGameStore((s) => s.currentUserId || authUser?.id);
  const setRoom        = useGameStore((s) => s.setRoom);
  const upsertPlayers  = useGameStore((s) => s.upsertPlayers);
  const resetGameStore = useGameStore((s) => s.resetGameStore);
  const removePlayer   = useGameStore((s) => s.removePlayer);

  const { createRoom, joinRoom, addBots, startGame, kickPlayer } = useGameActions();

  // ── View state: null | "create" | "join" | "waiting" ──────────────────────
  const [view, setView] = useState(null);

  // ── Create-room form state ─────────────────────────────────────────────────
  const [rounds, setRounds]                     = useState(5);
  const [timeLimitSeconds, setTimeLimitSeconds]  = useState(60);
  const [maxPlayers, setMaxPlayers]              = useState(6);   // total seats (real + bots)
  const [initialBots, setInitialBots]            = useState(0);   // bots to add immediately
  const [letterMode, setLetterMode]              = useState(LETTER_MODES.MANUAL_ONLY);
  const [alphabet, setAlphabet]                  = useState(language === "ar" ? "ar" : "en");

  // ── Join-room state ────────────────────────────────────────────────────────
  const [joinRoomId, setJoinRoomId] = useState("");
  const [waitingRooms, setWaitingRooms] = useState([]);

  // ── Internal flags ─────────────────────────────────────────────────────────
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [starting, setStarting]         = useState(false);
  const [copied, setCopied]             = useState(false);

  const maxRounds = alphabet === "ar" ? 28 : 26;
  const players   = room.players ?? [];
  const isOwner   = !!room.ownerId && room.ownerId === currentUserId;

  const ownerPlayer = useMemo(() => ({
    id: currentUserId,
    name: authUser?.name ?? authUser?.username ?? t("common.player"),
    username: authUser?.username ?? authUser?.name ?? t("common.player"),
    isBot: false,
  }), [authUser?.name, authUser?.username, currentUserId, t]);

  /* ── Clear previous room data on mount ──────────────────────────────────── */
  useEffect(() => {
    resetGameStore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch open rooms when on join view ─────────────────────────────────── */
  useEffect(() => {
    if (view !== "join") return;
    let cancelled = false;
    roomsApi.listWaiting()
      .then((p) => { if (!cancelled) setWaitingRooms(p?.rooms ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [view]);

  /* ── After server confirms room created → go to waiting room ────────────── */
  useEffect(() => {
    if (!creatingRoom || !room.id) return;
    if (initialBots > 0) addBots(room.id, initialBots);
    setCreatingRoom(false);
    navigate(`/waiting/${room.id}`);
  }, [addBots, creatingRoom, initialBots, navigate, room.id]);

  /* ── Handlers ────────────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    try { if (token) await authApi.logout(token); } catch { /* noop */ }
    finally { clearSession(); }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!currentUserId) return;
    const safeRounds = Math.min(maxRounds, Math.max(1, rounds));
    setRoom({
      id: "",
      ownerId: currentUserId,
      settings: { ...room.settings, rounds: safeRounds, timeLimitSeconds, letterMode, alphabet, maxPlayers },
    });
    upsertPlayers([ownerPlayer]);
    const ok = createRoom({ rounds: safeRounds, timeLimitSeconds, letterMode, alphabet });
    if (ok) setCreatingRoom(true);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    const roomId = joinRoomId.trim().toUpperCase();
    setRoom({ id: roomId });
    upsertPlayers([ownerPlayer]);
    joinRoom({ roomId });
    navigate(`/waiting/${roomId}`);
  };

  const handleStartGame = () => {
    if (!room.id || starting) return;
    setStarting(true);

    const realCount = players.filter((p) => !p.isBot).length;
    const botsNeeded = Math.max(0, maxPlayers - players.length);

    if (botsNeeded > 0) {
      addBots(room.id, botsNeeded);
      // Give socket time to process the bot additions before starting
      setTimeout(() => {
        startGame(room.id);
        navigate(`/room/${room.id}`);
      }, 700);
    } else {
      startGame(room.id);
      navigate(`/room/${room.id}`);
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard?.writeText(room.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Deco renderer ───────────────────────────────────────────────────────── */
  const decoStyle = (item) => ({
    position: "fixed",
    top: item.top, left: item.left,
    animation: `${item.anim} ${animDuration(item.anim)} ease-in-out ${item.delay} infinite`,
    pointerEvents: "none", userSelect: "none", zIndex: 0, opacity: 0.7,
  });

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="auth-bg relative min-h-screen">

      {/* Floating decorations — hidden on small screens to avoid overflow */}
      <div className="hidden sm:block" aria-hidden="true">
        {LOBBY_DECO.map((item, i) => {
          const s = decoStyle(item);
          if (item.isDoodle) return <span key={i} style={{ ...s, color: item.color, fontSize: item.fontSize, lineHeight: 1 }}>{item.label}</span>;
          if (item.isWord)   return <span key={i} style={{ ...s, background: item.bg, color: item.color, borderRadius: "999px", padding: "4px 14px", fontSize: "0.8rem", fontWeight: 700, fontFamily: "'Nunito',sans-serif", border: `2px solid ${item.color}40`, whiteSpace: "nowrap" }}>{item.label}</span>;
          return <span key={i} style={{ ...s, width: item.size, height: item.size, background: item.bg, color: item.color, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: item.size * 0.46, fontWeight: 900, fontFamily: "'Fredoka One',cursive", border: `3px solid ${item.color}50`, boxShadow: `0 4px 12px ${item.color}30` }}>{item.label}</span>;
        })}
      </div>

      {/* Top-right controls */}
      <div className="relative z-10 flex justify-end gap-2 px-4 pt-4">
        <LanguageToggle />
        <ThemeToggle />
        <button type="button" onClick={handleLogout} className="game-btn-secondary text-sm">{t("nav.logout")}</button>
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-md flex-col items-center justify-center px-4 pb-12">

        {/* Title */}
        <div className="mb-8 text-center select-none">
          <h1
            style={{
              fontFamily: isArabic ? AR_TITLE_FONT_STACK : "'Fredoka One',cursive",
              fontSize: isArabic ? "clamp(1.9rem,5.8vw,2.95rem)" : "clamp(1.4rem,5vw,2.2rem)",
              lineHeight: 1.2,
              fontWeight: isArabic ? 800 : undefined,
            }}
          >
            {titleWords.map((w, i) => (
              <span
                key={`${w}-${i}`}
                style={{
                  color: TITLE_COLORS[i],
                  display: "inline-block",
                  marginInlineEnd: isArabic ? "0.22em" : "0.3em"
                }}
              >
                {w}
              </span>
            ))}
          </h1>
          <p className="mt-1 text-xs subtle-text" style={{ fontFamily: "'Nunito',sans-serif" }}>{t("lobby.subtitle")}</p>
        </div>

        {/* ── Step 1: choose ──────────────────────────────────────────── */}
        {!view && (
          <div className="flex w-full flex-col gap-4 animate-fade-in">
            <button type="button" onClick={() => setView("create")}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-card px-6 py-8 text-left shadow-lg transition hover:border-accent hover:shadow-accent/20 hover:shadow-xl active:scale-[0.98]">
              <span className="absolute right-5 top-5 text-3xl opacity-20 transition group-hover:opacity-50">✨</span>
              <p className="text-xl font-bold" style={{ fontFamily: "'Fredoka One',cursive", color: "#7c3aed" }}>{t("lobby.createRoom")}</p>
              <p className="mt-1 text-sm subtle-text">Set up your own room and invite friends</p>
            </button>

            <button type="button" onClick={() => setView("join")}
              className="group relative overflow-hidden rounded-2xl border-2 border-good/30 bg-card px-6 py-8 text-left shadow-lg transition hover:border-good hover:shadow-good/20 hover:shadow-xl active:scale-[0.98]">
              <span className="absolute right-5 top-5 text-3xl opacity-20 transition group-hover:opacity-50">🔑</span>
              <p className="text-xl font-bold" style={{ fontFamily: "'Fredoka One',cursive", color: "#059669" }}>{t("lobby.joinRoom")}</p>
              <p className="mt-1 text-sm subtle-text">{t("common.appName")} · 2-10 {t("common.players")}</p>
            </button>
          </div>
        )}

        {/* ── Step 2a: create room form ────────────────────────────────── */}
        {view === "create" && (
          <div className="w-full animate-fade-in">
            <button
              type="button"
              onClick={() => setView(null)}
              className="game-btn-secondary mb-4 text-sm"
            >
              ← {t("common.back")}
            </button>
            <form onSubmit={handleCreateRoom} className="game-card space-y-5">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Fredoka One',cursive", color: "#7c3aed" }}>
                ✨ {t("lobby.createRoom")}
              </h2>

              {/* Alphabet toggle (moved to top) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold subtle-text uppercase tracking-wide">
                  {t("lobby.alphabet")}
                </p>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAlphabet("en");
                      if (rounds > 26) setRounds(26);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                      alphabet === "en"
                        ? "bg-accent text-white shadow"
                        : "text-foreground hover:bg-card"
                    }`}
                    aria-pressed={alphabet === "en"}
                  >
                    {t("lobby.english")} (26)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAlphabet("ar");
                      if (rounds > 28) setRounds(28);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                      alphabet === "ar"
                        ? "bg-accent text-white shadow"
                        : "text-foreground hover:bg-card"
                    }`}
                    aria-pressed={alphabet === "ar"}
                  >
                    {t("lobby.arabic")} (28)
                  </button>
                </div>
              </div>

              {/* Rounds */}
              <label className="block text-xs subtle-text">
                {t("lobby.rounds")} — <strong className="text-foreground">{rounds}</strong> / {maxRounds}
                <input className="mt-1 w-full accent-[color:rgb(var(--color-accent))]" type="range" min={1} max={maxRounds} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
              </label>

              {/* Time limit */}
              <label className="block text-xs subtle-text">
                {t("lobby.timeLimit")} — <strong className="text-foreground">{timeLimitSeconds}s</strong>
                <input className="mt-1 w-full accent-[color:rgb(var(--color-accent))]" type="range" min={30} max={120} step={5} value={timeLimitSeconds} onChange={(e) => setTimeLimitSeconds(Number(e.target.value))} />
              </label>

              {/* Players / Bots */}
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
                <p className="text-xs font-semibold subtle-text uppercase tracking-wide">Players &amp; Bots</p>

                {/* Room capacity */}
                <label className="block text-xs subtle-text">
                  Room capacity — <strong className="text-foreground">{maxPlayers} total</strong>
                  <input
                    className="mt-1 w-full accent-[color:rgb(var(--color-accent))]"
                    type="range" min={2} max={10} value={maxPlayers}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMaxPlayers(v);
                      // clamp bots: owner takes 1 slot, so max bots = capacity - 1
                      if (initialBots > v - 1) setInitialBots(v - 1);
                    }}
                  />
                  <span className="text-[10px] subtle-text">Total seats including yourself</span>
                </label>

                {/* Initial bots — hard cap = capacity - 1 (owner always takes 1 seat) */}
                <label className="block text-xs subtle-text">
                  Fill with bots now — <strong className="text-foreground">{initialBots}</strong>
                  <input
                    className="mt-1 w-full accent-[color:rgb(var(--color-accent))]"
                    type="range" min={0} max={maxPlayers - 1}
                    value={Math.min(initialBots, maxPlayers - 1)}
                    onChange={(e) => setInitialBots(Math.min(Number(e.target.value), maxPlayers - 1))}
                  />
                  <span className="text-[10px] subtle-text">Max {maxPlayers - 1} (you occupy 1 seat)</span>
                </label>

                {/* Live breakdown */}
                <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-xs font-semibold">
                  <span>👤 You + <span className="text-good">{initialBots} bots</span> + <span className="text-warn">{maxPlayers - 1 - initialBots} free seats</span></span>
                  <span className="text-accent">= {maxPlayers} total</span>
                </div>

                <p className="text-[11px] rounded-lg bg-accent/10 px-3 py-2 text-accent font-medium">
                  Empty seats are auto-filled with bots when you click Start.
                </p>
              </div>

              {/* Letter mode */}
              <div className="grid gap-3">
                <label className="block text-xs subtle-text">
                  {t("lobby.letterMode")}
                  <select className="game-input mt-1" value={letterMode} onChange={(e) => setLetterMode(e.target.value)}>
                    <option value={LETTER_MODES.MANUAL_ONLY}>{t("lobby.manualOnly")}</option>
                    <option value={LETTER_MODES.RANDOM_ONLY}>{t("lobby.randomOnly")}</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="game-btn-primary w-full">✨ {t("lobby.createRoom")}</button>
            </form>
          </div>
        )}

        {/* ── Step 2b: join room ───────────────────────────────────────── */}
        {view === "join" && (
          <div className="w-full animate-fade-in">
            <button
              type="button"
              onClick={() => setView(null)}
              className="game-btn-secondary mb-4 text-sm"
            >
              ← {t("common.back")}
            </button>
            <form onSubmit={handleJoinRoom} className="game-card space-y-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Fredoka One',cursive", color: "#059669" }}>
                🔑 {t("lobby.joinRoom")}
              </h2>
              <input
                className="game-input text-center font-mono text-lg tracking-widest uppercase"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder={t("lobby.roomId")}
                maxLength={12}
                required
              />
              <button type="submit" className="game-btn-primary w-full">🔑 {t("lobby.joinRoom")}</button>
            </form>

            {waitingRooms.length > 0 && (
              <div className="mt-4 game-card space-y-2">
                <h3 className="text-sm font-semibold subtle-text">Open rooms</h3>
                {waitingRooms.map((item) => (
                  <div key={item.roomId} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <div className="text-sm">
                      <p className="font-mono font-semibold">{item.roomId}</p>
                      <p className="subtle-text text-xs">{item.playerCount}/{item.maxPlayers} · {item.totalRounds}r · {item.timeLimit}s</p>
                    </div>
                    <button type="button" className="game-btn-secondary text-xs"
                      onClick={() => { joinRoom({ roomId: item.roomId }); navigate(`/waiting/${item.roomId}`); }}>
                      {t("lobby.joinRoom")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: waiting room (owner only) ───────────────────────── */}
        {view === "waiting" && (
          <div className="w-full animate-fade-in space-y-4">

            {/* Room ID card */}
            <div className="game-card text-center space-y-2">
              <p className="text-xs subtle-text font-semibold uppercase tracking-wide">Room ID — share with friends</p>
              <p className="font-mono text-4xl font-black tracking-widest" style={{ color: "#7c3aed" }}>{room.id}</p>
              <button type="button" onClick={handleCopyRoomId}
                className="game-btn-secondary text-xs mx-auto">
                {copied ? "✓ Copied!" : "Copy Room ID"}
              </button>
            </div>

            {/* Player list */}
            <div className="game-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("common.players")} ({players.length} / {maxPlayers})</p>
                <span className="text-xs subtle-text">Waiting for players…</span>
              </div>

              {players.length === 0 && (
                <p className="text-sm subtle-text">{t("game.waitingPlayers")}</p>
              )}

              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{p.name ?? p.username}</span>
                    {p.id === currentUserId && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">{t("common.you")}</span>
                    )}
                    {p.id === room.ownerId && p.id !== currentUserId && (
                      <span className="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">{t("common.owner")}</span>
                    )}
                    {p.isBot && (
                      <span className="rounded-full bg-good/20 px-2 py-0.5 text-[10px] font-bold text-good">{t("common.bot")}</span>
                    )}
                  </div>
                  {isOwner && p.id !== currentUserId && (
                    <button
                      type="button"
                      className="game-btn-danger text-xs !px-2 !py-1"
                      onClick={() => {
                        kickPlayer(room.id, p.id);
                        removePlayer(p.id); // optimistic removal
                      }}
                    >
                      {t("lobby.kick")}
                    </button>
                  )}
                </div>
              ))}

              {/* Empty seats indicator */}
              {players.length < maxPlayers && (
                <p className="text-center text-xs subtle-text pt-1">
                  {maxPlayers - players.length} empty seat{maxPlayers - players.length !== 1 ? "s" : ""} — will be filled with bots on start
                </p>
              )}
            </div>

            {/* Start button (owner only) */}
            {isOwner && (
              <button
                type="button"
                disabled={starting}
                onClick={handleStartGame}
                className="game-btn-primary w-full py-3 text-base"
                style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem" }}
              >
                {starting ? "Starting…" : `▶ ${t("lobby.startGame")}`}
              </button>
            )}

            {!isOwner && (
              <p className="text-center text-sm subtle-text">Waiting for the room owner to start the game…</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
