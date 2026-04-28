import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/apiClient";
import { normalizeUser } from "../utils/backendAdapters";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";

function normalizeAuthPayload(payload, fallbackName, fallbackEmail, t) {
  const token = payload?.token ?? payload?.data?.token;
  const user = normalizeUser(payload?.user ?? payload?.data?.user);
  if (!token) throw new Error(t("auth.tokenMissing"));
  return { token, user: user ?? { id: `fallback-${Date.now()}`, name: fallbackName || fallbackEmail || "Player" } };
}

/* ── Decorative elements scattered around the page ───────────────────────── */
const DECO_ITEMS = [
  // Letter bubbles
  { label: "N", color: "#7c3aed", bg: "#ede9fe", top: "7%",  left: "5%",  size: 56, anim: "float-slow",   delay: "0s",    rot: "-8deg" },
  { label: "A", color: "#0891b2", bg: "#cffafe", top: "18%", left: "91%", size: 48, anim: "float-medium",  delay: "0.8s",  rot: "6deg"  },
  { label: "P", color: "#d97706", bg: "#fef3c7", top: "68%", left: "3%",  size: 60, anim: "float-medium",  delay: "1.2s",  rot: "10deg" },
  { label: "O", color: "#059669", bg: "#d1fae5", top: "78%", left: "90%", size: 52, anim: "float-slow",    delay: "0.4s",  rot: "-5deg" },
  { label: "C", color: "#dc2626", bg: "#fee2e2", top: "42%", left: "93%", size: 48, anim: "float-fast",    delay: "1.6s",  rot: "8deg"  },
  { label: "B", color: "#7c3aed", bg: "#ede9fe", top: "88%", left: "18%", size: 44, anim: "float-slow",    delay: "2.1s",  rot: "-12deg"},
  { label: "S", color: "#0891b2", bg: "#cffafe", top: "55%", left: "94%", size: 40, anim: "float-medium",  delay: "0.3s",  rot: "4deg"  },
  { label: "M", color: "#d97706", bg: "#fef3c7", top: "30%", left: "2%",  size: 44, anim: "float-fast",    delay: "1.9s",  rot: "-6deg" },
  { label: "T", color: "#059669", bg: "#d1fae5", top: "93%", left: "72%", size: 50, anim: "float-slow",    delay: "0.7s",  rot: "7deg"  },
  { label: "R", color: "#dc2626", bg: "#fee2e2", top: "12%", left: "55%", size: 38, anim: "float-fast",    delay: "2.4s",  rot: "-9deg" },
  // Category word chips
  { label: "Name",   color: "#7c3aed", bg: "#ede9fe", top: "22%", left: "4%",  size: null, anim: "float-slow",   delay: "1.1s",  rot: "-5deg", isWord: true },
  { label: "Animal", color: "#0891b2", bg: "#cffafe", top: "60%", left: "3%",  size: null, anim: "float-medium",  delay: "0.6s",  rot: "4deg",  isWord: true },
  { label: "Plant",  color: "#059669", bg: "#d1fae5", top: "14%", left: "82%", size: null, anim: "float-fast",    delay: "1.5s",  rot: "6deg",  isWord: true },
  { label: "Object", color: "#d97706", bg: "#fef3c7", top: "48%", left: "88%", size: null, anim: "float-slow",   delay: "2.2s",  rot: "-7deg", isWord: true },
  { label: "City",   color: "#dc2626", bg: "#fee2e2", top: "83%", left: "52%", size: null, anim: "float-medium",  delay: "0.9s",  rot: "9deg",  isWord: true },
  // Doodles
  { label: "♥", color: "#f43f5e", bg: "transparent", top: "9%",  left: "76%", size: null, anim: "float-slow",  delay: "0.2s",  rot: "0deg",  isDoodle: true, fontSize: "2rem"   },
  { label: "♥", color: "#fb7185", bg: "transparent", top: "5%",  left: "82%", size: null, anim: "float-medium", delay: "1.3s",  rot: "0deg",  isDoodle: true, fontSize: "1.3rem" },
  { label: "✦", color: "#7c3aed", bg: "transparent", top: "38%", left: "1%",  size: null, anim: "float-fast",   delay: "0.5s",  rot: "0deg",  isDoodle: true, fontSize: "2rem"   },
  { label: "✦", color: "#d97706", bg: "transparent", top: "90%", left: "8%",  size: null, anim: "sway",         delay: "1.7s",  rot: "0deg",  isDoodle: true, fontSize: "2.2rem" },
  { label: "✦", color: "#059669", bg: "transparent", top: "4%",  left: "44%", size: null, anim: "float-slow",  delay: "2.0s",  rot: "0deg",  isDoodle: true, fontSize: "1.8rem" },
  { label: "✶", color: "#0891b2", bg: "transparent", top: "75%", left: "85%", size: null, anim: "sway",         delay: "0.8s",  rot: "0deg",  isDoodle: true, fontSize: "2.5rem" },
  { label: "✶", color: "#dc2626", bg: "transparent", top: "96%", left: "38%", size: null, anim: "float-fast",   delay: "1.4s",  rot: "0deg",  isDoodle: true, fontSize: "1.5rem" },
];

