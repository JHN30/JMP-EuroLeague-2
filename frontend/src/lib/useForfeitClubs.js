import { useQueries } from "@tanstack/react-query";
import { getGame } from "./api";
import { useSeasonFormat } from "./useSeasonFormat";

// The clubs that played a recorded forfeit in a stage (E2001 and E2003 Top 16), each with its opponent and the awarded score from its own
// side. The source's team totals for such a club cover only the real games, so they are one game short of the standings; the pages say so
// next to the totals. Names come from the game's own teams.
export function useForfeitClubs(seasonCode, phaseCode) {
  const exceptions = (useSeasonFormat(seasonCode).data?.exceptions ?? []).filter((entry) => entry.kind === "walkover" && entry.stage === phaseCode);
  const queries = useQueries({
    queries: exceptions.map((entry) => ({ queryKey: ["game", seasonCode, entry.gameCode], queryFn: () => getGame(seasonCode, entry.gameCode) })),
  });
  const clubs = new Map();
  for (const query of queries) {
    const game = query.data?.game ?? query.data;
    const local = game?.localTeam;
    const road = game?.roadTeam;
    if (!local?.clubCode || !road?.clubCode || game.localScore == null || game.roadScore == null) continue;
    const label = (team) => team.abbreviatedName ?? team.name ?? team.clubCode;
    clubs.set(local.clubCode, { name: label(local), opponent: label(road), own: game.localScore, other: game.roadScore });
    clubs.set(road.clubCode, { name: label(road), opponent: label(local), own: game.roadScore, other: game.localScore });
  }
  return clubs;
}
