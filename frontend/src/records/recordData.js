import { formatDate, formatSeasonLabel } from "../lib/format";
import { displayName } from "../lib/playerName";
import { seasonSlug } from "../lib/seasonSlug";

// The three kinds of record. `description` says what a record of that kind is; it sits under the page title.
export const FAMILIES = [
  { key: "player", label: "Player seasons", description: "The highest season totals by one player." },
  { key: "game", label: "Single-game", description: "The best single games by one player." },
  { key: "team", label: "Team-season", description: "The highest season totals by one club." },
];

export const METRICS = [
  { key: "pointsScored", label: "Points" },
  { key: "totalRebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "pir", label: "PIR" },
];

// The single-game and team-season routes name the metrics differently from the player-season one.
export const ROUTE_METRICS = { pointsScored: "points", totalRebounds: "totalRebounds", assists: "assistances", pir: "valuation" };

// A value from the address, or the default when it is not one of the keys.
export function pickKey(entries, value, fallback) {
  return entries.some((entry) => entry.key === value) ? value : fallback;
}

// One record row as the page shows it. `crestOf` finds a club's crest by its club code. A part the row does not have is null.
export function describeRecord(family, row, crestOf) {
  const slug = seasonSlug(row.seasonCode);
  const isClub = family === "team";
  const clubName = row.clubName ?? null;
  const clubCode = row.clubTvCodes ?? row.clubTvCode ?? null;
  return {
    key: `${row.seasonCode}-${row.personKey ?? row.clubCode}-${row.gameCode ?? "season"}`,
    name: isClub ? (clubName ?? row.clubCode ?? "-") : displayName(row.playerName),
    to: isClub ? (row.clubCode ? `/${slug}/teams/${row.clubCode}` : null) : row.personKey ? `/${slug}/players/${row.personKey}` : null,
    club: isClub ? null : clubName || clubCode ? { name: clubName, code: clubCode } : null,
    crestUrl: isClub ? (crestOf?.(row.clubCode) ?? null) : null,
    seasonCode: row.seasonCode,
    season: formatSeasonLabel(row.seasonCode),
    date: row.scheduledAt ? formatDate(row.scheduledAt) : null,
    when: row.scheduledAt ? new Date(row.scheduledAt).getTime() : null,
    gameCode: row.gameCode ?? null,
    gameTo: row.gameCode ? `/${slug}/games/${row.gameCode}` : null,
    value: row.numericValue,
  };
}

// Each record that beat every one before it, oldest first, with how far it beat the previous record by (null for the first).
export function recordProgression(records) {
  // Games go by when they were played; a season total has no date, so those go by season.
  const oldestFirst = records.slice().sort((a, b) => {
    if (a.when !== null && b.when !== null) return a.when - b.when || (a.gameCode ?? 0) - (b.gameCode ?? 0);
    return a.seasonCode.localeCompare(b.seasonCode);
  });
  return oldestFirst.reduce((steps, record) => {
    const previous = steps.at(-1);
    if (previous && record.value <= previous.record.value) return steps;
    return [...steps, { record, gain: previous ? record.value - previous.record.value : null }];
  }, []);
}

// The best row of each season that has any, oldest season first.
export function bestOfEachSeason(records) {
  const best = new Map();
  for (const record of records) {
    const held = best.get(record.seasonCode);
    if (!held || record.value > held.value) best.set(record.seasonCode, record);
  }
  return [...best.values()].sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
}
