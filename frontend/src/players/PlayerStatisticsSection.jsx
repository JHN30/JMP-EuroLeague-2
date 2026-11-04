import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getPlayerSeasonStats } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { PlayerStatisticsSkeleton } from "./PlayerPageSkeleton";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { barFill, denseListContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { ordinal, rankTier } from "../teams/teamLeague";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "./leagueLeaderboard";
import { formatSheetValue, leagueStanding, STAT_GROUPS, statValue } from "./playerStatDefs";
import { statNumber } from "./playerOverview";

const PANEL_ID = "player-stats-panel";
const MODES = [
  { key: "perGame", label: "Per game" },
  { key: "accumulated", label: "Accumulated" },
];
const TOP_RANK = 10;
const HIGHLIGHT_COUNT = 5;

// Every row and group header share this grid, as on the team Statistics tab: the name, the rank, the player's number,
// the player's bar and the league's (growing out from the middle), and the league average. On a phone a row is two
// lines: the name centred over the row with the rank at its left, then the two numbers with their bars between them.
const ROW_GRID =
  "grid items-center gap-x-2 grid-cols-[3.25rem_1fr_1fr_3.25rem] sm:grid-cols-[9.5rem_2.75rem_3.75rem_1fr_1fr_3.75rem] lg:grid-cols-[11rem_2.75rem_3.75rem_1fr_1fr_3.75rem]";
const LABEL_CELL = "col-span-4 sm:col-span-1";

const formatValue = formatSheetValue;

// An average of whole games (double-doubles) keeps a decimal.
function formatAverage(stat, value, mode) {
  return stat.kind === "games" && value !== null ? value.toFixed(1) : formatValue(stat, value, mode);
}

// One half of the butterfly: grows outwards from the middle.
function HalfBar({ share, side, fillClass }) {
  return (
    <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
      <motion.div
        className={`h-full rounded-full ${fillClass} ${side === "player" ? "ml-auto" : ""}`}
        style={{ width: `${Math.min(100, Math.max(0, share))}%`, originX: side === "player" ? 1 : 0 }}
        {...barFill}
      />
    </div>
  );
}

function StatRank({ stat, standing }) {
  if (!standing) return <span className="col-start-1 row-start-1 sm:col-auto sm:row-auto" />;
  if (!standing.rank) {
    return (
      <span className="muted col-start-1 row-start-1 text-xs sm:col-auto sm:row-auto" title={standing.unqualified ? "Too few games to be ranked" : undefined}>
        {standing.unqualified ? "–" : ""}
      </span>
    );
  }
  const tier = stat.direction === "style" ? null : rankTier({ rank: standing.rank, of: standing.of });
  return (
    <span
      className={`col-start-1 row-start-1 text-xs font-bold tabular-nums sm:col-auto sm:row-auto ${tier ? tier.text : "muted"}`}
      title={`${ordinal(standing.rank)} of ${standing.of} players`}
    >
      {ordinal(standing.rank)}
    </span>
  );
}

function StatRow({ stat, mode }) {
  const { value, standing } = stat;
  const compared = stat.direction !== "none";
  const average = standing?.average ?? null;
  const biggest = Math.max(value ?? 0, average ?? 0) || 1;

  return (
    <motion.li variants={listItem} className={`${ROW_GRID} gap-y-0.5 border-b border-base-300 py-1 text-sm last:border-0`}>
      <span
        className={`${LABEL_CELL} col-start-1 row-start-1 truncate text-center text-xs font-bold tracking-wide uppercase sm:col-auto sm:row-auto sm:text-left sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal`}
      >
        {stat.tip ? <HeaderTip tip={stat.tip}>{stat.label}</HeaderTip> : stat.label}
      </span>
      <StatRank stat={stat} standing={standing} />
      <span className="text-right font-semibold tabular-nums">{formatValue(stat, value, mode)}</span>
      {compared && standing ? (
        <>
          <HalfBar share={((value ?? 0) / biggest) * 100} side="player" fillClass="bg-primary" />
          <HalfBar share={((average ?? 0) / biggest) * 100} side="league" fillClass="bg-base-content/45" />
          <span className="muted text-left tabular-nums">{formatAverage(stat, average, mode)}</span>
        </>
      ) : (
        <span className="col-span-3" />
      )}
    </motion.li>
  );
}

function StatGroup({ group, mode, playerTag }) {
  return (
    <section aria-label={group.title}>
      <div aria-hidden="true" className={`${ROW_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <h3 className={`${LABEL_CELL} text-base-content text-sm normal-case tracking-normal`}>{group.title}</h3>
        {/* The rank column has no heading: "15th" says what it is. Below sm this cell sits over the player's number. */}
        <span />
        <span className="max-sm:hidden" />
        <span className="truncate text-center">{playerTag}</span>
        <span className="truncate text-center">League avg</span>
        <span className="max-sm:hidden" />
      </div>
      <motion.ul variants={denseListContainer} initial="hidden" animate="show">
        {group.stats.map((stat) => (
          <StatRow key={stat.key} stat={stat} mode={mode} />
        ))}
      </motion.ul>
    </section>
  );
}

// The ranks a player is best at, as chips above the sheet (style numbers are not "best" at anything).
function Highlights({ groups }) {
  const best = groups
    .flatMap((group) => group.stats)
    .filter((stat) => stat.direction !== "style" && stat.standing?.rank && stat.standing.rank <= TOP_RANK)
    .sort((a, b) => a.standing.rank - b.standing.rank)
    .slice(0, HIGHLIGHT_COUNT);
  if (best.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span className="muted text-xs font-bold tracking-wide uppercase">Top {TOP_RANK} in the league</span>
      {best.map((stat) => (
        <span key={stat.key} className="badge badge-success badge-outline h-auto gap-1 py-0.5 max-sm:badge-sm">
          <b className="tabular-nums">{ordinal(stat.standing.rank)}</b> {stat.label}
        </span>
      ))}
    </div>
  );
}

// The surname from the feed's "SURNAME, NAME", as the column heading over the player's numbers.
function surname(playerName) {
  const last = (playerName ?? "").split(",")[0].trim();
  return last ? last.charAt(0) + last.slice(1).toLowerCase() : "Player";
}

export default function PlayerStatisticsSection({ seasonCode, personKey, phases, phaseCode, onPhaseChange }) {
  const [mode, setMode] = useState("perGame");

  const statsQuery = useQuery({
    queryKey: ["player-season-stats", seasonCode, personKey, phaseCode, mode],
    queryFn: () => getPlayerSeasonStats(seasonCode, personKey, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode),
  });
  // The ranks and averages load on their own: without them the numbers still show.
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
        value: statValue(stat, entry, mode),
        standing: leagueStanding(stat, league, entry, mode),
      })),
    }));
  }, [entry, league, mode]);

  const phaseName = phases.find((phase) => phase.code === phaseCode)?.name ?? phaseCode;

  let body;
  if (statsQuery.isPending) {
    body = <AsyncState status="loading" label="Loading season statistics" skeleton={<PlayerStatisticsSkeleton />} />;
  } else if (statsQuery.isError) {
    body = <AsyncState status="error" message="Could not load season statistics." onRetry={() => statsQuery.refetch()} />;
  } else if (!entry) {
    body = <EmptyText>No season statistics in this phase: the player has not played in it, or has not played enough games to be listed.</EmptyText>;
  } else {
    const hasRanks = Boolean(league);
    const qualifiedCount = league ? league.filter((player) => player.qualified !== false).length : 0;
    const minGames = entry.minGames;
    const playerTag = surname(entry.playerName);
    body = (
      <Panel as="section" className="p-4">
        <PanelHeader compact kicker="STATISTICS" title={`${phaseName}, ${mode === "perGame" ? "per game" : "season totals"}, against the league average`} />
        {entry.qualified === false ? (
          <p className="mb-3 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-sm">
            <span className="font-semibold">Not ranked per game:</span> {statNumber(entry.traditional?.gamesPlayed)} games played, and the league
            ranks players from {minGames} games in this phase.
            {entry.isCalculated && mode === "perGame" ? " These per-game numbers are worked out from the player's season totals." : ""}
          </p>
        ) : null}
        {hasRanks ? <Highlights groups={groups} /> : null}
        {/* Two columns of about equal height from xl; one column in the same order below. */}
        <div className="grid gap-x-10 gap-y-4 xl:grid-cols-2">
          {["left", "right"].map((side) => (
            <div key={side} className="flex flex-col gap-4">
              {groups
                .filter((group) => group.column === side)
                .map((group) => (
                  <StatGroup key={`${phaseCode}-${mode}-${group.title}`} group={group} mode={mode} playerTag={playerTag} />
                ))}
            </div>
          ))}
        </div>
        <p className="muted mt-4 text-sm">
          {hasRanks
            ? `${
                mode === "perGame"
                  ? `Ranks and the league average are among the ${qualifiedCount} players with at least ${minGames} games in this phase`
                  : `Totals are ranked and averaged among all ${league.length} players who played; percentages and ratios among the ${qualifiedCount} with at least ${minGames} games`
              } (green top third, red bottom third). 1st is best, so for turnovers, fouls and shots blocked the fewest ranks first; style numbers (shot mix, attempts per 100 possessions) rank the most first, without a colour. The grey bar is the league average.`
            : "League ranks and averages are loading."}
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
