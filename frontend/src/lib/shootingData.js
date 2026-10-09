import { useQueries, useQuery } from "@tanstack/react-query";
import { getPlayerShots, getShots } from "./api";
import { formatPercentage } from "./format";

// What the team and player Shooting tabs share: a shot's result, the "made-attempted (percent)" line, the view
// switches, and loading every played game's shot list.
export const isMade = (shot) => shot.actionCode.endsWith("M");

export function shootingLine(shots) {
  const made = shots.filter(isMade).length;
  return `${made}-${shots.length} (${formatPercentage(shots.length === 0 ? null : (made / shots.length) * 100)})`;
}

export const PRESENTATION_TABS = [
  { key: "heatmap", label: "Zone heatmap" },
  { key: "markers", label: "Every attempt" },
];

export const RESULT_TABS = [
  { key: "all", label: "All shots" },
  { key: "made", label: "Made" },
  { key: "missed", label: "Missed" },
];

// Every played game's shot list, combined. Games are cached one by one, so a game seen on another page is not fetched twice.
export function useSeasonShots(seasonCode, playedGames) {
  const queries = useQueries({
    queries: playedGames.map((game) => ({
      queryKey: ["shots", seasonCode, game.gameCode],
      queryFn: () => getShots(seasonCode, game.gameCode),
    })),
  });
  return {
    loading: queries.some((query) => query.isLoading),
    errored: queries.some((query) => query.isError),
    mappedGames: queries.filter((query) => query.isSuccess).length,
    shots: queries.flatMap((query) => query.data?.shots ?? []),
    retry: () => queries.forEach((query) => query.refetch()),
  };
}

// One player's shots in a phase, in a single request.
export function usePlayerShots(seasonCode, personKey, phaseCode, enabled) {
  const query = useQuery({
    queryKey: ["playerShots", seasonCode, personKey, phaseCode],
    queryFn: () => getPlayerShots(seasonCode, personKey, phaseCode),
    enabled,
  });
  return {
    loading: query.isLoading,
    errored: query.isError,
    shots: query.data?.shots ?? [],
    retry: () => query.refetch(),
  };
}
