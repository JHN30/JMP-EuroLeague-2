import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "../lib/motion";
import RevealImage from "../lib/RevealImage";

// The list opens inside the page, under its box, growing from nothing to its height, so it never hangs over the edge of the card
// around it; it is capped at about six rows and scrolls inside itself.
const PANEL_MOTION = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } },
};

// An opened list low on the page scrolls just far enough to be seen, as a native list would show itself, once it has grown.
function reveal(node, smooth) {
  node?.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" });
}

// The open list of a team or player picker, under its box. `heading` and `note` are text around the options (a list title,
// "Searching..."), outside the listbox so a screen reader hears only the choices as options.
export default function PickerPanel({ open, listId, label, heading, note, children }) {
  const panelRef = useRef(null);
  // Height is not a transform, so MotionConfig's reduced motion does not stop it; it is made instant here instead.
  const reduceMotion = useReducedMotion();
  const instant = { duration: 0 };
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          ref={panelRef}
          initial={PANEL_MOTION.initial}
          animate={reduceMotion ? { ...PANEL_MOTION.animate, transition: instant } : PANEL_MOTION.animate}
          exit={reduceMotion ? { ...PANEL_MOTION.exit, transition: instant } : PANEL_MOTION.exit}
          onAnimationComplete={() => {
            if (open) reveal(panelRef.current, !reduceMotion);
          }}
          className="overflow-hidden"
        >
          <div className="mt-1 max-h-64 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-sm">
            {heading ? <p className="muted px-2.5 pt-1.5 pb-1 text-xs font-bold tracking-wide uppercase">{heading}</p> : null}
            <ul id={listId} role="listbox" aria-label={label} className="flex flex-col gap-0.5">
              {children}
            </ul>
            {note ? <p className="muted px-2.5 py-2 text-sm">{note}</p> : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// One choice. The press is taken on mousedown's default so the box keeps focus, and the keyboard's active row scrolls into view.
export function PickerOption({ id, active, selected, onChoose, onHover, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <li
      ref={ref}
      id={id}
      role="option"
      aria-selected={selected}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onHover}
      onClick={onChoose}
      className={`flex cursor-pointer items-center gap-2.5 rounded-field px-2.5 py-1.5 text-sm transition-colors ${active ? "bg-base-200" : ""} ${
        selected ? "font-semibold text-primary" : ""
      }`}
    >
      {children}
      <span aria-hidden="true" className={`ml-auto flex-none text-primary ${selected ? "" : "invisible"}`}>
        ✓
      </span>
    </li>
  );
}

// A crest or a photo in a picker row or box. A traded player's season row joins several crest addresses with ";", which no
// single image can show, so it shows none.
export function PickerImage({ src, round = false, className = "h-6 w-6" }) {
  if (!src || src.includes(";")) return <span aria-hidden="true" className={`${className} flex-none`} />;
  return round ? (
    <span className={`${className} relative flex-none overflow-hidden rounded-full bg-neutral`}>
      <RevealImage src={src} effect="wipe" className="h-full w-full origin-top scale-[1.7] object-cover object-top" />
    </span>
  ) : (
    <RevealImage src={src} className={`${className} flex-none object-contain`} />
  );
}
