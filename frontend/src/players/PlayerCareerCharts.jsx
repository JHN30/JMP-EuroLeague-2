import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import { listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { ordinal } from "../teams/teamLeague";
import { changeFrom, SMALL_SAMPLE_GAMES } from "./careerData";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "./leagueLeaderboard";
import { PROFILE_AXES, rankPlayer } from "./playerOverview";

// ---- Trends: one small line per number, a point for every season ----

const TREND_METRICS = [
  { key: "pts", label: "Points", digits: 1 },
  { key: "reb", label: "Rebounds", digits: 1 },
  { key: "ast", label: "Assists", digits: 1 },
  { key: "stl", label: "Steals", digits: 1 },
  { key: "blk", label: "Blocks", digits: 1 },
  { key: "pir", label: "Valuation (PIR)", digits: 1 },
  { key: "min", label: "Minutes", digits: 1 },
  { key: "ts", label: "True shooting %", digits: 1, suffix: "%" },
  { key: "p3", label: "3-point %", digits: 1, suffix: "%" },
  { key: "per", label: "PER", digits: 1 },
  { key: "usg", label: "Usage %", digits: 1, suffix: "%" },
  { key: "ws", label: "Win shares", digits: 2 },
];

const SPARK_WIDTH = 160;
const SPARK_HEIGHT = 52;
const SPARK_PAD = 8;

// The line through the seasons that have the number. A season with few games is a hollow dot, and any stretch to or
// from it is dashed, to say it is not to be read as a trend. One season is a single dot.
function Sparkline({ lines, metric }) {
  const known = lines.map((line, index) => ({ line, index })).filter(({ line }) => line[metric.key] !== null);
  if (known.length === 0) return <div className="h-[52px]" />;

  const values = known.map(({ line }) => line[metric.key]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const x = (index) => (lines.length === 1 ? SPARK_WIDTH / 2 : SPARK_PAD + (index / (lines.length - 1)) * (SPARK_WIDTH - 2 * SPARK_PAD));
  const y = (value) => (high === low ? SPARK_HEIGHT / 2 : SPARK_HEIGHT - SPARK_PAD - ((value - low) / span) * (SPARK_HEIGHT - 2 * SPARK_PAD));
  const points = known.map(({ line, index }) => ({ px: x(index), py: y(line[metric.key]), small: line.small }));

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="h-[52px] w-full overflow-visible text-primary"
      role="img"
      aria-label={`${metric.label} by season: ${known.map(({ line }) => `${line.label} ${formatDecimal(line[metric.key], metric.digits)}`).join(", ")}`}
    >
      {points.slice(1).map((point, index) => {
        const from = points[index];
        const dashed = from.small || point.small;
        return (
          <motion.path
            key={index}
            d={`M${from.px} ${from.py}L${point.px} ${point.py}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={dashed ? "3 4" : undefined}
            initial={dashed ? { opacity: 0 } : { pathLength: 0 }}
            animate={dashed ? { opacity: 1 } : { pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.15 + index * 0.1 }}
          />
        );
      })}
      {points.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.px}
          cy={point.py}
          r="4"
          fill={point.small ? "var(--color-base-100)" : "currentColor"}
          stroke="currentColor"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.1 + index * 0.1 }}
        />
      ))}
    </svg>
  );
}

function TrendCard({ lines, metric }) {
  // The headline is the latest season with enough games to mean something (the latest of all if none has).
  const known = lines.filter((line) => line[metric.key] !== null);
  const reliable = known.filter((line) => !line.small);
  const shown = reliable.length > 0 ? reliable : known;
  const latest = shown[shown.length - 1];
  const before = shown[shown.length - 2];
  const change = latest && before ? changeFrom(before, latest, metric.key) : null;

  return (
    <motion.div className="rounded-box border border-base-300 bg-base-100 p-3" variants={listItem}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="muted text-xs font-bold uppercase tracking-wide">{metric.label}</span>
        {change !== null && change !== 0 ? (
          <span className={`text-xs font-semibold tabular-nums ${change > 0 ? "text-success" : "text-error"}`} title="Against the season before">
            {formatSignedDecimal(change)}
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-black tabular-nums">
        {latest ? `${formatDecimal(latest[metric.key], metric.digits)}${metric.suffix ?? ""}` : "—"}
      </p>
      <p className="muted -mt-0.5 mb-1 text-xs">{latest ? latest.label : ""}</p>
      <Sparkline lines={lines} metric={metric} />
      {lines.length > 1 ? (
        <div className="muted flex justify-between text-[0.65rem] tabular-nums">
          <span>{lines[0].label}</span>
          <span>{lines[lines.length - 1].label}</span>
        </div>
      ) : null}
    </motion.div>
  );
}

export function TrendGrid({ lines }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="SEASON TO SEASON" title="Trends" />
      <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3" variants={listContainer} initial="hidden" animate="show">
        {TREND_METRICS.map((metric) => (
          <TrendCard key={metric.key} lines={lines} metric={metric} />
        ))}
      </motion.div>
      {lines.some((line) => line.small) ? (
        <p className="muted mt-3 text-xs">A hollow dot is a season with fewer than 10 games; it is drawn but not compared.</p>
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
          legend: { position: "bottom", labels: { color: textColor, usePointStyle: true } },
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

// Each season's league leaderboard is a few requests, so the profile loads when asked for.
export function ProfileComparison({ cards, personKey }) {
  const [show, setShow] = useState(false);
  const queries = useQueries({
    queries: cards.map((card) => ({
      queryKey: leaderboardQueryKey(card.seasonCode, "RS"),
      queryFn: () => fetchLeagueLeaderboard(card.seasonCode, "RS"),
      enabled: show,
    })),
  });

  const pending = show && queries.some((query) => query.isPending);
  const failed = show && queries.some((query) => query.isError);
  const dataKey = queries.map((query) => query.dataUpdatedAt).join(",");

  const series = useMemo(() => {
    if (!show || queries.some((query) => !query.data)) return [];
    return cards
      .map((card, index) => {
        const percentiles = PROFILE_AXES.map((axis) => rankPlayer(queries[index].data, personKey, axis, { qualifiedOnly: true, rankUnqualified: true }).percentile);
        const games = Number(card.entry?.traditional?.gamesPlayed);
        // Under the league's minimum (or just very few games) the percentiles are a guide, not a ranking: dashed.
        const limited = card.entry?.qualified === false || (Number.isFinite(games) && games < SMALL_SAMPLE_GAMES);
        return {
          label: limited ? `${card.label} (${games} GP)` : card.label,
          cardIndex: index,
          note: !limited
            ? null
            : card.entry?.qualified === false
              ? `${card.label}: ${games} games, under the ${card.entry.minGames} the league ranks from, so this shows where they would rank among that season's qualified players`
              : `${card.label}: ${games} games, a very small sample`,
          percentiles,
          small: limited,
          colourVariable: colourVariable(cards.length - 1 - index),
        };
      })
      .filter((entry) => entry.percentiles.some((percentile) => percentile !== null));
    // The queries array is a new object every render; their data timestamps say when anything changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, cards, personKey, dataKey]);

  // Seasons drawn dashed (under the league's minimum games, or very few games), and seasons with no statistics at all.
  const drawn = new Set(series.map((entry) => entry.cardIndex));
  const dashedNotes = series.map((entry) => entry.note).filter(Boolean);
  const notDrawn = series.length === 0 ? [] : cards.filter((_, index) => !drawn.has(index)).map((card) => `${card.label} (no statistics)`);

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
      ) : pending ? (
        <AsyncState status="loading" label="Loading league rankings for every season" />
      ) : failed ? (
        <AsyncState status="error" message="Could not load the league rankings." onRetry={() => queries.forEach((query) => query.refetch())} />
      ) : series.length === 0 ? (
        <p className="muted text-sm">No recorded stats in any season to chart.</p>
      ) : (
        <>
          <OverlayRadar series={series} />
          <p className="muted mt-2 text-xs">Click a season in the legend to hide it.</p>
          {dashedNotes.length > 0 ? (
            <p className="muted mt-1 text-xs">
              <span className="font-semibold">Dashed outline: a season with few games, a guide more than a ranking.</span> {dashedNotes.join("; ")}.
            </p>
          ) : null}
          {notDrawn.length > 0 ? <p className="muted mt-1 text-xs">Not drawn: {notDrawn.join("; ")}.</p> : null}
        </>
      )}
    </Panel>
  );
}
