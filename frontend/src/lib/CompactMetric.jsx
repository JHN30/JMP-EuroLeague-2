import { motion } from "motion/react";
import { Link } from "react-router";
import { cardHover } from "./motion";
import { SkeletonChip } from "./Skeleton";

const MotionLink = motion.create(Link);

// `to` makes the whole chip a link (a team's or player's page), styled and lifting on hover like the other linked chips.
// `tone` colours the value ("positive" green, "negative" red) for good or bad news; pair it with an arrow or sign
// in the value so the meaning never depends on colour alone.
// `skeleton` shows bars for the name and the value while loading, instead of "–".
export default function CompactMetric({ value, label, name, isLoading = false, isError = false, imageUrl, imageAlt = "", tone, to, skeleton = false }) {
  if (isLoading && skeleton) {
    return <SkeletonChip label={label} role="status" aria-label={`Loading ${label}`} aria-busy="true" />;
  }

  const displayValue = isLoading ? "–" : isError ? "–" : value;
  const valueClass = tone && !isLoading && !isError ? `value tone-${tone}` : "value";
  const valueTitle = isError ? "Could not load this value." : undefined;

  const Root = to ? MotionLink : "div";

  return (
    <Root {...(to ? { to, ...cardHover } : {})} className={to ? "kpi-chip kpi-chip-link" : "kpi-chip"}>
      <div className="kpi-chip-body">
        {name ? (
          <>
            <span className="label">{label}</span>
            <span className="name">{name}</span>
            <span className={valueClass} title={valueTitle}>
              {displayValue}
            </span>
          </>
        ) : (
          <>
            <span className={valueClass} title={valueTitle}>
              {displayValue}
            </span>
            <span className="label">{label}</span>
          </>
        )}
      </div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="kpi-chip-image"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </Root>
  );
}
