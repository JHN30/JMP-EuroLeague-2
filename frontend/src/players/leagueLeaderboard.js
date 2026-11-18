import { getLeaderStats } from "../lib/api";

// The API's largest /season-stats page, more than a season's players (about 300-350), so one request holds them all.
const LEADERBOARD_LIMIT = 500;

// The query key every page uses for the same leaderboard, so they share one cached request.
export function leaderboardQueryKey(seasonCode, phaseCode, mode = "perGame") {
  return ["league-leaderboard", seasonCode, phaseCode, mode];
}

// Every player's line for one season, phase and mode (per game or accumulated), which is what a player's ranks are
// measured against, in the API's order (its tie-break when it sorts), in one request.
export async function fetchLeagueLeaderboard(seasonCode, phaseCode, mode = "perGame") {
  const data = await getLeaderStats(seasonCode, { phase: phaseCode, mode, limit: LEADERBOARD_LIMIT, offset: 0 });
  return data.players;
}
