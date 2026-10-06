import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useParams } from "react-router";
import { TABS } from "./sections";

const MENU_ID = "site-menu";

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

// Below sm the header shows only a bar; the tabs, season picker and theme switch live here.
export default function SiteMenu({ children }) {
  const { seasonCode } = useParams();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [seenKey, setSeenKey] = useState(location.key);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Any navigation (a tab, or a season change) closes the menu.
  if (seenKey !== location.key) {
    setSeenKey(location.key);
    setOpen(false);
  }

  useEffect(() => {
    const widerThanMobile = window.matchMedia("(min-width: 40rem)");
    const handleChange = (event) => {
      if (event.matches) setOpen(false);
    };
    widerThanMobile.addEventListener("change", handleChange);
    return () => widerThanMobile.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (panelRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-square size-11"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon open={open} />
      </button>
      {open ? (
        <>
          <div aria-hidden="true" className="fixed inset-x-0 bottom-0 top-(--app-nav-height) bg-black/40" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            id={MENU_ID}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--app-nav-height))] overflow-y-auto border-b border-base-300 bg-base-200 shadow-lg"
          >
            <nav aria-label="Sections" className="grid grid-cols-2 gap-2 p-3">
              {TABS.map((tab) => (
                <NavLink
                  key={tab.label}
                  to={`/${seasonCode}/${tab.path}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center rounded-field px-3 font-semibold ${isActive ? "bg-primary/15 text-primary" : "hover:bg-base-300"}`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2 border-t border-base-300 p-3 [&_button]:min-h-11 [&_button]:min-w-11 [&_select]:min-h-11 [&_select]:w-full">
              {children}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
