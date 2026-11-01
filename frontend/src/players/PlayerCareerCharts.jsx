import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import { CareerRadarSkeleton } from "./PlayerPageSkeleton";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabStrip } from "../lib/TabStrip";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { ordinal } from "../teams/teamLeague";
import { changeFrom, SMALL_SAMPLE_GAMES } from "./careerData";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "./leagueLeaderboard";
import { PROFILE_AXES, rankPlayer } from "./playerOverview";

// ---- Trends: one stat at a time, a bar per season with its value, against the career average ----

// `shooting` stats are averaged over minutes played, the rest over games; `total` stats add up over a career.
const TREND_METRICS = [
  { key: "pts", label: "Points", unit: "per game", digits: 1 },
  { key: "reb", label: "Rebounds", unit: "per game", digits: 1 },
  { key: "ast", label: "Assists", unit: "per game", digits: 1 },
  { key: "stl", label: "Steals", unit: "per game", digits: 1 },
  { key: "blk", label: "Blocks", unit: "per game", digits: 1 },
  { key: "pir", label: "PIR", unit: "valuation per game", digits: 1 },
  { key: "min", label: "Minutes", unit: "per game", digits: 1 },
  { key: "ts", label: "TS%", unit: "true shooting", digits: 1, suffix: "%", shooting: true },
  { key: "p3", label: "3P%", unit: "three-point shooting", digits: 1, suffix: "%", shooting: true },
  { key: "per", label: "PER", unit: "player efficiency rating", digits: 1 },
  { key: "usg", label: "USG%", unit: "share of possessions used", digits: 1, suffix: "%" },
  { key: "ws", label: "Win shares", unit: "wins added", digits: 2, total: true },
];

const TREND_PANEL_ID = "player-career-trend";

const formatMetric = (metric, value) => `${formatDecimal(value, metric.digits)}${metric.suffix ?? ""}`;

// The career figure drawn as the dashed line: the games-weighted average (minutes-weighted for shooting), or the sum.
function careerFigure(lines, metric) {
  let sum = 0;
  let weight = 0;
  for (const line of lines) {
    const value = line[metric.key];
    if (value === null || !line.gp) continue;
    const w = metric.total ? 1 : metric.shooting ? line.gp * (line.min ?? 0) : line.gp;
    sum += value * w;
    weight += w;
  }
  if (weight === 0) return null;
  return metric.total ? sum : sum / weight;
}

function TrendFact({ label, value, sub, tone }) {
  return (
    <div className="min-w-0">
      <p className="muted text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black leading-tight tabular-nums">{value}</p>
      <p className={`truncate text-xs ${tone ?? "muted"}`}>{sub}</p>
    </div>
  );
}

