/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        subtle: "rgb(var(--color-subtle) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--color-accent-hover) / <alpha-value>)",
        good: "rgb(var(--color-good) / <alpha-value>)",
        warn: "rgb(var(--color-warn) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "danger-hover": "rgb(var(--color-danger-hover) / <alpha-value>)",

        // Legacy tokens — back-compat with components that still reference bg-game-*
        game: {
          bg: "rgb(var(--color-surface) / <alpha-value>)",
          card: "rgb(var(--color-card) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
          good: "rgb(var(--color-good) / <alpha-value>)",
          warn: "rgb(var(--color-warn) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Noto Sans Arabic",
          "sans-serif"
        ]
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(124, 58, 237, 0.6)" },
          "100%": { boxShadow: "0 0 0 12px rgba(124, 58, 237, 0)" }
        },
        "letter-pop": {
          "0%": { transform: "scale(0.6)", opacity: 0 },
          "60%": { transform: "scale(1.1)", opacity: 1 },
          "100%": { transform: "scale(1)", opacity: 1 }
        }
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "letter-pop": "letter-pop 260ms cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
};
