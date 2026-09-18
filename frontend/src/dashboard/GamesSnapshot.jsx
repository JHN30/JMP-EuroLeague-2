import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonGames } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

function formatGame(game) {
  const local = game.localTeam?.abbreviatedName ?? game.localTeam?.name ?? "TBD";
  const road = game.roadTeam?.abbreviatedName ?? game.roadTeam?.name ?? "TBD";
  return `${local} vs ${road}`;
}

function GameList({ title, seasonCode, queryKey, params, emptyMessage, showScore }) {
  const query = useQuery({
    queryKey,
    queryFn: () => getSeasonGames(seasonCode, params),
  });
  const games = query.data?.games ?? [];

  return (
    <WidgetPanel
      title={title}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && games.length === 0}
      emptyMessage={emptyMessage}
    >
      <ul className="space-y-2">
        {games.map((game) => (
          <li key={game.gameCode} className="flex items-center justify-between">
            <Link to={`/${seasonCode}/games/${game.gameCode}`} className="link link-hover">
              {formatGame(game)}
            </Link>
            {showScore ? (
              <span className="muted">
                {game.localScore ?? "-"}-{game.roadScore ?? "-"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </WidgetPanel>
  );
}

export default function GamesSnapshot() {
  const { seasonCode } = useParams();

  return (
    <>
      <GameList
        title="Recent results"
        seasonCode={seasonCode}
        queryKey={["games", seasonCode, "played", "desc"]}
        params={{ status: "played", order: "desc", limit: 5 }}
        emptyMessage="No results yet."
        showScore
      />
      <GameList
        title="Upcoming games"
        seasonCode={seasonCode}
        queryKey={["games", seasonCode, "scheduled", "asc"]}
        params={{ status: "scheduled", order: "asc", limit: 5 }}
        emptyMessage="No games scheduled yet."
      />
    </>
  );
}
