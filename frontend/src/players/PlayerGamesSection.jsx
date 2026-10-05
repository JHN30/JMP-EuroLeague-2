import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatMinutes, formatShortDate, formatSignedDecimal } from "../lib/format";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import LabelledSelect from "../lib/LabelledSelect";
import { EASE_OUT, denseListContainer, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import { TabStrip } from "../lib/TabStrip";
import StatBarCell from "../statistics/StatBarCell";
import { barWidthScale } from "../statistics/statBarScale";
import { BAR_STATS, GAME_FILTERS, SORTS, averageOf, playedLog, seasonHighs, viewGame } from "./gameLog";

const INITIAL_ROWS = 12;
const BAR_COLUMN_REM = 2.75;
// The bar chart's fixed pieces, so the average line can be placed over it: a value above each bar, the bar area, then
// the crest and the venue icon below.
const VALUE_ROW_REM = 1.25;
const BAR_AREA_REM = 7;

function opponentName(opponent) {
  return opponent?.abbreviatedName ?? opponent?.name ?? "TBD";
}

function roundLabel(game) {
  const round = game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : null);
  if (game.phaseCode && game.phaseCode !== "RS") return [game.phaseName, round].filter(Boolean).join(" · ");
  return round ?? game.phaseName ?? "";
}

function describe(view) {
  return `${roundLabel(view.game)}: ${view.home ? "vs" : "at"} ${opponentName(view.opponent)}, ${
    view.won === null ? "" : view.won ? "won" : "lost"
  } ${view.clubScore}-${view.opponentScore}`;
}

// ---- Bars: one per game, oldest to newest, as tall as the chosen stat ----

function GameBars({ views, seasonCode }) {
  const [statKey, setStatKey] = useState("pts");
  const scrollRef = useRef(null);
  const stat = BAR_STATS.find((entry) => entry.key === statKey);

  // A season is longer than the chart is wide, so open on the latest games.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [views.length]);

  const values = views.map((view) => view[stat.key]);
  const scale = Math.max(1, ...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const best = Math.max(...values);
  const wins = views.filter((view) => view.won).length;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="GAME BY GAME"
        title="How each game went"
        trailing={
          <div className="flex flex-wrap justify-end gap-2">
            <span className="stat-badge stat-badge-neutral">
              Team {wins}-{views.length - wins}
            </span>
            <span className="stat-badge stat-badge-neutral">
              {formatDecimal(average)} {stat.short} a game
            </span>
          </div>
        }
      />
      <TabStrip
        ariaLabel="Stat to chart"
        panelId="player-games-bars"
        activeKey={statKey}
        onChange={setStatKey}
        className="mb-3 w-fit"
        tabs={BAR_STATS.map((entry) => ({ key: entry.key, label: entry.short }))}
      />
      <div id="player-games-bars" ref={scrollRef} className="overflow-x-auto overscroll-x-contain pb-1">
        <ul className="relative flex" style={{ minWidth: `${views.length * BAR_COLUMN_REM}rem` }}>
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-base-content/40"
            style={{ top: `${VALUE_ROW_REM + BAR_AREA_REM * (1 - average / scale)}rem` }}
          >
            <span className="muted absolute -top-4 left-1 bg-base-100/80 px-1 text-[0.65rem]">average {formatDecimal(average)}</span>
          </li>
          {views.map((view, index) => {
            const value = view[stat.key];
            const description = `${describe(view)}: ${formatDecimal(value, stat.digits)} ${stat.short.toLowerCase()}`;
            return (
              <li key={view.game.gameCode} className="flex min-w-0 flex-1 basis-0" style={{ maxWidth: views.length <= 12 ? "8rem" : "6rem" }}>
                <Link
                  to={`/${seasonCode}/games/${view.game.gameCode}`}
                  title={description}
                  aria-label={description}
                  className="group flex w-full flex-col items-center gap-1 rounded-field px-0.5 pb-1 transition-colors hover:bg-base-200"
                >
                  <span className={`text-xs tabular-nums ${value === best ? "font-black text-primary" : "font-semibold"}`} style={{ height: `${VALUE_ROW_REM}rem` }}>
                    {formatDecimal(value, stat.digits)}
                  </span>
                  <div className="relative flex w-full items-end justify-center" style={{ height: `${BAR_AREA_REM}rem` }}>
                    <motion.span
                      aria-hidden="true"
                      className={`w-3/5 max-w-6 rounded-t-sm opacity-90 group-hover:opacity-100 ${view.won === false ? "bg-error" : view.won ? "bg-success" : "bg-base-content/40"} ${value === best ? "ring-2 ring-primary ring-offset-1 ring-offset-base-100" : ""}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${(value / scale) * 100}%` }}
                      transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 40) * 0.015 }}
                    />
                  </div>
                  {view.opponent?.crestUrl ? (
                    <RevealImage src={view.opponent.crestUrl} className="h-5 w-5 object-contain" />
                  ) : (
                    <span className="h-5" />
                  )}
                  <HomeAwayIcon home={view.home} className="h-3.5 w-3.5 text-base-content/60" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="muted mt-2 text-xs">
        Green is a win for the player's team and red a loss; the ringed bar is the best game, and the dashed line is the average over these
        games. Each bar opens the game.
      </p>
    </Panel>
  );
}

