import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import Panel from "../lib/Panel";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";

function ChartPanel({ kicker, title, note, ariaLabel, canvasRef, height }) {
  return (
    <Panel className="p-4">
      {kicker ? <p className="eyebrow mb-0.5">{kicker}</p> : null}
      <h3 className="text-lg font-bold">{title}</h3>
      {note ? <p className="muted mb-2 mt-1 text-sm">{note}</p> : <div className="mb-2" />}
      <div className={`relative w-full ${height}`}>
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
      </div>
    </Panel>
  );
}

// Two lines (or one) over a shared axis, drawn without a table. A series is { label, points, notes? }: one value per label, null for
// a gap, and an optional line of text per point for the tooltip (the opponent, say). `zero` draws the zero line stronger.
export function LineTrend({ kicker, title, note, labels, series, digits = 1, zero = false, axisTitle }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const colors = [themeColor(canvas, "--color-primary"), themeColor(canvas, "--color-accent")];
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 14%, transparent)`;
    const strongGrid = `color-mix(in srgb, ${textColor} 55%, transparent)`;

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: series.map((entry, index) => ({
          label: entry.label,
          data: entry.points,
          borderColor: colors[index % colors.length],
          backgroundColor: `color-mix(in srgb, ${colors[index % colors.length]} 14%, transparent)`,
          borderWidth: 2.5,
          borderDash: index === 0 ? [] : [7, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          spanGaps: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { color: textColor, maxTicksLimit: 8, autoSkip: true, maxRotation: 0 }, grid: { display: false } },
          y: {
            ticks: { color: textColor },
            title: axisTitle ? { display: true, text: axisTitle, color: textColor } : { display: false },
            grid: { color: (context) => (zero && context.tick.value === 0 ? strongGrid : gridColor) },
          },
        },
        plugins: {
          legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              label: (context) => (context.parsed.y === null ? null : `${context.dataset.label}: ${context.parsed.y.toFixed(digits)}`),
              afterLabel: (context) => series[context.datasetIndex]?.notes?.[context.dataIndex] ?? "",
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, series, digits, zero, axisTitle, theme]);

  return <ChartPanel kicker={kicker} title={title} note={note} canvasRef={canvasRef} height="h-64" ariaLabel={`${title}: ${series.map((entry) => entry.label).join(" and ")}`} />;
}

// One bar per game, green when the margin is positive and red when it is not; `notes` is the tooltip's second line.
export function MarginTrend({ kicker, title, note, labels, margins, notes, label }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const good = themeColor(canvas, "--color-success");
    const bad = themeColor(canvas, "--color-error");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 14%, transparent)`;
    const strongGrid = `color-mix(in srgb, ${textColor} 55%, transparent)`;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label, data: margins, backgroundColor: margins.map((margin) => (margin > 0 ? good : bad)), borderRadius: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor, maxTicksLimit: 8, autoSkip: true, maxRotation: 0 }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: (context) => (context.tick.value === 0 ? strongGrid : gridColor) } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Margin: ${context.parsed.y > 0 ? "+" : ""}${context.parsed.y}`,
              afterLabel: (context) => notes?.[context.dataIndex] ?? "",
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, margins, notes, label, theme]);

  return <ChartPanel kicker={kicker} title={title} note={note} canvasRef={canvasRef} height="h-56" ariaLabel={`${title}: ${label}`} />;
}
