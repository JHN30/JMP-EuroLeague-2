import { useQuery } from "@tanstack/react-query";
import { getSeasonGames } from "../lib/api";

// A round never holds more than a handful of games; this is the API's page cap (the Games page asks the same).
const ROUND_GAME_LIMIT = 100;

// The round with the next game to play: its first game to come, and then every game of that round. The Teams tab's games and the Players
// tab's star matchups read the same queries.
export function useUpcomingRound(seasonCode) {
  const nextQuery = useQuery({
    queryKey: ["compare-next-game", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 1 }),
  });
  const nextGame = nextQuery.data?.games[0] ?? null;
  const phaseCode = nextGame?.phaseCode ?? null;
  const roundNumber = nextGame?.roundNumber ?? null;

  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, roundNumber],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, round: roundNumber, limit: ROUND_GAME_LIMIT, order: "asc" }),
    enabled: Boolean(phaseCode) && roundNumber !== null,
  });
  return { nextQuery, gamesQuery, nextGame, phaseCode, roundNumber, games: gamesQuery.data?.games ?? [] };
}
