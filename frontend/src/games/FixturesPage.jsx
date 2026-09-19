import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getPhases, getRounds, getSeasonGames } from "../lib/api";

const PAGE_SIZE = 20;
const ALL_ROUND_LIMIT = 100;

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Played", value: "played" },
  { label: "Scheduled", value: "scheduled" },
];

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

export default function FixturesPage() {
  const { seasonCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [status, setStatus] = useState(undefined);
  const [offset, setOffset] = useState(0);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const rounds = roundsQuery.data?.rounds ?? [];

  function handlePhaseChange(code) {
    setSelectedPhase(code);
    setSelectedRound(null);
    setOffset(0);
  }

  function handleRoundChange(event) {
    setSelectedRound(event.target.value === "" ? null : Number(event.target.value));
    setOffset(0);
  }

  function handleStatusChange(value) {
    setStatus(value);
    setOffset(0);
  }

  const gamesParams = selectedRound
    ? { phase: phaseCode, round: selectedRound, status, limit: ALL_ROUND_LIMIT, order: "asc" }
    : { phase: phaseCode, status, limit: PAGE_SIZE, offset, order: "asc" };

  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, selectedRound, status, offset],
    queryFn: () => getSeasonGames(seasonCode, gamesParams),
    enabled: Boolean(phaseCode),
  });

  const games = gamesQuery.data?.games ?? [];

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Fixtures and results</h1>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
        {phases.map((phase) => (
          <button
            key={phase.code}
            role="tab"
            type="button"
            className={`tab font-semibold ${phaseCode === phase.code ? "tab-active" : ""}`}
            onClick={() => handlePhaseChange(phase.code)}
          >
            {phase.name ?? phase.code}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          aria-label="Round"
          className="select select-bordered select-sm"
          value={selectedRound ?? ""}
          onChange={handleRoundChange}
          disabled={roundsQuery.isLoading}
        >
          <option value="">All rounds</option>
          {rounds.map((round) => (
            <option key={round.key} value={round.number}>
              {round.name ?? `Round ${round.number}`}
            </option>
          ))}
        </select>

        <div role="tablist" className="tabs tabs-boxed tabs-sm w-fit">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              role="tab"
              type="button"
              className={`tab font-semibold ${status === filter.value ? "tab-active" : ""}`}
              onClick={() => handleStatusChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {gamesQuery.isLoading ? (
        <CenteredSpinner />
      ) : gamesQuery.isError ? (
        <ErrorAlert message="Could not load games." onRetry={() => gamesQuery.refetch()} />
      ) : games.length === 0 ? (
        <p className="muted">No games match these filters.</p>
      ) : (
        <>
          <div className="panel p-4">
            <ul>
              {games.map((game) => {
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
                          <span className={`flex items-center gap-2 ${localWon ? "font-semibold" : ""}`}>
                            {game.localTeam?.crestUrl ? (
                              <img
                                src={game.localTeam.crestUrl}
                                alt=""
                                className="h-6 w-6 flex-none object-contain"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            {teamLabel(game.localTeam)}
                          </span>
                          <span className="muted text-xs">vs</span>
                          <span className={`flex items-center gap-2 ${roadWon ? "font-semibold" : ""}`}>
                            {game.roadTeam?.crestUrl ? (
                              <img
                                src={game.roadTeam.crestUrl}
                                alt=""
                                className="h-6 w-6 flex-none object-contain"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : null}
                            {teamLabel(game.roadTeam)}
                          </span>
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

          {!selectedRound ? (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              >
                Previous page
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!gamesQuery.data?.pagination.hasMore}
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
              >
                Next page
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
