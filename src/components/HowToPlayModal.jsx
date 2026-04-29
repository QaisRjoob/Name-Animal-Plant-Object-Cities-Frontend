import { useEffect } from "react";
import { useTranslation } from "../i18n";

const CATEGORY_COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626"];
const CATEGORY_LABELS_EN = ["Name", "Animal", "Plant", "Object", "City"];
const CATEGORY_LABELS_AR = ["اسم", "حيوان", "نبات", "جماد", "بلاد"];

export function HowToPlayModal({ onClose }) {
  const { t, language } = useTranslation();
  const isArabic = language === "ar";
  const htp = t("howToPlay");
  const sections = htp.sections ?? [];
  const categoryLabels = isArabic ? CATEGORY_LABELS_AR : CATEGORY_LABELS_EN;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="game-card animate-fade-in flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="relative flex flex-col items-center gap-1 bg-gradient-to-br from-accent/20 to-accent-hover/10 px-6 pb-4 pt-6">
          {/* Category pill strip */}
          <div className="mb-2 flex gap-1.5">
            {categoryLabels.map((label, i) => (
              <span
                key={i}
                className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: CATEGORY_COLORS[i] }}
              >
                {label}
              </span>
            ))}
          </div>
          <h2 className="text-2xl font-black">{htp.title}</h2>
          <p className="text-sm subtle-text">{htp.subtitle}</p>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm subtle-text transition hover:bg-border"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "60vh" }}>
          <div className="flex flex-col gap-4">
            {sections.map((section, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {section.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{section.heading}</p>
                  <p className="mt-0.5 text-sm leading-relaxed subtle-text">{section.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="game-btn-primary w-full"
          >
            {htp.close}
          </button>
        </div>
      </div>
    </div>
  );
}
