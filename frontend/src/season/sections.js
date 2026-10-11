export const TABS = [
  { label: "Home", path: "home" },
  { label: "Overview", path: "overview" },
  { label: "Standings", path: "standings" },
  { label: "Games", path: "games" },
  { label: "Teams", path: "teams" },
  { label: "Players", path: "players" },
  { label: "Leaders", path: "leaders" },
  { label: "Records", path: "records" },
  { label: "Compare", path: "compare" },
  { label: "Postseason", path: "postseason" },
];

// The section a path belongs to: /2026/games/123 is Games.
export function pageLabel(pathname) {
  const section = pathname.split("/")[2];
  const tab = TABS.find((entry) => entry.path === section);
  return tab?.label ?? "EuroLeague";
}
