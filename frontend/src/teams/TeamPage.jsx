import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getPhases, getSeasonStandings, getTeam, getTeamGames, getTeamRoster } from "../lib/api";

const ROSTER_LIMIT = 100;
const GAMES_LIMIT = 100;

function CenteredSpinner() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-md">
      <span>{message}</span>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function formatDateTime(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

function opponent(game, clubCode) {
  const home = game.localTeam?.clubCode === clubCode;
  return { team: home ? game.roadTeam : game.localTeam, home };
}

function SeasonRecordSection({ standingsQuery, clubCode }) {
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load the season record." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  if (!entry || !entry.basic) {
    return <p className="muted">Standings not available yet for this phase.</p>;
  }
  const basic = entry.basic;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      <div>
        <dt className="muted text-sm">Position</dt>
        <dd className="font-semibold">{basic.position ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Record</dt>
        <dd className="font-semibold">
          {basic.gamesWon ?? "-"}-{basic.gamesLost ?? "-"} ({basic.gamesPlayed ?? "-"} GP)
        </dd>
      </div>
      <div>
        <dt className="muted text-sm">Win %</dt>
        <dd className="font-semibold">{basic.winPercentage ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Points for/against</dt>
        <dd className="font-semibold">
          {basic.pointsFor ?? "-"} / {basic.pointsAgainst ?? "-"}
        </dd>
      </div>
      <div>
        <dt className="muted text-sm">Differential</dt>
        <dd className="font-semibold">{basic.pointsDifference ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Home record</dt>
        <dd className="font-semibold">{basic.homeRecord ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Away record</dt>
        <dd className="font-semibold">{basic.awayRecord ?? "-"}</dd>
      </div>
      <div>
        <dt className="muted text-sm">Last 10</dt>
        <dd className="font-semibold">{basic.lastTenRecord ?? "-"}</dd>
      </div>
    </dl>
  );
}

function TeamStatisticsSection({ standingsQuery, clubCode }) {
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load team statistics." onRetry={() => standingsQuery.refetch()} />;
  }
  const entry = standingsQuery.data.standings.find((row) => row.clubCode === clubCode);
  const margins = entry?.margins;
  if (!margins) {
    return <p className="muted">Team statistics not available yet for this phase.</p>;
  }
  const rows = [
    ["Decided by 1-5 pts", margins.pointDifference1To5],
    ["Decided by 6-10 pts", margins.pointDifference6To10],
    ["Decided by 11-15 pts", margins.pointDifference11To15],
    ["Decided by 15+ pts", margins.pointDifferenceMoreThan15],
    ["Rebounds", margins.rebounds],
    ["Assists", margins.assists],
    ["Blocks", margins.blocks],
    ["Two-pointers", margins.twoPointers],
    ["Three-pointers", margins.threePointers],
    ["Free throws", margins.freeThrows],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="muted text-sm">{label}</dt>
          <dd className="font-semibold">{value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

function RosterSection({ rosterQuery }) {
  if (rosterQuery.isPending) return <CenteredSpinner />;
  if (rosterQuery.isError) {
    return <ErrorAlert message="Could not load the roster." onRetry={() => rosterQuery.refetch()} />;
  }
  const registrations = rosterQuery.data.registrations ?? [];
  if (registrations.length === 0) {
    return <p className="muted">Roster not available yet.</p>;
  }
  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Position</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((entry) => (
            <tr key={entry.registrationKey}>
              <td>{entry.dorsal ?? "-"}</td>
              <td className="font-medium">{entry.player?.name ?? "TBD"}</td>
              <td>{entry.positionName ?? "-"}</td>
              <td>{entry.active === false ? "Inactive" : "Active"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleSection({ gamesQuery, clubCode }) {
  if (gamesQuery.isPending) return <CenteredSpinner />;
  if (gamesQuery.isError) {
    return <ErrorAlert message="Could not load the schedule." onRetry={() => gamesQuery.refetch()} />;
  }
  const games = gamesQuery.data.games ?? [];
  if (games.length === 0) {
    return <p className="muted">No games scheduled yet.</p>;
  }
  return (
    <div className="panel p-4">
      <ul>
        {games.map((game) => {
          const { team, home } = opponent(game, clubCode);
          const hasScores = game.localScore != null && game.roadScore != null;
          const teamWon = game.played && hasScores && (home ? game.localScore > game.roadScore : game.roadScore > game.localScore);
          const teamLost = game.played && hasScores && (home ? game.roadScore > game.localScore : game.localScore > game.roadScore);
          return (
            <li key={game.gameCode} className="flex items-center justify-between gap-4 border-b border-base-300 py-2 last:border-0">
              <div className="flex flex-col">
                <span>
                  {home ? "vs" : "@"} {teamLabel(team)}
                </span>
                <span className="muted text-sm">
                  {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} ·{" "}
                  {formatDateTime(game.scheduledAt)}
                </span>
              </div>
              {game.played ? (
                <span
                  className={`stat-badge tabular-nums ${teamWon ? "stat-badge-positive" : teamLost ? "stat-badge-negative" : "stat-badge-neutral"}`}
                >
                  {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                </span>
              ) : (
                <span className="muted text-sm">Not yet played</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function TeamPage() {
  const { seasonCode, clubCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);

  const teamQuery = useQuery({
    queryKey: ["team", seasonCode, clubCode],
    queryFn: () => getTeam(seasonCode, clubCode),
    retry: false,
  });

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
    enabled: teamQuery.isSuccess,
  });
  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: teamQuery.isSuccess && Boolean(phaseCode),
  });

  const rosterQuery = useQuery({
    queryKey: ["team-roster", seasonCode, clubCode],
    queryFn: () => getTeamRoster(seasonCode, clubCode, { limit: ROSTER_LIMIT }),
    enabled: teamQuery.isSuccess,
  });

  const gamesQuery = useQuery({
    queryKey: ["team-games", seasonCode, clubCode],
    queryFn: () => getTeamGames(seasonCode, clubCode, { limit: GAMES_LIMIT, order: "asc" }),
    enabled: teamQuery.isSuccess,
  });

  if (teamQuery.isLoading) return <CenteredSpinner />;

  if (teamQuery.isError) {
    const notFound = teamQuery.error?.response?.status === 404;
    return notFound ? (
      <p className="muted">Team not found.</p>
    ) : (
      <ErrorAlert message="Could not load this team." onRetry={() => teamQuery.refetch()} />
    );
  }

  const team = teamQuery.data.team;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {team.crestUrl ? <img src={team.crestUrl} alt="" className="h-16 w-16 object-contain" /> : null}
        <div>
          <h1 className="text-2xl font-semibold">{team.name ?? team.abbreviatedName ?? team.clubCode}</h1>
          <p className="muted">
            {team.abbreviatedName ?? team.clubCode} · {team.countryCode ?? "-"}
          </p>
        </div>
      </div>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-6 w-fit">
        {phases.map((phase) => (
          <button
            key={phase.code}
            role="tab"
            type="button"
            className={`tab font-semibold ${phaseCode === phase.code ? "tab-active" : ""}`}
            onClick={() => setSelectedPhase(phase.code)}
          >
            {phase.name ?? phase.code}
          </button>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Season record</h2>
        <SeasonRecordSection standingsQuery={standingsQuery} clubCode={clubCode} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Team statistics</h2>
        <TeamStatisticsSection standingsQuery={standingsQuery} clubCode={clubCode} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Roster</h2>
        <RosterSection rosterQuery={rosterQuery} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Schedule and results</h2>
        <ScheduleSection gamesQuery={gamesQuery} clubCode={clubCode} />
      </section>
    </div>
  );
}
