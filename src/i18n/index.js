import { createContext, createElement, useCallback, useContext, useEffect, useMemo } from "react";
import en from "./en";
import ar from "./ar";
import { useUIStore } from "../store/uiStore";

const DICTIONARIES = { en, ar };

const I18nContext = createContext({
  language: "en",
  dir: "ltr",
  t: (key) => key
});

function resolveKey(dict, key) {
  if (!key) {
    return "";
  }
  const parts = String(key).split(".");
  let current = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function format(template, values) {
  if (!values) {
    return template;
  }
  return Object.keys(values).reduce(
    (acc, key) => acc.replaceAll(`{${key}}`, String(values[key] ?? "")),
    template
  );
}

export function I18nProvider({ children }) {
  const language = useUIStore((state) => state.language);
  const theme = useUIStore((state) => state.theme);
  const dir = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", dir);
  }, [language, dir]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    }
  }, [theme]);

  const t = useCallback(
    (key, values) => {
      const dict = DICTIONARIES[language] ?? DICTIONARIES.en;
      const resolved = resolveKey(dict, key) ?? resolveKey(DICTIONARIES.en, key) ?? key;
      return format(resolved, values);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, dir, t }),
    [language, dir, t]
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation() {
  return useContext(I18nContext);
}
