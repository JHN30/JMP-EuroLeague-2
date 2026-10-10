import { useContext, useEffect, useRef } from "react";
import { Link } from "react-router";
import { BackTargetContext } from "./backTarget";
import { isPlainClick, useBackLinkClick } from "./historyTrail";

// A quiet link to a page's list ("← Games"), for the top of a detail page. The arrow is drawn, not read; screen readers get
// "Back to Games". Below sm the sticky bar carries the link, so this one is hidden there. A page whose way back is a change of its
// own state, not another address, passes `onBack`: a plain click runs it instead of following `to` (which stays the link's address
// for a new tab), here and in the sticky bar.
export default function BackLink({ to, label, onBack }) {
  const setBackTarget = useContext(BackTargetContext);
  const goBack = useBackLinkClick(to);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  const hasOnBack = Boolean(onBack);
  useEffect(() => {
    setBackTarget({ to, label, onBack: hasOnBack ? () => onBackRef.current() : undefined });
    return () => setBackTarget(null);
  }, [setBackTarget, to, label, hasOnBack]);

  return (
    <Link
      to={to}
      onClick={(event) => {
        if (hasOnBack && isPlainClick(event)) {
          event.preventDefault();
          onBack();
        } else goBack(event);
      }}
      className="mb-1 -ml-1 inline-flex items-center gap-1 rounded px-1 py-1.5 text-sm font-medium muted hover:text-primary focus-visible:text-primary max-sm:hidden"
    >
      <span aria-hidden="true">←</span>
      <span className="sr-only">Back to </span>
      {label}
    </Link>
  );
}
