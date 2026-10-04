import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { thinAxisLabels } from "../lib/chartHelpers";
import Panel from "../lib/Panel";

function themeColor(el, variable) {
  return getComputedStyle(el).getPropertyValue(variable).trim();
}

// The active theme lives on <html data-theme>, set outside this component
// (see useThemePreference). Watching the attribute directly, rather than
// threading the theme through props, lets the chart re-theme wherever it is
// mounted without coupling it to the route tree above it.
function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

// `collapseTable` folds the round-by-round table (one row per round) behind a toggle, for a long season.
export default function TrendChart({ title, labels, series, collapseTable = false }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const axisLabels = useMemo(() => thinAxisLabels(labels, 6), [labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const accent = themeColor(canvas, "--color-accent");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;
    const colors = [primary, accent];

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: axisLabels,
        datasets: series.map((entry, index) => ({
          label: entry.label,
          data: entry.points,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length],
          borderDash: index === 0 ? [] : [6, 4],
          spanGaps: false,
          tension: 0.2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: { mode: "nearest", intersect: true },
        },
        interaction: { mode: "nearest", intersect: true },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [axisLabels, series, theme]);

  return (
    <Panel className="p-4">
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className="relative h-64 w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${title}: ${series.map((entry) => entry.label).join(" vs ")} across rounds`}
        />
        </div>
      </div>
      {collapseTable ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">Show the round-by-round numbers</summary>
        <div className="mt-4 overflow-x-auto overscroll-x-contain">
          <table className="table">
            <thead>
              <tr>
                <th>Round</th>
                {series.map((entry, seriesIndex) => (
                  <th key={seriesIndex}>{entry.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, index) => (
                <tr key={label}>
                  <td>{label}</td>
                  {series.map((entry, seriesIndex) => (
                    <td key={seriesIndex}>{entry.points[index] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </details>
      ) : (
        <div className="mt-4 overflow-x-auto overscroll-x-contain">
          <table className="table">
            <thead>
              <tr>
                <th>Round</th>
                {series.map((entry, seriesIndex) => (
                  <th key={seriesIndex}>{entry.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, index) => (
                <tr key={label}>
                  <td>{label}</td>
                  {series.map((entry, seriesIndex) => (
                    <td key={seriesIndex}>{entry.points[index] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
    </Panel>
  );
}
