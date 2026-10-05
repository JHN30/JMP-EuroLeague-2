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

export function directionOf(stat) {
  if (stat.key === "pace") return "neutral";
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

// Free throws made are on the Leaders board but left out of the comparison.
const LEFT_OUT = new Set(["freeThrowsMade"]);

export function statsOfFamily(family, usableFn, source) {
  return TEAM_STATS.filter((stat) => stat.family === family && !LEFT_OUT.has(stat.key) && usableFn(stat, source));
}
