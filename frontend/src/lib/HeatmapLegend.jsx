import { EFFICIENCY_RAMP_STOPS, efficiencyRamp } from "./chartHelpers";

export default function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
      {EFFICIENCY_RAMP_STOPS.map((stop) => (
        <span key={stop.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: efficiencyRamp(stop.max === Infinity ? 100 : stop.max - 1) }}
          />
          {stop.label}
        </span>
      ))}
      <span className="muted">Size represents volume</span>
    </div>
  );
}
