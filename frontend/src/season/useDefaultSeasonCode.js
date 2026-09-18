import { useQuery } from "@tanstack/react-query";
import { getSeasonGames, getSeasons } from "../lib/api";

async function resolveDefaultSeasonCode() {
  const { seasons } = await getSeasons();
  if (seasons.length === 0) return null;

  for (const season of seasons) {
    // Games are ordered by scheduledAt ascending, so the first one is this
    // season's earliest fixture; if it has been played, the season is underway.
    const { games } = await getSeasonGames(season.seasonCode, { limit: 1 });
    if (games.length > 0 && games[0].played === true) return season.seasonCode;
  }

  return seasons[0].seasonCode;
}

export function useDefaultSeasonCode(enabled = true) {
  return useQuery({
    queryKey: ["default-season"],
    queryFn: resolveDefaultSeasonCode,
    enabled,
  });
}
