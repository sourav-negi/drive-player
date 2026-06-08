// ------------------------------------------------------------------
// drive-pleya — theme context (light / dark / system)
// ------------------------------------------------------------------

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";   // what's actually applied
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "drive-pleya:theme";

function getStored(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch { /* noop */ }
  return "system";
}

function resolve(t: Theme): "light" | "dark" {
  if (t === "light" || t === "dark") return t;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStored);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(getStored()));

  const apply = useCallback((t: Theme) => {
    const r = resolve(t);
    document.documentElement.setAttribute("data-theme", r);
    setResolved(r);
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
      apply(t);
    },
    [apply],
  );

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  // apply on mount
  useEffect(() => {
    apply(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => apply("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, apply]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
