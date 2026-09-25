export function thinAxisLabels(labels, maxLabels) {
  if (!Array.isArray(labels) || labels.length <= maxLabels || maxLabels < 2) {
    return labels;
  }
  const lastIndex = labels.length - 1;
  const step = lastIndex / (maxLabels - 1);
  const keepIndexes = new Set();
  for (let i = 0; i < maxLabels; i += 1) {
    keepIndexes.add(Math.round(i * step));
  }
  keepIndexes.add(0);
  keepIndexes.add(lastIndex);
  return labels.map((label, index) => (keepIndexes.has(index) ? label : ""));
}

// A sequential single-hue ramp (desaturated slate under 30% through
// saturated primary at 60%+) instead of a red/amber/green scale, so
// efficiency order survives every form of colour-vision deficiency and in
// greyscale. Built from theme variables via color-mix() so it re-themes
// automatically; "ink" is a fixed dark color so labels stay legible on
// every stop in both themes.
export const EFFICIENCY_RAMP_STOPS = [
  { max: 30, mixPercent: 15, label: "Under 30%" },
  { max: 40, mixPercent: 35, label: "30-40%" },
  { max: 50, mixPercent: 55, label: "40-50%" },
  { max: 60, mixPercent: 75, label: "50-60%" },
  { max: Infinity, mixPercent: 100, label: "60%+" },
];

export function efficiencyRamp(percentage) {
  const value = Number.isFinite(percentage) ? percentage : 0;
  const stop = EFFICIENCY_RAMP_STOPS.find((candidate) => value < candidate.max) ?? EFFICIENCY_RAMP_STOPS.at(-1);
  return `color-mix(in srgb, var(--color-primary) ${stop.mixPercent}%, var(--color-base-300))`;
}

export const EFFICIENCY_RAMP_INK = "#1c1917";

export function computeDomain(values, { paddingRatio = 0.1 } = {}) {
  const numeric = (values ?? []).filter((value) => typeof value === "number" && Number.isFinite(value));
  if (numeric.length === 0) return { min: undefined, max: undefined };

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || Math.abs(max) || 1;
  const padding = range * paddingRatio;
  return { min: min - padding, max: max + padding };
}
