import { getLeaderStats } from "../lib/api";

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

// A player who changed clubs during the season has one row with both codes joined by ";" ("MCO;PAR"), and numbers that
// cover all their games.
export function playedForOtherClubs(player, clubCode) {
  const codes = player?.clubCode ? player.clubCode.split(";") : [];
  return codes.some((code) => code !== clubCode);
}

// Every player of one club with their season stats (and photo), keyed by person key: per game by default, or totals with
// `mode` "accumulated". The leader endpoint covers the whole league, so this pages through it and keeps the club's players,
// including those whose row also names another club.
export async function fetchTeamRosterStats(seasonCode, phaseCode, clubCode, mode = "perGame") {
  const byPersonKey = new Map();
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode,
      limit: PAGE_LIMIT,
      offset,
    });
    for (const player of data.players) {
      if ((player.clubCode ?? "").split(";").includes(clubCode)) byPersonKey.set(player.personKey, player);
    }
    if (!data.pagination.hasMore) break;
    offset += PAGE_LIMIT;
  }
  return byPersonKey;
}
