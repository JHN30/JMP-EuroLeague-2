import { getLeaderStats } from "../lib/api";

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

// Every player of one club with their per-game season stats (and photo), keyed by person key. The leader endpoint covers
// the whole league, so this pages through it and keeps the club's players.
export async function fetchTeamRosterStats(seasonCode, phaseCode, clubCode) {
  const byPersonKey = new Map();
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode: "perGame",
      limit: PAGE_LIMIT,
      offset,
    });
    for (const player of data.players) {
      if (player.clubCode === clubCode) byPersonKey.set(player.personKey, player);
    }
    if (!data.pagination.hasMore) break;
    offset += PAGE_LIMIT;
  }
  return byPersonKey;
}
