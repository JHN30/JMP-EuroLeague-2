import { useMemo } from "react";
import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { formatCount, formatDecimal, formatMissing } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { PeriodTable, ScoreFlowChart } from "./gameFlow";
import { computeGameFlow } from "./gameFlowData";
import { teamName } from "./gameUtils";
import { attachAdvanced } from "./AdvancedBoxScore";
import { bestPlayerMetric, gameLeaders, keyStatRows, pickBestPlayer } from "./overview";
import PlayerLink from "./PlayerLink";
import TeamLabel from "./TeamLabel";
import { overviewFlowRows } from "./teamFlow";

function Headshot({ player }) {
  return player.headshotUrl ? (
    <img
      src={player.headshotUrl}
      alt=""
      className="aspect-3/4 h-16 w-auto flex-none object-contain object-bottom"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <div className="aspect-3/4 h-16 flex-none rounded-field bg-base-200" />
  );
}

function StandoutCard({ team, player, metric, seasonCode }) {
  return (
    <Panel className="p-4" role="article" aria-label={`${teamName(team)} best player`}>
      <TeamLabel team={team} />
      {player ? (
        <div className="mt-3 flex items-center gap-3">
          <Headshot player={player} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">
              <PlayerLink seasonCode={seasonCode} player={player} />
            </p>
            <p className="muted text-sm">
              {[player.dorsal ? `#${player.dorsal}` : null, player.positionName].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 tabular-nums">
              {formatCount(player.points)} PTS · {formatCount(player.totalRebounds)} REB · {formatCount(player.assistances)} AST
            </p>
            <span className="badge badge-primary badge-sm mt-2 tabular-nums">
              {metric.label} {formatDecimal(metric.value(player), metric.digits)}
            </span>
          </div>
        </div>
      ) : (
        <p className="muted mt-3 text-sm">Not enough minutes data to pick a best player.</p>
      )}
    </Panel>
  );
}

function LeadersCard({ team, rows, seasonCode }) {
  return (
    <Panel className="p-4" role="group" aria-label={`${teamName(team)} game leaders`}>
      <TeamLabel team={team} />
      <ul className="mt-3">
        {gameLeaders(rows).map(({ key, label, player, value }) => (
          <li key={key} className="flex items-baseline justify-between gap-3 border-b border-base-300 py-2 last:border-0">
            <span className="muted text-sm">{label}</span>
            <span className="flex min-w-0 items-baseline gap-2">
              {player ? <PlayerLink seasonCode={seasonCode} player={player} className="truncate" /> : null}
              <span className="font-bold tabular-nums">{player ? formatCount(value) : formatMissing(null)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// `flowRows` are the extra rows from the score-flow and shot-split tables; without them the box-score rows stand alone.
function KeyStatsCard({ game, localTotal, roadTotal, flowRows }) {
  return (
    <Panel className="p-4">
      <div className="mb-2 grid grid-cols-2 gap-4">
        <div className="flex justify-end">
          <TeamLabel team={game.localTeam} />
        </div>
        <TeamLabel team={game.roadTeam} />
      </div>
      {[...keyStatRows(localTotal, roadTotal), ...flowRows].map(({ key, ...row }) => (
        <ComparisonRow key={key} {...row} />
      ))}
    </Panel>
  );
}

// Its own loading, error, and empty states, so play-by-play trouble never hides the rest of the Overview.
function FlowSection({ game, playByPlayQuery }) {
  const events = playByPlayQuery.data?.events;
  const flow = useMemo(
    () => (events ? computeGameFlow(events, game.localTeam?.clubCode, game.roadTeam?.clubCode) : null),
    [events, game.localTeam?.clubCode, game.roadTeam?.clubCode],
  );

  if (playByPlayQuery.isError) {
    return <AsyncState status="error" message="Could not load the score flow." onRetry={() => playByPlayQuery.refetch()} />;
  }
  if (!flow) return <AsyncState status="loading" label="Loading the score flow" compact />;
  return <ScoreFlowChart flow={flow} localTeam={game.localTeam} roadTeam={game.roadTeam} compact />;
}

// The game summary: line score, standouts, leaders, key stats, and a compact score flow.
export default function OverviewTab({ game, seasonCode, boxScoreQuery, playByPlayQuery, advancedQuery, teamFlowQuery }) {
  if (!game.played) {
    return <EmptyText>Overview isn't available until this game is played.</EmptyText>;
  }
  if (boxScoreQuery.isLoading) return <AsyncState status="loading" label="Loading the overview" />;
  if (boxScoreQuery.isError) {
    return <AsyncState status="error" message="Could not load the overview." onRetry={() => boxScoreQuery.refetch()} />;
  }

  const boxScore = boxScoreQuery.data;
  // Game PER when the game has advanced rows, otherwise PIR. A failed advanced request just means PIR.
  const metric = bestPlayerMetric(advancedQuery.data);
  const rankedStats = advancedQuery.data?.available === true ? attachAdvanced(boxScore, advancedQuery.data).playerStats : boxScore.playerStats;
  // The extra key-stat rows arrive when the team-flow request does; a failure or an empty answer adds none.
  const flowRows = teamFlowQuery.data?.available === true ? overviewFlowRows(teamFlowQuery.data.teams) : [];
  const localRows = rankedStats.filter((row) => row.side === "local");
  const roadRows = rankedStats.filter((row) => row.side === "road");
  const hasPlayers = boxScore.playerStats.length > 0;
  const totalFor = (side) => boxScore.teamStats.find((row) => row.side === side && row.statsKind === "total");
  const localTotal = totalFor("local");
  const roadTotal = totalFor("road");

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.section variants={sectionItem}>
        <PanelHeader kicker="LINE SCORE" title="Score by period" />
        <PeriodTable periodScores={boxScore.periodScores} localTeam={game.localTeam} roadTeam={game.roadTeam} />
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="STANDOUTS" title="Best player on each team" />
        {advancedQuery.isLoading ? (
          <AsyncState status="loading" label="Loading the best players" compact />
        ) : hasPlayers ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <StandoutCard team={game.localTeam} player={pickBestPlayer(localRows, metric)} metric={metric} seasonCode={seasonCode} />
            <StandoutCard team={game.roadTeam} player={pickBestPlayer(roadRows, metric)} metric={metric} seasonCode={seasonCode} />
          </div>
        ) : (
          <EmptyText>Player statistics aren't available for this game yet.</EmptyText>
        )}
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="GAME LEADERS" title="Points, rebounds and assists" />
        {hasPlayers ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <LeadersCard team={game.localTeam} rows={localRows} seasonCode={seasonCode} />
            <LeadersCard team={game.roadTeam} rows={roadRows} seasonCode={seasonCode} />
          </div>
        ) : (
          <EmptyText>Player statistics aren't available for this game yet.</EmptyText>
        )}
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="KEY STATS" title="How the teams compared" />
        {localTotal && roadTotal ? (
          <KeyStatsCard game={game} localTotal={localTotal} roadTotal={roadTotal} flowRows={flowRows} />
        ) : (
          <EmptyText>Team totals aren't available for this game yet.</EmptyText>
        )}
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="FLOW" title="Score flow" />
        <FlowSection game={game} playByPlayQuery={playByPlayQuery} />
      </motion.section>
    </motion.div>
  );
}
