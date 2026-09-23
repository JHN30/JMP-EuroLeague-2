import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

const STEP_MS = 650;

export default function RacePlayback({ roundCount, visibleCount, onChange, playing, onPlayingChange }) {
  const reducedMotion = usePrefersReducedMotion();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (reducedMotion || !playing) return undefined;
    intervalRef.current = setInterval(() => {
      onChange((current) => {
        if (current >= roundCount) {
          onPlayingChange(false);
          return current;
        }
        return current + 1;
      });
    }, STEP_MS);
    return () => clearInterval(intervalRef.current);
  }, [playing, reducedMotion, roundCount, onChange, onPlayingChange]);

  if (reducedMotion) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onChange((current) => Math.min(current + 1, roundCount))}
          disabled={visibleCount >= roundCount}
        >
          Next round
        </button>
        <span className="text-xs text-base-content/70">
          Round {visibleCount} of {roundCount}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          if (visibleCount >= roundCount) onChange(1);
          onPlayingChange(!playing);
        }}
      >
        {playing ? "Pause" : visibleCount >= roundCount ? "Replay season" : "Play season"}
      </button>
      <span className="text-xs text-base-content/70">Opening round</span>
      <input
        type="range"
        className="range range-primary range-sm max-w-xs"
        min={1}
        max={roundCount}
        value={visibleCount}
        onChange={(event) => {
          onPlayingChange(false);
          onChange(Number(event.target.value));
        }}
      />
      <span className="text-xs text-base-content/70">Final round</span>
      <span className="badge badge-primary">Round {visibleCount}</span>
    </div>
  );
}
