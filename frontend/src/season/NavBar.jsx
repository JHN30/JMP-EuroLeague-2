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
    <nav aria-label="Sections" className="overflow-x-auto">
      <div role="tablist" className="tabs tabs-boxed w-max">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            role="tab"
            end={tab.end}
            to={tab.path ? `/${seasonCode}/${tab.path}` : `/${seasonCode}`}
            className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
