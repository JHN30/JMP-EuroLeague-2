import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";

// The page of each history entry visited in this session, by the entry's index (the router keeps it in the browser's history
// state). It lets a detail page's back link tell whether the entry before it is the list it points to. Held in memory only: a
// reload empties it, and the link is then an ordinary link.
const pathAt = new Map();

const idxOf = () => window.history.state?.idx;

export function useRecordHistory() {
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    const idx = idxOf();
    if (typeof idx === "number") pathAt.set(idx, pathname);
  }, [pathname, search]);
}

// The click handler of a back link to `to` (an address that may carry a query string). When the entry before this one is the same
// page, it goes back one step instead of opening a new entry, so the list is back as it was left (its filters and its scroll,
// which the browser restores on Back). Otherwise, and for a click that asks for a new tab or window, the link works as a link.
export function useBackLinkClick(to) {
  const navigate = useNavigate();
  return (event) => {
    if (!to || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const idx = idxOf();
    if (typeof idx === "number" && idx > 0 && pathAt.get(idx - 1) === to.split("?")[0]) {
      event.preventDefault();
      navigate(-1);
    }
  };
}
