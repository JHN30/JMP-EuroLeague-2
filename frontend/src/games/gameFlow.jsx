import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import EmptyText from "../lib/EmptyText";
import { formatMissing, formatPeriod, formatSignedDiff } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import { buildMarginSeries, eventMoment, momentLabel } from "./gameFlowData";
import { teamCode, teamName } from "./gameUtils";
import { TeamName } from "./TeamLabel";

// `fill` stretches the panel to its parent's height from lg, the rows sharing it out (the Overview, beside the score flow).
export function PeriodTable({ periodScores, localTeam, roadTeam, forfeit = false, fill = false }) {
  // A forfeit has no play: the source's zero period scores are placeholders, not recorded values.
  if (forfeit) return <EmptyText>Period scores were not recorded: this game was a forfeit.</EmptyText>;
  if (periodScores.length === 0) {
    return <EmptyText>Period scores weren't recorded for this game.</EmptyText>;
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
    <Panel className={`overflow-x-auto overscroll-x-contain p-2${fill ? " lg:flex-1" : ""}`}>
      <table className={`table table-sm max-sm:[&_td]:px-1.5 max-sm:[&_th]:px-1.5 lg:[&_th]:text-sm${fill ? " lg:h-full" : ""}`}>
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
          <TeamRow team={localTeam} scores={localScores} otherScores={roadScores} total={localTotal} otherTotal={roadTotal} periodNumbers={periodNumbers} />
          <TeamRow team={roadTeam} scores={roadScores} otherScores={localScores} total={roadTotal} otherTotal={localTotal} periodNumbers={periodNumbers} />
          <tr>
            <td className="muted lg:text-sm">Margin</td>
            {margins.map((margin, index) => (
              <td key={periodNumbers[index]} className="muted text-center tabular-nums lg:text-sm">
                {margin == null ? "-" : formatSignedDiff(margin)}
              </td>
            ))}
            <td className="muted text-center tabular-nums lg:text-sm">
              {localTotal != null && roadTotal != null ? formatSignedDiff(localTotal - roadTotal) : formatMissing(null)}
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

// A score that beat the other side's in the same column; a tie or a missing score beats nothing.
const beats = (score, other) => score != null && other != null && score > other;

// One team's line: its crest and name, then each period and the total. The side that won a period has its score in bold, and
// the winner's total is bold in the theme's first colour, as in the header. From lg the numbers are larger. Below 360px the crest
// is left out: three-digit scores over four periods need its room.
function TeamRow({ team, scores, otherScores, total, otherTotal, periodNumbers }) {
  const wonGame = beats(total, otherTotal);
  return (
    <tr>
      <td className="font-medium lg:text-base">
        <span className="flex items-center gap-2 max-sm:gap-1.5">
          {team?.crestUrl ? (
            <img
              src={team.crestUrl}
              alt=""
              className="size-5 flex-none object-contain max-[359px]:hidden lg:size-7"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span className="min-w-0">
            <TeamName team={team} />
          </span>
        </span>
      </td>
      {scores.map((score, index) => (
        <td key={periodNumbers[index]} className={`text-center tabular-nums lg:text-lg ${beats(score, otherScores[index]) ? "font-bold" : ""}`}>
          {score ?? "-"}
        </td>
      ))}
      <td className={`text-center tabular-nums lg:text-lg ${wonGame ? "font-bold text-primary" : ""}`}>{formatMissing(total)}</td>
    </tr>
  );
}

// One bar per stretch of play: from the tie line up (home side ahead) or down (road side ahead) to the margin, as wide as
// the time that margin stood. Drawn as plain rectangles so there is no outline to show seams where the lead changes.
function leadBarsPlugin({ points, homeColor, roadColor }) {
  return {
    id: "leadBars",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const zero = scales.y.getPixelForValue(0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.clip();
      points.slice(0, -1).forEach((point, index) => {
        if (point.y === 0) return;
        const left = scales.x.getPixelForValue(point.x);
        const right = scales.x.getPixelForValue(points[index + 1].x);
        if (right <= left) return;
        const top = scales.y.getPixelForValue(point.y);
        ctx.fillStyle = point.y > 0 ? homeColor : roadColor;
        // A hair of overlap so neighbouring bars never leave a gap.
        ctx.fillRect(left, Math.min(top, zero), right - left + 0.5, Math.abs(zero - top));
      });
      ctx.restore();
    },
  };
}

// Dotted lines between periods, a faint crest in each half and the two team codes at the ends of the vertical axis, so it
// is clear which side the bars on each half belong to. Kept as one small inline plugin instead of adding an
// annotation-plugin dependency.
function flowDecorationsPlugin({ periods, home, road, textColor }) {
  const drawCrest = (ctx, image, centerX, centerY, size) => {
    if (!image?.complete || !image.naturalWidth) return;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  };

  return {
    id: "flowDecorations",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const half = (chartArea.bottom - chartArea.top) / 2;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const size = Math.min(half * 0.75, 150);
      ctx.save();
      ctx.globalAlpha = 0.2;
      drawCrest(ctx, home.crest, centerX, chartArea.top + half / 2, size);
      drawCrest(ctx, road.crest, centerX, chartArea.bottom - half / 2, size);
      ctx.restore();
    },
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.strokeStyle = `color-mix(in srgb, ${textColor} 45%, transparent)`;
      ctx.setLineDash([2, 3]);
      for (const period of periods.slice(1)) {
        const x = scales.x.getPixelForValue(period.start);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = `color-mix(in srgb, ${textColor} 80%, transparent)`;
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(home.code, chartArea.left + 10, chartArea.top + 8);
      ctx.textBaseline = "bottom";
      ctx.fillText(road.code, chartArea.left + 10, chartArea.bottom - 8);
      ctx.restore();
    },
  };
}

function loadCrest(url, onLoad) {
  if (!url) return null;
  const image = new Image();
  image.onload = onLoad;
  image.src = url;
  return image;
}

export function ScoreFlowChart({ flow, localTeam, roadTeam, compact = false }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { scoringEvents } = flow;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scoringEvents.length < 2) return undefined;

    const { points, periods, gameSeconds } = buildMarginSeries(scoringEvents);
    const textColor = themeColor(canvas, "--color-base-content");
    // The home side is the theme's orange and the road side its second colour, as on the shot chart: a lead is not good or bad.
    const homeColor = themeColor(canvas, "--color-primary");
    const roadColor = themeColor(canvas, "--color-secondary");
    const tiedColor = `color-mix(in srgb, ${textColor} 55%, transparent)`;
    const gridColor = `color-mix(in srgb, ${textColor} 30%, transparent)`;
    const sideColor = (margin) => (margin > 0 ? homeColor : margin < 0 ? roadColor : tiedColor);

    // Both halves are the same size, like a lead tracker: the bound is the biggest lead of either side rounded up to a
    // whole number of tick steps, so zero is always a tick.
    const largest = Math.max(...points.map((point) => Math.abs(point.y)));
    const step = largest <= 30 ? 5 : 10;
    const bound = Math.max(2 * step, Math.ceil((largest + 1) / step) * step);

    const redraw = () => chartRef.current?.draw();
    const home = { code: teamCode(localTeam), crest: loadCrest(localTeam?.crestUrl, redraw) };
    const road = { code: teamCode(roadTeam), crest: loadCrest(roadTeam?.crestUrl, redraw) };

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            data: points,
            parsing: false,
            // The bars are drawn by leadBarsPlugin; the dataset only supplies the hover marker and the tooltip.
            showLine: false,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointBackgroundColor: (context) => sideColor(context.parsed?.y ?? 0),
            pointBorderColor: textColor,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, right: 6 } },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: gameSeconds,
            // One label per period, centred under it.
            afterBuildTicks: (scale) => {
              scale.ticks = periods.map((period) => ({ value: (period.start + period.end) / 2 }));
            },
            ticks: {
              color: textColor,
              autoSkip: false,
              maxRotation: 0,
              callback: (value) => formatPeriod(periods.find((period) => value >= period.start && value <= period.end)?.number),
            },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            min: -bound,
            max: bound,
            ticks: { color: textColor, stepSize: step, callback: (value) => Math.abs(value) },
            grid: { color: gridColor, lineWidth: 1, tickBorderDash: [2, 3] },
            border: { display: false, dash: [2, 3] },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "nearest",
            axis: "x",
            intersect: false,
            callbacks: {
              title: (items) => {
                const point = items[0].raw;
                if (point.event) return momentLabel(eventMoment(point.event));
                return point.x === 0 ? "Tip-off" : "End of game";
              },
              label: (context) => {
                const value = context.parsed.y;
                const leader = value > 0 ? teamName(localTeam) : value < 0 ? teamName(roadTeam) : null;
                return leader ? `${leader} by ${Math.abs(value)}` : "Tied";
              },
            },
          },
        },
        interaction: { mode: "nearest", axis: "x", intersect: false },
      },
      plugins: [
        leadBarsPlugin({ points, homeColor: `color-mix(in srgb, ${homeColor} 90%, transparent)`, roadColor: `color-mix(in srgb, ${roadColor} 90%, transparent)` }),
        flowDecorationsPlugin({ periods, home, road, textColor }),
      ],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [scoringEvents, theme, localTeam, roadTeam]);

  if (scoringEvents.length < 2) {
    return <EmptyText>Not enough play-by-play yet to chart game flow.</EmptyText>;
  }

  return (
    <Panel className="p-4 max-sm:p-3">
      {compact ? null : <PanelHeader kicker="FLOW" title="Lead tracker" />}
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className={`relative w-full ${compact ? "h-52" : "h-80 max-sm:h-64"}`}>
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
