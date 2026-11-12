import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { getPlayerGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { TrendsSkeleton } from "./CompareSkeleton";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { formatPerGame } from "../lib/format";
import { listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { Avatar } from "../leaders/LeaderParts";
import { playedLog, viewGame } from "../players/gameLog";
import { statNumber } from "../players/playerOverview";
import { LineTrend } from "./TrendCharts";
import { chartNames, fullName } from "./playerLabels";
import PlayerPairHeader from "./PlayerPairHeader";
import usePlayerRows from "./usePlayerRows";
import { average } from "./trendMath";

// Fewer games than this is not a trend.
const MIN_GAMES = 4;
// The form chart's games and the best stretch's length.
const WINDOW = 10;
const STRETCH = 5;

const PRODUCTION = [
  { key: "pts", label: "Points" },
  { key: "reb", label: "Rebounds" },
  { key: "ast", label: "Assists" },
  { key: "pir", label: "PIR" },
];

// The better side's colour, as the radar and the Statistics tab draw the two players.
const SIDE_TEXT = { a: "text-primary", b: "text-accent" };

// ---- The numbers ----

// A player's played games in the chosen phase, in order, as the header's season line and the team Trends count them.
function phaseViews(games, phaseCode) {
  return playedLog(games ?? [])
    .filter((game) => !phaseCode || game.phaseCode === phaseCode)
    .map(viewGame);
}

// The tooltip's second line for a game.
function noteOf(view) {
  return (view.home ? "vs " : "at ") + (view.opponent?.abbreviatedName ?? view.opponent?.name ?? "TBD") + ": " + Math.round(view.pts) + " pts, " + Math.round(view.reb) + " reb, " + Math.round(view.ast) + " ast, " + Math.round(view.pir) + " PIR";
}

// A game's true shooting and usage from the pipeline's advanced numbers, in percent; null for a game without them or without a shot.
function trueShooting(view) {
  const attempts = view.fga + (statNumber(view.game.freeThrowsAttempted) ?? 0);
  const value = view.advanced?.trueShootingPct;
  return attempts > 0 && value !== null && value !== undefined ? Number(value) * 100 : null;
}
function usage(view) {
  const value = view.advanced?.usagePct;
  return view.seconds > 0 && value !== null && value !== undefined ? Number(value) * 100 : null;
}

function advancedNumber(view, key) {
  const value = view.advanced?.[key];
  return view.seconds > 0 && value !== null && value !== undefined ? Number(value) : null;
}

function spread(values) {
  const mean = average(values);
  if (mean === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

// The highest average over `length` games in a row.
function bestStretch(values, length) {
  if (values.length < length) return null;
  let best = -Infinity;
  for (let start = 0; start + length <= values.length; start += 1) best = Math.max(best, average(values.slice(start, start + length)));
  return best;
}

const isDoubleDouble = (view) => [view.pts, view.reb, view.ast].filter((value) => value >= 10).length >= 2;

// The splits: points and PIR per game over the games that fit. `knowsStarts` adds the starter and bench rows.
function splitsOf(views, knowsStarts) {
  const half = Math.ceil(views.length / 2);
  const rows = [
    { key: "home", label: "Home", pick: (view) => view.home },
    { key: "away", label: "Away", pick: (view) => !view.home },
    { key: "wins", label: "In wins", pick: (view) => view.won === true },
    { key: "losses", label: "In losses", pick: (view) => view.won === false },
    ...(knowsStarts
      ? [
          { key: "started", label: "Started", pick: (view) => view.started === true },
          { key: "bench", label: "Off the bench", pick: (view) => view.started === false },
        ]
      : []),
    { key: "first", label: "First half", tip: "The first half of the player's games this season", pick: (view, index) => index < half },
    { key: "second", label: "Second half", tip: "The second half of the player's games this season", pick: (view, index) => index >= half },
  ];
  return rows.map((row) => {
    const games = views.filter(row.pick);
    return { ...row, games: games.length, pts: average(games.map((view) => view.pts)), pir: average(games.map((view) => view.pir)) };
  });
}

// The consistency rows. `count` rows show how many games and their share; the share decides the better side.
function consistencyOf(views) {
  const pir = views.map((view) => view.pir);
  const count = (pick) => {
    const games = views.filter(pick).length;
    return { games, share: views.length ? games / views.length : null };
  };
  return {
    pts10: count((view) => view.pts >= 10),
    pts20: count((view) => view.pts >= 20),
    pir20: count((view) => view.pir >= 20),
    doubles: count(isDoubleDouble),
    low: count((view) => view.pir < 5),
    spread: spread(pir),
    stretch: bestStretch(pir, STRETCH),
  };
}

const CONSISTENCY_ROWS = [
  { key: "pts10", label: "10+ point games", kind: "count" },
  { key: "pts20", label: "20+ point games", kind: "count" },
  { key: "pir20", label: "20+ PIR games", kind: "count" },
  { key: "doubles", label: "Double-doubles", tip: "Games with 10 or more of two of points, rebounds and assists", kind: "count" },
  { key: "spread", label: "PIR spread", tip: "How far a game's PIR usually lands from the player's average (the standard deviation). Lower is steadier.", kind: "spread", lower: true },
  { key: "stretch", label: `Best ${STRETCH}-game stretch`, tip: `The highest PIR average over ${STRETCH} games in a row`, kind: "value" },
  { key: "low", label: "Games under 5 PIR", tip: "The games the player gave little, and their share of the player's games", kind: "count", lower: true },
];

// "a", "b" or null.
function betterOf(a, b, lower = false) {
  if (a === null || b === null || a === undefined || b === undefined || Math.abs(a - b) < 1e-9) return null;
  return (lower ? a < b : a > b) ? "a" : "b";
}

// ---- Form ----

function Delta({ value }) {
  if (value === null || Math.abs(value) < 0.05) return <span className="muted text-xs">(level)</span>;
  return <span className={"text-xs font-semibold tabular-nums " + (value > 0 ? "text-success" : "text-error")}>({(value > 0 ? "+" : "") + value.toFixed(1)})</span>;
}

// The form summary of one player: the swatch of their colour in the chart, the name, then points and PIR over the last games with
// the change on the season.
function FormSummary({ side }) {
  const compare = side.views.length > side.recent.length;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar imageUrl={side.imageUrl ?? null} size="h-9 w-9" />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className={`size-2.5 flex-none rounded-full ${side.swatch}`} />
          <span className="min-w-0 wrap-break-word">{side.name}</span>
        </p>
        <p className="text-sm">
          <span className="muted text-xs">PTS</span> <b className="tabular-nums">{formatPerGame(side.recentPts)}</b> {compare ? <Delta value={side.recentPts - side.seasonPts} /> : null}
          <span className="muted mx-1.5 text-xs">·</span>
          <span className="muted text-xs">PIR</span> <b className="tabular-nums">{formatPerGame(side.recentPir)}</b> {compare ? <Delta value={side.recentPir - side.seasonPir} /> : null}
          <span className="muted ms-1.5 text-xs whitespace-nowrap">season {formatPerGame(side.seasonPir)}</span>
        </p>
      </div>
    </div>
  );
}

// The two players' last games side by side on one scale: a pair of bars a game (each player's PIR, in their colour, the number on
// top from sm, the latest game on the right), and a dashed line at each player's season average. The taller bar is the better game.
function FormChart({ sides }) {
  const top = Math.max(1, ...sides.flatMap((side) => [...side.recent.map((view) => view.pir), side.seasonPir ?? 0])) * 1.18;
  const height = (value) => `${(Math.max(0, value) / top) * 100}%`;
  const slots = Array.from({ length: WINDOW }, (_, index) => index);
  // A side with fewer games leaves the oldest slots empty, so both players' latest games share the right edge.
  const gameAt = (side, slot) => side.recent[side.recent.length - WINDOW + slot];
  const label = sides.map((side) => `${side.name}: ${side.recent.map((view) => Math.round(view.pir)).join(", ")}, season average ${formatPerGame(side.seasonPir)}`).join("; ");
  return (
    <div>
      <div role="img" aria-label={`PIR in the last ${WINDOW} games. ${label}`} className="relative mt-5 h-36 border-b border-base-300 sm:h-40">
        {sides.map((side) =>
          side.seasonPir === null ? null : <span key={side.key} aria-hidden="true" className={`absolute inset-x-0 border-t-2 border-dashed ${side.line}`} style={{ bottom: height(side.seasonPir) }} />,
        )}
        <div aria-hidden="true" className="absolute inset-0 flex items-end gap-1 sm:gap-2">
          {slots.map((slot) => (
            <div key={slot} className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
              {sides.map((side) => {
                const view = gameAt(side, slot);
                if (!view) return <span key={side.key} className="w-full max-w-7" />;
                return (
                  <span key={side.key} title={`${side.name}, ${noteOf(view)}`} className={`relative w-full max-w-7 rounded-t-sm ${side.swatch}`} style={{ height: height(view.pir), minHeight: 2 }}>
                    <span className={`absolute inset-x-[-4px] -top-4 text-center text-[10px] leading-4 font-semibold tabular-nums max-sm:hidden ${side.text}`}>{Math.round(view.pir)}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="muted mt-1 flex justify-between gap-3 text-[11px]">
        <span>Older</span>
        <span className="text-center">Bars: PIR in each game · dashed: season average</span>
        <span>Latest</span>
      </div>
    </div>
  );
}

function formSide(key, name, imageUrl, views) {
  const recent = views.slice(-WINDOW);
  const colours = key === "a" ? { swatch: "bg-primary", line: "border-primary/70", text: "text-primary" } : { swatch: "bg-accent", line: "border-accent/70", text: "text-accent" };
  return {
    key,
    name,
    imageUrl,
    views,
    recent,
    ...colours,
    seasonPts: average(views.map((view) => view.pts)),
    seasonPir: average(views.map((view) => view.pir)),
    recentPts: average(recent.map((view) => view.pts)),
    recentPir: average(recent.map((view) => view.pir)),
  };
}

// ---- Rows ----

// A compact panel's rows: the name, then each player's figure (A, then B), the better one in its player's colour.
const SPLIT_GRID = "grid grid-cols-[minmax(0,1fr)_5.25rem_5.25rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem]";
const COUNT_GRID = "grid grid-cols-[minmax(0,1fr)_4.75rem_4.75rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem]";

function RowsPanel({ label, kicker, title, names, grid, children }) {
  return (
    <Panel as="section" aria-label={label} className="h-full p-4">
      <PanelHeader compact level="h2" kicker={kicker} title={title} />
      <div aria-hidden="true" className={`${grid} muted border-b border-base-300 pb-1 text-right text-xs font-semibold`}>
        <span />
        <span className="min-w-0 wrap-break-word text-primary">{names[0]}</span>
        <span className="min-w-0 wrap-break-word text-accent">{names[1]}</span>
      </div>
      <m.ul variants={listContainer} initial="hidden" animate="show">
        {children}
      </m.ul>
    </Panel>
  );
}

function Row({ grid, label, tip, better, a, b }) {
  const cell = (content, side) => <span className={`text-right tabular-nums ${better === side ? `font-bold ${SIDE_TEXT[side]}` : "font-semibold"}`}>{content}</span>;
  return (
    <m.li variants={listItem} data-better={better ?? undefined} className={`${grid} border-b border-base-300 py-1.5 text-sm last:border-0`}>
      <span className="min-w-0 font-medium">{tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}</span>
      {cell(a, "a")}
      {cell(b, "b")}
    </m.li>
  );
}

// A split's figure: points and PIR per game, then the games it covers (from sm; below it, in the tip).
function SplitFigure({ split }) {
  if (!split.games) return "—";
  return (
    <span title={`${split.games} games`}>
      {formatPerGame(split.pts)} · {formatPerGame(split.pir)} <span className="muted text-xs font-normal max-sm:hidden">({split.games})</span>
    </span>
  );
}

function Splits({ viewsA, viewsB, names }) {
  const knowsStarts = [...viewsA, ...viewsB].every((view) => view.started !== null);
  const [rowsA, rowsB] = [splitsOf(viewsA, knowsStarts), splitsOf(viewsB, knowsStarts)];
  return (
    <RowsPanel label="Splits" kicker="SPLITS" title="By type of game" names={names} grid={SPLIT_GRID}>
      <li aria-hidden="true" className={`${SPLIT_GRID} muted pt-1 text-right text-[11px]`}>
        <span />
        <span>
          PTS · PIR<span className="max-sm:hidden"> (games)</span>
        </span>
        <span>
          PTS · PIR<span className="max-sm:hidden"> (games)</span>
        </span>
      </li>
      {rowsA.map((splitA, index) => {
        const splitB = rowsB[index];
        return (
          <Row
            key={splitA.key}
            grid={SPLIT_GRID}
            label={splitA.label}
            tip={splitA.tip}
            better={splitA.games && splitB.games ? betterOf(splitA.pir, splitB.pir) : null}
            a={<SplitFigure split={splitA} />}
            b={<SplitFigure split={splitB} />}
          />
        );
      })}
    </RowsPanel>
  );
}

function consistencyFigure(row, value) {
  if (row.kind === "count") return value.share === null ? "—" : `${value.games} · ${Math.round(value.share * 100)}%`;
  if (value === null) return "—";
  return row.kind === "spread" ? `±${value.toFixed(1)}` : formatPerGame(value);
}

function Consistency({ viewsA, viewsB, names }) {
  const [a, b] = [consistencyOf(viewsA), consistencyOf(viewsB)];
  return (
    <RowsPanel label="Consistency" kicker="CONSISTENCY" title="How reliable" names={names} grid={COUNT_GRID}>
      {CONSISTENCY_ROWS.map((row) => {
        const [valueA, valueB] = [a[row.key], b[row.key]];
        const compareBy = (value) => (row.kind === "count" ? value.share : value);
        return (
          <Row
            key={row.key}
            grid={COUNT_GRID}
            label={row.label}
            tip={row.tip}
            better={betterOf(compareBy(valueA), compareBy(valueB), row.lower)}
            a={consistencyFigure(row, valueA)}
            b={consistencyFigure(row, valueB)}
          />
        );
      })}
    </RowsPanel>
  );
}

// ---- Charts ----

function ProductionPicker({ value, onChange }) {
  return (
    <div role="group" aria-label="Production stat" className="flex flex-wrap gap-1">
      {PRODUCTION.map((stat) => (
        <button
          key={stat.key}
          type="button"
          aria-pressed={stat.key === value}
          className={`btn btn-xs max-sm:h-8 ${stat.key === value ? "btn-primary" : "btn-outline"}`}
          onClick={() => onChange(stat.key)}
        >
          {stat.label}
        </button>
      ))}
    </div>
  );
}

// How two players have been playing through the season: the last ten games against the season, how they play in different kinds of
// game and how steady they are, and their production, minutes, shooting, usage, PER and Game Score over the last ten games.
export default function ComparePlayerTrends({ seasonCode, phaseCode, entityA, entityB }) {
  const [rowA, rowB] = usePlayerRows(seasonCode, phaseCode, entityA, entityB);
  const [production, setProduction] = useState("pts");
  const gamesA = useQuery({ queryKey: ["player-games", seasonCode, entityA.id], queryFn: () => getPlayerGames(seasonCode, entityA.id, { limit: 100 }) });
  const gamesB = useQuery({ queryKey: ["player-games", seasonCode, entityB.id], queryFn: () => getPlayerGames(seasonCode, entityB.id, { limit: 100 }) });

  const viewsA = useMemo(() => phaseViews(gamesA.data?.games, phaseCode), [gamesA.data, phaseCode]);
  const viewsB = useMemo(() => phaseViews(gamesB.data?.games, phaseCode), [gamesB.data, phaseCode]);
  // The charts show each player's last WINDOW games, the latest on the right (as the form chart): a player with fewer starts later.
  const length = Math.min(WINDOW, Math.max(viewsA.length, viewsB.length));
  const labels = useMemo(() => Array.from({ length }, (_, index) => (index === length - 1 ? "Latest" : `${length - 1 - index} ago`)), [length]);
  // The legends and tooltips name the players by last name (full names when they share one).
  const [nameA, nameB] = chartNames(entityA.label, entityB.label);
  const charts = useMemo(() => {
    const recentA = viewsA.slice(-length);
    const recentB = viewsB.slice(-length);
    const line = (views, pick) => {
      const empty = Array(length - views.length).fill(null);
      return { points: [...empty, ...views.map(pick)], notes: [...empty, ...views.map(noteOf)] };
    };
    const pair = (pick) => [
      { label: nameA, ...line(recentA, pick) },
      { label: nameB, ...line(recentB, pick) },
    ];
    return {
      ...Object.fromEntries(PRODUCTION.map((stat) => [stat.key, pair((view) => view[stat.key])])),
      min: pair((view) => view.min),
      ts: pair(trueShooting),
      usage: pair(usage),
      per: pair((view) => advancedNumber(view, "gamePer")),
      gameScore: pair((view) => advancedNumber(view, "gameScore")),
    };
  }, [viewsA, viewsB, length, nameA, nameB]);

  if (gamesA.isPending || gamesB.isPending) return <AsyncState status="loading" label="Loading the trends" skeleton={<TrendsSkeleton />} />;
  if (gamesA.isError || gamesB.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load the trends."
        onRetry={() => {
          gamesA.refetch();
          gamesB.refetch();
        }}
      />
    );
  }
  if (viewsA.length < MIN_GAMES || viewsB.length < MIN_GAMES) return <EmptyText>Not enough games played in this phase to show a trend yet.</EmptyText>;

  const names = [nameA, nameB];
  const gameNote = `Each player's last ${WINDOW} games, the latest on the right. Hover or tap a point for the game.`;
  const haveAdvancedGames = [...viewsA, ...viewsB].some((view) => view.advanced);
  const productionLabel = PRODUCTION.find((stat) => stat.key === production).label;
  // Three charts a row from xl when they fill whole rows, two otherwise.
  const chartCount = 2 + (haveAdvancedGames ? 4 : 0);
  const sides = [
    formSide("a", fullName(rowA?.playerName ?? entityA.label), rowA?.playerImageUrl, viewsA),
    formSide("b", fullName(rowB?.playerName ?? entityB.label), rowB?.playerImageUrl, viewsB),
  ];
  return (
    <m.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <m.div variants={sectionItem}>
        <Panel className="p-4">
          <PlayerPairHeader compact seasonCode={seasonCode} entityA={entityA} entityB={entityB} rowA={rowA} rowB={rowB} />
        </Panel>
      </m.div>
      <m.div variants={sectionItem}>
        <Panel as="section" aria-label="Recent form" className="p-4">
          <PanelHeader compact level="h2" kicker="FORM" title={`The last ${WINDOW} games against the season`} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 sm:gap-6">
            {sides.map((side) => (
              <FormSummary key={side.key} side={side} />
            ))}
          </div>
          <FormChart sides={sides} />
        </Panel>
      </m.div>
      <m.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        <Splits viewsA={viewsA} viewsB={viewsB} names={names} />
        <Consistency viewsA={viewsA} viewsB={viewsB} names={names} />
      </m.div>
      <m.div data-charts className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${chartCount % 3 === 0 ? "xl:grid-cols-3" : "xl:grid-cols-2"}`} variants={sectionItem}>
        <LineTrend
          compact
          stretch
          kicker="PRODUCTION"
          title={productionLabel}
          note={gameNote}
          subtitle={`Last ${WINDOW} games`}
          actions={<ProductionPicker value={production} onChange={setProduction} />}
          labels={labels}
          series={charts[production]}
          markers
        />
        <LineTrend compact stretch kicker="ROLE" title="Minutes" note={gameNote} subtitle={`Last ${WINDOW} games`} labels={labels} series={charts.min} markers />
        {haveAdvancedGames ? (
          <>
            <LineTrend compact stretch kicker="EFFICIENCY" title="True shooting %" note={`${gameNote} Games without a shot are gaps.`} subtitle={`Last ${WINDOW} games`} labels={labels} series={charts.ts} markers />
            <LineTrend compact stretch kicker="LOAD" title="Usage %" note={`The share of the team's possessions the player used while on the floor. ${gameNote}`} subtitle={`Last ${WINDOW} games`} labels={labels} series={charts.usage} markers />
            <LineTrend compact stretch kicker="RATING" title="PER" note={`Player efficiency rating in each game; over a season the league average is 15. ${gameNote}`} subtitle={`Last ${WINDOW} games`} labels={labels} series={charts.per} markers />
            <LineTrend
              compact
              stretch
              kicker="OVERALL"
              title="Game Score"
              note={`A one-game box-score rating: about 10 is an average game, 40 an outstanding one. ${gameNote}`}
              subtitle={`Last ${WINDOW} games`}
              labels={labels}
              series={charts.gameScore}
              markers
            />
          </>
        ) : null}
      </m.div>
    </m.div>
  );
}
