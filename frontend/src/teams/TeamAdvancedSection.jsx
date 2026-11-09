import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getAdvancedStandings, getGameFlow, getTeamAdvanced, getTeamLineups, getTeamPlayersAdvanced } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { LeagueProfileSkeleton, LineupRowsSkeleton, TeamAdvancedSkeleton } from "./TeamPageSkeleton";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import { barFill, EASE_OUT, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { displayName, nameParts } from "../lib/playerName";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import RatingsChart from "./RatingsChart";
import {
  FLOW_RANKS,
  FOUR_FACTOR_GROUPS,
  leagueAverage,
  leagueBest,
  leaguePosition,
  SHOOTING_PASSING_ROWS,
  STRENGTH_GROUPS,
  STRENGTH_TILES,
  withDerivedFlow,
  withDerivedStrength,
} from "./teamAdvancedDefs";
import { ordinal, rankOf, rankTier } from "./teamLeague";
import { fetchTeamRosterStats } from "./teamRosterStats";

const SCOPE_LABELS = { RS: "Regular season", TS: "Top 16", all: "All games", PS: "Postseason" };
const EM_DASH = "—";

const LINEUP_TABS = [
  { key: "5", label: "5-man" },
  { key: "3", label: "3-man" },
  { key: "2", label: "2-man" },
];
// 100 possessions is the sample worth showing; where no lineup of a size has reached it yet, "auto" falls back to 50.
const TARGET_POSSESSIONS = 100;
const FALLBACK_POSSESSIONS = 50;
const MINIMUM_CHOICES = [50, 100, 200, 300];
const LINEUP_LIMIT = 10;

function ratio(numerator, denominator) {
  if (numerator === null || numerator === undefined || !denominator) return null;
  return numerator / denominator;
}

const signedTone = (value) => (value === null || value === undefined ? "" : value >= 0 ? "text-success" : "text-error");

// A bar from the middle: green to the right for a positive value, red to the left for a negative one. `maxAbs` is the
// value that fills a half, so bars in one group share a scale.
function DivergingBar({ value, maxAbs }) {
  const half = value === null || value === undefined ? 0 : Math.min(50, (Math.abs(value) / maxAbs) * 50);
  const positive = (value ?? 0) >= 0;
  return (
    <div aria-hidden="true" className="relative h-2 w-full overflow-hidden rounded-full bg-base-300">
      <motion.div
        className={`absolute inset-y-0 rounded-full ${positive ? "bg-success" : "bg-error"}`}
        style={positive ? { left: "50%" } : { right: "50%" }}
        initial={{ width: 0 }}
        animate={{ width: `${half}%` }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
      />
      <span className="absolute inset-y-0 left-1/2 w-px bg-base-content/40" />
    </div>
  );
}

// The ratings chart: each round's own offensive and defensive rating, the season averages (the cumulative values after the last round)
// as dashed lines, and the same averages as figures under it.
function RatingsCard({ trend }) {
  const rows = trend.filter((point) => point.offensiveRating !== null && point.defensiveRating !== null);
  const latest = rows.at(-1);
  const played = trend.filter((point) => point.roundOffensiveRating !== null && point.roundDefensiveRating !== null);
  const chart = useMemo(
    () => ({
      rounds: trend.map((point) => `R${point.round}`),
      offense: trend.map((point) => (point.roundOffensiveRating === null ? null : Number(point.roundOffensiveRating.toFixed(1)))),
      defense: trend.map((point) => (point.roundDefensiveRating === null ? null : Number(point.roundDefensiveRating.toFixed(1)))),
      games: trend.map((point) => point.roundGames),
      averages: latest ? { offense: Number(latest.offensiveRating.toFixed(1)), defense: Number(latest.defensiveRating.toFixed(1)) } : null,
    }),
    [trend, latest],
  );
  const netBadge = latest ? (
    <span className={`stat-badge ${latest.netRating >= 0 ? "stat-badge-positive" : "stat-badge-negative"}`}>
      Season net {formatSignedDecimal(latest.netRating)} after R{latest.round}
    </span>
  ) : null;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        compact
        kicker="RATINGS"
        title="Offense and defense through the season"
        trailing={netBadge ? <div className="max-sm:hidden">{netBadge}</div> : null}
      />
      {/* Below sm the badge sits under the title, where the title has the panel's whole width; the other copy is hidden then. */}
      {netBadge ? <div className="-mt-2 mb-3 sm:hidden">{netBadge}</div> : null}
      {played.length < 2 || !chart.averages ? (
        <EmptyText>Not enough rounds played yet to chart the ratings.</EmptyText>
      ) : (
        <>
          <RatingsChart rounds={chart.rounds} offense={chart.offense} defense={chart.defense} games={chart.games} averages={chart.averages} />
          <p className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm" data-testid="ratings-averages">
            <span className="muted text-xs font-bold tracking-wide uppercase">Season average</span>
            <span>
              Offense <b className="tabular-nums">{formatDecimal(latest.offensiveRating)}</b>
            </span>
            <span>
              Defense <b className="tabular-nums">{formatDecimal(latest.defensiveRating)}</b>
            </span>
            <span>
              Net <b className={`tabular-nums ${signedTone(latest.netRating)}`}>{formatSignedDecimal(latest.netRating)}</b>
            </span>
            <span className="muted">over {latest.gamesPlayed === 1 ? "1 game" : `${latest.gamesPlayed} games`}</span>
          </p>
          <p className="muted mt-2 text-sm">
            Per 100 possessions; dashed lines are the season averages, and the shaded gap is each round&apos;s net rating (green
            ahead, red behind).
          </p>
        </>
      )}
    </Panel>
  );
}

// A club's league rank ("4th"), tinted by third unless the stat has no better direction; "of N" for screen readers.
function RankText({ standing, direction, className = "" }) {
  if (!standing) return <span className={`muted ${className}`}>{EM_DASH}</span>;
  const tone = direction === "neutral" ? "muted" : rankTier(standing).text;
  return (
    <span className={`font-bold tabular-nums ${tone} ${className}`} title={`${ordinal(standing.rank)} of ${standing.of}`}>
      {ordinal(standing.rank)}
      <span className="sr-only"> of {standing.of}</span>
    </span>
  );
}

const rankFor = (rows, clubCode, row) => rankOf(rows, clubCode, row.field, row.direction !== "lower");

// The league's advanced standings for the tab's scope, the club's row in them and whether its schedule-based figures
// mean anything yet. Rows carry the derived fields the tables rank.
function useLeagueRows(standingsQuery, clubCode) {
  return useMemo(() => {
    const rows = (standingsQuery.data?.standings ?? []).map(withDerivedStrength);
    const own = rows.find((row) => row.clubCode === clubCode) ?? null;
    // Before every club is linked by the games, the schedule-based figures are blanked for every club, so no rank is
    // drawn from them either.
    const usable = rows.map((row) => (row.connected ? row : { ...row, ...blankConnected() }));
    return { rows: usable, own: own && (own.connected ? own : { ...own, ...blankConnected() }), connected: Boolean(own?.connected) };
  }, [standingsQuery.data, clubCode]);
}

const CONNECTED_FIELDS = [...new Set([...STRENGTH_TILES, ...STRENGTH_GROUPS.flatMap((group) => group.rows)].filter((row) => row.connected).map((row) => row.field))];
function blankConnected() {
  return Object.fromEntries(CONNECTED_FIELDS.map((field) => [field, null]));
}

function LeagueState({ standingsQuery, children }) {
  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading the league comparison" skeleton={<LeagueProfileSkeleton />} />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load the league comparison." onRetry={() => standingsQuery.refetch()} />;
  }
  return children;
}

