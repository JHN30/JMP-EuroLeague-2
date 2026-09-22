import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "euroleague-theme";

export const THEMES = {
  "dark-euroleague": { name: "dark-euroleague", title: "Dark", browserColor: "#151517" },
  "light-euroleague": { name: "light-euroleague", title: "Light", browserColor: "#f6f2ec" },
};

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored && Object.hasOwn(THEMES, stored) ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light-euroleague" : "dark-euroleague";
}

function resolveInitialTheme() {
  return readStoredTheme() ?? systemTheme();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light-euroleague" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEMES[theme].browserColor;
}

export function useThemePreference() {
  const [theme, setTheme] = useState(resolveInitialTheme);
  const [hasExplicitChoice, setHasExplicitChoice] = useState(() => readStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (hasExplicitChoice) return undefined;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (event) => setTheme(event.matches ? "light-euroleague" : "dark-euroleague");
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [hasExplicitChoice]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark-euroleague" ? "light-euroleague" : "dark-euroleague";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // The theme still applies for this session when storage is unavailable.
      }
      return next;
    });
    setHasExplicitChoice(true);
  }, []);

  const nextTheme = theme === "dark-euroleague" ? "light-euroleague" : "dark-euroleague";

  return { theme, nextTheme, toggleTheme };
}
