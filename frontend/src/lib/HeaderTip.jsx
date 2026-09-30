import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "./motion";

const GAP = 8;
const EDGE = 8;

// The bubble is drawn in a portal so a scrolling table never clips it. It opens below its label, or above when there
// is no room, and is nudged sideways to stay inside the viewport.
function TipBubble({ id, tip, anchor }) {
  const ref = useRef(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const rect = ref.current.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - EDGE);
    const overflowLeft = EDGE - rect.left;
    // The shift is a layout measurement taken before paint, so the bubble is never seen off-centre.
    setShift(overflowRight > 0 ? -overflowRight : overflowLeft > 0 ? overflowLeft : 0);
  }, [anchor, tip]);

  const above = anchor.bottom + 80 > window.innerHeight;
  const offset = above ? 6 : -6;

  return (
    <motion.div
      ref={ref}
      id={id}
      role="tooltip"
      className="header-tip"
      style={{
        x: "-50%",
        left: anchor.centre,
        marginLeft: shift,
        ...(above ? { bottom: window.innerHeight - anchor.top + GAP } : { top: anchor.bottom + GAP }),
      }}
      initial={{ opacity: 0, y: offset, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: offset, scale: 0.96, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
    >
      {tip}
    </motion.div>
  );
}

// A column header (or badge) with a hover tip: the full name first, then a short explanation. It also opens on keyboard
// focus, and the text is read out after the label for screen readers.
export default function HeaderTip({ tip, children }) {
  const id = useId();
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);

  function open() {
    const rect = ref.current.getBoundingClientRect();
    setAnchor({ centre: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  }

  const isOpen = anchor !== null;
  useEffect(() => {
    if (!isOpen) return undefined;
    const close = () => setAnchor(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        className="header-tip-label"
        aria-describedby={isOpen ? id : undefined}
        onMouseEnter={open}
        onMouseLeave={() => setAnchor(null)}
        onFocus={open}
        onBlur={() => setAnchor(null)}
      >
        {children}
        <span className="sr-only"> ({tip})</span>
      </span>
      {createPortal(
        <AnimatePresence>{anchor ? <TipBubble key="tip" id={id} tip={tip} anchor={anchor} /> : null}</AnimatePresence>,
        document.body,
      )}
    </>
  );
}
