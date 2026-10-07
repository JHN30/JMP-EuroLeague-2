import { motion } from "motion/react";
import { comparisonBand, markerPosition, winnerSide } from "./comparisonMath";
import HeaderTip from "./HeaderTip";
import { barFill, listItem } from "./motion";

// A bar with an optional tick at `position` (a percentage from the bar's anchored end). The tick carries a title and
// the caller prints the same value as text, so the tick is never the only carrier of the information. `animated` grows
// the bar from its anchored end.
function Track({ width, position, anchor, title, animated }) {
  const Fill = animated ? motion.div : "div";
  return (
    <div className="relative">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
        <Fill
          className={`h-full rounded-full bg-current ${anchor === "end" ? "ml-auto" : ""}`}
          style={animated ? { width: `${width}%`, originX: anchor === "end" ? 1 : 0 } : { width: `${width}%` }}
          {...(animated ? barFill : {})}
        />
      </div>
      {position === null ? null : (
        <span
          aria-hidden="true"
          title={title}
          className={`absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-base-content ${anchor === "end" ? "translate-x-1/2" : "-translate-x-1/2"}`}
          style={anchor === "end" ? { right: `${position}%` } : { left: `${position}%` }}
        />
      )}
    </div>
  );
}

// Optional: `tip` (a hover tip on the label), `markerA`/`markerB` (raw values drawn as ticks, for example a season
// average) and `avgA`/`avgB` (their printed text, shown under the bar). `animated` makes the row take part in a
// staggered entrance (it must sit inside a motion parent using the list variants) and grows its bars. `bars={false}` leaves
// the bars out and shows only the printed values and the highlight on the better side. `compact` tightens the row's padding
// and gaps below sm.
export default function ComparisonRow({
  label,
  rawA,
  rawB,
  displayA,
  displayB,
  direction,
  tip,
  markerA = null,
  markerB = null,
  avgA = null,
  avgB = null,
  animated = false,
  bars = true,
  compact = false,
}) {
  const winner = winnerSide(rawA, rawB, direction);
  const { widthA, widthB } = comparisonBand(rawA, rawB);
  const aMissing = rawA === null || rawA === undefined;
  const bMissing = rawB === null || rawB === undefined;
  const Root = animated ? motion.div : "div";

  return (
    <Root
      className={`flex flex-1 flex-col justify-center border-b border-base-300 py-3 last:border-0 ${compact ? "max-sm:py-2" : ""}`}
      {...(animated ? { variants: listItem } : {})}
    >
      <div className={`mb-2 text-center ${compact ? "max-sm:mb-1" : ""}`}>
        <span className="text-xs font-bold tracking-wide uppercase">
          {tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}
        </span>
        {direction === "lower" ? (
          <span className="muted ml-2 text-[0.65rem] tracking-wide uppercase">Lower is better</span>
        ) : null}
      </div>
      <div className={`grid grid-cols-2 gap-4 ${compact ? "max-sm:gap-2" : ""}`}>
        <div className={`rounded-field p-2 ${compact ? "max-sm:p-1.5" : ""} ${winner === "a" ? "bg-primary/10 text-primary" : ""}`}>
          <div className={`${bars ? "mb-1 " : ""}text-right font-semibold tabular-nums`}>{aMissing ? "—" : displayA}</div>
          {bars ? (
            <Track
              width={aMissing ? 0 : widthA}
              position={aMissing ? null : markerPosition(markerA, rawA, rawB)}
              anchor="start"
              title={avgA ?? undefined}
              animated={animated}
            />
          ) : null}
          {avgA ? <div className="muted mt-1 text-right text-xs tabular-nums">{avgA}</div> : null}
        </div>
        <div className={`rounded-field p-2 ${compact ? "max-sm:p-1.5" : ""} ${winner === "b" ? "bg-primary/10 text-primary" : ""}`}>
          <div className={`${bars ? "mb-1 " : ""}text-left font-semibold tabular-nums`}>{bMissing ? "—" : displayB}</div>
          {bars ? (
            <Track
              width={bMissing ? 0 : widthB}
              position={bMissing ? null : markerPosition(markerB, rawA, rawB)}
              anchor="end"
              title={avgB ?? undefined}
              animated={animated}
            />
          ) : null}
          {avgB ? <div className="muted mt-1 text-left text-xs tabular-nums">{avgB}</div> : null}
        </div>
      </div>
    </Root>
  );
}
