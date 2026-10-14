import { ordinal } from "../teams/teamLeague";

export function groupStandings(standings) {
  const groups = new Map();
  for (const entry of standings) {
    const name = typeof entry.groupName === "string" && entry.groupName.trim() ? entry.groupName : null;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  return [...groups].map(([name, rows]) => ({ name, standings: rows }));
}

export function selectedGroup(params, groups) {
  const values = params.getAll("group");
  return values.length === 1 && groups.some((group) => group.name === values[0]) ? values[0] : null;
}

export function groupLabel(name) {
  return name === null ? "Group unavailable" : `Group ${name}`;
}

// A table with two or more observed groups. A modern single table, or one with unnamed rows, is not grouped.
export function isGroupedTable(standings) {
  return new Set(standings.map((entry) => entry.groupName).filter((name) => typeof name === "string" && name.trim())).size > 1;
}

// "Group A · 2nd": a club's place within its own group. Null without a group or a position, so nothing is invented.
export function groupPositionLabel(entry) {
  const position = entry?.basic?.position;
  if (typeof entry?.groupName !== "string" || !entry.groupName.trim() || position == null) return null;
  return `${groupLabel(entry.groupName)} · ${ordinal(position)}`;
}

// The club with the most wins across every group, for a summary that has room for one club. Level wins go to the better points
// difference (only to pick which club is shown); `tied` counts the other clubs level on wins, so a page can say so.
export function mostWinsEntry(standings) {
  const wins = (entry) => entry.basic?.gamesWon ?? -1;
  const best = Math.max(-1, ...standings.map(wins));
  const level = standings.filter((entry) => wins(entry) === best);
  if (best < 0 || level.length === 0) return null;
  const entry = level.reduce((top, row) => ((row.basic?.pointsDifference ?? -Infinity) > (top.basic?.pointsDifference ?? -Infinity) ? row : top));
  return { entry, tied: level.length - 1 };
}
