import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { formatDecimal, formatSignedDecimal } from "../lib/format";

// What the club's offense and defense did in each round: offensive and defensive rating (points per 100 possessions) as two lines,
// with the season averages as two dashed lines in the same colours. The space between the two round lines is that round's net
// rating: shaded green where the offense is above the defense (a positive net), red where it is below, so the gap reads at a glance.
// `rounds`, `offense`, `defense` and `games` are parallel arrays; a round the club did not play has null ratings and the lines span it.
//
// The dots and the lines get thinner as the rounds get more (a season is 38), so the lines stay readable instead of running into one
// band; hovering a round still shows its dot.
export default function RatingsChart({ rounds, offense, defense, games, averages, ariaLabel }) {
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
    const flat = (value) => rounds.map(() => value);
    // A dashed line at a season average: no dots, no tooltip entry, no legend entry (the caption names it).
    const average = (data, color) => ({
      data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      isAverage: true,
    });

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
            spanGaps: true,
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
            spanGaps: true,
            fill: false,
          },
          { label: "Offense season average", ...average(flat(averages.offense), primary) },
          { label: "Defense season average", ...average(flat(averages.defense), defenseColor) },
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
          legend: {
            labels: {
              color: textColor,
              usePointStyle: true,
              pointStyleWidth: 10,
              boxHeight: 8,
              padding: 12,
              filter: (item, data) => !data.datasets[item.datasetIndex].isAverage,
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (item) => !item.dataset.isAverage,
            callbacks: {
              footer: (items) => {
                const [first, second] = items;
                if (!first || !second || first.parsed.y === null || second.parsed.y === null) return "";
                const played = games[first.dataIndex];
                return `Net rating ${formatSignedDecimal(first.parsed.y - second.parsed.y)}${played > 1 ? ` · ${played} games` : ""}`;
              },
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });

    return () => chart.destroy();
  }, [rounds, offense, defense, games, averages, theme, pointRadius, lineWidth]);

  const lastPlayed = offense.findLastIndex((value) => value !== null);

  return (
    <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
      <div className="relative h-60 w-full sm:h-72">
        <canvas
          ref={canvasRef}
          data-point-radius={pointRadius}
          data-average-offense={averages.offense}
          data-average-defense={averages.defense}
          role="img"
          aria-label={
            ariaLabel ??
            `Offensive rating ${formatDecimal(offense[lastPlayed])} and defensive rating ${formatDecimal(defense[lastPlayed])} in ${rounds[lastPlayed]}; season averages ${formatDecimal(averages.offense)} and ${formatDecimal(averages.defense)}`
          }
        />
      </div>
    </div>
  );
}
