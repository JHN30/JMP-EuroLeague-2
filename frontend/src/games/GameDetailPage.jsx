import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getBoxScore, getGame } from "../lib/api";

function CenteredSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-md">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function formatDateTime(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatMinutes(timePlayed) {
  if (timePlayed === null || timePlayed === undefined) return "-";
  const totalSeconds = Math.round(Number(timePlayed));
  if (!Number.isFinite(totalSeconds)) return "-";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

function TeamStatsTable({ teamStats, localTeam, roadTeam }) {
  const totals = teamStats.filter((row) => row.statsKind === "total");

  if (totals.length === 0) {
    return <p role="status" className="muted">Box score not available yet.</p>;
  }

  const columns = [
    ["points", "PTS"],
    ["fieldGoalsMadeTotal", "FGM"],
    ["fieldGoalsAttemptedTotal", "FGA"],
    ["freeThrowsMade", "FTM"],
    ["freeThrowsAttempted", "FTA"],
    ["totalRebounds", "REB"],
    ["assistances", "AST"],
    ["steals", "STL"],
    ["turnovers", "TO"],
    ["blocksFavour", "BLK"],
    ["valuation", "VAL"],
  ];

  return (
    <div className="panel overflow-x-auto overscroll-x-contain p-2">
      <table className="data-table-sticky table">
        <thead>
          <tr>
            <th>Team</th>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {totals.map((row) => {
            const name = row.side === "local" ? teamName(localTeam) : teamName(roadTeam);
            return (
              <tr key={row.side}>
                <td className="font-medium">
                  <span className="block max-w-40 truncate sm:max-w-56" title={name}>
                    {name}
                  </span>
                </td>
                {columns.map(([field, label]) => (
                  <td key={label}>{row[field] ?? "-"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayerStatsTable({ players, side, teamLabel }) {
  const rows = players.filter((row) => row.side === side);

  return (
    <div>
      <h3 className="mb-2 font-semibold">{teamLabel}</h3>
      {rows.length === 0 ? (
        <p role="status" className="muted">Box score not available yet.</p>
      ) : (
        <div className="panel overflow-x-auto overscroll-x-contain p-2">
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Min</th>
                <th>Pts</th>
                <th>Reb</th>
                <th>Ast</th>
                <th>Stl</th>
                <th>TO</th>
                <th>Val</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((player) => (
                <tr key={player.personKey}>
                  <td>
                    <div className="flex min-w-0 items-center gap-2">
                      {player.headshotUrl ? (
                        <img
                          src={player.headshotUrl}
                          alt=""
                          className="h-8 w-8 flex-none rounded-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <span className="max-w-40 truncate sm:max-w-56" title={player.personName ?? player.personKey}>
                        {player.personName ?? player.personKey}
                      </span>
                    </div>
                  </td>
                  <td>{formatMinutes(player.timePlayed)}</td>
                  <td>{player.points ?? "-"}</td>
                  <td>{player.totalRebounds ?? "-"}</td>
                  <td>{player.assistances ?? "-"}</td>
                  <td>{player.steals ?? "-"}</td>
                  <td>{player.turnovers ?? "-"}</td>
                  <td>{player.valuation ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function GameDetailPage() {
  const { seasonCode, gameCode } = useParams();

  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    retry: false,
  });

  const boxScoreQuery = useQuery({
    queryKey: ["box-score", seasonCode, gameCode],
    queryFn: () => getBoxScore(seasonCode, gameCode),
    enabled: gameQuery.isSuccess,
  });

  if (gameQuery.isLoading) return <CenteredSpinner />;

  if (gameQuery.isError) {
    const notFound = gameQuery.error?.response?.status === 404;
    return notFound ? (
      <p role="status" className="muted">Game not found.</p>
    ) : (
      <ErrorAlert message="Could not load this game." onRetry={() => gameQuery.refetch()} />
    );
  }

  const game = gameQuery.data.game;
  const localWon = game.played && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
  const roadWon = game.played && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;

  return (
    <div>
      <h1 className="mb-2 flex flex-wrap items-center gap-2 text-2xl font-semibold">
        <span className={`flex items-center gap-3 ${localWon ? "text-primary" : ""}`}>
          {game.localTeam?.crestUrl ? (
            <img
              src={game.localTeam.crestUrl}
              alt=""
              className="h-12 w-12 flex-none object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          {teamName(game.localTeam)}
        </span>
        <span className="muted mx-2 text-lg font-normal">vs</span>
        <span className={`flex items-center gap-3 ${roadWon ? "text-primary" : ""}`}>
          {game.roadTeam?.crestUrl ? (
            <img
              src={game.roadTeam.crestUrl}
              alt=""
              className="h-12 w-12 flex-none object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          {teamName(game.roadTeam)}
        </span>
      </h1>
      <p className="muted mb-6">
        {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · {formatDateTime(game.scheduledAt)}
      </p>

      {game.played ? (
        <div className="stat-callout mb-6">
          <span className="value">
            {game.localScore ?? "-"} - {game.roadScore ?? "-"}
          </span>
          <span className="label">Final</span>
        </div>
      ) : (
        <span className="stat-badge stat-badge-neutral mb-6 inline-flex">
          {game.gameStatus ?? "Scheduled"}
        </span>
      )}

      <h2 className="mb-3 text-xl font-semibold">Team stats</h2>
      {boxScoreQuery.isLoading ? (
        <CenteredSpinner />
      ) : boxScoreQuery.isError ? (
        <ErrorAlert message="Could not load box score." onRetry={() => boxScoreQuery.refetch()} />
      ) : (
        <TeamStatsTable
          teamStats={boxScoreQuery.data.teamStats}
          localTeam={game.localTeam}
          roadTeam={game.roadTeam}
        />
      )}

      {boxScoreQuery.isSuccess ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <PlayerStatsTable
            players={boxScoreQuery.data.playerStats}
            side="local"
            teamLabel={teamName(game.localTeam)}
          />
          <PlayerStatsTable
            players={boxScoreQuery.data.playerStats}
            side="road"
            teamLabel={teamName(game.roadTeam)}
          />
        </div>
      ) : null}
    </div>
  );
}
