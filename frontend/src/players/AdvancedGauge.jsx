import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";
import { ZONES, verdictFor } from "./advancedVerdict";

export function VerdictPill({ percentile, neutral = false }) {
  const verdict = verdictFor(percentile, neutral);
  if (!verdict) return null;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${verdict.pill}`}>{verdict.label}</span>;
}

// A track split into the seven zones, a marker where the player sits, and the values at the 10th, 50th and 90th
// percentile of the group underneath, so the bar can be read in the stat's own units.
export default function AdvancedGauge({ percentile, spread, format, neutral = false, label }) {
  if (percentile === null || percentile === undefined) return <div className="h-9" />;
  const verdict = verdictFor(percentile, neutral);
  const ticks = spread ? [{ at: 10, value: spread.p10 }, { at: 50, value: spread.p50, name: "median" }, { at: 90, value: spread.p90 }] : [];

  return (
    <div role="img" aria-label={`${label}: ${verdict.label}, ${percentile}th percentile`} className="mt-3">
      <div className="relative">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {ZONES.map(({ verdict: zone, width }) => (
            <div key={zone.label} className={neutral ? zone.neutralZone : zone.zone} style={{ width: `${width}%` }} />
          ))}
        </div>
        <motion.span
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-base-content bg-base-100 shadow"
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: `${Math.min(100, Math.max(0, percentile))}%`, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
        />
      </div>
      {ticks.length > 0 ? (
        <div aria-hidden="true" className="muted relative mt-1.5 h-7 text-[0.65rem] leading-tight tabular-nums">
          {ticks.map((tick) => (
            <span key={tick.at} className="absolute -translate-x-1/2 text-center whitespace-nowrap" style={{ left: `${tick.at}%` }}>
              {format(tick.value)}
              <br />
              {tick.name ?? `${tick.at}th pct`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
