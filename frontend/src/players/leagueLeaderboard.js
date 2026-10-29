import { getLeaderStats } from "../lib/api";

const LEADERBOARD_PAGE_LIMIT = 100;
const LEADERBOARD_MAX_PAGES = 5;

// The query key every page uses for the same leaderboard, so they share one cached request.
export function leaderboardQueryKey(seasonCode, phaseCode, mode = "perGame") {
  return ["league-leaderboard", seasonCode, phaseCode, mode];
}

// Every player's line for one season, phase and mode (per game or accumulated), which is what a player's ranks are
// measured against, in the API's order (its tie-break when it sorts). The first page says how many there are, and the
// rest are read together.
export async function fetchLeagueLeaderboard(seasonCode, phaseCode, mode = "perGame") {
  const page = (offset) => getLeaderStats(seasonCode, { phase: phaseCode, mode, limit: LEADERBOARD_PAGE_LIMIT, offset });
  const first = await page(0);
  const total = Math.min(first.pagination.total, LEADERBOARD_PAGE_LIMIT * LEADERBOARD_MAX_PAGES);
  const offsets = [];
  for (let offset = LEADERBOARD_PAGE_LIMIT; offset < total; offset += LEADERBOARD_PAGE_LIMIT) offsets.push(offset);
  const rest = await Promise.all(offsets.map(page));
  return [first, ...rest].flatMap((data) => data.players);
}
