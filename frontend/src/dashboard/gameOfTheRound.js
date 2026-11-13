import { ordinal } from "../teams/teamLeague";

export const REGULAR_SEASON = "RS";

// Each club's record before the round: the table's record minus the result of its game in the round, when that game is
// played. A club plays once a round, so this undoes at most one game.
function preRoundRecords(roundGames, standingByClubCode) {
  const records = new Map();
  for (const [clubCode, entry] of standingByClubCode) {
    if (entry?.basic) records.set(clubCode, { won: entry.basic.gamesWon, played: entry.basic.gamesPlayed });
  }
  for (const game of roundGames) {
    if (!game.played || game.localScore == null || game.roadScore == null) continue;
    for (const [team, won] of [[game.localTeam, game.localScore > game.roadScore], [game.roadTeam, game.roadScore > game.localScore]]) {
      const record = records.get(team?.clubCode);
      if (record) records.set(team.clubCode, { won: record.won - (won ? 1 : 0), played: record.played - 1 });
    }
  }
  return records;
}

// The current regular-season round's biggest game, picked once for the whole round from all its games (`roundGames`,
// played or not) with the records from before the round, so the pick holds while the round's results come in: the most
// combined wins, then the smallest gap in wins, then the earliest tip-off, among games whose clubs had both played.
// `standingByClubCode` is the regular-season table. Returns { gameCode, reason } or null. The reason reads the table
// as it stands, like the cards' records; for a game still to play it equals the pre-round one.
export function gameOfTheRound(roundGames, standingByClubCode) {
  const records = preRoundRecords(roundGames, standingByClubCode);
  let best = null;
  for (const game of roundGames) {
    if (game.phaseCode !== REGULAR_SEASON) continue;
    const local = records.get(game.localTeam?.clubCode);
    const road = records.get(game.roadTeam?.clubCode);
    if (!local?.played || !road?.played) continue;
    const candidate = {
      game,
      combined: local.won + road.won,
      gap: Math.abs(local.won - road.won),
      time: new Date(game.scheduledAt).getTime() || Infinity,
    };
    if (!best || beats(candidate, best)) best = candidate;
  }
  if (!best) return null;
  const local = standingByClubCode.get(best.game.localTeam.clubCode).basic;
  const road = standingByClubCode.get(best.game.roadTeam.clubCode).basic;
  return { gameCode: best.game.gameCode, reason: reasonFor(local, road) };
}

function beats(candidate, best) {
  if (candidate.combined !== best.combined) return candidate.combined > best.combined;
  if (candidate.gap !== best.gap) return candidate.gap < best.gap;
  return candidate.time < best.time;
}

function reasonFor(local, road) {
  const places = local.position != null && road.position != null ? `${ordinal(local.position)} vs ${ordinal(road.position)} · ` : "";
  return `${places}${local.gamesWon}-${local.gamesLost} vs ${road.gamesWon}-${road.gamesLost}`;
}
