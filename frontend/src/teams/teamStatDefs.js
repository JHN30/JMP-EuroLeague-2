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

function attemptShare(attemptedKey) {
  return (side) =>
    present(side[attemptedKey]) && present(side.fieldGoalsAttemptedTotal) && side.fieldGoalsAttemptedTotal > 0
      ? (side[attemptedKey] / side.fieldGoalsAttemptedTotal) * 100
      : null;
}

// The share of the side's points that came from one kind of shot (`pointsPerMake` points for each make).
function pointShare(madeKey, pointsPerMake) {
  return (side) =>
    present(side[madeKey]) && present(side.points) && side.points > 0 ? ((side[madeKey] * pointsPerMake) / side.points) * 100 : null;
}

// Assists per 100 plays that end in a field goal attempt, free throws, an assist or a turnover.
function assistRatio(side) {
  if (![side.assistances, side.fieldGoalsAttemptedTotal, side.freeThrowsAttempted, side.turnovers].every(present)) return null;
  const plays = side.fieldGoalsAttemptedTotal + 0.44 * side.freeThrowsAttempted + side.assistances + side.turnovers;
  return plays > 0 ? (side.assistances / plays) * 100 : null;
}

function assistedFieldGoals(side) {
  return present(side.assistedFieldGoals) && present(side.splitFieldGoalsMade) && side.splitFieldGoalsMade > 0
    ? (side.assistedFieldGoals / side.splitFieldGoalsMade) * 100
    : null;
}

// The fast-break, second-chance and off-turnover points are only recorded in some games before E2016: they count when a
// side has them in at least half the games that have shot splits, averaged over the games that have them.
export function hasScoringContext(side) {
  return present(side.contextGames) && present(side.splitGames) && side.contextGames > 0 && side.contextGames * 2 >= side.splitGames;
}

function contextPerGame(key) {
  return (side) => (hasScoringContext(side) && present(side[key]) ? side[key] / side.contextGames : null);
}

