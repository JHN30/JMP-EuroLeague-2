import { useEffect } from "react";

// Keeps the selected child (`aria-selected="true"`) of a horizontally scrolling strip in the middle of it: smoothly when the
// selection changes, at once when the strip changes width (a phone turned sideways). `stripRef` is the element that scrolls
// and only that element moves, never the page. `selectionKey` changes whenever the selection or the strip's children do.
export function useCentredSelection(stripRef, selectionKey, enabled = true) {
  useEffect(() => {
    const strip = stripRef.current;
    if (!enabled || !strip) return undefined;
    const centre = (behavior) => {
      const active = strip.querySelector('[aria-selected="true"]');
      if (!active) return;
      const offset = active.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
      strip.scrollTo({ left: offset - (strip.clientWidth - active.offsetWidth) / 2, behavior });
    };
    centre("smooth");
    // The observer reports once when it starts; that first report is the scroll above, not a resize.
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) first = false;
      else centre("auto");
    });
    observer.observe(strip);
    return () => observer.disconnect();
  }, [stripRef, selectionKey, enabled]);
}
