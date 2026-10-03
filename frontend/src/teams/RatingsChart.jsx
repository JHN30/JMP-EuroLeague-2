import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { formatDecimal, formatSignedDecimal } from "../lib/format";

// Offensive and defensive rating, round by round, as two lines. The space between them is the net rating: shaded green
// where the offense is above the defense (a positive net), red where it is below, so the gap reads at a glance.
// `rounds`, `offense` and `defense` are parallel arrays.
export default function RatingsChart({ rounds, offense, defense, ariaLabel }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const success = themeColor(canvas, "--color-success");
    const error = themeColor(canvas, "--color-error");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 15%, transparent)`;
    const defenseColor = `color-mix(in srgb, ${textColor} 70%, transparent)`;

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: rounds,
        datasets: [
          {
            label: "Offensive rating",
            data: offense,
            borderColor: primary,
            backgroundColor: primary,
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.25,
            fill: {
              target: 1,
              above: `color-mix(in srgb, ${success} 28%, transparent)`,
              below: `color-mix(in srgb, ${error} 28%, transparent)`,
            },
          },
          {
            label: "Defensive rating",
            data: defense,
            borderColor: defenseColor,
            backgroundColor: defenseColor,
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor }, grace: "12%" },
        },
        plugins: {
          legend: { labels: { color: textColor, usePointStyle: true, pointStyleWidth: 10, boxHeight: 8, padding: 18 } },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              footer: (items) => {
                const [first, second] = items;
                if (!first || !second) return "";
                return `Net rating ${formatSignedDecimal(first.parsed.y - second.parsed.y)}`;
              },
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });

    return () => chart.destroy();
  }, [rounds, offense, defense, theme]);

  return (
    <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
      <div className="relative h-72 w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={
            ariaLabel ??
            `Offensive rating ${formatDecimal(offense.at(-1))} and defensive rating ${formatDecimal(defense.at(-1))} after ${rounds.at(-1)}`
          }
        />
      </div>
    </div>
  );
}
