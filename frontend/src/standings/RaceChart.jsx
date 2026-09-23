import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { thinAxisLabels } from "../lib/chartHelpers";
import { teamHue } from "../lib/teamHue";

const MIN_HEIGHT = 390;
const HEIGHT_PER_TEAM = 50;
const POSTSEASON_CUTOFF = 6;
const PLAYIN_CUTOFF = 10;

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function themeColor(el, variable) {
  return getComputedStyle(el).getPropertyValue(variable).trim();
}

function qualificationBandsPlugin(teamCount) {
  return {
    id: "qualificationBands",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const yScale = scales.y;
      const bands = [
        { from: 0.5, to: Math.min(POSTSEASON_CUTOFF + 0.5, teamCount + 0.5), color: chart.$postseasonBand },
        {
          from: Math.min(POSTSEASON_CUTOFF + 0.5, teamCount + 0.5),
          to: Math.min(PLAYIN_CUTOFF + 0.5, teamCount + 0.5),
          color: chart.$playinBand,
        },
      ];
      ctx.save();
      for (const band of bands) {
        if (band.to <= band.from) continue;
        const top = yScale.getPixelForValue(band.from);
        const bottom = yScale.getPixelForValue(band.to);
        ctx.fillStyle = band.color;
        ctx.fillRect(chartArea.left, Math.min(top, bottom), chartArea.right - chartArea.left, Math.abs(bottom - top));
      }
      ctx.restore();
    },
  };
}

export default function RaceChart({ rounds, totalRounds, standingsByRound, teamOrder, focusedClub, onFocusClub }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();

  const teamCount = teamOrder.length;
  const height = Math.max(MIN_HEIGHT, teamCount * HEIGHT_PER_TEAM);

  const roundLabels = useMemo(() => thinAxisLabels(rounds.map((r) => `R${r}`), 8), [rounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rounds.length < 1 || teamCount === 0) return undefined;

    const textColor = themeColor(canvas, "--color-base-content");
    const successColor = themeColor(canvas, "--color-success");
    const warningColor = themeColor(canvas, "--color-warning");
    const primaryColor = themeColor(canvas, "--color-primary");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    const hasFocus = Boolean(focusedClub);

    const datasets = teamOrder.map((team, index) => {
      const isFocused = focusedClub === team.clubCode;
      const baseColor = teamHue(index);
      const color = hasFocus
        ? isFocused
          ? primaryColor
          : `color-mix(in srgb, ${baseColor} 7%, transparent)`
        : baseColor;
      return {
        label: team.clubName ?? team.clubCode,
        clubCode: team.clubCode,
        data: rounds.map((round) => standingsByRound.get(round)?.get(team.clubCode) ?? null),
        borderColor: color,
        backgroundColor: color,
        borderWidth: isFocused ? 5 : 2,
        pointRadius: isFocused ? 4 : 2,
        pointHoverRadius: isFocused ? 6 : 4,
        order: isFocused ? -1 : 0,
        spanGaps: true,
        tension: 0,
      };
    });

    const chart = new Chart(canvas, {
      type: "line",
      data: { labels: roundLabels, datasets },
      plugins: [qualificationBandsPlugin(teamCount)],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements, activeChart) => {
          if (elements.length === 0) return;
          const clubCode = activeChart.data.datasets[elements[0].datasetIndex].clubCode;
          onFocusClub?.(clubCode === focusedClub ? null : clubCode);
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: {
            reverse: true,
            min: 0.5,
            max: teamCount + 0.5,
            ticks: { color: textColor, stepSize: 1, precision: 0 },
            grid: { color: gridColor },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "nearest",
            intersect: true,
            callbacks: {
              label: (context) => `${context.dataset.label}: position ${context.parsed.y}`,
            },
          },
        },
        interaction: { mode: "nearest", intersect: true },
      },
    });
    chart.$postseasonBand = `color-mix(in srgb, ${successColor} 6.5%, transparent)`;
    chart.$playinBand = `color-mix(in srgb, ${warningColor} 6.5%, transparent)`;
    chart.update();
    chartRef.current = chart;

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [rounds, roundLabels, standingsByRound, teamOrder, teamCount, theme, focusedClub, onFocusClub]);

  if (totalRounds < 2 || teamCount === 0) {
    return <p className="muted text-sm">Not enough round history yet to chart the standings race.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex w-fit items-center gap-2 text-xs text-base-content/70">
        Team focus
        <select
          className="select select-sm select-bordered"
          value={focusedClub ?? ""}
          onChange={(event) => onFocusClub?.(event.target.value || null)}
        >
          <option value="">All teams</option>
          {teamOrder.map((team) => (
            <option key={team.clubCode} value={team.clubCode}>
              {team.clubName ?? team.clubCode}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className="relative w-full" style={{ height }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Standings position by round across ${rounds.length} rounds for ${teamCount} teams`}
          />
        </div>
      </div>
    </div>
  );
}
