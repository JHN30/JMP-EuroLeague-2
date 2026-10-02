import { formatCount, formatMissing, formatPercentage } from "../lib/format";
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

export const LEADER_CATEGORIES = [
  { key: "points", label: "Points", field: "points" },
  { key: "rebounds", label: "Rebounds", field: "totalRebounds" },
  { key: "assists", label: "Assists", field: "assistances" },
];

// The leader in each category among players who played (everyone, if nobody on the team has minutes). Ties go to more
// minutes, then name. A category whose best value is 0 or missing has no leader.
export function gameLeaders(rows) {
  const pool = rows.some(hasMinutes) ? rows.filter(hasMinutes) : rows;
  return LEADER_CATEGORIES.map(({ key, label, field }) => {
    const candidates = pool.filter((row) => Number.isFinite(row[field]) && row[field] > 0);
    if (candidates.length === 0) return { key, label, player: null, value: null };
    const player = [...candidates].sort(
      (left, right) => right[field] - left[field] || (right.timePlayed ?? 0) - (left.timePlayed ?? 0) || compareByName(left, right),
    )[0];
    return { key, label, player, value: player[field] };
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
