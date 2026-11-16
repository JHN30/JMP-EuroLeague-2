import { NavLink, useParams } from "react-router";
import { TABS } from "./sections";

export default function NavBar() {
  const { seasonCode } = useParams();

  return (
    <nav
      aria-label="Sections"
      className="hidden min-h-0 flex-1 items-center border-t border-base-300 px-3 sm:flex sm:px-5 lg:px-8"
    >
      {/* Ten tabs need the tablet width: 3px of padding each side, a medium weight and tight tracking below lg (Inter is wider than
          the system fonts), and the row reaches 4px into the gutter so the first label stays on its edge. Below lg the tabs
          share the row's width, so a wider tablet spaces them out instead of leaving the room on the right. */}
      {/* `site-tabs` (index.css) draws the current page's underline, the bold label and the dimmer other tabs; `data-label`
          is the hidden bold copy that keeps each tab's width fixed. */}
      <div className="site-tabs tabs tabs-sm -mx-1 flex-nowrap overflow-x-auto max-lg:flex-1 max-lg:justify-between lg:mx-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/${seasonCode}/${tab.path}`}
            data-label={tab.label}
            className={({ isActive }) => `tab px-[3px] font-medium tracking-tight lg:px-2 lg:font-semibold lg:tracking-normal ${isActive ? "tab-active" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
