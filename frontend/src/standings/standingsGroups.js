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
