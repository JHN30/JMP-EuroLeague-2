// What a percentile means in words and colour, shared by the gauge and the verdict pills.
// A verdict for a percentile (100 is the top of the group). Most advanced stats are better when higher, so they read
// from Poor to Elite; usage is a role, not a quality, so it reads from Very low to Very high in one neutral colour.
const VERDICTS = [
  { min: 90, label: "Elite", neutralLabel: "Very high usage", pill: "bg-success text-success-content", zone: "bg-success", neutralPill: "bg-info text-info-content", neutralZone: "bg-info" },
  { min: 75, label: "Very good", neutralLabel: "High usage", pill: "bg-success/25 text-success", zone: "bg-success/70", neutralPill: "bg-info/25 text-info", neutralZone: "bg-info/70" },
  { min: 60, label: "Above average", neutralLabel: "Above typical", pill: "bg-success/10 text-success", zone: "bg-success/40", neutralPill: "bg-info/10 text-info", neutralZone: "bg-info/45" },
  { min: 40, label: "Average", neutralLabel: "Typical", pill: "bg-base-300 text-base-content", zone: "bg-base-content/25", neutralPill: "bg-base-300 text-base-content", neutralZone: "bg-base-content/25" },
  { min: 25, label: "Below average", neutralLabel: "Below typical", pill: "bg-warning/20 text-warning", zone: "bg-warning/60", neutralPill: "bg-info/10 text-info", neutralZone: "bg-info/30" },
  { min: 10, label: "Weak", neutralLabel: "Low usage", pill: "bg-error/15 text-error", zone: "bg-error/55", neutralPill: "bg-info/20 text-info", neutralZone: "bg-info/20" },
  { min: 0, label: "Poor", neutralLabel: "Very low usage", pill: "bg-error text-error-content", zone: "bg-error", neutralPill: "bg-info/25 text-info", neutralZone: "bg-info/10" },
];

// Zones left to right (worst to best), each the width of its share of the percentiles.
const ASCENDING = [...VERDICTS].reverse();
export const ZONES = ASCENDING.map((verdict, index) => ({ verdict, width: (ASCENDING[index + 1]?.min ?? 100) - verdict.min }));

export function verdictFor(percentile, neutral = false) {
  if (percentile === null || percentile === undefined) return null;
  const verdict = VERDICTS.find((entry) => percentile >= entry.min) ?? VERDICTS[VERDICTS.length - 1];
  return {
    label: neutral ? verdict.neutralLabel : verdict.label,
    pill: neutral ? verdict.neutralPill : verdict.pill,
    good: percentile >= 60,
    bad: percentile < 40,
  };
}
