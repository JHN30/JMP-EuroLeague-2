import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "euroleague-theme";

// `browserColor` is the phone browser bar (meta theme-color): base-200 of each theme block in index.css, the header's colour,
// as sRGB hex. Keep it in step when base-200 changes (index.html starts with the dark one).
export const THEMES = {
  "dark-euroleague": { name: "dark-euroleague", title: "Dark", browserColor: "#070d14" },
  "light-euroleague": { name: "light-euroleague", title: "Light", browserColor: "#eef2f7" },
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