function StrengthTile({ tile, own, rows, clubCode }) {
  const standing = rankFor(rows, clubCode, tile);
  return (
    <Panel className="p-3 sm:p-4">
      <span className="eyebrow">
        <HeaderTip tip={tile.tip}>{tile.label}</HeaderTip>
      </span>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-black tracking-tight tabular-nums sm:text-3xl ${tile.direction === "neutral" ? "" : signedTone(own[tile.field])}`}>
          {tile.format(own[tile.field])}
        </span>
        {standing ? (
          <span className="text-sm">
            <RankText standing={standing} direction={tile.direction} /> <span className="muted text-xs">of {standing.of}</span>
          </span>
        ) : null}
      </div>
    </Panel>
  );
}

const ZERO_SUM_TIP = "Zero for the league as a whole: this measures clubs against each other, so their figures cancel out";

// The league average of a row: a muted 0 with its reason for the figures that measure clubs against each other.
function LeagueAverageCell({ row, leagueRows }) {
  if (row.zeroSum) {
    return (
      <HeaderTip tip={ZERO_SUM_TIP}>
        <span className="tabular-nums">0</span>
      </HeaderTip>
    );
  }
  return row.format(leagueAverage(leagueRows, row.field));
}

// The club's value, its league rank, the league average and the league's best, one row per stat.
function LeagueTable({ title, rows: defs, leagueRows, own, clubCode }) {
  return (
    <div className="min-w-0">
      <h3 className="eyebrow mb-1">{title}</h3>
      <table className="table table-sm w-full [&_td]:px-1.5 [&_th]:px-1.5">
        <thead>
          <tr>
            <th>Stat</th>
            <th className="text-right">Value</th>
            <th className="text-right">Rank</th>
            <th className="text-right">
              <HeaderTip tip="The average of the stage's clubs">League</HeaderTip>
            </th>
            <th className="text-right max-sm:hidden">
              <HeaderTip tip="The league's best figure: the lowest where lower is better, the highest for pace and schedule">Best</HeaderTip>
            </th>
          </tr>
        </thead>
        <tbody>
          {defs.map((row) => {
            const valued = own[row.field] !== null && own[row.field] !== undefined;
            return (
              <tr key={row.field}>
                <td>
                  <HeaderTip tip={row.tip}>{row.label}</HeaderTip>
                </td>
                <td className="text-right font-semibold tabular-nums whitespace-nowrap">{row.format(own[row.field])}</td>
                <td className="text-right">
                  <RankText standing={rankFor(leagueRows, clubCode, row)} direction={row.direction} />
                </td>
                <td className="muted text-right tabular-nums whitespace-nowrap">{valued ? <LeagueAverageCell row={row} leagueRows={leagueRows} /> : EM_DASH}</td>
                <td className="muted text-right tabular-nums whitespace-nowrap max-sm:hidden">
                  {valued ? row.format(leagueBest(leagueRows, row.field, row.direction)) : EM_DASH}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StrengthSection({ standingsQuery, clubCode }) {
  const { rows, own, connected } = useLeagueRows(standingsQuery, clubCode);
  return (
    <section>
      <PanelHeader compact kicker="STRENGTH" title="How strong the team is" />
      <LeagueState standingsQuery={standingsQuery}>
        {!own ? (
          <EmptyText>No league comparison for this club in this stage yet.</EmptyText>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {STRENGTH_TILES.map((tile) => (
                <StrengthTile key={tile.field} tile={tile} own={own} rows={rows} clubCode={clubCode} />
              ))}
            </div>
            <Panel className="mt-3 p-3 sm:p-4">
              <div className="grid gap-6 xl:grid-cols-3 xl:gap-8">
                {STRENGTH_GROUPS.map((group) => (
                  <LeagueTable key={group.title} title={group.title} rows={group.rows} leagueRows={rows} own={own} clubCode={clubCode} />
                ))}
              </div>
            </Panel>
            <p className="muted mt-2 text-xs">
              After round {standingsQuery.data.round}, against the {rows.length} clubs of the stage. Ratings are per 100 possessions;
              the league column is the clubs&apos; average.
              {connected
                ? ""
                : " SRS, the schedule figures and the adjusted ratings appear once the games played link every club to every other."}
            </p>
          </>
        )}
      </LeagueState>
    </section>
  );
}

function FactorRow({ row, leagueRows, own, clubCode }) {
  const standing = rankFor(leagueRows, clubCode, row);
  const position = leaguePosition(leagueRows, clubCode, row.field, row.direction);
  const tier = standing ? rankTier(standing) : null;
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <HeaderTip tip={row.tip}>{row.label}</HeaderTip>
        <span className="flex items-baseline gap-2">
          <span className="font-semibold tabular-nums">{row.format(own[row.field])}</span>
          <RankText standing={standing} direction={row.direction} className="w-10 text-right text-xs" />
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        {/* From the league's worst on the left to its best on the right. */}
        <div aria-hidden="true" className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-base-300">
          {position === null ? null : (
            <motion.div className={`h-full origin-left rounded-full ${tier?.bar ?? "bg-base-content/40"}`} style={{ width: `${Math.max(4, position * 100)}%` }} {...barFill} />
          )}
        </div>
        <span className="muted w-24 flex-none text-right text-xs tabular-nums">League {row.format(leagueAverage(leagueRows, row.field))}</span>
      </div>
    </li>
  );
}

function FourFactorsSection({ standingsQuery, clubCode }) {
  const { rows, own } = useLeagueRows(standingsQuery, clubCode);
  return (
    <section>
      <PanelHeader compact kicker="FOUR FACTORS" title="What wins possessions, at both ends" />
      <LeagueState standingsQuery={standingsQuery}>
        {!own ? (
          <EmptyText>No league comparison for this club in this stage yet.</EmptyText>
        ) : (
          <Panel className="p-3 sm:p-4">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
              {FOUR_FACTOR_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="eyebrow">{group.title}</h3>
                  <ul className="divide-y divide-base-300">
                    {group.rows.map((row) => (
                      <FactorRow key={row.field} row={row} leagueRows={rows} own={own} clubCode={clubCode} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-base-300 pt-2">
              <h3 className="eyebrow">Shooting and passing</h3>
              <ul className="grid divide-y divide-base-300 lg:grid-cols-2 lg:gap-x-10 lg:divide-y-0">
                {SHOOTING_PASSING_ROWS.map((row) => (
                  <FactorRow key={row.field} row={row} leagueRows={rows} own={own} clubCode={clubCode} />
                ))}
              </ul>
            </div>
          </Panel>
        )}
      </LeagueState>
      <p className="muted mt-2 text-xs">Each bar runs from the league&apos;s worst on the left to its best on the right.</p>
    </section>
  );
}

const SPLITS = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last5", label: "Last 5" },
  { key: "last10", label: "Last 10" },
];

function splitOf(splits, key) {
  return {
    games: splits[`${key}Games`],
    wins: splits[`${key}Wins`],
    mov: splits[`${key}Mov`],
    ortg: splits[`${key}OffensiveRating`],
    drtg: splits[`${key}DefensiveRating`],
    net: splits[`${key}NetRating`],
    pace: splits[`${key}Pace`],
  };
}

function SplitRow({ label, split, maxAbs, season = null, reference = false }) {
  const { games, wins, mov, ortg, drtg, net, pace } = split;
  const played = games > 0;
  const versus = played && season && net !== null && season.net !== null ? net - season.net : null;
  const cell = (value) => (played ? value : EM_DASH);
  return (
    <tr className={reference ? "bg-base-200/60 font-semibold" : undefined}>
      <td>
        <span className={reference ? "eyebrow" : ""}>{label}</span>
        {/* Below sm the four ratings columns are hidden; they sit under the split's name instead. */}
        {played ? (
          <span className="muted block text-xs font-normal tabular-nums sm:hidden">
            ORtg {formatDecimal(ortg)} · DRtg {formatDecimal(drtg)} · Pace {formatDecimal(pace)} · MOV {formatSignedDecimal(mov)}
          </span>
        ) : null}
      </td>
      <td className="text-right tabular-nums">{games}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{cell(`${wins}-${games - wins}`)}</td>
      <td className="text-right tabular-nums max-sm:hidden">{cell(formatSignedDecimal(mov))}</td>
      <td className="text-right tabular-nums max-sm:hidden">{cell(formatDecimal(ortg))}</td>
      <td className="text-right tabular-nums max-sm:hidden">{cell(formatDecimal(drtg))}</td>
      <td className="text-right tabular-nums max-sm:hidden">{cell(formatDecimal(pace))}</td>
      <td className="w-[38%] sm:w-[30%]">
        {played ? (
          <div className="flex items-center gap-2">
            <span className={`w-12 flex-none text-right font-bold tabular-nums ${signedTone(net)}`}>{formatSignedDecimal(net)}</span>
            <div className="min-w-0 flex-1">
              <DivergingBar value={net} maxAbs={maxAbs} />
              {versus === null ? null : <span className="muted mt-0.5 block text-xs font-normal tabular-nums">{formatSignedDecimal(versus)} vs season</span>}
            </div>
          </div>
        ) : (
          <span className="muted">{EM_DASH}</span>
        )}
      </td>
    </tr>
  );
}

// The season and its four splits as one table, so each split reads against the season row. The season comes from the
// club's advanced standings row; without it the table shows the splits alone.
function SplitsTable({ splits, own }) {
  if (!splits) return null;
  const season = own
    ? { games: own.gamesPlayed, wins: own.wins, mov: own.mov, ortg: own.offensiveRating, drtg: own.defensiveRating, net: own.netRating, pace: own.pace }
    : null;
  const items = SPLITS.map(({ key, label }) => ({ label, split: splitOf(splits, key) }));
  const maxAbs = Math.max(5, ...[season, ...items.map((item) => item.split)].map((split) => Math.abs(split?.net ?? 0)));

  return (
    <section>
      <PanelHeader compact kicker="SPLITS" title="Home, away and recent form" />
      <Panel className="p-3 sm:p-4">
        <table className="table table-sm w-full max-sm:[&_td]:px-1 max-sm:[&_th]:px-1">
          <thead>
            <tr>
              <th>Split</th>
              <th className="text-right">
                <HeaderTip tip="Games played">GP</HeaderTip>
              </th>
              <th className="text-right">
                <HeaderTip tip="Wins and losses">Record</HeaderTip>
              </th>
              <th className="text-right max-sm:hidden">
                <HeaderTip tip="Margin of victory: points scored minus allowed, per game">MOV</HeaderTip>
              </th>
              <th className="text-right max-sm:hidden">
                <HeaderTip tip="Offensive rating: points scored per 100 possessions">ORtg</HeaderTip>
              </th>
              <th className="text-right max-sm:hidden">
                <HeaderTip tip="Defensive rating: points allowed per 100 possessions">DRtg</HeaderTip>
              </th>
              <th className="text-right max-sm:hidden">
                <HeaderTip tip="Possessions per 40 minutes">Pace</HeaderTip>
              </th>
              <th>
                <HeaderTip tip="Offensive rating minus defensive rating; for each split, the difference from the season's too">Net rating</HeaderTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {season ? <SplitRow label="Season" split={season} maxAbs={maxAbs} reference /> : null}
            {items.map((item) => (
              <SplitRow key={item.label} label={item.label} split={item.split} maxAbs={maxAbs} season={season} />
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="muted mt-2 text-xs">
        State after round {splits.roundNumber}. Ratings are per 100 possessions; the bars share one scale, and each split&apos;s
        net rating is compared with the season&apos;s.
      </p>
    </section>
  );
}

function Fact({ label, tip, value, rank }) {
  return (
    <div className="flex flex-col">
      <span className="muted text-xs font-bold uppercase tracking-wide">
        <HeaderTip tip={tip}>{label}</HeaderTip>
      </span>
      <span className="font-semibold tabular-nums">
        {value}
        {rank?.standing ? <RankText standing={rank.standing} direction={rank.direction} className="ml-2 text-xs" /> : null}
      </span>
    </div>
  );
}

const TIME_SEGMENTS = [
  { key: "lead", label: "Leading", fill: "bg-success" },
  { key: "tied", label: "Tied", fill: "bg-base-content/35" },
  { key: "trail", label: "Trailing", fill: "bg-error" },
];

// `flowRows` are every club's game-flow rows in the scope (empty when they couldn't load), for the facts' league ranks.
function GameFlowCard({ pbp, flowRows, clubCode }) {
  if (!pbp) return null;
  const rankOfFact = (key) => {
    const { field, direction } = FLOW_RANKS[key];
    return { standing: rankOf(flowRows, clubCode, field, direction !== "lower"), direction };
  };
  const seconds = { lead: pbp.timeLeadingSeconds, tied: pbp.timeTiedSeconds, trail: pbp.timeTrailingSeconds };
  const timed = Object.values(seconds).every((value) => value !== null);
  const total = timed ? seconds.lead + seconds.tied + seconds.trail : 0;

  const leadingRank = rankOfFact("timeLeading");

  const hasClutch = pbp.clutchPointsFor !== null && pbp.clutchPointsAgainst !== null && pbp.clutchSeconds > 0;
  const clutchTotal = hasClutch ? pbp.clutchPointsFor + pbp.clutchPointsAgainst : 0;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader compact kicker="PLAY BY PLAY" title="How games unfold" />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <p className="muted mb-2 text-xs font-bold uppercase tracking-wide">Time in the game</p>
          {total > 0 ? (
            <>
              <div className="mb-1 flex items-baseline justify-between text-lg font-bold tabular-nums">
                <span className="text-success">
                  {formatFractionPercent(seconds.lead / total, 0)}
                  {leadingRank.standing ? (
                    <span className="ml-2 text-xs font-semibold">
                      <RankText standing={leadingRank.standing} direction={leadingRank.direction} /> <span className="muted">in time leading</span>
                    </span>
                  ) : null}
                </span>
                <span className="muted text-sm font-semibold">{formatFractionPercent(seconds.tied / total, 0)} tied</span>
                <span className="text-error">{formatFractionPercent(seconds.trail / total, 0)}</span>
              </div>
              <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-base-300">
                {TIME_SEGMENTS.map((segment) => (
                  <motion.div
                    key={segment.key}
                    className={segment.fill}
                    initial={{ width: 0 }}
                    animate={{ width: `${(seconds[segment.key] / total) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
                  />
                ))}
              </div>
              <p className="muted mt-2 text-sm">
                Share of game time spent leading, tied and trailing, over {pbp.timedGames === 1 ? "1 game" : `${pbp.timedGames} games`}.
              </p>
            </>
          ) : (
            <p className="muted text-sm">{EM_DASH}</p>
          )}
        </div>

        <div>
          <p className="muted mb-2 text-xs font-bold uppercase tracking-wide">Clutch points</p>
          {hasClutch ? (
            <>
              <div className="mb-1 flex items-baseline justify-between text-lg font-bold tabular-nums">
                <span className="text-success">{pbp.clutchPointsFor}</span>
                <span className="text-error">{pbp.clutchPointsAgainst}</span>
              </div>
              <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-base-300">
                <motion.div
                  className="bg-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${clutchTotal === 0 ? 50 : (pbp.clutchPointsFor / clutchTotal) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
                />
                <div className="flex-1 bg-error" />
              </div>
              <p className="muted mt-2 text-sm">
                Scored against allowed in {formatDecimal(pbp.clutchSeconds / 60, 0)} clutch minutes over{" "}
                {pbp.clutchGames === 1 ? "1 game" : `${pbp.clutchGames} games`}: the last five minutes with a margin of 5 or less.
              </p>
            </>
          ) : (
            <p className="muted text-sm">No clutch minutes yet.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-base-300 pt-4 sm:flex sm:flex-wrap sm:gap-x-8">
        <Fact label="Clutch margin" tip="Points scored minus allowed in clutch time: the last five minutes with a margin of 5 or less" value={hasClutch ? formatSignedDecimal(pbp.clutchPointsFor - pbp.clutchPointsAgainst, 0) : EM_DASH} rank={rankOfFact("clutchMargin")} />
        <Fact label="Lead changes / game" tip="How often the lead passed from one team to the other, per game" value={formatDecimal(pbp.leadChangesPerGame)} rank={rankOfFact("leadChangesPerGame")} />
        <Fact label="Ties / game" tip="How often the score was tied after the start, per game" value={formatDecimal(pbp.tiesPerGame)} rank={rankOfFact("tiesPerGame")} />
        <Fact label="Largest lead" tip="The team's biggest lead in any game" value={formatDecimal(pbp.largestLead, 0)} rank={rankOfFact("largestLead")} />
        <Fact label="Longest run" tip="The most points scored in a row without the opponent scoring" value={pbp.longestRun === null ? EM_DASH : `${formatDecimal(pbp.longestRun, 0)} pts`} rank={rankOfFact("longestRun")} />
        <Fact label="Runs of 6+" tip="Runs of 6 or more unanswered points; ranked per game played" value={pbp.runs6Plus ?? EM_DASH} rank={rankOfFact("runs6Plus")} />
        <Fact label="Assisted FG" tip="The share of made field goals that came from an assist" value={formatFractionPercent(pbp.assistedFgPct, 0)} rank={rankOfFact("assistedFgPct")} />
        <Fact label="Possessions / game" tip="Possessions counted from the play-by-play, per game" value={formatDecimal(ratio(pbp.countedPossessions, pbp.games))} />
        <Fact label="Possession length" tip="The average time of the team's possessions, in seconds" value={pbp.avgPossessionSeconds === null ? EM_DASH : `${formatDecimal(pbp.avgPossessionSeconds)} s`} rank={rankOfFact("avgPossessionSeconds")} />
      </div>
    </Panel>
  );
}

