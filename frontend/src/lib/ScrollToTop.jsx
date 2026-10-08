import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";
import { useRecordHistory } from "./historyTrail";

// Opening a page starts at its top. The router leaves the window's scroll where it was, and the browser only lands at the top when
// the new page is shorter than that position (a page still loading), so a page whose data is already cached opened part-way down.
// Only a change of path counts: filters that change the query string, and Back or Forward, keep their positions.
// It also records each history entry's page, for the detail pages' back links (`historyTrail.js`).
export default function ScrollToTop() {
  useRecordHistory();
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (changed && navigationType !== "POP" && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}