const CATEGORY_COLORS = ["#7c3aed", "#0891b2", "#d97706", "#059669", "#dc2626"];
const TITLE_WORDS_BY_LANG = {
  en: ["Name", "Animal", "Plant", "Object", "Cities"],
  ar: ["اسم", "نبات", "حيوان", "جماد", "بلاد"],
};
const AR_TITLE_FONT_STACK = "'Noto Kufi Arabic', 'Cairo', 'Tajawal', 'Noto Sans Arabic', sans-serif";

function DecoItem({ item }) {
  const style = {
    position: "absolute",
    top: item.top,
    left: item.left,
    animation: `${item.anim} ${item.anim === "sway" ? "3s" : item.anim === "float-slow" ? "6s" : item.anim === "float-medium" ? "4.5s" : "3.5s"} ease-in-out ${item.delay} infinite`,
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 0,
    transform: `rotate(${item.rot})`,
  };

  if (item.isDoodle) {
    return (
      <span style={{ ...style, color: item.color, fontSize: item.fontSize, lineHeight: 1 }}>
        {item.label}
      </span>
    );
  }

  if (item.isWord) {
    return (
      <span
        style={{
          ...style,
          background: item.bg,
          color: item.color,
          borderRadius: "999px",
          padding: "4px 14px",
          fontSize: "0.82rem",
          fontWeight: 700,
          fontFamily: "'Nunito', sans-serif",
          border: `2px solid ${item.color}40`,
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>
    );
  }

  return (
    <span
      style={{
        ...style,
        width: item.size,
        height: item.size,
        background: item.bg,
        color: item.color,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: item.size * 0.46,
        fontWeight: 900,
        fontFamily: "'Fredoka One', cursive",
        border: `3px solid ${item.color}50`,
        boxShadow: `0 4px 12px ${item.color}30`,
      }}
    >
      {item.label}
    </span>
  );
}

export function AuthPage() {
  const navigate   = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const titleWords = TITLE_WORDS_BY_LANG[language] ?? TITLE_WORDS_BY_LANG.en;

  const [guestName, setGuestName]     = useState("");
  const [guestError, setGuestError]   = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  const [mode, setMode]               = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleGuest = async (e) => {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    setGuestLoading(true);
    setGuestError("");
    try {
      const payload = await authApi.guest(name);
      const token = payload?.token ?? payload?.data?.token;
      const user  = payload?.user ?? payload?.data?.user;
      if (!token) throw new Error(t("auth.tokenMissing"));
      setSession({ token, user: user ?? { id: `guest-${Date.now()}`, name, username: name } });
      navigate("/lobby", { replace: true });
    } catch (err) {
      setGuestError(err.message || t("connection.requestFailed"));
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload =
        mode === "login"
          ? await authApi.login({ email, password })
          : await authApi.register({ username: displayName, email, password });
      const session = normalizeAuthPayload(payload, displayName, email, t);
      setSession(session);
      navigate("/lobby", { replace: true });
    } catch (err) {
      setError(err.message || t("connection.requestFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg relative min-h-screen overflow-hidden">

      {/* Decorative scattered elements — hidden on small screens to avoid overflow */}
      <div className="hidden sm:block" aria-hidden="true">
        {DECO_ITEMS.map((item, i) => (
          <DecoItem key={i} item={item} />
        ))}
      </div>

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">

        {/* Game title */}
        <div className="mb-8 text-center select-none">
          <div
            className="mb-2 leading-tight"
            style={{
              fontFamily: isArabic ? AR_TITLE_FONT_STACK : "'Fredoka One', cursive",
              fontSize: isArabic ? "clamp(2rem, 6vw, 3.35rem)" : "clamp(1.6rem, 5vw, 2.8rem)",
              fontWeight: isArabic ? 800 : undefined,
            }}
          >
            {titleWords.map((word, i) => (
              <span
                key={word}
                style={{
                  color: CATEGORY_COLORS[i],
                  display: "inline-block",
                  marginInlineEnd: isArabic ? "0.24em" : "0.35em",
                }}
              >
                {word}
              </span>
            ))}
          </div>
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: "'Nunito', sans-serif", color: "#6b7280" }}
          >
            {t("auth.subtitle")}
          </p>
        </div>

        {/* Auth card */}
        <div
          className="auth-card w-full max-w-sm rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "2px solid rgba(124,58,237,0.18)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* ── Guest section ── */}
          <form className="space-y-3" onSubmit={handleGuest}>
            <p
              className="text-center text-xs font-black uppercase tracking-widest"
              style={{ color: "#059669", fontFamily: "'Nunito', sans-serif" }}
            >
              ✦ {t("auth.playAsGuest")}
            </p>
            <input
              className="game-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t("auth.guestName")}
              maxLength={20}
              style={{ fontFamily: "'Nunito', sans-serif" }}
            />
            {guestError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200">
                {guestError}
              </p>
            )}
            <button
              type="submit"
              disabled={guestLoading || !guestName.trim()}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                background: guestLoading || !guestName.trim()
                  ? "#6ee7b7"
                  : "linear-gradient(135deg, #059669, #10b981)",
                color: "#fff",
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                fontSize: "1rem",
                border: "none",
                cursor: guestLoading || !guestName.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
                transition: "all 0.18s",
              }}
            >
              {guestLoading ? t("auth.submitting") : `▶ ${t("auth.playNow")}`}
            </button>
          </form>

          <div className="hidden">
            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200" />
              <span
                className="text-xs font-semibold"
                style={{ color: "#94a3b8", fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap" }}
              >
                {t("auth.orSignIn")}
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* ── Login / Register tabs ── */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    borderRadius: "10px",
                    padding: "7px 0",
                    border: "2px solid",
                    borderColor: mode === m ? "#7c3aed" : "#e2e8f0",
                    background: mode === m ? "#7c3aed" : "transparent",
                    color: mode === m ? "#fff" : "#64748b",
                    cursor: "pointer",
                    transition: "all 0.18s",
                    fontSize: "0.88rem",
                  }}
                >
                  {m === "login" ? t("auth.login") : t("auth.register")}
                </button>
              ))}
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              {mode === "register" && (
                <input
                  className="game-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.displayName")}
                  required
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                />
              )}
              <input
                className="game-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                type="email"
                required
                autoComplete="email"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
              <input
                className="game-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  background: loading ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                  fontSize: "1rem",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                  transition: "all 0.18s",
                }}
              >
                {loading
                  ? t("auth.submitting")
                  : mode === "login"
                    ? `✦ ${t("auth.login")}`
                    : `✦ ${t("auth.createAccount")}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
