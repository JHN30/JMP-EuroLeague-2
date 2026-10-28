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
// and gaps below sm. `dense` (the Compare page) tightens the row at every width and puts `avgA`/`avgB` on the value's line, away
// from the centre, instead of under the bar. `sideA`/`sideB` (a crest and a code, say) sit over each side's value below sm only, for a row whose two
// sides are not labelled nearby. `inline` puts the label in a narrow centre column between the two values, one line per
// stat, with any bar and average under each value; without bars the highlight hugs the better value. `missingText`
// replaces the dash printed for a missing value (a loading mark, say).
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
  dense = false,
  sideA = null,
  sideB = null,
  inline = false,
  missingText = "—",
}) {
  const winner = winnerSide(rawA, rawB, direction);
  const { widthA, widthB } = comparisonBand(rawA, rawB);
  const aMissing = rawA === null || rawA === undefined;
  const bMissing = rawB === null || rawB === undefined;
  const Root = animated ? motion.div : "div";

  if (inline) {
    const side = (key, missing, display, width, marker, avg, anchor) => {
      const won = winner === key;
      const align = anchor === "start" ? "text-right" : "text-left";
      return (
        <div className={`min-w-0 ${align} ${bars ? `rounded-field p-1.5 max-sm:p-1 ${won ? "bg-primary/10 text-primary" : ""}` : ""}`}>
          <span className={`inline-block font-semibold tabular-nums ${bars ? "" : `rounded-field px-2 py-0.5 ${won ? "bg-primary/10 text-primary" : ""}`}`}>
            {missing ? missingText : display}
          </span>
          {bars ? (
            <div className="mt-1">
              <Track width={missing ? 0 : width} position={missing ? null : markerPosition(marker, rawA, rawB)} anchor={anchor} title={avg ?? undefined} animated={animated} />
            </div>
          ) : null}
          {avg ? <div className="muted mt-0.5 text-xs tabular-nums">{avg}</div> : null}
        </div>
      );
    };
    return (
      <Root
        className="grid flex-1 grid-cols-[1fr_9rem_1fr] items-center gap-2 border-b border-base-300 py-1.5 last:border-0 max-sm:grid-cols-[1fr_7rem_1fr] max-sm:gap-1.5 max-sm:text-sm"
        {...(animated ? { variants: listItem } : {})}
      >
        {side("a", aMissing, displayA, widthA, markerA, avgA, "start")}
        <div className="text-center leading-tight">
          <span className="text-xs font-bold tracking-wide uppercase">{tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}</span>
          {direction === "lower" ? <span className="muted block text-[0.6rem] tracking-wide uppercase">Lower is better</span> : null}
        </div>
        {side("b", bMissing, displayB, widthB, markerB, avgB, "end")}
      </Root>
    );
  }
  // A dense row keeps its average beside the value, so the line under the bar is left out.
  const avgBelow = !dense;
  const sidePad = dense ? "p-1" : `p-2 ${compact ? "max-sm:p-1.5" : ""}`;

  return (
    <Root
      className={`flex flex-1 flex-col justify-center border-b border-base-300 last:border-0 ${dense ? "py-1.5" : `py-3 ${compact ? "max-sm:py-2" : ""}`}`}
      {...(animated ? { variants: listItem } : {})}
    >
      <div className={`text-center ${dense ? "mb-0.5" : `mb-2 ${compact ? "max-sm:mb-1" : ""}`}`}>
        <span className="text-xs font-bold tracking-wide uppercase">
          {tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}
        </span>
        {direction === "lower" ? (
          <span className="muted ml-2 text-[0.65rem] tracking-wide uppercase">Lower is better</span>
        ) : null}
      </div>
      <div className={`grid grid-cols-2 ${dense ? "gap-3 max-sm:gap-2" : `gap-4 ${compact ? "max-sm:gap-2" : ""}`}`}>
        <div className={`rounded-field ${sidePad} ${winner === "a" ? "bg-primary/10 text-primary" : ""}`}>
          {sideA ? <div className="mb-1 flex justify-end sm:hidden">{sideA}</div> : null}
          <div className={`${bars && !dense ? "mb-1 " : ""}${dense ? "flex items-baseline justify-end gap-2 " : ""}text-right font-semibold tabular-nums`}>
            {dense && avgA ? <span className="muted text-xs font-normal">{avgA}</span> : null}
            <span>{aMissing ? "—" : displayA}</span>
          </div>
          {bars ? (
            <Track
              width={aMissing ? 0 : widthA}
              position={aMissing ? null : markerPosition(markerA, rawA, rawB)}
              anchor="start"
              title={avgA ?? undefined}
              animated={animated}
            />
          ) : null}
          {avgA && avgBelow ? <div className="muted mt-1 text-right text-xs tabular-nums">{avgA}</div> : null}
        </div>
        <div className={`rounded-field ${sidePad} ${winner === "b" ? "bg-primary/10 text-primary" : ""}`}>
          {sideB ? <div className="mb-1 flex justify-start sm:hidden">{sideB}</div> : null}
          <div className={`${bars && !dense ? "mb-1 " : ""}${dense ? "flex items-baseline justify-start gap-2 " : ""}text-left font-semibold tabular-nums`}>
            <span>{bMissing ? "—" : displayB}</span>
            {dense && avgB ? <span className="muted text-xs font-normal">{avgB}</span> : null}
          </div>
          {bars ? (
            <Track
              width={bMissing ? 0 : widthB}
              position={bMissing ? null : markerPosition(markerB, rawA, rawB)}
              anchor="end"
              title={avgB ?? undefined}
              animated={animated}
            />
          ) : null}
          {avgB && avgBelow ? <div className="muted mt-1 text-left text-xs tabular-nums">{avgB}</div> : null}
        </div>
      </div>
    </Root>
  );
}
