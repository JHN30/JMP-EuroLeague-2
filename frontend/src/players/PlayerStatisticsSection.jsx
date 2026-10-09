import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getPlayerSeasonStats } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { barFill, denseListContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { ordinal, rankTier } from "../teams/teamLeague";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "./leagueLeaderboard";
import { STAT_GROUPS } from "./playerStatDefs";
import { rankPlayer, statNumber } from "./playerOverview";

const PANEL_ID = "player-stats-panel";
const MODES = [
  { key: "perGame", label: "Per game" },
  { key: "accumulated", label: "Accumulated" },
];
const TOP_RANK = 10;
const HIGHLIGHT_COUNT = 5;

// The two columns of the sheet (by group title): 24 and 23 lines, so both sides end at about the same height.
const COLUMNS = [["Traditional", "Advanced"], ["Shooting", "Shot and point mix", "Record and milestones"]];

// Every row and group header share this grid, so the columns line up down the whole tab. On a phone the bar and rank
// drop to a second line under the name and value. At the two-column width every row, group header and the gap between
// groups is one fixed line (h-11), so a row on the left sits level with its neighbour on the right.
const ROW_GRID = "grid grid-cols-[1fr_auto] items-center gap-x-3 sm:grid-cols-[11rem_4.5rem_1fr_7rem]";

// The player's rank on one row, or null when there is none to show. Per game, and any percentage or ratio, is ranked
// among the players who meet the phase's minimum games; season totals of a count among everyone who played.
function rankedStanding(league, personKey, stat, mode, entry) {
  if (!league || stat.rank === false) return null;
  const value = statNumber(entry[stat.group]?.[stat.field]);
  if (value === 0 && !stat.lowerIsBetter) return null;
  const qualifiedOnly = mode === "perGame" || stat.kind === "percent" || stat.kind === "decimal";
  return rankPlayer(league, personKey, stat, { qualifiedOnly });
}

function formatValue(stat, value, mode) {
  if (value === null) return "—";
  if (stat.kind === "percent") return `${value.toFixed(1)}%`;
  if (stat.kind === "games") return String(Math.round(value));
  if (stat.kind === "count" && mode === "accumulated") return Math.round(value).toLocaleString();
  return value.toFixed(1);
}

function StatRow({ stat, mode }) {
  const { value, standing } = stat;
  const tier = standing?.rank ? rankTier({ rank: standing.rank, of: standing.of }) : null;
  // A ranked row fills by percentile; a share (points from threes) fills by the share itself.
  const fill = standing?.rank ? Math.max(standing.percentile ?? 0, 4) : stat.rank === false && stat.kind === "percent" && value !== null ? value : null;

  return (
    <motion.li variants={listItem} className={`${ROW_GRID} gap-y-1 border-b border-base-300 py-2 text-sm last:border-0 xl:h-11 xl:py-0`}>
      <span className="min-w-0 truncate font-medium">{stat.tip ? <HeaderTip tip={stat.tip}>{stat.label}</HeaderTip> : stat.label}</span>
      <span className="text-right font-bold tabular-nums sm:text-left">{formatValue(stat, value, mode)}</span>
      <div className="col-span-2 flex items-center gap-2 sm:contents">
        <div aria-hidden="true" className={`h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-base-300 ${fill === null ? "invisible" : ""}`}>
          {fill !== null ? (
            <motion.div
              className={`h-full rounded-full ${tier ? tier.bar : "bg-primary"}`}
              style={{ width: `${Math.min(100, fill)}%`, transformOrigin: "left" }}
              {...barFill}
            />
          ) : null}
        </div>
        <span
          className={`w-24 flex-none text-right text-xs font-bold tabular-nums sm:w-auto ${tier ? tier.text : "muted font-medium"}`}
          title={standing?.rank ? `${ordinal(standing.rank)} of ${standing.of} players` : undefined}
        >
          {standing?.rank ? `${ordinal(standing.rank)} of ${standing.of}` : standing && value !== null ? "too few games" : ""}
        </span>
      </div>
    </motion.li>
  );
}

function StatGroup({ group, mode, hasRanks }) {
  // A group of shares and records has nothing to rank, so it has no rank caption either.
  const showRanks = hasRanks && group.stats.some((stat) => stat.rank !== false);
  return (
    <section aria-label={group.title} className="mt-6 first:mt-0 xl:mt-11 xl:first:mt-0">
      <div aria-hidden="true" className={`${ROW_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase xl:h-11 xl:pb-0`}>
        <h3 className="text-base-content text-sm normal-case tracking-normal">{group.title}</h3>
        <span className="hidden text-left sm:block">{mode === "perGame" ? "Per game" : "Total"}</span>
        <span className="hidden sm:block" />
        <span className="hidden text-right sm:block">{showRanks ? "League rank" : ""}</span>
      </div>
      <motion.ul variants={denseListContainer} initial="hidden" animate="show">
        {group.stats.map((stat) => (
          <StatRow key={`${stat.group}-${stat.field}`} stat={stat} mode={mode} />
        ))}
      </motion.ul>
    </section>
  );
}

// The ranks a player is best at, as chips above the sheet.
function Highlights({ groups }) {
  const best = groups
    .flatMap((group) => group.stats)
    .filter((stat) => stat.standing?.rank && stat.standing.rank <= TOP_RANK)
    .sort((a, b) => a.standing.rank - b.standing.rank)
    .slice(0, HIGHLIGHT_COUNT);
  if (best.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span className="muted text-xs font-bold tracking-wide uppercase">Top {TOP_RANK} in the league</span>
      {best.map((stat) => (
        <span key={`${stat.group}-${stat.field}`} className="badge badge-success badge-outline h-auto gap-1 py-0.5 max-sm:badge-sm">
          <b className="tabular-nums">{ordinal(stat.standing.rank)}</b> {stat.label}
        </span>
      ))}
    </div>
  );
}

export default function PlayerStatisticsSection({ seasonCode, personKey, phases, phaseCode, onPhaseChange }) {
  const [mode, setMode] = useState("perGame");

  const statsQuery = useQuery({
    queryKey: ["player-season-stats", seasonCode, personKey, phaseCode, mode],
    queryFn: () => getPlayerSeasonStats(seasonCode, personKey, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode),
  });
  // The ranks load on their own: without them the numbers still show.
  const leaderboardQuery = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode, mode),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode, mode),
    enabled: Boolean(phaseCode),
  });

  const entry = statsQuery.data?.players?.[0];
  const league = leaderboardQuery.data;
  const groups = useMemo(() => {
    if (!entry) return [];
    return STAT_GROUPS.map((group) => ({
      ...group,
      stats: group.stats.map((stat) => ({
        ...stat,
        value: statNumber(entry[stat.group]?.[stat.field]),
        standing: rankedStanding(league, personKey, stat, mode, entry),
      })),
    }));
  }, [entry, league, personKey, mode]);

  const phaseName = phases.find((phase) => phase.code === phaseCode)?.name ?? phaseCode;

  let body;
  if (statsQuery.isPending) {
    body = <AsyncState status="loading" label="Loading season statistics" />;
  } else if (statsQuery.isError) {
    body = <AsyncState status="error" message="Could not load season statistics." onRetry={() => statsQuery.refetch()} />;
  } else if (!entry) {
    body = <EmptyText>No season statistics in this phase: the player has not played in it, or has not played enough games to be listed.</EmptyText>;
  } else {
    const hasRanks = Boolean(league);
    const qualifiedCount = league ? league.filter((player) => player.qualified !== false).length : 0;
    const minGames = entry.minGames;
    body = (
      <Panel as="section" className="p-4">
        <PanelHeader kicker="STATISTICS" title={`${phaseName}, ${mode === "perGame" ? "per game" : "season totals"}`} />
        {entry.qualified === false ? (
          <p className="mb-4 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-sm">
            <span className="font-semibold">Not ranked per game:</span> {statNumber(entry.traditional?.gamesPlayed)} games played, and the league
            ranks players from {minGames} games in this phase.
            {entry.isCalculated && mode === "perGame" ? " These per-game numbers are worked out from the player's season totals." : ""}
          </p>
        ) : null}
        {hasRanks ? <Highlights groups={groups} /> : null}
        <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
          {COLUMNS.map((titles) => (
            <div key={titles.join()} className="flex flex-col">
              {groups
                .filter((group) => titles.includes(group.title))
                .map((group) => (
                  <StatGroup key={`${phaseCode}-${mode}-${group.title}`} group={group} mode={mode} hasRanks={hasRanks} />
                ))}
            </div>
          ))}
        </div>
        <p className="muted mt-4 text-sm">
          {hasRanks
            ? `${mode === "perGame" ? `Ranked among the ${qualifiedCount} players with at least ${minGames} games in this phase` : `Totals are ranked among all ${league.length} players who played; percentages and ratios among the ${qualifiedCount} with at least ${minGames} games`} (green top third, red bottom third). 1st is best, so for turnovers and fouls the fewest ranks first.`
            : "League ranks are loading."}
        </p>
      </Panel>
    );
  }

  return (
    <>
      <h2 className="mb-3 text-xl font-semibold">Season statistics</h2>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <TabStrip
          ariaLabel="Phase"
          scrolling
          level={2}
          panelId={PANEL_ID}
          activeKey={phaseCode}
          onChange={onPhaseChange}
          className="w-fit"
          tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
        />
        <TabStrip ariaLabel="Stats mode" level={2} panelId={PANEL_ID} activeKey={mode} onChange={setMode} className="w-fit" tabs={MODES} />
      </div>
      <TabPanel id={PANEL_ID} focusKey={`${phaseCode}-${mode}`} scroll={false}>
        {body}
      </TabPanel>
    </>
  );
}
