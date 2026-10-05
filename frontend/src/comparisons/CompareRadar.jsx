import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { ordinal } from "../teams/teamLeague";

// Two players' percentiles on one radar: `axes` are { label, a, b } with each side a 0-100 percentile or null.
export default function CompareRadar({ axes, labelA, labelB }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const primary = themeColor(canvas, "--color-primary");
    const accent = themeColor(canvas, "--color-accent");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;
    const dataset = (label, key, color, dashed) => ({
      label,
      data: axes.map((axis) => axis[key] ?? 0),
      borderColor: color,
      backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
      borderWidth: 2,
      borderDash: dashed ? [6, 4] : [],
      pointBackgroundColor: color,
    });

    const chart = new Chart(canvas, {
      type: "radar",
      data: { labels: axes.map((axis) => axis.label), datasets: [dataset(labelA, "a", primary, false), dataset(labelB, "b", accent, true)] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: textColor, backdropColor: "transparent" },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: textColor },
          },
        },
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${ordinal(context.parsed.r)} percentile` } },
        },
      },
    });
    return () => chart.destroy();
  }, [axes, labelA, labelB, theme]);

  return (
    <div className="relative h-72 w-full">
      <canvas ref={canvasRef} role="img" aria-label={`Percentile radar of ${labelA} and ${labelB} across ${axes.map((axis) => axis.label).join(", ")}`} />
    </div>
  );
}
