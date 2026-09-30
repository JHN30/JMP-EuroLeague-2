import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

const STEP_MS = 650;

// A controlled scrubber over steps 0..total, where 0 is the season start. Playing steps forward one round at a time.
export default function RacePlayback({ total, value, label, endLabel, onChange }) {
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const isPlaying = playing && !reducedMotion && value < total;

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setTimeout(() => onChange(value + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, value, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {reducedMotion ? null : (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            if (isPlaying) {
              setPlaying(false);
              return;
            }
            if (value >= total) onChange(0);
            setPlaying(true);
          }}
        >
          {isPlaying ? "Pause" : value >= total ? "Replay season" : "Play season"}
        </button>
      )}
      <span className="text-xs text-base-content/70">Start</span>
      <input
        type="range"
        className="range range-primary range-sm max-w-xs"
        min={0}
        max={total}
        value={value}
        aria-label="Round shown in the race"
        onChange={(event) => {
          setPlaying(false);
          onChange(Number(event.target.value));
        }}
      />
      <span className="text-xs text-base-content/70">{endLabel}</span>
      <span className="badge badge-primary">{label}</span>
    </div>
  );
}
