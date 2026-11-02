import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import { PlayerGamesSkeleton } from "./PlayerPageSkeleton";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatMinutes, formatShortDate, formatSignedDecimal } from "../lib/format";
import { ADVANCED_TIPS } from "../games/AdvancedBoxScore";
import { MIN_BEST_PLAYER_SECONDS } from "../games/overview";
import HeaderTip from "../lib/HeaderTip";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import { EASE_OUT, denseListContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { TabStrip } from "../lib/TabStrip";
import { barWidthScale } from "../statistics/statBarScale";
import {
  BAR_STATS,
  GAME_FILTERS,
  SORTS,
  SPLIT_COLUMNS,
  SPLIT_ROWS,
  playedLog,
  rollingAverage,
  seasonHighGames,
  seasonHighs,
  statOver,
  viewGame,
} from "./gameLog";

const INITIAL_ROWS = 12;
// A bar's narrowest column: a long season scrolls rather than squeezing its bars; a short one stretches to the width.
const BAR_COLUMN_REM = 2.75;
// The chart's plot: its height, with a row for the value over a bar (and under one that goes below zero).
const PLOT_REM = 7.5;
const LABEL_REM = 1;
const ROLLING_GAMES = 5;

function opponentName(opponent) {
  return opponent?.abbreviatedName ?? opponent?.name ?? "TBD";
}

// The club's TV code, for the small screens where a name would be cut.
function opponentCode(opponent) {
  return opponent?.tvCode ?? opponentName(opponent);
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

const gamePath = (seasonCode, view) => `/${seasonCode}/games/${view.game.gameCode}`;

// A chart value as it reads over its bar: a rate with one decimal, a plus-minus with its sign. An average keeps one
// decimal even for a count.
function formatStat(stat, value, { average = false } = {}) {
  if (value === null) return "—";
  const digits = average ? Math.max(1, stat.digits) : stat.digits;
  return stat.signed ? formatSignedDecimal(value, digits) : formatDecimal(value, digits);
}

// ---- Season highs: his best game in each of four stats ----

const HIGH_STATS = [
  { key: "pts", short: "PTS" },
  { key: "reb", short: "REB" },
  { key: "ast", short: "AST" },
  { key: "pir", short: "PIR" },
];

function SeasonHighs({ views, seasonCode }) {
  const games = seasonHighGames(views);
  return (
    <Panel as="section" aria-labelledby="player-games-highs" className="flex flex-col p-3 sm:p-4">
      <h2 id="player-games-highs" className="micro-label mb-2">
        Season highs
      </h2>
      {/* Two by two, then one column beside the splits from lg, as tall as they are. */}
      <ul className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-1">
        {HIGH_STATS.map((stat) => {
          const view = games[stat.key];
          const body = (
            <>
              <span className={`w-10 flex-none text-2xl font-black tabular-nums ${view ? "text-primary" : "muted"}`}>{view ? Math.round(view[stat.key]) : "—"}</span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">{stat.short}</span>
                {view ? (
                  <span className="muted block truncate text-xs">
                    {view.home ? "vs" : "@"} {opponentCode(view.opponent)}
                    <span className="max-sm:hidden"> · {formatShortDate(view.game.scheduledAt)}</span>
                  </span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={stat.key} className="min-w-0">
              {view ? (
                <Link
                  to={gamePath(seasonCode, view)}
                  aria-label={`${Math.round(view[stat.key])} ${stat.short}, the season high: ${describe(view)}`}
                  className="flex h-full items-center gap-2 rounded-field border border-base-300 px-3 py-2 transition-colors hover:bg-base-200"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex h-full items-center gap-2 rounded-field border border-base-300 px-3 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
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
  const present = values.filter((value) => value !== null);
  const average = statOver(views, stat);
  const rolling = views.length >= ROLLING_GAMES ? rollingAverage(views, stat, ROLLING_GAMES) : [];
  const best = present.length > 0 ? Math.max(...present) : null;
  const wins = views.filter((view) => view.won).length;

  // The plot runs from the highest value down to zero, or below it when a value is negative (a plus-minus).
  const high = Math.max(0, ...present);
  const low = Math.min(0, ...present);
  const range = high - low || 1;
  const bottomRow = low < 0 ? LABEL_REM : 0;
  const plot = PLOT_REM - LABEL_REM - bottomRow;
  const y = (value) => LABEL_REM + (plot * (high - value)) / range;
  const zero = y(0);
  const rollingPoints = rolling
    .map((value, index) => (value === null ? null : `${index + 0.5},${(y(value) * 100).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  const badges = (
    <>
      <span className="stat-badge stat-badge-neutral">
        Team {wins}-{views.length - wins}
      </span>
      <span className="stat-badge stat-badge-neutral">
        {stat.percent ? `${stat.short} ${formatStat(stat, average)}` : `${formatStat(stat, average, { average: true })} ${stat.short} a game`}
      </span>
    </>
  );

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="GAME BY GAME"
        title="How each game went"
        trailing={<div className="flex flex-wrap justify-end gap-2 max-sm:hidden">{badges}</div>}
      />
      {/* Below sm the badges sit under the title, where they have the panel's whole width; the other copy is hidden then. */}
      <div className="-mt-2 mb-3 flex flex-wrap gap-2 sm:hidden">{badges}</div>
      <TabStrip
        ariaLabel="Stat to chart"
        panelId="player-games-bars"
        activeKey={statKey}
        onChange={setStatKey}
        scrolling
        className="mb-3 w-fit max-w-full"
        tabs={BAR_STATS.map((entry) => ({ key: entry.key, label: entry.short }))}
      />
      <div id="player-games-bars" ref={scrollRef} className="overflow-x-auto overscroll-x-contain pb-1">
        <ul className="relative flex" style={{ minWidth: `${views.length * BAR_COLUMN_REM}rem` }}>
          {low < 0 ? (
            <li aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 border-t border-base-content/50" style={{ top: `${zero}rem` }} />
          ) : null}
          {average === null ? null : (
            <li
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-base-content/40"
              style={{ top: `${y(average)}rem` }}
            >
              <span className="muted absolute -top-4 left-1 bg-base-100/80 px-1 text-[0.65rem]">average {formatStat(stat, average, { average: true })}</span>
            </li>
          )}
          {rollingPoints ? (
            <li aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10" style={{ height: `${PLOT_REM}rem` }}>
              <svg className="h-full w-full overflow-visible text-primary" viewBox={`0 0 ${views.length} ${PLOT_REM * 100}`} preserveAspectRatio="none">
                <polyline points={rollingPoints} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </li>
          ) : null}
          {views.map((view, index) => {
            const value = view[stat.key];
            const description = `${describe(view)}: ${formatStat(stat, value)} ${stat.short}`;
            const negative = value !== null && value < 0;
            const colour = view.won === false ? "bg-error" : view.won ? "bg-success" : "bg-base-content/40";
            return (
              <li key={view.game.gameCode} className="flex min-w-0 flex-1 basis-0">
                <Link
                  to={gamePath(seasonCode, view)}
                  title={description}
                  aria-label={description}
                  className="group flex w-full flex-col items-center gap-1.5 rounded-field px-0.5 pb-1 transition-colors hover:bg-base-200"
                >
                  <div className="relative w-full" style={{ height: `${PLOT_REM}rem` }}>
                    <span
                      className={`absolute inset-x-0 text-center text-xs leading-4 tabular-nums ${value !== null && value === best ? "font-black text-primary" : "font-semibold"} ${value === null ? "muted" : ""}`}
                      style={{ top: `${value === null ? zero - LABEL_REM : negative ? y(value) : y(value) - LABEL_REM}rem` }}
                    >
                      {formatStat(stat, value)}
                    </span>
                    {value === null ? null : (
                      <motion.span
                        aria-hidden="true"
                        className={`absolute left-1/2 w-3/5 max-w-10 -translate-x-1/2 opacity-90 group-hover:opacity-100 ${negative ? "rounded-b-sm" : "rounded-t-sm"} ${colour} ${
                          value === best ? "ring-2 ring-primary ring-offset-1 ring-offset-base-100" : ""
                        }`}
                        style={negative ? { top: `${zero}rem` } : { bottom: `${PLOT_REM - zero}rem` }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.abs(y(value) - zero)}rem` }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 40) * 0.015 }}
                      />
                    )}
                  </div>
                  {/* The opponent's crest, with home or away marked on its corner. */}
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    {view.opponent?.crestUrl ? (
                      <RevealImage src={view.opponent.crestUrl} className="h-5 w-5 object-contain" />
                    ) : (
                      <span className="text-[0.55rem] font-bold">{opponentCode(view.opponent)}</span>
                    )}
                    <span className="absolute -right-2 -bottom-1 rounded-full bg-base-100 p-px">
                      <HomeAwayIcon home={view.home} className="h-2.5 w-2.5 text-base-content/70" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="muted mt-2 text-xs">
        Green is a win for the player's team and red a loss; the ringed bar is the best game. The dashed line is the average over these games
        {rollingPoints ? ` and the solid line the average of the last ${ROLLING_GAMES} games` : ""}. Each bar opens the game.
        {stat.percent ? " FG% is made over attempted twos and threes; a game without an attempt has no bar." : ""}
      </p>
    </Panel>
  );
}

// ---- Splits: per game in each situation, against all the games ----

function SplitTable({ views }) {
  const overall = Object.fromEntries(SPLIT_COLUMNS.map((column) => [column.key, statOver(views, column)]));
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="SPLITS" title="Per game, by situation" />
      <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Splits, per game" tabIndex={0}>
        <table className="data-table-sticky table table-sm">
          <thead>
            <tr>
              <th>Games</th>
              <th className="text-right">GP</th>
              {SPLIT_COLUMNS.map((column) => (
                <th key={column.key} className="text-right">
                  {column.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPLIT_ROWS.map((row) => {
              const subset = row.pick(views);
              const all = row.key === "all";
              return (
                <tr key={row.key} className={all ? "font-semibold" : undefined}>
                  <td className="whitespace-nowrap">{row.label}</td>
                  <td className="text-right tabular-nums">{subset.length}</td>
                  {SPLIT_COLUMNS.map((column) => {
                    const value = subset.length === 0 ? null : statOver(subset, column);
                    const difference = value === null || overall[column.key] === null ? null : value - overall[column.key];
                    const tint = all || difference === null || Math.abs(difference) < column.clear ? "" : difference > 0 ? "text-success" : "text-error";
                    return (
                      <td
                        key={column.key}
                        className={`text-right tabular-nums ${tint}`}
                        title={all || difference === null ? undefined : `${formatSignedDecimal(difference)} against all games`}
                      >
                        {value === null ? "—" : formatDecimal(value, column.digits)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted mt-2 text-xs">
        Per game. Green is clearly above all games and red clearly below. Started and Off the bench count the games the feed marks.
      </p>
    </Panel>
  );
}

// ---- The game table ----

// A number with a thin bar under it, scaled to the games shown (the bar only from 640px).
function BarNumber({ value, widthPct, className, title }) {
  return (
    <td className="tabular-nums" title={title}>
      <span className={className}>{Math.round(value)}</span>
      {widthPct === null ? null : (
        <span aria-hidden="true" className="bar-line mt-1 block h-0.5 w-10 rounded-full bg-base-300 max-sm:hidden">
          <span className="block h-full rounded-full bg-primary/80" style={{ width: `${widthPct}%` }} />
        </span>
      )}
    </td>
  );
}

// The advanced view's columns, read from each game's pipeline row (percentages are fractions), with the game page's tips.
const ADVANCED_COLUMNS = [
  { key: "gameScore", label: "GmSc", format: (value) => formatDecimal(value) },
  { key: "gamePer", label: "PER", format: (value) => formatDecimal(value) },
  { key: "trueShootingPct", label: "TS%", format: formatFractionPercent },
  { key: "efgPct", label: "eFG%", format: formatFractionPercent },
  { key: "usagePct", label: "USG%", format: formatFractionPercent },
  { key: "assistPct", label: "AST%", format: formatFractionPercent },
  { key: "tovPct", label: "TOV%", format: formatFractionPercent },
  { key: "orbPct", label: "ORB%", format: formatFractionPercent },
  { key: "drbPct", label: "DRB%", format: formatFractionPercent },
  { key: "stealPct", label: "STL%", format: formatFractionPercent },
  { key: "blockPct", label: "BLK%", format: formatFractionPercent },
];

// One advanced cell: a dash without the season's advanced numbers, and the game PER only from 10 minutes (as on the
// game page).
function AdvancedCell({ view, column, best }) {
  const advanced = view.advanced;
  const raw = advanced?.[column.key] ?? null;
  const shortGame = column.key === "gamePer" && raw !== null && (advanced.secondsPlayed ?? 0) < MIN_BEST_PLAYER_SECONDS;
  const value = shortGame ? null : raw;
  return (
    <td
      className={`tabular-nums ${best ? "font-bold text-primary" : ""}`}
      title={shortGame ? "Game PER is shown from 10 minutes played" : best ? "Best game score shown" : undefined}
    >
      {column.format(value)}
    </td>
  );
}

function GameTable({ views, highs, seasonCode }) {
  const [filterKey, setFilterKey] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [showAll, setShowAll] = useState(false);
  // Keys of their own: a tab's id comes from its key, and the page's tabs already have an "advanced" one.
  const [boxKey, setBoxKey] = useState("basic-numbers");
  // Seasons before the advanced pipeline have no advanced numbers, so the switch is only offered when a game has them.
  const hasAdvanced = views.some((view) => view.advanced);
  const advancedView = hasAdvanced && boxKey === "advanced-numbers";

  const filter = GAME_FILTERS.find((entry) => entry.key === filterKey);
  const sort = SORTS.find((entry) => entry.key === sortKey);
  const rows = useMemo(() => views.filter(filter.test).sort(sort.compare), [views, filter, sort]);
  const visible = showAll ? rows : rows.slice(0, INITIAL_ROWS);
  const ptsScale = barWidthScale(rows.map((view) => view.pts));
  const pirScale = barWidthScale(rows.map((view) => view.pir));
  const seasonSeed = views[0]?.game.gameCode;

  // A season high carries a marker, so the best games stand out in the table as well as in the chart.
  const high = (view, stat) => (view[stat] === highs[stat] && highs[stat] > 0 ? "font-bold text-primary" : "");
  const bestGameScore = Math.max(...rows.map((view) => view.advanced?.gameScore ?? -Infinity));

  return (
    <Panel as="section" className="p-4">
      {/* The panel heading with the filter, the sort and the count beside it, under it when they do not fit. */}
      <div className="panel-header flex-wrap">
        <div>
          <p className="eyebrow mb-1">BOX SCORES</p>
          <h2 className="panel-title">Every game</h2>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-2">
          {hasAdvanced ? (
            <TabStrip
              ariaLabel="Box score numbers"
              panelId="player-games-table"
              activeKey={boxKey}
              onChange={setBoxKey}
              className="w-fit"
              tabs={[
                { key: "basic-numbers", label: "Basic" },
                { key: "advanced-numbers", label: "Advanced" },
              ]}
            />
          ) : null}
          <TabStrip
            ariaLabel="Games to show"
            panelId="player-games-table"
            activeKey={filterKey}
            onChange={(key) => {
              setFilterKey(key);
              setShowAll(false);
            }}
            scrolling
            className="w-fit max-w-full"
            tabs={GAME_FILTERS.map((entry) => ({ key: entry.key, label: entry.label }))}
          />
          <select aria-label="Sort by" className="select select-bordered select-sm w-auto" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {SORTS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          <span className="muted text-sm whitespace-nowrap">{rows.length} games</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyText>No games match this filter.</EmptyText>
      ) : (
        <div id="player-games-table" className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Every game, box scores" tabIndex={0}>
          <table className="data-table-sticky table max-sm:table-sm">
            <thead>
              <tr>
                <th className="max-sm:px-2">Opponent</th>
                <th>Result</th>
                <th>MIN</th>
                {advancedView ? (
                  ADVANCED_COLUMNS.map((column) => (
                    <th key={column.key}>
                      <HeaderTip tip={ADVANCED_TIPS[column.label]}>{column.label}</HeaderTip>
                    </th>
                  ))
                ) : (
                  <>
                    <th>PTS</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>TO</th>
                    <th>FG</th>
                    <th>2P</th>
                    <th>3P</th>
                    <th>FT</th>
                    <th>PF</th>
                    <th>FD</th>
                    <th>PIR</th>
                    <th>+/-</th>
                  </>
                )}
              </tr>
            </thead>
            <motion.tbody key={`${filterKey}-${sortKey}-${boxKey}-${seasonSeed}`} variants={denseListContainer} initial="hidden" animate="show">
              {visible.map((view) => (
                <motion.tr key={view.game.gameCode} variants={listItem}>
                  <td className="max-sm:px-2">
                    <div className="flex min-w-0 items-center gap-2 max-sm:gap-1.5">
                      <HomeAwayIcon home={view.home} className="h-4 w-4 text-base-content/60" />
                      {view.opponent?.crestUrl ? <RevealImage src={view.opponent.crestUrl} className="h-6 w-6 flex-none object-contain max-sm:hidden" /> : null}
                      <div className="min-w-0">
                        {/* The start mark sits after the opponent, whose line is short on a phone (a TV code). */}
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Link to={gamePath(seasonCode, view)} className="link link-hover block max-w-28 truncate font-medium sm:max-w-56" title={describe(view)}>
                            {view.home ? "vs" : "@"} <ShortLabel short={opponentCode(view.opponent)} full={opponentName(view.opponent)} />
                          </Link>
                          {view.started ? (
                            <span className="relative flex-none text-[0.65rem] font-black text-primary" title="Started">
                              <span aria-hidden="true">S</span>
                              <span className="sr-only">Started</span>
                            </span>
                          ) : null}
                        </div>
                        <span className="muted relative block max-w-28 truncate text-xs whitespace-nowrap sm:max-w-none">
                          <span className="max-sm:sr-only">{roundLabel(view.game)} · </span>
                          {formatShortDate(view.game.scheduledAt)}
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
                  {advancedView ? (
                    ADVANCED_COLUMNS.map((column) => (
                      <AdvancedCell
                        key={column.key}
                        view={view}
                        column={column}
                        best={column.key === "gameScore" && view.advanced?.gameScore != null && view.advanced.gameScore === bestGameScore}
                      />
                    ))
                  ) : (
                    <>
                      <BarNumber value={view.pts} widthPct={ptsScale(view.pts)} className={high(view, "pts") || "font-semibold"} title={high(view, "pts") ? "Season high" : undefined} />
                      <td className="tabular-nums whitespace-nowrap" title={`${Math.round(view.oreb)} offensive, ${Math.round(view.dreb)} defensive`}>
                        <span className={high(view, "reb")}>{Math.round(view.reb)}</span>
                        <span className="muted block text-[0.65rem]">
                          {Math.round(view.oreb)}+{Math.round(view.dreb)}
                        </span>
                      </td>
                      <td className={`tabular-nums ${high(view, "ast")}`} title={high(view, "ast") ? "Season high" : undefined}>
                        {Math.round(view.ast)}
                      </td>
                      <td className="tabular-nums">{Math.round(view.stl)}</td>
                      <td className="tabular-nums">{Math.round(view.blk)}</td>
                      <td className="tabular-nums">{Math.round(view.tov)}</td>
                      <td className="tabular-nums whitespace-nowrap">
                        {view.fgm}/{view.fga}
                        <span className="muted block text-[0.65rem]">{view.fgPct === null ? "—" : `${formatDecimal(view.fgPct)}%`}</span>
                      </td>
                      <td className="tabular-nums whitespace-nowrap">{view.two}</td>
                      <td className="tabular-nums whitespace-nowrap">{view.three}</td>
                      <td className="tabular-nums whitespace-nowrap">{view.ft}</td>
                      <td className="tabular-nums">{Math.round(view.pf)}</td>
                      <td className="tabular-nums">{Math.round(view.fd)}</td>
                      <BarNumber value={view.pir} widthPct={pirScale(view.pir)} className={high(view, "pir") || "font-semibold"} title={high(view, "pir") ? "Season high" : undefined} />
                      <td className="tabular-nums">{view.plusMinus === null ? "—" : formatSignedDecimal(view.plusMinus, 0)}</td>
                    </>
                  )}
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
      {advancedView ? (
        <p className="muted mt-3 text-xs">
          Each game&apos;s advanced numbers; the percentages are shares of the plays while he was on the court (each heading explains its
          own). The best game score shown is in colour, and the game PER counts from 10 minutes. S marks a start; a dash is a number the
          game does not have.
        </p>
      ) : (
        <p className="muted mt-3 text-xs">
          FG, 2P, 3P and FT are made over attempted; REB is offensive + defensive under it; BLK blocks, PF fouls and FD fouls drawn. S marks
          a start. A season high in points, rebounds, assists or PIR is in colour.{" "}
          <span className="max-sm:hidden">The lines under PTS and PIR compare the games shown.</span>
        </p>
      )}
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
      scrolling
      className="w-fit"
      tabs={[{ key: "all", label: "All games" }, ...phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))]}
    />
  );
}

export default function PlayerGamesSection({ gamesQuery, seasonCode }) {
  const [phaseKey, setPhaseKey] = useState("all");

  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading the game log" skeleton={<PlayerGamesSkeleton />} />;
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
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <SeasonHighs views={views} seasonCode={seasonCode} />
        <SplitTable views={views} />
      </div>
      <GameBars key={`bars-${activePhase}`} views={views} seasonCode={seasonCode} />
      <GameTable key={`table-${activePhase}`} views={views} highs={highs} seasonCode={seasonCode} />
    </div>
  );
}
