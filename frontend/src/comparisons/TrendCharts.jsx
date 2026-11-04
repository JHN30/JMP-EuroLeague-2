import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import HeaderTip from "../lib/HeaderTip";
import Panel from "../lib/Panel";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { rollingAverage } from "./trendMath";

// `compact` puts the kicker beside the title, the note in a tip on the title and `subtitle` (what must stay visible) after it;
// `actions` (a compact panel's control, say a stat picker) sits at the end of that line. `stretch` fills the grid cell and keeps the
// chart at the bottom, so charts in a row line up when one heading wraps.
function ChartPanel({ kicker, title, note, subtitle, actions, ariaLabel, canvasRef, height, compact = false, stretch = false }) {
  if (compact) {
    return (
      <Panel className={stretch ? "flex h-full flex-col p-4" : "p-4"}>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {kicker ? <p className="eyebrow">{kicker}</p> : null}
          <h3 className="font-bold">{note ? <HeaderTip tip={note}>{title}</HeaderTip> : title}</h3>
          {subtitle ? <p className="muted text-xs">{subtitle}</p> : null}
          {actions ? <div className="ms-auto">{actions}</div> : null}
        </div>
        <div className={`relative w-full ${height} ${stretch ? "mt-auto min-w-0" : ""}`}>
          <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
        </div>
      </Panel>
    );
  }
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
// `markers` draws a dot on every point and straight segments, for series of single values (each game) rather than a smoothed average.
// `rolling` (a window, say 3) adds each series' rolling average as a bold line over a faint game-by-game one; the legend then names
// each series once. `compact`, `subtitle`, `actions` and `stretch` are the panel's (see ChartPanel).
export function LineTrend({ kicker, title, note, subtitle, actions, labels, series, digits = 1, zero = false, axisTitle, markers = false, rolling = 0, compact = false, stretch = false }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const colors = [themeColor(canvas, "--color-primary"), themeColor(canvas, "--color-accent")];
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 14%, transparent)`;
    const strongGrid = `color-mix(in srgb, ${textColor} 55%, transparent)`;

    const lines = series.map((entry, index) => ({
      label: entry.label,
      data: entry.points,
      series: index,
      borderColor: rolling ? `color-mix(in srgb, ${colors[index % colors.length]} 40%, transparent)` : colors[index % colors.length],
      backgroundColor: `color-mix(in srgb, ${colors[index % colors.length]} 14%, transparent)`,
      borderWidth: rolling ? 1.5 : 2.5,
      borderDash: index === 0 ? [] : [7, 4],
      pointRadius: markers ? (rolling ? 2 : 3) : 0,
      pointHoverRadius: 5,
      tension: markers ? 0 : 0.3,
      spanGaps: false,
    }));
    const averages = rolling
      ? series.map((entry, index) => ({
          label: `${entry.label}, ${rolling}-game average`,
          data: rollingAverage(entry.points, rolling),
          series: index,
          average: true,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length],
          borderWidth: 3.5,
          borderDash: index === 0 ? [] : [7, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          spanGaps: false,
        }))
      : [];
    // With rolling lines the legend names each series once, by its average line in the full colour.
    const legendLabels = {
      color: textColor,
      usePointStyle: true,
      // The point is drawn boxHeight across: kept to the box width, with room before the name.
      boxWidth: 8,
      boxHeight: 8,
      padding: 16,
      filter: (item, data) => !rolling || Boolean(data.datasets[item.datasetIndex].average),
      // Each dot is filled in its series' full colour (a line's own fill is faint); with rolling lines the name is the series'.
      generateLabels: (chartRef) =>
        Chart.defaults.plugins.legend.labels.generateLabels(chartRef).map((item) => {
          const dataset = chartRef.data.datasets[item.datasetIndex];
          const colour = colors[dataset.series % colors.length];
          return { ...item, fillStyle: colour, strokeStyle: colour, text: rolling ? (series[dataset.series]?.label ?? item.text) : item.text };
        }),
    };

    const chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets: [...lines, ...averages] },
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
          legend: { labels: legendLabels },
          tooltip: {
            callbacks: {
              label: (context) => (context.parsed.y === null ? null : `${context.dataset.label}: ${context.parsed.y.toFixed(digits)}`),
              afterLabel: (context) => (context.dataset.average ? "" : (series[context.dataset.series]?.notes?.[context.dataIndex] ?? "")),
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, series, digits, zero, axisTitle, markers, rolling, theme]);

  return (
    <ChartPanel
      kicker={kicker}
      title={title}
      note={note}
      subtitle={subtitle}
      actions={actions}
      compact={compact}
      stretch={stretch}
      canvasRef={canvasRef}
      height={compact ? "h-44" : "h-64"}
      ariaLabel={`${title}: ${series.map((entry) => entry.label).join(" and ")}`}
    />
  );
}

// One bar per game, green when the margin is positive and red when it is not; `notes` is the tooltip's second line.
export function MarginTrend({ kicker, title, note, subtitle, labels, margins, notes, label, compact = false }) {
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

  return <ChartPanel kicker={kicker} title={title} note={note} subtitle={subtitle} compact={compact} canvasRef={canvasRef} height={compact ? "h-40" : "h-56"} ariaLabel={`${title}: ${label}`} />;
}
