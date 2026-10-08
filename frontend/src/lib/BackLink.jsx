import { useContext, useEffect } from "react";
import { Link } from "react-router";
import { BackTargetContext } from "./backTarget";
import { useBackLinkClick } from "./historyTrail";

// A quiet link to a page's list ("← Games"), for the top of a detail page. The arrow is drawn, not read; screen readers get
// "Back to Games". Below sm the sticky bar carries the link, so this one is hidden there.
export default function BackLink({ to, label }) {
  const setBackTarget = useContext(BackTargetContext);
  const goBack = useBackLinkClick(to);
  useEffect(() => {
    setBackTarget({ to, label });
    return () => setBackTarget(null);
  }, [setBackTarget, to, label]);

  return (
    <Link
      to={to}
      onClick={goBack}
      className="mb-1 -ml-1 inline-flex items-center gap-1 rounded px-1 py-1.5 text-sm font-medium muted hover:text-primary focus-visible:text-primary max-sm:hidden"
    >
      <span aria-hidden="true">←</span>
      <span className="sr-only">Back to </span>
      {label}
    </Link>
  );
}