// One column per season: its value over a bar measured from zero, and the season under it. The best season (of those
// with enough games) is filled, a season with few games is striped and never the best.
function TrendBars({ lines, metric, average, best }) {
  const values = lines.map((line) => line[metric.key]).filter((value) => value !== null);
  const top = Math.max(...values, average ?? 0, 0) || 1;
  const height = (value) => `${(Math.max(value, 0) / top) * 100}%`;
  return (
    <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label={`${metric.label} by season`} tabIndex={0}>
      <div className="relative" style={{ minWidth: `${lines.length * 2.75}rem` }}>
        <div className="relative flex h-48 items-end gap-1.5 pt-5">
          {average !== null && !metric.total ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-5">
              <div className="absolute inset-x-0 border-t-2 border-dashed border-base-content/35" style={{ bottom: height(average) }}>
                <span className="absolute -top-4.5 right-0 rounded bg-base-100 px-1 text-[0.65rem] font-semibold text-base-content/70">
                  Career {formatMetric(metric, average)}
                </span>
              </div>
            </div>
          ) : null}
          {lines.map((line, index) => {
            const value = line[metric.key];
            const isBest = best && line.seasonCode === best.seasonCode;
            return (
              <div
                key={line.seasonCode}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                title={value === null ? `${line.label}: no figure` : `${line.label}: ${formatMetric(metric, value)} (${line.gp ?? 0} games)`}
              >
                <span className={`mb-1 text-[0.7rem] leading-none tabular-nums ${isBest ? "font-black text-primary" : "font-semibold"}`}>
                  {value === null ? "—" : formatDecimal(value, metric.digits)}
                </span>
                {value === null ? null : (
                  <motion.div
                    className={`w-full max-w-10 rounded-t-sm ${isBest ? "bg-primary" : line.small ? "trend-bar-small" : "bg-primary/40"}`}
                    style={{ height: height(value), transformOrigin: "bottom" }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.45, delay: Math.min(index * 0.025, 0.4), ease: "easeOut" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 border-t border-base-300 pt-1">
          {lines.map((line, index) => (
            <span
              key={line.seasonCode}
              className={`min-w-0 flex-1 text-center text-[0.65rem] tabular-nums ${index === lines.length - 1 ? "font-bold" : "muted"}`}
              title={line.label}
            >
              {line.label.slice(2)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendGrid({ lines }) {
  const [metricKey, setMetricKey] = useState("pts");
  const metric = TREND_METRICS.find((entry) => entry.key === metricKey);

  // The headline is the latest season with enough games to mean something (the latest of all if none has).
  const known = lines.filter((line) => line[metric.key] !== null);
  const reliable = known.filter((line) => !line.small);
  const shown = reliable.length > 0 ? reliable : known;
  const latest = shown[shown.length - 1];
  const before = shown[shown.length - 2];
  const change = latest && before ? changeFrom(before, latest, metric.key) : null;
  const best = shown.reduce((top, line) => (top === null || line[metric.key] > top[metric.key] ? line : top), null);
  const average = careerFigure(lines, metric);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="SEASON TO SEASON" title="Trends" />
      <TabStrip ariaLabel="Trend stat" scrolling panelId={TREND_PANEL_ID} activeKey={metricKey} onChange={setMetricKey} className="mb-4 w-fit max-w-full" tabs={TREND_METRICS} />
      <div id={TREND_PANEL_ID}>
        {known.length === 0 ? (
          <p className="muted text-sm">No {metric.label} recorded in these seasons.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <TrendFact
                label={latest.label}
                value={formatMetric(metric, latest[metric.key])}
                sub={change === null || change === 0 ? metric.unit : `${change > 0 ? "▲" : "▼"} ${formatSignedDecimal(change).replace(/^[+-]/, "")} on ${before.label}`}
                tone={change === null || change === 0 ? null : change > 0 ? "text-success font-semibold" : "text-error font-semibold"}
              />
              <TrendFact label="Best season" value={formatMetric(metric, best[metric.key])} sub={best.label} />
              <TrendFact label={metric.total ? "Career total" : "Career"} value={average === null ? "—" : formatMetric(metric, average)} sub={metric.total ? "every season added up" : "weighted average"} />
            </div>
            <TrendBars key={metric.key} lines={lines} metric={metric} average={average} best={best} />
          </>
        )}
      </div>
      {lines.some((line) => line.small) ? (
        <p className="muted mt-3 text-xs">A striped bar is a season with fewer than 10 games: it is drawn, but never the best season or compared.</p>
      ) : null}
    </Panel>
  );
}

// ---- Profile: the Overview's percentile radar, one outline per season on the same chart ----

// The newest season takes the brand colour; older ones step through the others.
const SEASON_COLOURS = ["--color-secondary", "--color-accent", "--color-warning", "--color-info", "--color-success"];

function colourVariable(fromNewest) {
  return fromNewest === 0 ? "--color-primary" : SEASON_COLOURS[(fromNewest - 1) % SEASON_COLOURS.length];
}

function OverlayRadar({ series }) {
  const canvasRef = useRef(null);
  const theme = useActiveTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    const chart = new Chart(canvas, {
      type: "radar",
      data: {
        labels: PROFILE_AXES.map((axis) => axis.label),
        datasets: series.map((entry) => {
          const colour = themeColor(canvas, entry.colourVariable);
          return {
            label: entry.label,
            data: entry.percentiles.map((percentile) => percentile ?? 0),
            borderColor: colour,
            backgroundColor: `color-mix(in srgb, ${colour} 14%, transparent)`,
            borderWidth: 2,
            borderDash: entry.small ? [5, 4] : [],
            pointBackgroundColor: colour,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: textColor, backdropColor: "transparent" },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: textColor },
          },
        },
        plugins: {
          // The season chips above choose what is drawn, so the legend is only a key.
          legend: { position: "bottom", labels: { color: textColor, usePointStyle: true }, onClick: () => {} },
          tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${ordinal(context.parsed.r)} percentile` } },
        },
      },
    });
    return () => chart.destroy();
  }, [series, theme]);

  return (
    <div className="relative h-80 w-full">
      <canvas ref={canvasRef} role="img" aria-label="Percentile radar with one outline per season" />
    </div>
  );
}

// How many seasons the radar starts with: the latest ones.
const DEFAULT_RADAR_SEASONS = 3;

// The seasons drawn: the ones picked (null until the user picks), or the latest few. At least one always stays.
function radarSeasons(lines, chosen) {
  const available = lines.map((line) => line.seasonCode);
  const picked = (chosen ?? []).filter((code) => available.includes(code));
  return picked.length > 0 ? picked : available.slice(-DEFAULT_RADAR_SEASONS);
}

// Each season's league leaderboard is a few requests, so the profile loads when asked for, and only for the seasons picked.
// `lines` are the seasons with games in the tab's view, and `phase` is that view (`all` or `RS`).
export function ProfileComparison({ lines, personKey, phase }) {
  const [show, setShow] = useState(false);
  const [chosen, setChosen] = useState(null);
  const selected = radarSeasons(lines, chosen);
  const selectedLines = lines.filter((line) => selected.includes(line.seasonCode));
  const queries = useQueries({
    queries: selectedLines.map((line) => ({
      queryKey: leaderboardQueryKey(line.seasonCode, phase),
      queryFn: () => fetchLeagueLeaderboard(line.seasonCode, phase),
      enabled: show,
    })),
  });

  const pending = show && queries.some((query) => query.isPending);
  const failed = show && queries.some((query) => query.isError);
  const dataKey = queries.map((query) => query.dataUpdatedAt).join(",");
  const selectedKey = selected.join(",");

  const series = useMemo(() => {
    if (!show || queries.some((query) => !query.data)) return [];
    return selectedLines
      .map((line, index) => {
        const percentiles = PROFILE_AXES.map((axis) => rankPlayer(queries[index].data, personKey, axis, { qualifiedOnly: true, rankUnqualified: true }).percentile);
        const games = line.gp;
        // Under the league's minimum (or just very few games) the percentiles are a guide, not a ranking: dashed.
        const limited = line.qualified === false || (games !== null && games < SMALL_SAMPLE_GAMES);
        return {
          label: limited ? `${line.label} (${games} GP)` : line.label,
          seasonCode: line.seasonCode,
          note: !limited
            ? null
            : line.qualified === false
              ? `${line.label}: ${games} games, under the ${line.minGames} the league ranks from, so this shows where they would rank among that season's qualified players`
              : `${line.label}: ${games} games, a very small sample`,
          percentiles,
          small: limited,
          colourVariable: colourVariable(selectedLines.length - 1 - index),
        };
      })
      .filter((entry) => entry.percentiles.some((percentile) => percentile !== null));
    // The queries array is a new object every render; their data timestamps say when anything changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, selectedKey, personKey, phase, dataKey]);

  function toggle(seasonCode) {
    if (!selected.includes(seasonCode)) setChosen([...selected, seasonCode]);
    else if (selected.length > 1) setChosen(selected.filter((code) => code !== seasonCode));
  }

  // Seasons drawn dashed (under the league's minimum games, or very few games), and picked seasons with no statistics.
  const drawn = new Set(series.map((entry) => entry.seasonCode));
  const dashedNotes = series.map((entry) => entry.note).filter(Boolean);
  const notDrawn = series.length === 0 ? [] : selectedLines.filter((line) => !drawn.has(line.seasonCode)).map((line) => `${line.label} (no statistics)`);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="PERCENTILE 0-100" title="Profile by season" />
      {!show ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShow(true)}>
            Compare the profile by season
          </button>
          <span className="muted text-sm">Ranks the player against the league in each season, using the six Overview axes.</span>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Seasons on the radar" className="mb-3 flex flex-wrap gap-1.5">
            {lines.map((line) => {
              const on = selected.includes(line.seasonCode);
              const last = on && selected.length === 1;
              return (
                <button
                  key={line.seasonCode}
                  type="button"
                  aria-pressed={on}
                  aria-disabled={last || undefined}
                  title={last ? "At least one season stays on the radar" : undefined}
                  className={`btn btn-xs tabular-nums max-sm:h-8 ${on ? "btn-primary" : "btn-outline"} ${last ? "cursor-not-allowed" : ""}`}
                  onClick={() => toggle(line.seasonCode)}
                >
                  {line.label}
                </button>
              );
            })}
          </div>
          {pending ? (
            <AsyncState status="loading" label="Loading league rankings for the seasons picked" skeleton={<CareerRadarSkeleton />} />
          ) : failed ? (
            <AsyncState status="error" message="Could not load the league rankings." onRetry={() => queries.forEach((query) => query.refetch())} />
          ) : series.length === 0 ? (
            <p className="muted text-sm">No recorded stats in the seasons picked to chart.</p>
          ) : (
            <>
              <OverlayRadar series={series} />
              {dashedNotes.length > 0 ? (
                <p className="muted mt-2 text-xs">
                  <span className="font-semibold">Dashed outline: a season with few games, a guide more than a ranking.</span> {dashedNotes.join("; ")}.
                </p>
              ) : null}
              {notDrawn.length > 0 ? <p className="muted mt-1 text-xs">Not drawn: {notDrawn.join("; ")}.</p> : null}
            </>
          )}
        </>
      )}
    </Panel>
  );
}
