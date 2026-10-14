import { useQueries } from "@tanstack/react-query";
import { getGame } from "./api";
import { useSeasonFormat } from "./useSeasonFormat";

// The clubs that played a recorded forfeit in a stage (E2001 and E2003 Top 16). The source's team totals for such a club are empty
// for that stage, because one game with no performance data leaves its sums without a value; the pages say so instead of showing
// dashes or leaving the club off a board without a word. Names come from the game's own teams.
export function useForfeitClubs(seasonCode, phaseCode) {
  const exceptions = (useSeasonFormat(seasonCode).data?.exceptions ?? []).filter((entry) => entry.kind === "walkover" && entry.stage === phaseCode);
  const queries = useQueries({
    queries: exceptions.map((entry) => ({ queryKey: ["game", seasonCode, entry.gameCode], queryFn: () => getGame(seasonCode, entry.gameCode) })),
  });
  const clubs = new Map();
  for (const query of queries) {
    const game = query.data?.game ?? query.data;
    for (const team of [game?.localTeam, game?.roadTeam]) if (team?.clubCode) clubs.set(team.clubCode, team.abbreviatedName ?? team.name ?? team.clubCode);
  }
  return clubs;
}
