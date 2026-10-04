import { getLeaderStats } from "../lib/api";

const LEADERBOARD_PAGE_LIMIT = 100;
const LEADERBOARD_MAX_PAGES = 5;

// The query key every page uses for the same leaderboard, so they share one cached request.
export function leaderboardQueryKey(seasonCode, phaseCode, mode = "perGame") {
  return ["league-leaderboard", seasonCode, phaseCode, mode];
}

// Every player's line for one season, phase and mode (per game or accumulated), which is what a player's ranks are
// measured against.
export async function fetchLeagueLeaderboard(seasonCode, phaseCode, mode = "perGame") {
  const players = [];
  let offset = 0;
  for (let page = 0; page < LEADERBOARD_MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode,
      limit: LEADERBOARD_PAGE_LIMIT,
      offset,
    });
    players.push(...data.players);
    if (!data.pagination.hasMore) break;
    offset += LEADERBOARD_PAGE_LIMIT;
  }
  return players;
}
