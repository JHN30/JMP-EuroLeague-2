import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPhases, getSeasonGames } from "../lib/api";

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

function MatchupCard({ seasonCode, groupName, games }) {
  const sorted = [...games].sort((a, b) => (a.roundNumber ?? Infinity) - (b.roundNumber ?? Infinity));

  return (
    <div className="panel p-4">
      <h3 className="panel-title mb-3">{groupName}</h3>
      <ul>
        {sorted.map((game) => {
          const localWon = game.played && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
          const roadWon = game.played && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;
          return (
            <li key={game.gameCode} className="border-b border-base-300 py-2 last:border-0">
              <Link
                to={`/${seasonCode}/games/${game.gameCode}`}
                className="flex items-center justify-between gap-4 rounded-field hover:text-primary"
              >
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className={localWon ? "font-semibold" : undefined}>{teamLabel(game.localTeam)}</span>
                    <span className="muted text-xs">vs</span>
                    <span className={roadWon ? "font-semibold" : undefined}>{teamLabel(game.roadTeam)}</span>
                  </span>
                  <span className="muted text-sm">
                    {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : "")} · {formatDateTime(game.scheduledAt)}
                  </span>
                </div>
                {game.played ? (
                  <span className="stat-badge stat-badge-neutral tabular-nums">
                    {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                  </span>
                ) : (
                  <span className="muted text-sm">Not yet played</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MatchupGroups({ seasonCode, games }) {
  if (games.length === 0) {
    return <p className="muted">No games scheduled yet for this phase.</p>;
  }

  const groups = new Map();
  for (const game of games) {
    const key = game.groupId ?? game.groupName ?? "ungrouped";
    if (!groups.has(key)) groups.set(key, { groupName: game.groupName ?? "Matchup", games: [] });
    groups.get(key).games.push(game);
  }

  const sortedGroups = [...groups.entries()].sort(
    ([, a], [, b]) =>
      Math.min(...a.games.map((game) => game.roundNumber ?? Infinity)) -
      Math.min(...b.games.map((game) => game.roundNumber ?? Infinity)),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sortedGroups.map(([key, group]) => (
        <MatchupCard key={key} seasonCode={seasonCode} groupName={group.groupName} games={group.games} />
      ))}
    </div>
  );
}

export default function PlayoffsPage() {
  const { seasonCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const postseasonPhases = (phasesQuery.data?.phases ?? []).filter((phase) => phase.code !== "RS");
  const phaseCode = selectedPhase ?? postseasonPhases[0]?.code;

  const gamesQuery = useQuery({
    queryKey: ["playoff-games", seasonCode, phaseCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, limit: 100 }),
    enabled: Boolean(phaseCode),
  });

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Playoffs</h1>

      {postseasonPhases.length === 0 ? (
        <p className="muted">The postseason has not started yet for this season.</p>
      ) : (
        <>
          <div role="tablist" className="tabs tabs-boxed tabs-sm mb-6 w-fit">
            {postseasonPhases.map((phase) => (
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

          {gamesQuery.isPending ? (
            <CenteredSpinner />
          ) : gamesQuery.isError ? (
            <ErrorAlert message="Could not load games." onRetry={() => gamesQuery.refetch()} />
          ) : (
            <MatchupGroups seasonCode={seasonCode} games={gamesQuery.data.games} />
          )}
        </>
      )}
    </div>
  );
}
