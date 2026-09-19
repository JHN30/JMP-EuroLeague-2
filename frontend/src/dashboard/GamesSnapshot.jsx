import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonGames } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

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
        {games.map((game) => {
          const localWon = showScore && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
          const roadWon = showScore && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;
          return (
            <li key={game.gameCode}>
              <Link
                to={`/${seasonCode}/games/${game.gameCode}`}
                className="flex items-center justify-between gap-3 rounded-field hover:text-primary"
              >
                <span className={localWon ? "font-semibold" : "muted"}>
                  {game.localTeam?.abbreviatedName ?? game.localTeam?.name ?? "TBD"}
                </span>
                {showScore ? (
                  <span className="stat-badge stat-badge-neutral tabular-nums">
                    {game.localScore ?? "-"}-{game.roadScore ?? "-"}
                  </span>
                ) : (
                  <span className="muted text-sm">vs</span>
                )}
                <span className={roadWon ? "font-semibold" : "muted"}>
                  {game.roadTeam?.abbreviatedName ?? game.roadTeam?.name ?? "TBD"}
                </span>
              </Link>
            </li>
          );
        })}
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
