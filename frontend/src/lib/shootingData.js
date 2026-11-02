import { useQueries, useQuery } from "@tanstack/react-query";
import { getPlayerShots, getPositionShots, getShots } from "./api";
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

// The context flags packed into a compact shot row, as the API writes them.
const FAST_BREAK_FLAG = 1;
const SECOND_CHANCE_FLAG = 2;
const OFF_TURNOVER_FLAG = 4;

// A stable function, so React Query unpacks the rows once per response rather than on every render.
function unpackPositionShots(data) {
  return {
    players: data.players,
    shots: data.shots.map(([coordX, coordY, actionCode, minute, flags, personCode]) => ({
      coordX,
      coordY,
      actionCode,
      minute,
      personCode,
      points: actionCode.startsWith("3") ? 3 : 2,
      fastbreak: Boolean(flags & FAST_BREAK_FLAG),
      secondChance: Boolean(flags & SECOND_CHANCE_FLAG),
      pointsOffTurnover: Boolean(flags & OFF_TURNOVER_FLAG),
    })),
  };
}

// Every shot of a phase by one position's players (null: every player), unpacked from the API's compact rows
// [coordX, coordY, actionCode, minute, flags, personCode] into the shot objects the courts and tables read. `players` lists
// each shooter once: { personCode, name, club, games } (games played in the phase).
export function usePositionShots(seasonCode, phaseCode, position, enabled) {
  const query = useQuery({
    queryKey: ["positionShots", seasonCode, phaseCode, position],
    queryFn: () => getPositionShots(seasonCode, phaseCode, position),
    enabled,
    select: unpackPositionShots,
  });
  return {
    loading: query.isLoading,
    errored: query.isError,
    players: query.data?.players ?? [],
    shots: query.data?.shots ?? [],
    retry: () => query.refetch(),
  };
}
