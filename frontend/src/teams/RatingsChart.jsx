import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { formatDecimal, formatSignedDecimal } from "../lib/format";

// Offensive and defensive rating, round by round, as two lines. The space between them is the net rating: shaded green
// where the offense is above the defense (a positive net), red where it is below, so the gap reads at a glance.
// `rounds`, `offense` and `defense` are parallel arrays.
//
// The dots and the lines get thinner as the rounds get more (a season is 38), so the lines stay readable instead of running into one
// band; hovering a round still shows its dot.
export default function RatingsChart({ rounds, offense, defense, ariaLabel }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();
  const pointRadius = rounds.length <= 12 ? 4 : rounds.length <= 25 ? 2 : 0;
  const lineWidth = rounds.length <= 25 ? 3 : 2;

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
            borderWidth: lineWidth,
            pointRadius,
            pointHoverRadius: 4,
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
            borderWidth: lineWidth,
            pointRadius,
            pointHoverRadius: 4,
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
          legend: { labels: { color: textColor, usePointStyle: true, pointStyleWidth: 10, boxHeight: 8, padding: 12 } },
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
  }, [rounds, offense, defense, theme, pointRadius, lineWidth]);

  return (
    <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
      <div className="relative h-60 w-full sm:h-72">
        <canvas
          ref={canvasRef}
          data-point-radius={pointRadius}
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
