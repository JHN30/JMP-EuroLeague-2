import { ordinal } from "../teams/teamLeague";

// The next round's biggest game: the scheduled games of the first upcoming game's round, picked by the most combined wins,
// then the smallest gap in wins, then the earliest tip-off. Only a table stage's round qualifies, and only once both clubs
// have played, so the pick rests on a real table. `standingByClubCode` must be that stage's standings. Null when nothing fits.
export function gameOfTheRound(games, standingByClubCode, format) {
  const first = games[0];
  if (!first) return null;
  const stage = format?.stages.find((entry) => entry.code === first.phaseCode);
  if (stage?.type !== "table") return null;

  let best = null;
  for (const game of games) {
    if (game.phaseCode !== first.phaseCode || game.roundNumber !== first.roundNumber) continue;
    const local = standingByClubCode.get(game.localTeam?.clubCode)?.basic;
    const road = standingByClubCode.get(game.roadTeam?.clubCode)?.basic;
    if (!local?.gamesPlayed || !road?.gamesPlayed) continue;
    const combined = local.gamesWon + road.gamesWon;
    const gap = Math.abs(local.gamesWon - road.gamesWon);
    const time = new Date(game.scheduledAt).getTime() || Infinity;
    if (
      best === null ||
      combined > best.combined ||
      (combined === best.combined && (gap < best.gap || (gap === best.gap && time < best.time)))
    ) {
      best = { game, local, road, combined, gap, time };
    }
  }
  if (!best) return null;

  const { local, road } = best;
  const places = local.position != null && road.position != null ? `${ordinal(local.position)} vs ${ordinal(road.position)} · ` : "";
  return {
    game: best.game,
    reason: `${places}${local.gamesWon}-${local.gamesLost} vs ${road.gamesWon}-${road.gamesLost}`,
  };
}
