import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import EmptyText from "../lib/EmptyText";
import { formatMissing, formatPeriod, formatSignedDiff } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import { eventMoment, momentLabel } from "./gameFlowData";
import { teamName } from "./gameUtils";

export function PeriodTable({ periodScores, localTeam, roadTeam }) {
  if (periodScores.length === 0) {
    return <EmptyText>Period scores aren't available until this game is played.</EmptyText>;
  }

  const periodNumbers = [...new Set(periodScores.map((row) => row.periodNumber))].sort((a, b) => a - b);

  const byPeriod = (side) => periodNumbers.map((periodNumber) => {
    const entry = periodScores.find((row) => row.side === side && row.periodNumber === periodNumber);
    return entry?.score ?? null;
  });

  const localScores = byPeriod("local");
  const roadScores = byPeriod("road");
  const margins = periodNumbers.map((_, index) => {
    const local = localScores[index];
    const road = roadScores[index];
    return local != null && road != null ? local - road : null;
  });

  // A side's total is the sum of its periods (overtimes included); any missing period leaves it unknown.
  const total = (scores) => (scores.every((score) => score != null) ? scores.reduce((sum, score) => sum + score, 0) : null);
  const localTotal = total(localScores);
  const roadTotal = total(roadScores);

  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Team</th>
            {periodNumbers.map((periodNumber) => (
              <th key={periodNumber} className="text-center">
                {formatPeriod(periodNumber)}
              </th>
            ))}
            <th className="text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">{teamName(localTeam)}</td>
            {localScores.map((score, index) => (
              <td key={periodNumbers[index]} className="text-center tabular-nums">
                {score ?? "-"}
              </td>
            ))}
            <td className="text-center font-bold tabular-nums">{formatMissing(localTotal)}</td>
          </tr>
          <tr>
            <td className="font-medium">{teamName(roadTeam)}</td>
            {roadScores.map((score, index) => (
              <td key={periodNumbers[index]} className="text-center tabular-nums">
                {score ?? "-"}
              </td>
            ))}
            <td className="text-center font-bold tabular-nums">{formatMissing(roadTotal)}</td>
          </tr>
          <tr>
            <td className="muted">Margin</td>
            {margins.map((margin, index) => (
              <td key={periodNumbers[index]} className="muted text-center tabular-nums">
                {margin == null ? "-" : formatSignedDiff(margin)}
              </td>
            ))}
            <td className="muted text-center tabular-nums">
              {localTotal != null && roadTotal != null ? formatSignedDiff(localTotal - roadTotal) : formatMissing(null)}
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

// Draws a dashed vertical line at each period's first scoring-event index,
// labelling the period on the x-axis at that same position. Kept as one
// small inline plugin instead of adding an annotation-plugin dependency.
function periodBoundaryPlugin(boundaryIndexes) {
  return {
    id: "periodBoundaries",
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.strokeStyle = "color-mix(in srgb, currentColor 30%, transparent)";
      ctx.setLineDash([4, 4]);
      for (const index of boundaryIndexes) {
        const x = scales.x.getPixelForValue(index);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export function ScoreFlowChart({ flow, localTeam, roadTeam, compact = false }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { scoringEvents } = flow;

  const margins = scoringEvents.map((event) => event.runningScoreA - event.runningScoreB);
  const boundaryIndexes = [];
  let lastPeriod = null;
  scoringEvents.forEach((event, index) => {
    if (event.periodNumber !== lastPeriod) {
      boundaryIndexes.push(index);
      lastPeriod = event.periodNumber;
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || margins.length < 2) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const successColor = themeColor(canvas, "--color-success");
    const errorColor = themeColor(canvas, "--color-error");
    const successFill = `color-mix(in srgb, ${successColor} 18%, transparent)`;
    const errorFill = `color-mix(in srgb, ${errorColor} 18%, transparent)`;
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: scoringEvents.map((_, index) => index),
        datasets: [
          {
            data: margins,
            borderColor: primary,
            segment: {
              borderColor: (context) => (context.p1.parsed.y >= 0 ? successColor : errorColor),
              backgroundColor: (context) => (context.p1.parsed.y >= 0 ? successFill : errorFill),
            },
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: (context) => ((context.parsed?.y ?? 0) >= 0 ? successColor : errorColor),
            fill: "origin",
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: textColor,
              callback: (value, index) =>
                boundaryIndexes.includes(index) ? formatPeriod(scoringEvents[index].periodNumber) : "",
              autoSkip: false,
              maxRotation: 0,
            },
            grid: { display: false },
          },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: (items) => momentLabel(eventMoment(scoringEvents[items[0].dataIndex])),
              label: (context) => {
                const value = context.parsed.y;
                const leader = value > 0 ? teamName(localTeam) : value < 0 ? teamName(roadTeam) : null;
                return leader ? `${leader} by ${Math.abs(value)}` : "Tied";
              },
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
      plugins: [periodBoundaryPlugin(boundaryIndexes)],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringEvents, theme, localTeam, roadTeam]);

  if (margins.length < 2) {
    return <EmptyText>Not enough play-by-play yet to chart game flow.</EmptyText>;
  }

  return (
    <Panel className="p-4">
      {compact ? null : <PanelHeader kicker="FLOW" title="Score differential" />}
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className={`relative w-full ${compact ? "h-40" : "h-64"}`}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Running score margin (${teamName(localTeam)} minus ${teamName(roadTeam)}) across every scoring play`}
          />
        </div>
      </div>
    </Panel>
  );
}
