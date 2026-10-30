import { hasLocation, shotZone } from "../lib/shotZones";

export function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

// The code a club goes by this season (its TV code), for the places with little room; older responses and test mocks without one
// fall back to the abbreviated name, then the club code.
export function teamCode(team) {
  return team?.tvCode ?? team?.abbreviatedName ?? team?.clubCode ?? "TBD";
}

// The abbreviated name, for the places with little room.
export function shortTeamName(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

export const hasMinutes = (row) => row.timePlayed > 0;

export const isStarter = (row) => Boolean(row.started ?? row.startedAlt);

// Points by one side's players who did not start, or null when the feed marks no starter on that side.
export function benchPoints(playerStats, side) {
  const rows = playerStats.filter((row) => row.side === side);
  if (!rows.some(isStarter)) return null;
  return rows.filter((row) => !isStarter(row)).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
}

const PAINT_ZONES = new Set(["Restricted area", "In the paint"]);

// Points from one club's made shots in the restricted area and the paint, over its shots with a location, or null
// when it has none. Field goals only: an and-one free throw is not counted.
export function paintPoints(shots, clubCode) {
  const located = shots.filter((shot) => shot.clubCode === clubCode && hasLocation(shot));
  if (located.length === 0) return null;
  return 2 * located.filter((shot) => shot.actionCode.endsWith("M") && PAINT_ZONES.has(shotZone(shot))).length;
}

// The period a shot's game minute falls in: four 10-minute quarters, then 5-minute overtimes. 0 without a minute.
export function periodNumberForMinute(minute) {
  if (minute == null) return 0;
  return minute <= 40 ? Math.ceil(minute / 10) : 4 + Math.ceil((minute - 40) / 5);
}

export function compareByName(left, right) {
  return (left.personName ?? "").localeCompare(right.personName ?? "") || left.personKey.localeCompare(right.personKey);
}
