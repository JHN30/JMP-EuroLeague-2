export function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

export const hasMinutes = (row) => row.timePlayed > 0;

export const isStarter = (row) => Boolean(row.started ?? row.startedAlt);

export function compareByName(left, right) {
  return (left.personName ?? "").localeCompare(right.personName ?? "") || left.personKey.localeCompare(right.personKey);
}
