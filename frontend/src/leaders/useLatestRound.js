import { useQuery } from "@tanstack/react-query";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { statNumber } from "./leaderData";

// A round never holds more than a handful of games; this is the API's page cap (the Games page asks the same).
const ROUND_GAME_LIMIT = 100;

// The stage's latest standings round, and whether it is still being played. The source has a round's standings from its first game,
// so until every game of that round is played the round is in progress: `played` of its `total` games. A stage without standings
// (the postseason) has no rounds (`round` 0). The round's games share the home page's query.
export function useLatestRound(seasonCode, phaseCode) {
  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, phaseCode], queryFn: () => getSeasonStandings(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const round = standingsQuery.data?.standings?.length ? (statNumber(standingsQuery.data.round) ?? 0) : 0;
  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, round],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, round, limit: ROUND_GAME_LIMIT, order: "asc" }),
    enabled: Boolean(phaseCode) && round > 0,
  });
  const games = gamesQuery.data?.games ?? [];
  const played = games.filter((game) => game.played === true).length;
  return {
    round,
    inProgress: played < games.length,
    played,
    total: games.length,
    standingsData: standingsQuery.data,
    isLoading: standingsQuery.isLoading || (round > 0 && gamesQuery.isLoading),
  };
}
