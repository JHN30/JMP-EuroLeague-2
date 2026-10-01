import { comparisonBand, winnerSide } from "./comparisonMath";

export default function ComparisonRow({ label, rawA, rawB, displayA, displayB, direction }) {
  const winner = winnerSide(rawA, rawB, direction);
  const { widthA, widthB } = comparisonBand(rawA, rawB);
  const aMissing = rawA === null || rawA === undefined;
  const bMissing = rawB === null || rawB === undefined;

  return (
    <div className="border-b border-base-300 py-3 last:border-0">
      <div className="mb-2 text-center">
        <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
        {direction === "lower" ? (
          <span className="muted ml-2 text-[0.65rem] tracking-wide uppercase">Lower is better</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-field p-2 ${winner === "a" ? "bg-primary/10 text-primary" : ""}`}>
          <div className="mb-1 text-right font-semibold tabular-nums">{aMissing ? "—" : displayA}</div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
            <div className="h-full rounded-full bg-current" style={{ width: `${aMissing ? 0 : widthA}%` }} />
          </div>
        </div>
        <div className={`rounded-field p-2 ${winner === "b" ? "bg-primary/10 text-primary" : ""}`}>
          <div className="mb-1 text-left font-semibold tabular-nums">{bMissing ? "—" : displayB}</div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
            <div className="ml-auto h-full rounded-full bg-current" style={{ width: `${bMissing ? 0 : widthB}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
