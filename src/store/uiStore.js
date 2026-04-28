import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const isBrowser = typeof window !== "undefined";

const detectInitialTheme = () => {
  if (!isBrowser) {
    return "dark";
  }
  try {
    const stored = window.localStorage.getItem("napoc-ui");
    if (stored) {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme;
      if (theme === "light" || theme === "dark") {
        return theme;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
};

const detectInitialLanguage = () => {
  if (!isBrowser) {
    return "en";
  }
  try {
    const stored = window.localStorage.getItem("napoc-ui");
    if (stored) {
      const parsed = JSON.parse(stored);
      const lang = parsed?.state?.language;
      if (lang === "ar" || lang === "en") {
        return lang;
      }
    }
  } catch {
    // ignore
  }
  const navigatorLang = window.navigator?.language?.toLowerCase() ?? "";
  return navigatorLang.startsWith("ar") ? "ar" : "en";
};

export const useUIStore = create(
  persist(
    (set, get) => ({
      theme: detectInitialTheme(),
      language: detectInitialLanguage(),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === "en" ? "ar" : "en" })
    }),
    {
      name: "napoc-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, language: state.language })
    }
  )
);
