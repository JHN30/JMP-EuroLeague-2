import { useEffect, useState } from "react";

const THEME_KEY = "euroleague-theme";

function initialTheme() {
  const theme = document.documentElement.dataset.theme;
  return Object.hasOwn(theme) ? theme : "dark-euroleague";
}

function App() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark-euroleague" ? "#151517" : "#f6f2ec";
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }, [theme]);

  return (
    <div className="app-shell">
      Hello World
    </div>
  );
}

export default App;
