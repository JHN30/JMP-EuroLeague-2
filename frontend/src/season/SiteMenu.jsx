import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, useLocation, useParams } from "react-router";
import { EASE_OUT } from "../lib/motion";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { TABS } from "./sections";

const MENU_ID = "site-menu";

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
              animate={{ opacity: 1 }}
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
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, pointerEvents: "none" }}
              transition={fade}
            >
              <motion.nav
                aria-label="Sections"
                className="flex flex-col gap-1 p-2"
                variants={rowsContainer}
                initial={reduced ? false : "hidden"}
                animate="show"
              >
                {TABS.map((tab) => (
                  <motion.div key={tab.label} variants={reduced ? undefined : row}>
                    <NavLink
                      to={`/${seasonCode}/${tab.path}`}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `relative flex min-h-12 items-center rounded-field px-4 text-base font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full ${
                          isActive ? "bg-primary/10 text-primary before:bg-primary" : "hover:bg-base-300"
                        }`
                      }
                    >
                      {tab.label}
                    </NavLink>
                  </motion.div>
                ))}
              </motion.nav>
              <div className="border-t border-base-300 p-3">
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
