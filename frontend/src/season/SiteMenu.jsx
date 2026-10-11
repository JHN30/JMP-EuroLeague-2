import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, useLocation, useParams } from "react-router";
import { EASE_OUT } from "../lib/motion";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import IconArrowsExchange from "@tabler/icons-react/dist/esm/icons/IconArrowsExchange.mjs";
import IconAward from "@tabler/icons-react/dist/esm/icons/IconAward.mjs";
import IconBallBasketball from "@tabler/icons-react/dist/esm/icons/IconBallBasketball.mjs";
import IconChartBar from "@tabler/icons-react/dist/esm/icons/IconChartBar.mjs";
import IconHome from "@tabler/icons-react/dist/esm/icons/IconHome.mjs";
import IconLayoutDashboard from "@tabler/icons-react/dist/esm/icons/IconLayoutDashboard.mjs";
import IconListNumbers from "@tabler/icons-react/dist/esm/icons/IconListNumbers.mjs";
import IconTrophy from "@tabler/icons-react/dist/esm/icons/IconTrophy.mjs";
import IconUserCircle from "@tabler/icons-react/dist/esm/icons/IconUserCircle.mjs";
import IconUsersGroup from "@tabler/icons-react/dist/esm/icons/IconUsersGroup.mjs";
import { TABS } from "./sections";

const MENU_ID = "site-menu";

// The icon before each tab's label, by the tab's path. Each icon is imported from its own file so the bundle holds only these ten; a
// tab without one shows its label alone.
const TAB_ICONS = {
  home: IconHome,
  overview: IconLayoutDashboard,
  standings: IconListNumbers,
  games: IconBallBasketball,
  teams: IconUsersGroup,
  players: IconUserCircle,
  leaders: IconChartBar,
  records: IconAward,
  compare: IconArrowsExchange,
  postseason: IconTrophy,
};

// Three bars that turn into a cross: the outer two move to the middle and tilt, the middle one fades.
function MenuIcon({ open, reduced }) {
  const transition = { duration: reduced ? 0 : 0.22, ease: EASE_OUT };
  const bar = { x1: 4, x2: 20, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", style: { transformBox: "fill-box", transformOrigin: "center" } };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <motion.line {...bar} y1={7} y2={7} initial={false} animate={open ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }} transition={transition} />
      <motion.line {...bar} y1={12} y2={12} initial={false} animate={open ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }} transition={transition} />
      <motion.line {...bar} y1={17} y2={17} initial={false} animate={open ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }} transition={transition} />
    </svg>
  );
}

const rowsContainer = { hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } } };
const row = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE_OUT } } };

// Below sm the header shows only a bar; the tabs, season picker and theme switch live here.
export default function SiteMenu({ children }) {
  const { seasonCode } = useParams();
  const location = useLocation();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [seenKey, setSeenKey] = useState(location.key);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Any navigation (a tab, a season change, the logo) closes the menu.
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

  const fade = { duration: reduced ? 0 : 0.2, ease: EASE_OUT };

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
        <MenuIcon open={open} reduced={reduced} />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              aria-hidden="true"
              className="fixed inset-x-0 bottom-0 top-(--app-nav-height) bg-black/40"
              initial={{ opacity: 0 }}
              // Leaving sets pointer-events to none; coming back before the exit has finished must turn them on again.
              animate={{ opacity: 1, pointerEvents: "auto" }}
              exit={{ opacity: 0, pointerEvents: "none" }}
              transition={fade}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="panel"
              ref={panelRef}
              id={MENU_ID}
              className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--app-nav-height))] overflow-y-auto border-b border-base-300 bg-base-200 shadow-lg"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ opacity: 0, y: -12, pointerEvents: "none" }}
              transition={fade}
            >
              <motion.nav
                aria-label="Sections"
                className="divide-y divide-base-300"
                variants={rowsContainer}
                initial={reduced ? false : "hidden"}
                animate="show"
              >
                {TABS.map((tab) => {
                  const Icon = TAB_ICONS[tab.path];
                  return (
                  // One column of rows with a hairline between them.
                  <motion.div key={tab.label} variants={reduced ? undefined : row}>
                    <NavLink
                      to={`/${seasonCode}/${tab.path}`}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `site-menu-row relative flex min-h-11 items-center gap-3 px-4 text-base font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full ${
                          isActive ? "bg-primary/10 text-primary before:bg-primary" : "hover:bg-base-300"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {Icon ? <Icon aria-hidden="true" size={20} stroke={1.75} className={`flex-none ${isActive ? "" : "opacity-70"}`} /> : null}
                          {tab.label}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                  );
                })}
              </motion.nav>
              <div className="site-menu-footer border-t border-base-300 p-3">
                <p aria-hidden="true" className="eyebrow mb-2">
                  Season
                </p>
                <div className="flex items-center gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_select]:min-h-11 [&_select]:w-full">
                  {children}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
