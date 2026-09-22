import { NavLink, useParams } from "react-router";

const TABS = [
  { label: "Home", path: "", end: true },
  { label: "Standings", path: "standings" },
  { label: "Fixtures and results", path: "games" },
  { label: "Teams", path: "teams" },
  { label: "Players", path: "players" },
  { label: "Statistics leaderboards", path: "statistics" },
  { label: "Comparisons and trends", path: "comparisons" },
  { label: "Playoffs", path: "playoffs" },
];

export default function NavBar() {
  const { seasonCode } = useParams();

  return (
    <nav aria-label="Sections" className="border-t border-base-300 px-4 sm:px-6">
      <div className="tabs tabs-sm flex-wrap">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            end={tab.end}
            to={tab.path ? `/${seasonCode}/${tab.path}` : `/${seasonCode}`}
            className={({ isActive }) => `tab font-semibold ${isActive ? "tab-active text-primary" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
