import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { formatDateTime as formatTime } from "../lib/format";
import { WidgetPanel } from "./Dashboard";

function roundLabel(game) {
  return game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName);
}

function MatchCard({ game, standingByClubCode, seasonCode, showScore }) {
  const localEntry = game.localTeam?.clubCode ? standingByClubCode.get(game.localTeam.clubCode) : null;
  const roadEntry = game.roadTeam?.clubCode ? standingByClubCode.get(game.roadTeam.clubCode) : null;
  const localWon = showScore && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
  const roadWon = showScore && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;

  return (
    <Link to={`/${seasonCode}/games/${game.gameCode}`} className="match-card">
      <div className="match-card-head">
        <span>{roundLabel(game)}</span>
        <span className={`status-chip ${showScore ? "final" : "upcoming"}`}>
          {showScore ? "Final" : formatTime(game.scheduledAt)}
        </span>
      </div>
      <div className="game-teams">
        <div className={`game-team${localWon ? " win" : ""}`}>
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
          <span className="flex-1">{game.localTeam?.abbreviatedName ?? game.localTeam?.name ?? "TBD"}</span>
          {localEntry?.basic ? (
            <span className="record">
              {localEntry.basic.gamesWon}-{localEntry.basic.gamesLost}
            </span>
          ) : null}
          {showScore ? <span className="score">{game.localScore ?? "-"}</span> : null}
        </div>
        <div className={`game-team${roadWon ? " win" : ""}`}>
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
          <span className="flex-1">{game.roadTeam?.abbreviatedName ?? game.roadTeam?.name ?? "TBD"}</span>
          {roadEntry?.basic ? (
            <span className="record">
              {roadEntry.basic.gamesWon}-{roadEntry.basic.gamesLost}
            </span>
          ) : null}
          {showScore ? <span className="score">{game.roadScore ?? "-"}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function GameList({ kicker, title, seasonCode, queryKey, params, emptyMessage, showScore, standingByClubCode, standingsReady }) {
  const query = useQuery({
    queryKey,
    queryFn: () => getSeasonGames(seasonCode, params),
  });
  const games = query.data?.games ?? [];

  return (
    <WidgetPanel
      kicker={kicker}
      title={title}
      isLoading={query.isLoading || !standingsReady}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && games.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="games-list">
        {games.map((game) => (
          <MatchCard
            key={game.gameCode}
            game={game}
            standingByClubCode={standingByClubCode}
            seasonCode={seasonCode}
            showScore={showScore}
          />
        ))}
      </div>
    </WidgetPanel>
  );
}

export default function GamesSnapshot() {
  const { seasonCode } = useParams();
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const standingByClubCode = new Map(
    (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]),
  );

  return (
    <>
      <GameList
        kicker="RESULTS"
        title="Recent results"
        seasonCode={seasonCode}
        queryKey={["games", seasonCode, "played", "desc"]}
        params={{ status: "played", order: "desc", limit: 5 }}
        emptyMessage="No results yet."
        showScore
        standingByClubCode={standingByClubCode}
        standingsReady={standingsQuery.isSuccess || standingsQuery.isError}
      />
      <GameList
        kicker="SCHEDULE"
        title="Upcoming games"
        seasonCode={seasonCode}
        queryKey={["games", seasonCode, "scheduled", "asc"]}
        params={{ status: "scheduled", order: "asc", limit: 5 }}
        emptyMessage="No games scheduled yet."
        standingByClubCode={standingByClubCode}
        standingsReady={standingsQuery.isSuccess || standingsQuery.isError}
      />
    </>
  );
}