function initials(fullName) {
  const { last, first } = nameParts(fullName);
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function PlayerFace({ name, imageUrl }) {
  return (
    <span
      title={displayName(name)}
      className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full bg-base-300 text-xs font-bold ring-2 ring-base-100"
    >
      {initials(name)}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full bg-base-300 object-cover object-top"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

function LineupRow({ lineup, photos, maxAbsNet, badges }) {
  const keys = lineup.lineup.split(",");
  const names = (lineup.lineupNames ?? "").split("; ");

  return (
    <motion.li
      variants={sectionItem}
      className="grid items-center gap-x-10 gap-y-2 border-b border-base-300 py-3 last:border-0 lg:grid-cols-[24rem_minmax(0,1fr)]"
    >
      <div className="min-w-0">
        {/* Below sm the badges wrap under the faces: beside five faces they pushed the page wider. */}
        <div className="flex items-center gap-3 max-sm:flex-wrap max-sm:gap-y-2">
          <div className="flex -space-x-2">
            {keys.map((key, index) => (
              <PlayerFace key={key} name={names[index] ?? key} imageUrl={photos?.get(key)?.playerImageUrl} />
            ))}
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span key={badge.label} className={`stat-badge ${badge.tone}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <p className="muted mt-1 truncate text-sm" title={lineup.lineupNames ?? undefined}>
          {names.map((name) => nameParts(name).last).join(" · ")}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="muted text-xs font-bold uppercase tracking-wide">Net rating</span>
          <span className={`text-lg font-bold tabular-nums ${signedTone(lineup.netRating)}`}>
            {formatSignedDecimal(lineup.netRating)}
          </span>
        </div>
        <DivergingBar value={lineup.netRating} maxAbs={maxAbsNet} />
        <p className="muted mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums">
          <span>ORtg {formatDecimal(lineup.ortg)}</span>
          <span>DRtg {formatDecimal(lineup.drtg)}</span>
          <span>{lineup.possessionsFor ?? EM_DASH} poss</span>
          <span>{formatDecimal(ratio(lineup.seconds, 60), 0)} min</span>
          <span>{lineup.games} GP</span>
        </p>
      </div>
    </motion.li>
  );
}

// 100 minutes on court is the sample the impact charts show; fewer swing too much.
const IMPACT_MIN_SECONDS = 100 * 60;

function PlayerName({ seasonCode, player }) {
  return (
    <Link to={`/${seasonCode}/players/${player.personKey}`} className="link link-hover block truncate font-semibold" title={displayName(player.playerName)}>
      {displayName(player.playerName)}
    </Link>
  );
}

const IMPACT_ROW = "grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3.5rem] items-center gap-x-3 py-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem]";

// The team's net rating with each player on court minus with the player off, on one shared scale, best first.
function OnOffChart({ seasonCode, players }) {
  const rows = players
    .filter((player) => player.netRatingDiff !== null && (player.onSeconds ?? 0) >= IMPACT_MIN_SECONDS)
    .sort((a, b) => b.netRatingDiff - a.netRatingDiff);
  const maxAbs = Math.max(5, ...rows.map((player) => Math.abs(player.netRatingDiff)));
  return (
    <Panel className="p-3 sm:p-4">
      <h3 className="eyebrow mb-2">On/off net rating</h3>
      {rows.length === 0 ? (
        <p className="muted text-sm">No player has {IMPACT_MIN_SECONDS / 60} on-court minutes in this stage yet.</p>
      ) : (
        <ul className="divide-y divide-base-300" aria-label="On/off net rating">
          {rows.map((player) => (
            <li key={player.personKey} className={IMPACT_ROW}>
              <PlayerName seasonCode={seasonCode} player={player} />
              <DivergingBar value={player.netRatingDiff} maxAbs={maxAbs} />
              <span className={`text-right font-bold tabular-nums ${signedTone(player.netRatingDiff)}`}>{formatSignedDecimal(player.netRatingDiff)}</span>
              <p className="muted col-span-3 mt-0.5 flex flex-wrap gap-x-3 text-xs tabular-nums">
                <span>On {formatSignedDecimal(player.onNetRating)}</span>
                <span>Off {formatSignedDecimal(player.offNetRating)}</span>
                <span>{formatDecimal(player.onSeconds / 60, 0)} min</span>
                {player.rapm === null ? null : (
                  <span>
                    RAPM {formatSignedDecimal(player.rapm)} ({formatSignedDecimal(player.rapmOffense)} O / {formatSignedDecimal(player.rapmDefense)} D)
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// Each player's win shares, offense and defense stacked, most first; the bars share the top player's scale.
function WinSharesChart({ seasonCode, players }) {
  const rows = players
    .filter((player) => player.winShares !== null && (player.secondsPlayed ?? 0) >= IMPACT_MIN_SECONDS)
    .sort((a, b) => b.winShares - a.winShares);
  const teamTotal = players.reduce((sum, player) => sum + (player.winShares ?? 0), 0);
  const scale = Math.max(0.5, ...rows.map((player) => Math.max(0, player.offWinShares ?? 0) + Math.max(0, player.defWinShares ?? 0)));
  const width = (value) => `${(Math.max(0, value ?? 0) / scale) * 100}%`;
  const grow = { initial: { width: 0 }, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.1 } };
  return (
    <Panel className="p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="eyebrow">Win shares</h3>
        <span className="muted text-xs tabular-nums">Team total {formatDecimal(teamTotal)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="muted text-sm">No player has {IMPACT_MIN_SECONDS / 60} minutes in this stage yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-base-300" aria-label="Win shares">
            {rows.map((player) => (
              <li key={player.personKey} className={IMPACT_ROW}>
                <PlayerName seasonCode={seasonCode} player={player} />
                <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-base-300">
                  <motion.div className="h-full bg-primary" {...grow} animate={{ width: width(player.offWinShares) }} />
                  <motion.div className="h-full bg-secondary" {...grow} animate={{ width: width(player.defWinShares) }} />
                </div>
                <span className="text-right font-bold tabular-nums">{formatDecimal(player.winShares)}</span>
                <p className="muted col-span-3 mt-0.5 text-xs tabular-nums">
                  {formatDecimal(player.offWinShares)} offense · {formatDecimal(player.defWinShares)} defense
                </p>
              </li>
            ))}
          </ul>
          <p className="muted mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-sm bg-primary" /> Offense
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-3 rounded-sm bg-secondary" /> Defense
            </span>
          </p>
        </>
      )}
    </Panel>
  );
}

function PlayerImpact({ seasonCode, clubCode, scope }) {
  const query = useQuery({
    queryKey: ["team-players-advanced", seasonCode, clubCode, scope],
    queryFn: () => getTeamPlayersAdvanced(seasonCode, clubCode, { scope }),
  });
  return (
    <section>
      <PanelHeader compact kicker="PLAYER IMPACT" title="Who drives the results" />
      {query.isPending ? (
        <AsyncState status="loading" label="Loading player impact" skeleton={<LineupRowsSkeleton />} />
      ) : query.isError ? (
        <AsyncState status="error" message="Could not load player impact." onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            <OnOffChart seasonCode={seasonCode} players={query.data.players} />
            <WinSharesChart seasonCode={seasonCode} players={query.data.players} />
          </div>
          <p className="muted mt-2 text-xs">
            Players with at least {IMPACT_MIN_SECONDS / 60} minutes. On/off is the team&apos;s net rating with the player on court
            minus with the player off; RAPM, which adjusts for teammates and opponents, covers the whole season.
          </p>
        </>
      )}
    </section>
  );
}

function emptyLineupMessage(size, possessions) {
  const hint =
    size === 5
      ? "Five-man lineups usually need a dozen games or more to get there, so try the 3-man or 2-man view."
      : "It usually takes a few games.";
  return `No ${size}-man lineup has reached ${possessions} possessions yet. ${hint}`;
}

function LineupsCard({ seasonCode, clubCode, scope }) {
  const [size, setSize] = useState("5");
  const [choice, setChoice] = useState("auto");
  const sizeNumber = Number(size);
  const target = choice === "auto" ? TARGET_POSSESSIONS : Number(choice);

  const lineupsQuery = (minPossessions, enabled = true) => ({
    queryKey: ["team-lineups", seasonCode, clubCode, scope, sizeNumber, minPossessions],
    queryFn: () => getTeamLineups(seasonCode, clubCode, { scope, size: sizeNumber, minPossessions, limit: LINEUP_LIMIT }),
    placeholderData: keepPreviousData,
    enabled,
  });
  const primary = useQuery(lineupsQuery(target));
  // Only in auto: when no lineup of this size has 100 possessions yet, look at 50 instead of showing nothing.
  const useFallback = choice === "auto" && primary.isSuccess && !primary.isPlaceholderData && primary.data.lineups.length === 0;
  const fallback = useQuery(lineupsQuery(FALLBACK_POSSESSIONS, useFallback));
  const active = useFallback ? fallback : primary;
  const usedPossessions = useFallback ? FALLBACK_POSSESSIONS : target;

  // The roster's photos, by person key. Regular-season stats cover every player who has played for the club.
  const photosQuery = useQuery({
    queryKey: ["team-roster-stats", seasonCode, "RS", clubCode],
    queryFn: () => fetchTeamRosterStats(seasonCode, "RS", clubCode),
  });

  const lineups = active.data?.lineups ?? [];
  const maxAbsNet = Math.max(5, ...lineups.map((lineup) => Math.abs(lineup.netRating ?? 0)));
  const mostUsed = lineups.reduce((best, lineup) => ((lineup.possessionsFor ?? 0) > (best?.possessionsFor ?? -1) ? lineup : best), null);

  function badgesFor(lineup, index) {
    const badges = [];
    if (index === 0) badges.push({ label: "Best net rating", tone: "stat-badge-positive" });
    if (lineups.length > 1 && lineup === mostUsed) badges.push({ label: "Most used", tone: "stat-badge-neutral" });
    return badges;
  }

  return (
    <section>
      <PanelHeader compact kicker="LINEUPS" title="Best lineups" />
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TabStrip ariaLabel="Lineup size" panelId="team-lineups-panel" activeKey={size} onChange={setSize} tabs={LINEUP_TABS} />
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Minimum possessions
          <select
            className="select select-bordered select-sm"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="auto">Auto (100, else 50)</option>
            {MINIMUM_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value}+
              </option>
            ))}
          </select>
        </label>
      </div>

      <TabPanel id="team-lineups-panel" focusKey={size} scroll={false}>
        {active.isLoading || (useFallback && fallback.isLoading) ? (
          <AsyncState status="loading" label="Loading lineups" skeleton={<LineupRowsSkeleton />} />
        ) : active.isError ? (
          <AsyncState status="error" message="Could not load lineups." onRetry={() => active.refetch()} />
        ) : lineups.length === 0 ? (
          <EmptyText>{emptyLineupMessage(sizeNumber, usedPossessions)}</EmptyText>
        ) : (
          <Panel className="p-4">
            {useFallback ? (
              <p className="mb-2">
                {/* The badge class keeps its text on one line; below sm this long note wraps inside the panel. */}
                <span className="stat-badge stat-badge-neutral max-sm:rounded-lg! max-sm:whitespace-normal!">
                  No {sizeNumber}-man lineup has reached {TARGET_POSSESSIONS} possessions yet, so this shows {FALLBACK_POSSESSIONS}+
                </span>
              </p>
            ) : null}
            <motion.ul
              key={`${size}-${usedPossessions}`}
              variants={sectionContainer}
              initial="hidden"
              animate="show"
            >
              {lineups.map((lineup, index) => (
                <LineupRow
                  key={lineup.lineup}
                  lineup={lineup}
                  photos={photosQuery.data}
                  maxAbsNet={maxAbsNet}
                  badges={badgesFor(lineup, index)}
                />
              ))}
            </motion.ul>
          </Panel>
        )}
      </TabPanel>
      <p className="muted mt-2 text-xs">
        Ordered by net rating (points per 100 possessions) among lineups with at least {usedPossessions} possessions. Small
        samples swing a lot, so treat the top of a low minimum with care.
      </p>
    </section>
  );
}

export default function TeamAdvancedSection({ seasonCode, clubCode }) {
  const [scope, setScope] = useState(null);

  const query = useQuery({
    queryKey: ["team-advanced", seasonCode, clubCode, scope],
    queryFn: () => getTeamAdvanced(seasonCode, clubCode, { scope: scope ?? undefined }),
    placeholderData: keepPreviousData,
  });
  const activeScope = query.data?.scope ?? null;
  // The league around the club: the advanced standings (shared with the overview's league profile) and every club's game
  // flow (shared with the Standings page).
  const standingsQuery = useQuery({
    queryKey: ["advanced-standings-team-overview", seasonCode, activeScope],
    queryFn: () => getAdvancedStandings(seasonCode, { scope: activeScope }),
    enabled: Boolean(activeScope),
  });
  const flowQuery = useQuery({
    queryKey: ["game-flow", seasonCode, activeScope],
    queryFn: () => getGameFlow(seasonCode, { scope: activeScope }),
    enabled: Boolean(activeScope),
  });
  const { own } = useLeagueRows(standingsQuery, clubCode);
  const flowRows = useMemo(() => (flowQuery.data?.clubs ?? []).map(withDerivedFlow), [flowQuery.data]);

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced team stats" skeleton={<TeamAdvancedSkeleton />} />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced team stats." onRetry={() => query.refetch()} />;
  }

  const { scopes, trend, splits, pbp } = query.data;
  if (!activeScope || trend.length === 0) {
    return <EmptyText>Advanced stats are not available yet for this club.</EmptyText>;
  }

  return (
    <div className="flex flex-col gap-6">
      <TabStrip
        ariaLabel="Advanced stats scope"
        level={2}
        panelId="team-advanced-panel"
        activeKey={activeScope}
        onChange={setScope}
        className="w-fit"
        tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
      />
      <TabPanel id="team-advanced-panel" focusKey={activeScope} scroll={false}>
        <motion.div key={activeScope} className="flex flex-col gap-8" variants={sectionContainer} initial="hidden" animate="show">
          <motion.div variants={sectionItem}>
            <StrengthSection standingsQuery={standingsQuery} clubCode={clubCode} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <FourFactorsSection standingsQuery={standingsQuery} clubCode={clubCode} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <RatingsCard trend={trend} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <SplitsTable splits={splits} own={own} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <GameFlowCard pbp={pbp} flowRows={flowRows} clubCode={clubCode} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <PlayerImpact seasonCode={seasonCode} clubCode={clubCode} scope={activeScope} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <LineupsCard seasonCode={seasonCode} clubCode={clubCode} scope={activeScope} />
          </motion.div>
        </motion.div>
      </TabPanel>
    </div>
  );
}