// `higherIsBetter` is from the club's point of view, and decides whether the most or the fewest ranks first. A `style` row
// (how a club plays rather than how well) ranks the most first and shows its rank without the good or bad colour.
// `needsSplits` rows come from the per-game shot splits and are left out when the club has none. `column` places the
// group from xl.
export const STAT_GROUPS = [
  {
    title: "Scoring",
    column: "left",
    stats: [
      { key: "points", label: "Points", higherIsBetter: true, compute: perGame("points"), format: formatPerGame },
      { key: "fgm", label: "Field goals made", higherIsBetter: true, compute: perGame("fieldGoalsMadeTotal"), format: formatPerGame },
      { key: "fga", label: "Field goals attempted", tip: "Most ranks first", higherIsBetter: true, compute: perGame("fieldGoalsAttemptedTotal"), format: formatPerGame },
      { key: "fgPct", label: "FG %", higherIsBetter: true, compute: share("fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal"), format: formatPercentage },
      { key: "twoMade", label: "2PT made", higherIsBetter: true, compute: perGame("fieldGoalsMade2"), format: formatPerGame },
      { key: "twoAttempted", label: "2PT attempted", tip: "Most ranks first", higherIsBetter: true, compute: perGame("fieldGoalsAttempted2"), format: formatPerGame },
      { key: "twoPt", label: "2PT %", higherIsBetter: true, compute: share("fieldGoalsMade2", "fieldGoalsAttempted2"), format: formatPercentage },
      { key: "threeMade", label: "3PT made", higherIsBetter: true, compute: perGame("fieldGoalsMade3"), format: formatPerGame },
      { key: "threeAttempted", label: "3PT attempted", tip: "Most ranks first", higherIsBetter: true, compute: perGame("fieldGoalsAttempted3"), format: formatPerGame },
      { key: "threePt", label: "3PT %", higherIsBetter: true, compute: share("fieldGoalsMade3", "fieldGoalsAttempted3"), format: formatPercentage },
      { key: "ftMade", label: "Free throws made", higherIsBetter: true, compute: perGame("freeThrowsMade"), format: formatPerGame },
      { key: "ftAttempted", label: "Free throws attempted", tip: "Most ranks first", higherIsBetter: true, compute: perGame("freeThrowsAttempted"), format: formatPerGame },
      { key: "freeThrow", label: "FT %", higherIsBetter: true, compute: share("freeThrowsMade", "freeThrowsAttempted"), format: formatPercentage },
    ],
  },
  {
    title: "Rebounding",
    column: "right",
    stats: [
      { key: "rebounds", label: "Rebounds", higherIsBetter: true, compute: perGame("totalRebounds"), format: formatPerGame },
      { key: "offRebounds", label: "Off. rebounds", higherIsBetter: true, compute: perGame("offensiveRebounds"), format: formatPerGame },
      { key: "defRebounds", label: "Def. rebounds", higherIsBetter: true, compute: perGame("defensiveRebounds"), format: formatPerGame },
      { key: "orb", label: "Off. rebound %", tip: "The share of available offensive rebounds the team took", higherIsBetter: true, compute: reboundShare("offensiveRebounds", "defensiveRebounds"), format: formatPercentage },
      { key: "drb", label: "Def. rebound %", tip: "The share of available defensive rebounds the team took", higherIsBetter: true, compute: reboundShare("defensiveRebounds", "offensiveRebounds"), format: formatPercentage },
    ],
  },
  {
    title: "Playmaking",
    column: "right",
    stats: [
      { key: "assists", label: "Assists", higherIsBetter: true, compute: perGame("assistances"), format: formatPerGame },
      { key: "turnovers", label: "Turnovers", tip: "Fewest ranks first", higherIsBetter: false, compute: perGame("turnovers"), format: formatPerGame },
      { key: "ato", label: "Assist/turnover", higherIsBetter: true, compute: assistToTurnover, format: formatPerGame },
      { key: "assistRatio", label: "Assist ratio", tip: "Assists per 100 plays ending in a shot, free throws, an assist or a turnover", higherIsBetter: true, compute: assistRatio, format: formatPerGame },
      { key: "assistedFg", label: "Assisted FG %", tip: "The share of made field goals that came from an assist", higherIsBetter: true, needsSplits: true, compute: assistedFieldGoals, format: formatPercentage },
    ],
  },
  {
    title: "Defense and fouls",
    column: "right",
    stats: [
      { key: "steals", label: "Steals", higherIsBetter: true, compute: perGame("steals"), format: formatPerGame },
      { key: "blocks", label: "Blocks", higherIsBetter: true, compute: perGame("blocksFavour"), format: formatPerGame },
      { key: "blocked", label: "Shots blocked", tip: "The team's shots the opponent blocked; fewest ranks first", higherIsBetter: false, compute: perGame("blocksAgainst"), format: formatPerGame },
      { key: "fouls", label: "Fouls committed", tip: "Fewest ranks first", higherIsBetter: false, compute: perGame("foulsCommited"), format: formatPerGame },
      { key: "foulsDrawn", label: "Fouls drawn", higherIsBetter: true, compute: perGame("foulsReceived"), format: formatPerGame },
    ],
  },
  {
    title: "Efficiency",
    column: "left",
    stats: [
      { key: "efg", label: "eFG %", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5", higherIsBetter: true, compute: effectiveFieldGoal, format: formatPercentage },
      { key: "ts", label: "True shooting %", tip: "Points per shooting possession, counting free throws", higherIsBetter: true, compute: trueShooting, format: formatPercentage },
      { key: "ftr", label: "Free throw rate", tip: "Free throw attempts per field goal attempt", higherIsBetter: true, compute: freeThrowRate, format: formatPercentage },
      { key: "threeRate", label: "3PT attempt rate", tip: "The share of field goal attempts that are threes; most ranks first", higherIsBetter: true, style: true, compute: attemptShare("fieldGoalsAttempted3"), format: formatPercentage },
      { key: "twoShare", label: "Points from 2s", tip: "The share of points scored on two-pointers; most ranks first", higherIsBetter: true, style: true, compute: pointShare("fieldGoalsMade2", 2), format: formatPercentage },
      { key: "threeShare", label: "Points from 3s", tip: "The share of points scored on three-pointers; most ranks first", higherIsBetter: true, style: true, compute: pointShare("fieldGoalsMade3", 3), format: formatPercentage },
      { key: "ftShare", label: "Points from free throws", tip: "The share of points scored on free throws; most ranks first", higherIsBetter: true, style: true, compute: pointShare("freeThrowsMade", 1), format: formatPercentage },
    ],
  },
  {
    title: "Scoring context",
    column: "right",
    stats: [
      { key: "fastBreak", label: "Fast-break points", higherIsBetter: true, needsSplits: true, compute: contextPerGame("fastBreakPoints"), format: formatPerGame },
      { key: "secondChance", label: "Second-chance points", tip: "Points after an offensive rebound", higherIsBetter: true, needsSplits: true, compute: contextPerGame("secondChancePoints"), format: formatPerGame },
      { key: "offTurnovers", label: "Points off turnovers", higherIsBetter: true, needsSplits: true, compute: contextPerGame("pointsOffTurnoverPoints"), format: formatPerGame },
      { key: "pir", label: "PIR", tip: "Performance index rating, summed over the team", higherIsBetter: true, compute: perGame("valuation"), format: formatPerGame },
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
