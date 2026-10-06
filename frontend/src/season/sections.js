export const TABS = [
  { label: "Home", path: "home" },
  { label: "Overview", path: "overview" },
  { label: "Standings", path: "standings" },
  { label: "Games", path: "games" },
  { label: "Teams", path: "teams" },
  { label: "Players", path: "players" },
  { label: "Leaders", path: "leaders" },
  { label: "Compare", path: "compare" },
  { label: "Postseason", path: "postseason" },
];

// Records is a real page without a tab, so the mobile header still names it.
const UNLISTED_LABELS = { records: "Records" };

// The section a path belongs to: /2026/games/123 is Games.
export function pageLabel(pathname) {
  const section = pathname.split("/")[2];
  const tab = TABS.find((entry) => entry.path === section);
  return tab?.label ?? UNLISTED_LABELS[section] ?? "EuroLeague";
}
