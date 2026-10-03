// Numbers behind the team Shooting tab: the zone table, its hottest and coldest zones, and the game-situation groups.
import { summarizeZones } from "../lib/shotZones";

const isMade = (shot) => shot.actionCode.endsWith("M");

const percentOf = (made, attempts) => (attempts === 0 ? null : (made / attempts) * 100);

// Zones that were shot from, most used first. `share` is the part of the located shots taken from the zone.
export function zoneRows(shots) {
  const rows = summarizeZones(shots).filter((row) => row.attempts > 0);
  const total = rows.reduce((sum, row) => sum + row.attempts, 0);
  return rows
    .map((row) => ({
      key: row.zone,
      label: row.zone,
      attempts: row.attempts,
      made: row.made,
      fg: percentOf(row.made, row.attempts),
      share: total === 0 ? 0 : row.attempts / total,
    }))
    .sort((a, b) => b.attempts - a.attempts);
}

// The best and worst zone by FG%, among zones with enough shots to mean something (the larger of 3 and 4% of all).
export function zoneExtremes(rows) {
  const total = rows.reduce((sum, row) => sum + row.attempts, 0);
  const minimum = Math.max(3, Math.round(total * 0.04));
  const sampled = rows.filter((row) => row.attempts >= minimum);
  if (sampled.length < 2) return null;
  const hottest = sampled.reduce((best, row) => (row.fg > best.fg ? row : best));
  const coldest = sampled.reduce((worst, row) => (row.fg < worst.fg ? row : worst));
  return hottest.key === coldest.key ? null : { hottest, coldest };
}

// The feed flags a scoring shot as a fast break, a second chance and/or coming off a turnover. Misses are never flagged,
// so only made shots can be placed in a situation, and there is no shooting percentage for one. The flags can overlap,
// and every other made shot is a half-court one.
const SITUATIONS = [
  { key: "fastbreak", label: "Fast break", tip: "Points scored in transition", test: (shot) => shot.fastbreak },
  { key: "secondChance", label: "Second chance", tip: "Points scored after an offensive rebound", test: (shot) => shot.secondChance },
  { key: "offTurnover", label: "Off turnovers", tip: "Points scored following a turnover", test: (shot) => shot.pointsOffTurnover },
  {
    key: "halfCourt",
    label: "Half court",
    tip: "Points scored in none of the situations above",
    test: (shot) => !shot.fastbreak && !shot.secondChance && !shot.pointsOffTurnover,
  },
];

// One row per situation over the made shots: how many, the points they scored and the share of all the shots' points.
export function situationRows(shots) {
  const made = shots.filter(isMade);
  const totalPoints = made.reduce((sum, shot) => sum + (shot.points ?? 0), 0);
  return SITUATIONS.map((situation) => {
    const inSituation = made.filter(situation.test);
    const points = inSituation.reduce((sum, shot) => sum + (shot.points ?? 0), 0);
    return {
      key: situation.key,
      label: situation.label,
      tip: situation.tip,
      made: inSituation.length,
      points,
      share: totalPoints === 0 ? 0 : points / totalPoints,
    };
  });
}
