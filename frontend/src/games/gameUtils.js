export function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
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
