import { useQuery } from "@tanstack/react-query";
import { getPlayerSeasonStats } from "../lib/api";

// The two players' per-game season-statistics rows (headshot, club, games), under the key the Statistics tab uses, for the header at the top of
// each tab. A row is undefined until it arrives, and stays so if it cannot be loaded: the header then shows the names alone.
export default function usePlayerRows(seasonCode, phaseCode, entityA, entityB) {
  const optionsFor = (entity) => ({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, "perGame", entity.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entity.id, { phase: phaseCode, mode: "perGame" }),
    enabled: Boolean(phaseCode),
  });
  const queryA = useQuery(optionsFor(entityA));
  const queryB = useQuery(optionsFor(entityB));
  return [queryA.data?.players?.[0], queryB.data?.players?.[0]];
}
