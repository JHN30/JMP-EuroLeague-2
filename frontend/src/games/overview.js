import { formatCount, formatMissing, formatPercentage, formatSignedDiff } from "../lib/format";
import { compareByName, hasMinutes } from "./gameUtils";

// The one place that names the "best player" ranking metric. Game PER comes from `app_game_player_advanced` and is
// read from `row.advanced` (see `attachAdvanced`); a game without advanced data falls back to PIR.
export const PIR_METRIC = { label: "PIR", digits: 0, value: (row) => row.valuation };
export const PER_METRIC = { label: "PER", digits: 1, value: (row) => row.advanced?.gamePer };

export function bestPlayerMetric(advanced) {
  return advanced?.available === true ? PER_METRIC : PIR_METRIC;
}

// Fewer minutes than this and a big number says little, so a player must have played at least 10 minutes.
export const MIN_BEST_PLAYER_SECONDS = 600;

// Highest metric value among players with enough minutes. Ties go to more points, then more minutes, then name.
// Returns null when nobody on the team is eligible (including a box score with no minutes at all).
export function pickBestPlayer(rows, metric = PIR_METRIC) {
  const eligible = rows.filter((row) => row.timePlayed >= MIN_BEST_PLAYER_SECONDS && Number.isFinite(metric.value(row)));
  if (eligible.length === 0) return null;
  return [...eligible].sort(
    (left, right) =>
      metric.value(right) - metric.value(left) ||
      (right.points ?? 0) - (left.points ?? 0) ||
      right.timePlayed - left.timePlayed ||
      compareByName(left, right),
  )[0];
}

// A few shots say little about efficiency (one make in one attempt is 100%), so true shooting needs this many field goal attempts.
export const TS_MIN_ATTEMPTS = 5;

// True shooting percentage from the box score: points per two shooting possessions, a free throw attempt counting as 0.44 of
// one. Null below the attempts minimum.
function trueShooting(row) {
  const attempts = (row.fieldGoalsAttempted2 ?? 0) + (row.fieldGoalsAttempted3 ?? 0);
  if (!Number.isFinite(row.points) || attempts < TS_MIN_ATTEMPTS) return null;
  return (row.points / (2 * (attempts + 0.44 * (row.freeThrowsAttempted ?? 0)))) * 100;
}

// `desktopOnly` categories fill the team card from lg, where it stands as tall as the key stats beside it; a phone or a
// tablet shows the first five. `value` reads a category the box score does not carry as one field; `tip` explains its label.
export const LEADER_CATEGORIES = [
  { key: "points", label: "Points", field: "points" },
  { key: "rebounds", label: "Rebounds", field: "totalRebounds" },
  { key: "assists", label: "Assists", field: "assistances" },
  { key: "steals", label: "Steals", field: "steals" },
  { key: "blocks", label: "Blocks", field: "blocksFavour" },
  { key: "plusMinus", label: "+/-", field: "plusMinus", format: formatSignedDiff, desktopOnly: true, anyValue: true },
  { key: "pir", label: "PIR", field: "valuation", desktopOnly: true },
  {
    key: "trueShooting",
    label: "TS%",
    value: trueShooting,
    format: formatPercentage,
    desktopOnly: true,
    tip: `True shooting percentage: scoring efficiency counting twos, threes and free throws. Points divided by twice the shooting possessions (field goal attempts plus 0.44 per free throw attempt). Needs at least ${TS_MIN_ATTEMPTS} field goal attempts.`,
  },
];

// The leader in each category among players who played (everyone, if nobody on the team has minutes). Ties go to more
// minutes, then name. A category whose best value is 0 or missing has no leader, except an `anyValue` one (+/-): a losing
// team's best +/- can be 0 or below and is still its best.
export function gameLeaders(rows) {
  const pool = rows.some(hasMinutes) ? rows.filter(hasMinutes) : rows;
  return LEADER_CATEGORIES.map(({ key, label, field, value = (row) => row[field], format = formatCount, desktopOnly = false, anyValue = false, tip = null }) => {
    const entry = { key, label, format, desktopOnly, tip };
    const candidates = pool.filter((row) => Number.isFinite(value(row)) && (anyValue || value(row) > 0));
    if (candidates.length === 0) return { ...entry, player: null, value: null };
    const player = [...candidates].sort(
      (left, right) => value(right) - value(left) || (right.timePlayed ?? 0) - (left.timePlayed ?? 0) || compareByName(left, right),
    )[0];
    return { ...entry, player, value: value(player) };
  });
}

// A percentage from made and attempted shots, or null when attempts are zero or missing.
function percentage(made, attempted) {
  if (!Number.isFinite(made) || !Number.isFinite(attempted) || attempted <= 0) return null;
  return (made / attempted) * 100;
}

function shootingStat(key, label, madeField, attemptedField) {
  return {
    key,
    label,
    direction: "higher",
    raw: (total) => percentage(total[madeField], total[attemptedField]),
    display: (total) => {
      const pct = percentage(total[madeField], total[attemptedField]);
      return pct === null ? formatMissing(null) : `${formatCount(total[madeField])}-${formatCount(total[attemptedField])} (${formatPercentage(pct)})`;
    },
  };
}

function countStat(key, label, field, direction) {
  return {
    key,
    label,
    direction,
    raw: (total) => (Number.isFinite(total[field]) ? total[field] : null),
    display: (total) => formatCount(total[field]),
  };
}

const KEY_STATS = [
  shootingStat("fieldGoals", "Field goals", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal"),
  shootingStat("threePointers", "3-pointers", "fieldGoalsMade3", "fieldGoalsAttempted3"),
  shootingStat("freeThrows", "Free throws", "freeThrowsMade", "freeThrowsAttempted"),
  countStat("rebounds", "Rebounds", "totalRebounds", "higher"),
  countStat("assists", "Assists", "assistances", "higher"),
  countStat("steals", "Steals", "steals", "higher"),
  countStat("turnovers", "Turnovers", "turnovers", "lower"),
];

// Rows for the mirrored key-stat bars, in the shape ComparisonRow takes. `rawA`/`rawB` size the bars (a percentage for
// shooting, the count otherwise); `displayA`/`displayB` are the printed values.
export function keyStatRows(localTotal, roadTotal) {
  return KEY_STATS.map((stat) => ({
    key: stat.key,
    label: stat.label,
    direction: stat.direction,
    rawA: stat.raw(localTotal),
    rawB: stat.raw(roadTotal),
    displayA: stat.display(localTotal),
    displayB: stat.display(roadTotal),
  }));
}
