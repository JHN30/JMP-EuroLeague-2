import { useEffect, useRef } from "react";
import { Chart } from "../lib/chartSetup";
import { chartTheme, radarScale, tooltip } from "../lib/chartTheme";
import { useActiveTheme } from "../lib/useActiveTheme";
import { ordinal } from "../teams/teamLeague";

// Two players' percentiles on one radar: `axes` are { label, a, b } with each side a 0-100 percentile or null.
export default function CompareRadar({ axes, labelA, labelB }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const colours = chartTheme(canvas);
    const dataset = (label, key, color, dashed) => ({
      label,
      data: axes.map((axis) => axis[key] ?? 0),
      borderColor: color,
      backgroundColor: colours.radarFill(color),
      borderWidth: 2,
      borderDash: dashed ? [6, 4] : [],
      pointBackgroundColor: color,
    });

    const chart = new Chart(canvas, {
      type: "radar",
      data: { labels: axes.map((axis) => axis.label), datasets: [dataset(labelA, "a", colours.primary, false), dataset(labelB, "b", colours.accent, true)] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: radarScale(colours),
        },
        plugins: {
          legend: { labels: { color: colours.text } },
          tooltip: { ...tooltip(colours), callbacks: { label: (context) => `${context.dataset.label}: ${ordinal(context.parsed.r)} percentile` } },
        },
      },
    });
    return () => chart.destroy();
  }, [axes, labelA, labelB, theme]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} role="img" aria-label={`Percentile radar of ${labelA} and ${labelB} across ${axes.map((axis) => axis.label).join(", ")}`} />
    </div>
  );
}
