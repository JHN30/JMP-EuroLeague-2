import { NavLink, useParams } from "react-router";
import { TABS } from "./sections";

export default function NavBar() {
  const { seasonCode } = useParams();

  return (
    <nav
      aria-label="Sections"
      className="hidden min-h-0 flex-1 items-center border-t border-base-300 px-3 sm:flex sm:px-5 lg:px-8"
    >
      <div className="tabs tabs-sm flex-nowrap overflow-x-auto">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/${seasonCode}/${tab.path}`}
            className={({ isActive }) => `tab px-1.5 font-semibold lg:px-2 ${isActive ? "tab-active text-primary" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
