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

export function compareByName(left, right) {
  return (left.personName ?? "").localeCompare(right.personName ?? "") || left.personKey.localeCompare(right.personKey);
}
