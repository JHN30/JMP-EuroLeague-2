import { NavLink, useParams } from "react-router";
import { TABS } from "./sections";

export default function NavBar() {
  const { seasonCode } = useParams();

  return (
    <nav
      aria-label="Sections"
      className="hidden min-h-0 flex-1 items-center border-t border-base-300 px-3 sm:flex sm:px-5 lg:px-8"
    >
      {/* Ten tabs need the tablet width: 4px of padding each side below lg, and the row reaches 4px into the gutter so the first label stays on its edge. */}
      <div data-nosnippet className="tabs tabs-sm -mx-1 flex-nowrap overflow-x-auto lg:mx-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/${seasonCode}/${tab.path}`}
            className={({ isActive }) => `tab px-1 font-semibold lg:px-2 ${isActive ? "tab-active text-primary" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
