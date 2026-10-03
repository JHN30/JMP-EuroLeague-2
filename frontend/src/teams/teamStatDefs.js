// The Statistics tab's rows. Each stat is computed from one side's season totals (`side`) and the other side's
// (`other`), so the same function gives the club's number, the number its opponents put up against it, and every
// other club's numbers for the league rank.
import { formatPerGame, formatPercentage } from "../lib/format";

const present = (value) => value !== null && value !== undefined;

function perGame(key) {
  return (side, _other, gamesPlayed) => (present(side[key]) && gamesPlayed ? side[key] / gamesPlayed : null);
}

function share(madeKey, attemptedKey) {
  return (side) =>
    present(side[madeKey]) && present(side[attemptedKey]) && side[attemptedKey] > 0
      ? (side[madeKey] / side[attemptedKey]) * 100
      : null;
}

function effectiveFieldGoal(side) {
  if (![side.fieldGoalsMadeTotal, side.fieldGoalsMade3, side.fieldGoalsAttemptedTotal].every(present)) return null;
  if (side.fieldGoalsAttemptedTotal === 0) return null;
  return ((side.fieldGoalsMadeTotal + 0.5 * side.fieldGoalsMade3) / side.fieldGoalsAttemptedTotal) * 100;
}

function trueShooting(side) {
  if (![side.points, side.fieldGoalsAttemptedTotal, side.freeThrowsAttempted].every(present)) return null;
  const attempts = side.fieldGoalsAttemptedTotal + 0.44 * side.freeThrowsAttempted;
  return attempts > 0 ? (side.points / (2 * attempts)) * 100 : null;
}

function assistToTurnover(side) {
  return present(side.assistances) && present(side.turnovers) && side.turnovers > 0
    ? side.assistances / side.turnovers
    : null;
}

function reboundShare(ownKey, otherKey) {
  return (side, other) => {
    if (!present(side[ownKey]) || !present(other[otherKey])) return null;
    const chances = side[ownKey] + other[otherKey];
    return chances > 0 ? (side[ownKey] / chances) * 100 : null;
  };
}

function freeThrowRate(side) {
  return present(side.freeThrowsAttempted) && present(side.fieldGoalsAttemptedTotal) && side.fieldGoalsAttemptedTotal > 0
    ? (side.freeThrowsAttempted / side.fieldGoalsAttemptedTotal) * 100
    : null;
}

// `higherIsBetter` is from the club's point of view, and decides whether the most or the fewest ranks first.
export const STAT_GROUPS = [
  {
    title: "Traditional",
    stats: [
      { key: "points", label: "Points", higherIsBetter: true, compute: perGame("points"), format: formatPerGame },
      { key: "rebounds", label: "Rebounds", higherIsBetter: true, compute: perGame("totalRebounds"), format: formatPerGame },
      { key: "offRebounds", label: "Off. rebounds", higherIsBetter: true, compute: perGame("offensiveRebounds"), format: formatPerGame },
      { key: "defRebounds", label: "Def. rebounds", higherIsBetter: true, compute: perGame("defensiveRebounds"), format: formatPerGame },
      { key: "assists", label: "Assists", higherIsBetter: true, compute: perGame("assistances"), format: formatPerGame },
      { key: "steals", label: "Steals", higherIsBetter: true, compute: perGame("steals"), format: formatPerGame },
      { key: "blocks", label: "Blocks", higherIsBetter: true, compute: perGame("blocksFavour"), format: formatPerGame },
      { key: "turnovers", label: "Turnovers", tip: "Fewest ranks first", higherIsBetter: false, compute: perGame("turnovers"), format: formatPerGame },
      { key: "fouls", label: "Fouls committed", tip: "Fewest ranks first", higherIsBetter: false, compute: perGame("foulsCommited"), format: formatPerGame },
      { key: "pir", label: "PIR", tip: "Performance index rating, summed over the team", higherIsBetter: true, compute: perGame("valuation"), format: formatPerGame },
    ],
  },
  {
    title: "Shooting",
    stats: [
      { key: "twoPt", label: "2PT %", higherIsBetter: true, compute: share("fieldGoalsMade2", "fieldGoalsAttempted2"), format: formatPercentage },
      { key: "threePt", label: "3PT %", higherIsBetter: true, compute: share("fieldGoalsMade3", "fieldGoalsAttempted3"), format: formatPercentage },
      { key: "freeThrow", label: "FT %", higherIsBetter: true, compute: share("freeThrowsMade", "freeThrowsAttempted"), format: formatPercentage },
    ],
  },
  {
    title: "Advanced",
    stats: [
      { key: "efg", label: "eFG %", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5", higherIsBetter: true, compute: effectiveFieldGoal, format: formatPercentage },
      { key: "ts", label: "True shooting %", tip: "Points per shooting possession, counting free throws", higherIsBetter: true, compute: trueShooting, format: formatPercentage },
      { key: "ato", label: "Assist/turnover", higherIsBetter: true, compute: assistToTurnover, format: formatPerGame },
      { key: "orb", label: "Off. rebound %", tip: "The share of available offensive rebounds the team took", higherIsBetter: true, compute: reboundShare("offensiveRebounds", "defensiveRebounds"), format: formatPercentage },
      { key: "drb", label: "Def. rebound %", tip: "The share of available defensive rebounds the team took", higherIsBetter: true, compute: reboundShare("defensiveRebounds", "offensiveRebounds"), format: formatPercentage },
      { key: "ftr", label: "Free throw rate", tip: "Free throw attempts per field goal attempt", higherIsBetter: true, compute: freeThrowRate, format: formatPercentage },
    ],
  },
];

// Competition ranking (1, 2, 2, 4) of `clubCode` among `values` ({ clubCode, value }); null without a value.
export function rankAmong(values, clubCode, higherIsBetter) {
  const own = values.find((entry) => entry.clubCode === clubCode)?.value;
  if (!present(own)) return null;
  const valued = values.filter((entry) => present(entry.value));
  const ahead = valued.filter((entry) => (higherIsBetter ? entry.value > own : entry.value < own)).length;
  return { rank: ahead + 1, of: valued.length };
}

// The club's own rank for a stat among every club in `leagueTeams` (1st is best, so the fewest turnovers rank first).
export function leagueRank(stat, leagueTeams, clubCode) {
  const values = leagueTeams.map((entry) => ({
    clubCode: entry.clubCode,
    value: stat.compute(entry.own, entry.opponent, entry.gamesPlayed),
  }));
  return rankAmong(values, clubCode, stat.higherIsBetter);
}
