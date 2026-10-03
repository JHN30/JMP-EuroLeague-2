import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getLeagueTeamStats } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { barFill, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { ordinal, rankTier } from "./teamLeague";
import { leagueRank, STAT_GROUPS } from "./teamStatDefs";

// Every row and every group header share this grid, so the columns line up down the whole tab. On a phone the stat name
// moves to its own line above the numbers.
const ROW_GRID =
  "grid items-center gap-x-2 grid-cols-[2.75rem_3rem_1fr_1fr_3rem] sm:grid-cols-[8rem_3rem_3.5rem_1fr_1fr_3.5rem]";
const LABEL_CELL = "col-span-5 sm:col-span-1";

// One half of the butterfly: grows outwards from the middle.
function HalfBar({ share, side, fillClass }) {
  return (
    <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
      <motion.div
        className={`h-full rounded-full ${fillClass} ${side === "team" ? "ml-auto" : ""}`}
        style={{ width: `${Math.min(100, Math.max(0, share))}%`, originX: side === "team" ? 1 : 0 }}
        {...barFill}
      />
    </div>
  );
}

function StatRow({ stat, own, opponent, gamesPlayed, standing }) {
  const teamValue = stat.compute(own, opponent, gamesPlayed);
  const opponentValue = stat.compute(opponent, own, gamesPlayed);
  const biggest = Math.max(teamValue ?? 0, opponentValue ?? 0) || 1;

  return (
    <motion.li variants={listItem} className={`${ROW_GRID} gap-y-0.5 border-b border-base-300 py-2 text-sm last:border-0`}>
      <span className={`${LABEL_CELL} text-xs font-bold tracking-wide uppercase sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium`}>
        {stat.tip ? <HeaderTip tip={stat.tip}>{stat.label}</HeaderTip> : stat.label}
      </span>
      <span
        className={`text-xs font-bold tabular-nums ${standing ? rankTier(standing).text : ""}`}
        title={standing ? `${ordinal(standing.rank)} of ${standing.of} clubs` : undefined}
      >
        {standing ? ordinal(standing.rank) : ""}
      </span>
      <span className="text-right font-semibold tabular-nums">{stat.format(teamValue)}</span>
      <HalfBar share={((teamValue ?? 0) / biggest) * 100} side="team" fillClass="bg-primary" />
      <HalfBar share={((opponentValue ?? 0) / biggest) * 100} side="opponent" fillClass="bg-base-content/45" />
      <span className="text-left font-semibold tabular-nums">{stat.format(opponentValue)}</span>
    </motion.li>
  );
}

function StatGroup({ group, teamName, own, opponent, gamesPlayed, leagueTeams, clubCode }) {
  return (
    <section aria-label={group.title}>
      <div aria-hidden="true" className={`${ROW_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <h3 className={`${LABEL_CELL} text-base-content text-sm normal-case tracking-normal`}>{group.title}</h3>
        <span>Rank</span>
        <span />
        <span className="truncate text-center">{teamName}</span>
        <span className="truncate text-center">
          <span className="sm:hidden">Opp.</span>
          <span className="hidden sm:inline">Opponents</span>
        </span>
        <span />
      </div>
      <motion.ul variants={listContainer} initial="hidden" animate="show">
        {group.stats.map((stat) => (
          <StatRow
            key={stat.key}
            stat={stat}
            own={own}
            opponent={opponent}
            gamesPlayed={gamesPlayed}
            standing={leagueTeams.length > 0 ? leagueRank(stat, leagueTeams, clubCode) : null}
          />
        ))}
      </motion.ul>
    </section>
  );
}

// Per-game averages with the club on the left and what its opponents did against it on the right, plus the club's own
// rank among all clubs on each stat. Ranks load separately: without them the numbers and bars still show.
export default function TeamStatisticsSection({ seasonCode, phaseCode, clubCode, team, teamStatsSummaryQuery }) {
  const leagueQuery = useQuery({
    queryKey: ["league-team-stats", seasonCode, phaseCode],
    queryFn: () => getLeagueTeamStats(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  if (teamStatsSummaryQuery.isPending) return <AsyncState status="loading" label="Loading team statistics" />;
  if (teamStatsSummaryQuery.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load team statistics."
        onRetry={() => teamStatsSummaryQuery.refetch()}
      />
    );
  }
  const { gamesPlayed, own, opponent } = teamStatsSummaryQuery.data;
  if (!gamesPlayed) {
    return <EmptyText>This club did not play any games in the selected phase.</EmptyText>;
  }

  const teamName = team.abbreviatedName ?? team.name ?? clubCode;
  const leagueTeams = leagueQuery.data?.teams ?? [];
  const [traditional, ...rest] = STAT_GROUPS;
  const shared = { teamName, own, opponent, gamesPlayed, leagueTeams, clubCode };

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="STATISTICS" title={`Per game: ${teamName} against its opponents`} />
      <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
        <StatGroup key={`${phaseCode}-${traditional.title}`} group={traditional} {...shared} />
        <div className="flex flex-col gap-6">
          {rest.map((group) => (
            <StatGroup key={`${phaseCode}-${group.title}`} group={group} {...shared} />
          ))}
        </div>
      </div>
      <p className="muted mt-4 text-sm">
        {leagueTeams.length > 0
          ? `${teamName}'s rank among the ${leagueTeams.length} clubs that have played, on each number (green top third, red bottom third). 1st is best, so for turnovers and fouls the fewest ranks first. The grey bar is what opponents did against ${teamName}.`
          : `Left is ${teamName}'s own number, right is what its opponents put up against it.`}
      </p>
    </Panel>
  );
}