// ---- Splits: home and away, wins and losses ----

const SPLITS = [
  { key: "home", label: "At home", test: (view) => view.home },
  { key: "away", label: "Away", test: (view) => !view.home },
  { key: "wins", label: "In wins", test: (view) => view.won === true },
  { key: "losses", label: "In losses", test: (view) => view.won === false },
];
const SPLIT_STATS = [
  { key: "pts", label: "PTS" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "pir", label: "PIR" },
];

function Splits({ views }) {
  const overall = Object.fromEntries(SPLIT_STATS.map((stat) => [stat.key, averageOf(views, stat.key)]));
  return (
    <motion.div className="grid grid-cols-2 gap-3 xl:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
      {SPLITS.map((split) => {
        const subset = views.filter(split.test);
        return (
          <motion.div key={split.key} className="rounded-box border border-base-300 bg-base-100 p-3" variants={listItem}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold">{split.label}</span>
              <span className="muted text-xs tabular-nums">{subset.length} games</span>
            </div>
            {subset.length === 0 ? (
              <p className="muted mt-2 text-sm">No games.</p>
            ) : (
              <dl className="mt-2 grid grid-cols-4 gap-1 text-center">
                {SPLIT_STATS.map((stat) => {
                  const value = averageOf(subset, stat.key);
                  const difference = value - overall[stat.key];
                  return (
                    <div key={stat.key}>
                      <dt className="muted text-[0.65rem] font-bold uppercase">{stat.label}</dt>
                      <dd className="text-lg font-bold tabular-nums">{formatDecimal(value)}</dd>
                      <dd className={`text-[0.65rem] tabular-nums ${Math.abs(difference) < 0.05 ? "muted" : difference > 0 ? "text-success" : "text-error"}`} title="Against all games">
                        {Math.abs(difference) < 0.05 ? "even" : formatSignedDecimal(difference)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ---- The game table ----

function GameTable({ views, highs, seasonCode }) {
  const [filterKey, setFilterKey] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [showAll, setShowAll] = useState(false);

  const filter = GAME_FILTERS.find((entry) => entry.key === filterKey);
  const sort = SORTS.find((entry) => entry.key === sortKey);
  const rows = useMemo(() => views.filter(filter.test).sort(sort.compare), [views, filter, sort]);
  const visible = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const ptsScale = barWidthScale(rows.map((view) => view.pts));
  const pirScale = barWidthScale(rows.map((view) => view.pir));
  const seasonSeed = views[0]?.game.gameCode;

  // A season high carries a marker, so the best games stand out in the table as well as in the chart.
  const high = (view, stat) => (view[stat] === highs[stat] && highs[stat] > 0 ? "font-bold text-primary" : "");

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="BOX SCORES" title="Every game" />
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <TabStrip
          ariaLabel="Games to show"
          panelId="player-games-table"
          activeKey={filterKey}
          onChange={(key) => {
            setFilterKey(key);
            setShowAll(false);
          }}
          className="w-fit"
          tabs={GAME_FILTERS.map((entry) => ({ key: entry.key, label: entry.label }))}
        />
        <LabelledSelect label="Sort by" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
          {SORTS.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </LabelledSelect>
        <span className="muted pb-1 text-sm">{rows.length} games</span>
      </div>

      {rows.length === 0 ? (
        <EmptyText>No games match this filter.</EmptyText>
      ) : (
        <div id="player-games-table" className="overflow-x-auto overscroll-x-contain">
          <table className="data-table-sticky table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Result</th>
                <th>MIN</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>STL</th>
                <th>TO</th>
                <th>2P</th>
                <th>3P</th>
                <th>FT</th>
                <th>PIR</th>
                <th>+/-</th>
              </tr>
            </thead>
            <motion.tbody key={`${filterKey}-${sortKey}-${seasonSeed}`} variants={denseListContainer} initial="hidden" animate="show">
              {visible.map((view) => (
                <motion.tr key={view.game.gameCode} variants={listItem}>
                  <td>
                    <div className="flex min-w-0 items-center gap-2">
                      <HomeAwayIcon home={view.home} className="h-4 w-4 text-base-content/60" />
                      {view.opponent?.crestUrl ? <RevealImage src={view.opponent.crestUrl} className="h-6 w-6 flex-none object-contain" /> : null}
                      <div className="min-w-0">
                        <Link
                          to={`/${seasonCode}/games/${view.game.gameCode}`}
                          className="link link-hover block max-w-28 truncate font-medium sm:max-w-56"
                          title={describe(view)}
                        >
                          {view.home ? "vs" : "@"} {opponentName(view.opponent)}
                        </Link>
                        <span className="muted block max-w-28 truncate text-xs whitespace-nowrap sm:max-w-none">
                          {roundLabel(view.game)} · {formatShortDate(view.game.scheduledAt)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={`badge badge-sm mr-1.5 font-bold ${view.won ? "badge-success" : view.won === false ? "badge-error" : "badge-ghost"}`}>
                      {view.won ? "W" : view.won === false ? "L" : "-"}
                    </span>
                    <span className="tabular-nums">
                      {view.clubScore}-{view.opponentScore}
                    </span>
                  </td>
                  <td className="tabular-nums">{formatMinutes(view.seconds)}</td>
                  <StatBarCell widthPct={ptsScale(view.pts)}>
                    <span className={`tabular-nums ${high(view, "pts") || "font-semibold"}`} title={high(view, "pts") ? "Season high" : undefined}>
                      {Math.round(view.pts)}
                    </span>
                  </StatBarCell>
                  <td className={`tabular-nums ${high(view, "reb")}`} title={high(view, "reb") ? "Season high" : undefined}>
                    {Math.round(view.reb)}
                  </td>
                  <td className={`tabular-nums ${high(view, "ast")}`} title={high(view, "ast") ? "Season high" : undefined}>
                    {Math.round(view.ast)}
                  </td>
                  <td className="tabular-nums">{Math.round(view.stl)}</td>
                  <td className="tabular-nums">{Math.round(view.tov)}</td>
                  <td className="tabular-nums whitespace-nowrap">{view.two}</td>
                  <td className="tabular-nums whitespace-nowrap">{view.three}</td>
                  <td className="tabular-nums whitespace-nowrap">{view.ft}</td>
                  <StatBarCell widthPct={pirScale(view.pir)}>
                    <span className={`tabular-nums ${high(view, "pir") || "font-semibold"}`} title={high(view, "pir") ? "Season high" : undefined}>
                      {Math.round(view.pir)}
                    </span>
                  </StatBarCell>
                  <td className="tabular-nums">{view.plusMinus === null ? "—" : formatSignedDecimal(view.plusMinus, 0)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
      {rows.length > INITIAL_ROWS ? (
        <div className="mt-3 flex justify-center">
          <button type="button" className="btn btn-sm" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        </div>
      ) : null}
      <p className="muted mt-3 text-xs">
        2P, 3P and FT are made over attempted. A season high in points, rebounds, assists or PIR is in colour. The bars in the PTS and PIR
        columns compare the games shown.
      </p>
    </Panel>
  );
}

// ---- The tab ----

function PhaseSwitch({ phases, activeKey, onChange }) {
  if (phases.length < 2) return null;
  return (
    <TabStrip
      ariaLabel="Phase"
      level={2}
      panelId="player-games-panel"
      activeKey={activeKey}
      onChange={onChange}
      className="w-fit"
      tabs={[{ key: "all", label: "All games" }, ...phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))]}
    />
  );
}

export default function PlayerGamesSection({ gamesQuery, seasonCode }) {
  const [phaseKey, setPhaseKey] = useState("all");

  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading the game log" />;
  if (gamesQuery.isError) {
    return <AsyncState status="error" message="Could not load the game log." onRetry={() => gamesQuery.refetch()} />;
  }
  const log = playedLog(gamesQuery.data.games ?? []);
  if (log.length === 0) return <EmptyText>No game log available yet.</EmptyText>;

  const phases = [...new Map(log.map((game) => [game.phaseCode, { code: game.phaseCode, name: game.phaseName }])).values()];
  const activePhase = phases.some((phase) => phase.code === phaseKey) ? phaseKey : "all";
  const views = log.filter((game) => activePhase === "all" || game.phaseCode === activePhase).map(viewGame);
  const highs = seasonHighs(views);

  return (
    <div id="player-games-panel" className="flex flex-col gap-4">
      <PhaseSwitch phases={phases} activeKey={activePhase} onChange={setPhaseKey} />
      <GameBars key={`bars-${activePhase}`} views={views} seasonCode={seasonCode} />
      <Splits views={views} />
      <GameTable key={`table-${activePhase}`} views={views} highs={highs} seasonCode={seasonCode} />
    </div>
  );
}
