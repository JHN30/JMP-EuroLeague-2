import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import Panel from "../lib/Panel";

function themeColor(el, variable, fallback) {
  const value = getComputedStyle(el).getPropertyValue(variable).trim();
  return value || fallback;
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

export default function TrendChart({ title, labels, series }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const primary = themeColor(canvas, "--color-primary", "#ff7926");
    const accent = themeColor(canvas, "--color-accent", "#bba7d9");
    const textColor = themeColor(canvas, "--color-base-content", "#888888");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;
    const colors = [primary, accent];

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels,
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
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, series, theme]);

  return (
    <Panel className="p-4">
      <div className="relative h-64 w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${title}: ${series.map((entry) => entry.label).join(" vs ")} across rounds`}
        />
      </div>
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
    </Panel>
  );
}
