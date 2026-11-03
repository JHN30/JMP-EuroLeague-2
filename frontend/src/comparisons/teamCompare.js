import { TEAM_STATS, statByKey } from "../leaders/teamData";

// The order the statistics are grouped in on the comparison.
export const STAT_FAMILY_ORDER = ["Efficiency", "Record", "Scoring", "Shooting", "Rebounding", "Playmaking", "Defense"];

// The measures the matchup edges look at: how a club plays, without counting one thing twice (points and offensive rating say
// the same). Pace is left out because neither a high nor a low pace is better.
export const EDGE_KEYS = [
  "ortg",
  "drtg",
  "efgPct",
  "threePct",
  "twoPct",
  "freeThrowPct",
  "tovPct",
  "orbPct",
  "drbPct",
  "assists",
  "steals",
  "blocks",
  "fouls",
  "oppEfgPct",
  "oppThreePct",
  "oppFieldGoalPct",
];

// How often a club shoots twos or threes, like its pace, is a style: neither more nor fewer is better.
const STYLE_KEYS = new Set(["pace", "twoPointersAttempted", "threePointersAttempted"]);

export function directionOf(stat) {
  if (STYLE_KEYS.has(stat.key)) return "neutral";
  return stat.lowerIsBetter ? "lower" : "higher";
}

// A club's value on one statistic and its place among the league's clubs (equal values share a place); null without a value.
export function placeOn(rows, stat, clubCode) {
  const valued = rows
    .map((row) => ({ clubCode: row.clubCode, value: stat.get(row, "perGame") }))
    .filter((entry) => entry.value !== null && entry.value !== undefined && !Number.isNaN(entry.value));
  const own = valued.find((entry) => entry.clubCode === clubCode);
  if (!own) return null;
  const ahead = valued.filter((entry) => (stat.lowerIsBetter ? entry.value < own.value : entry.value > own.value)).length;
  return { value: own.value, rank: ahead + 1, of: valued.length };
}

// Where the two clubs are far apart in the league: for each measure the gap between their places, positive when A is higher.
export function edgesBetween(rows, clubA, clubB) {
  return EDGE_KEYS.map((key) => {
    const stat = statByKey(key);
    const a = stat ? placeOn(rows, stat, clubA) : null;
    const b = stat ? placeOn(rows, stat, clubB) : null;
    return a && b ? { stat, a, b, gap: b.rank - a.rank } : null;
  }).filter(Boolean);
}

// Where the comparison puts a family's stats when the Leaders list order reads oddly: the free throws together (made, attempted,
// rate), and the opponents' rates after their shooting.
const FAMILY_ORDER = {
  Scoring: ["points", "twoPointersMade", "twoPointersAttempted", "threePointersMade", "threePointersAttempted", "freeThrowsMade", "freeThrowsAttempted", "ftRate", "ortg"],
  Defense: ["oppPoints", "drtg", "oppFieldGoalPct", "oppThreePct", "oppEfgPct", "oppTovPct", "oppFtRate", "steals", "blocks", "fouls", "foulsDrawn"],
};

// Every team statistic of a family the source can show, in the comparison's order.
export function statsOfFamily(family, usableFn, source) {
  const stats = TEAM_STATS.filter((stat) => stat.family === family && usableFn(stat, source));
  const order = FAMILY_ORDER[family];
  if (!order) return stats;
  const place = (stat) => (order.includes(stat.key) ? order.indexOf(stat.key) : order.length);
  return [...stats].sort((x, y) => place(x) - place(y));
}

// A club that did not play in the season asked for: the API's 404 for it, which means no games rather than a failure.
export function absentFromSeason(error) {
  return error?.response?.status === 404 && error.response.data?.error?.code === "TEAM_NOT_FOUND";
}
