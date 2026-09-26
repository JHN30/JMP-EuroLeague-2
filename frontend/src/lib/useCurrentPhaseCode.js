import { useQuery } from "@tanstack/react-query";
import { getSeasonGames } from "./api";

// The most recently played game's phase is the season's current phase:
// phases play out in a fixed order (RS -> PI -> PO -> FF) with no overlap,
// so this one lightweight query stands in for fetching every phase's games
// and comparing dates. Falls back to "RS" before any game has been played.
export function useCurrentPhaseCode(seasonCode) {
  const query = useQuery({
    queryKey: ["current-phase-probe", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { status: "played", order: "desc", limit: 1 }),
  });
  return query.data?.games[0]?.phaseCode ?? "RS";
}
