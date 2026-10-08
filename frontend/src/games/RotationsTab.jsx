import { useMemo } from "react";
import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatMinutes } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import LineupsSection from "./LineupsSection";
import PlayerLink from "./PlayerLink";
import { computeConnections, computeRotations } from "./rotations";
import TeamLabel from "./TeamLabel";

// Below sm a player row is two lines (the name and the minutes, then the bar across the whole panel) and the period ruler is
// one full-width row; from sm the name, the bar and the minutes share one line.
const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-2 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_3.5rem] sm:gap-3";
const RULER_GRID = "grid grid-cols-1 items-center sm:grid-cols-[11rem_minmax(0,1fr)_3.5rem] sm:gap-3";

const percent = (seconds, total) => `${(seconds / total) * 100}%`;

function ReconciliationBadge({ side }) {
  const text = side.matches ? "Matches the box score" : `Approximate · up to ${side.maxDifference} s off the box score`;
  return <span className={`stat-badge ${side.matches ? "stat-badge-success" : "stat-badge-warning"}`}>{text}</span>;
}

function TeamTimeline({ team, side, periods, gameSeconds, seasonCode }) {
  return (
    <Panel className="p-4 max-sm:p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TeamLabel team={team} />
        {side.status === "ok" ? <ReconciliationBadge side={side} /> : null}
      </div>

      {side.status !== "ok" ? (
        <p className="muted text-sm">On-court times aren't available for this team.</p>
      ) : (
        <>
          <div className={`${RULER_GRID} mb-1`} aria-hidden="true">
            <span className="max-sm:hidden" />
            <div className="relative h-4">
              {periods.map((period) => (
                <span
                  key={period.number}
                  className="muted absolute text-[0.65rem] font-bold tracking-wide uppercase"
                  style={{ left: percent(period.start, gameSeconds) }}
                >
                  {period.number <= 4 ? `Q${period.number}` : `OT${period.number - 4}`}
                </span>
              ))}
            </div>
            <span className="muted text-right text-[0.65rem] font-bold tracking-wide uppercase max-sm:hidden">Min</span>
          </div>
          <ul>
            {side.rows.map(({ player, stints, seconds }) => (
              <li key={player.personKey} className={`${ROW_GRID} border-b border-base-300 py-1 max-sm:py-1.5 last:border-0`}>
                <PlayerLink seasonCode={seasonCode} player={player} className="truncate text-sm" />
                <span className="sr-only">
                  On court: {stints.map((stint) => `${stint.startLabel} to ${stint.endLabel}`).join(", ")}
                </span>
                <div className="relative h-5 rounded-sm bg-base-200 max-sm:col-span-2 max-sm:row-start-2" aria-hidden="true">
                  {periods.slice(1).map((period) => (
                    <span key={period.number} className="absolute inset-y-0 w-px bg-base-300" style={{ left: percent(period.start, gameSeconds) }} />
                  ))}
                  {stints.map((stint) => (
                    <span
                      key={stint.start}
                      className="absolute inset-y-0.5 rounded-sm bg-primary"
                      style={{ left: percent(stint.start, gameSeconds), width: percent(stint.end - stint.start, gameSeconds) }}
                      title={`${stint.startLabel} to ${stint.endLabel}`}
                    />
                  ))}
                </div>
                <span className="text-right text-sm tabular-nums max-sm:col-start-2 max-sm:row-start-1">{formatMinutes(seconds)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

// Reads the pipeline's on-court intervals and the box score; it never waits on the play-by-play.
function TimelineSection({ game, seasonCode, boxScoreQuery, lineupsQuery }) {
  const onCourt = lineupsQuery.data?.onCourt;
  const gameSeconds = lineupsQuery.data?.gameSeconds;
  const playerStats = boxScoreQuery.data?.playerStats;
  const rotations = useMemo(
    () => (onCourt && playerStats ? computeRotations({ onCourt, playerStats, gameSeconds }) : null),
    [onCourt, playerStats, gameSeconds],
  );

  if (lineupsQuery.isError) {
    return <AsyncState status="error" message="Could not load rotations." onRetry={() => lineupsQuery.refetch()} />;
  }
  if (boxScoreQuery.isError) {
    return <AsyncState status="error" message="Could not load the box score for rotations." onRetry={() => boxScoreQuery.refetch()} />;
  }
  if (!rotations) return <AsyncState status="loading" label="Loading rotations" compact />;
  if (rotations.status === "empty") return <EmptyText>Rotations aren't available for this game yet.</EmptyText>;

  return (
    <div className="flex flex-col gap-4">
      <TeamTimeline team={game.localTeam} side={rotations.sides.local} periods={rotations.periods} gameSeconds={rotations.gameSeconds} seasonCode={seasonCode} />
      <TeamTimeline team={game.roadTeam} side={rotations.sides.road} periods={rotations.periods} gameSeconds={rotations.gameSeconds} seasonCode={seasonCode} />
    </div>
  );
}

function TeamConnections({ team, connections, seasonCode }) {
  const { pairs, linked, recorded, madeFieldGoals } = connections;

  return (
    <Panel className="p-4 max-sm:p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TeamLabel team={team} />
        {recorded > 0 ? (
          <span className="muted text-sm tabular-nums">
            Assisted baskets: {linked} of {madeFieldGoals}
          </span>
        ) : null}
      </div>
      {recorded === 0 ? (
        <p className="muted text-sm">No assists recorded.</p>
      ) : pairs.length === 0 ? (
        <p className="muted text-sm">No assist could be linked to a basket.</p>
      ) : (
        <ul>
          {pairs.map((pair) => (
            <li key={pair.key} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-base-300 py-2 last:border-0">
              <span className="min-w-0">
                <PlayerLink seasonCode={seasonCode} player={pair.passer} />
                <span aria-hidden="true" className="muted mx-2">→</span>
                <span className="sr-only"> assisted </span>
                <PlayerLink seasonCode={seasonCode} player={pair.scorer} />
              </span>
              <span className="text-sm tabular-nums">
                {pair.baskets} {pair.baskets === 1 ? "basket" : "baskets"} · {pair.points} pts
              </span>
            </li>
          ))}
        </ul>
      )}
      {recorded > 0 ? (
        <p className="muted mt-2 text-xs">
          {linked} of {recorded} recorded assists were linked to a basket.
        </p>
      ) : null}
    </Panel>
  );
}

// Needs only the play-by-play, so it never waits on the box score or the lineups.
function ConnectionsSection({ game, seasonCode, playByPlayQuery }) {
  const events = playByPlayQuery.data?.events;
  const connections = useMemo(
    () =>
      events
        ? computeConnections({ events, clubCodes: { local: game.localTeam?.clubCode, road: game.roadTeam?.clubCode } })
        : null,
    [events, game.localTeam?.clubCode, game.roadTeam?.clubCode],
  );

  if (playByPlayQuery.isError) {
    return <AsyncState status="error" message="Could not load assist connections." onRetry={() => playByPlayQuery.refetch()} />;
  }
  if (!connections) return <AsyncState status="loading" label="Loading assist connections" compact />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TeamConnections team={game.localTeam} connections={connections.local} seasonCode={seasonCode} />
      <TeamConnections team={game.roadTeam} connections={connections.road} seasonCode={seasonCode} />
    </div>
  );
}

// Who was on the court and when and which five-man units played together come from the pipeline; who scored off whose
// assists is built from the play-by-play. Each section loads, fails and retries on its own.
export default function RotationsTab({ game, seasonCode, boxScoreQuery, playByPlayQuery, lineupsQuery }) {
  if (!game.played) {
    return <EmptyText>Rotations aren't available until this game is played.</EmptyText>;
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.section variants={sectionItem}>
        <PanelHeader kicker="ROTATIONS" title="Minutes on the court" />
        <TimelineSection game={game} seasonCode={seasonCode} boxScoreQuery={boxScoreQuery} lineupsQuery={lineupsQuery} />
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="CONNECTIONS" title="Assist connections" />
        <ConnectionsSection game={game} seasonCode={seasonCode} playByPlayQuery={playByPlayQuery} />
      </motion.section>

      <motion.section variants={sectionItem}>
        <PanelHeader kicker="LINEUPS" title="Five-man units" />
        <LineupsSection game={game} seasonCode={seasonCode} boxScoreQuery={boxScoreQuery} lineupsQuery={lineupsQuery} />
      </motion.section>
    </motion.div>
  );
}
