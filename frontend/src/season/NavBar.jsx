import { NavLink, useParams } from "react-router";

const TABS = [
  { label: "Home", path: "", end: true },
  { label: "Overview", path: "overview" },
  { label: "Standings", path: "standings" },
  { label: "Games", path: "games" },
  { label: "Teams", path: "teams" },
  { label: "Players", path: "players" },
  { label: "Leaders", path: "statistics" },
  { label: "Compare", path: "comparisons" },
  { label: "Format", path: "playoffs" },
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
