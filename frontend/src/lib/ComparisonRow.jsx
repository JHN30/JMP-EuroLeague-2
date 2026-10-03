import { comparisonBand, markerPosition, winnerSide } from "./comparisonMath";
import HeaderTip from "./HeaderTip";

// A bar with an optional tick at `position` (a percentage from the bar's anchored end). The tick carries a title and
// the caller prints the same value as text, so the tick is never the only carrier of the information.
function Track({ width, position, anchor, title }) {
  return (
    <div className="relative">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
        <div
          className={`h-full rounded-full bg-current ${anchor === "end" ? "ml-auto" : ""}`}
          style={{ width: `${width}%` }}
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
// average) and `avgA`/`avgB` (their printed text, shown under the bar).
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
}) {
  const winner = winnerSide(rawA, rawB, direction);
  const { widthA, widthB } = comparisonBand(rawA, rawB);
  const aMissing = rawA === null || rawA === undefined;
  const bMissing = rawB === null || rawB === undefined;

  return (
    <div className="flex flex-1 flex-col justify-center border-b border-base-300 py-3 last:border-0">
      <div className="mb-2 text-center">
        <span className="text-xs font-bold tracking-wide uppercase">
          {tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}
        </span>
        {direction === "lower" ? (
          <span className="muted ml-2 text-[0.65rem] tracking-wide uppercase">Lower is better</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-field p-2 ${winner === "a" ? "bg-primary/10 text-primary" : ""}`}>
          <div className="mb-1 text-right font-semibold tabular-nums">{aMissing ? "—" : displayA}</div>
          <Track
            width={aMissing ? 0 : widthA}
            position={aMissing ? null : markerPosition(markerA, rawA, rawB)}
            anchor="start"
            title={avgA ?? undefined}
          />
          {avgA ? <div className="muted mt-1 text-right text-xs tabular-nums">{avgA}</div> : null}
        </div>
        <div className={`rounded-field p-2 ${winner === "b" ? "bg-primary/10 text-primary" : ""}`}>
          <div className="mb-1 text-left font-semibold tabular-nums">{bMissing ? "—" : displayB}</div>
          <Track
            width={bMissing ? 0 : widthB}
            position={bMissing ? null : markerPosition(markerB, rawA, rawB)}
            anchor="end"
            title={avgB ?? undefined}
          />
          {avgB ? <div className="muted mt-1 text-left text-xs tabular-nums">{avgB}</div> : null}
        </div>
      </div>
    </div>
  );
}
