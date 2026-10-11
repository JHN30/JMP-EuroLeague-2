import { formatCount, formatDate, formatDecimal, formatSeasonLabel } from "../lib/format";
import { displayName } from "../lib/playerName";
import { seasonSlug } from "../lib/seasonSlug";

// The four kinds of record, each answered by one route of the records API. `description` says what a record of that kind is; it sits under the
// page title. `club` is true when the holder is a club rather than a player.
export const FAMILIES = [
  { key: "player", label: "Player seasons", description: "The highest season totals by one player.", club: false },
  { key: "game", label: "Player games", description: "The best single games by one player.", club: false },
  { key: "team", label: "Team seasons", description: "The highest season totals by one club.", club: true },
  { key: "teamgame", label: "Team games", description: "The best single games by one club.", club: true },
];

export const GROUPS = [
  { key: "traditional", label: "Traditional" },
  { key: "advanced", label: "Advanced" },
];

// The metrics of the API's catalogue (backend/src/db/season-records.ts), by group. The server validates the key, and records-layout.spec.js loads
// every metric listed here against it.
const TRADITIONAL = [
  { key: "pointsScored", label: "Points" },
  { key: "totalRebounds", label: "Rebounds" },
  { key: "offensiveRebounds", label: "Offensive rebounds" },
  { key: "defensiveRebounds", label: "Defensive rebounds" },
  { key: "assists", label: "Assists" },
  { key: "steals", label: "Steals" },
  { key: "blocks", label: "Blocks" },
  { key: "twoPointersMade", label: "2-pointers made" },
  { key: "threePointersMade", label: "3-pointers made" },
  { key: "freeThrowsMade", label: "Free throws made" },
  { key: "pir", label: "PIR" },
];
const RATINGS = [
  { key: "offensiveRating", label: "Offensive rating" },
  { key: "netRating", label: "Net rating" },
];
const ADVANCED = {
  player: [
    { key: "per", label: "PER" },
    { key: "winShares", label: "Win Shares" },
  ],
  game: [{ key: "gameScore", label: "Game Score" }],
  team: RATINGS,
  teamgame: RATINGS,
};

export const DEFAULT_FAMILY = "player";
export const DEFAULT_METRIC = "pointsScored";

export const metricsOf = (family, group) => (group === "advanced" ? ADVANCED[family] : TRADITIONAL);

// Every metric a family offers, each with its group.
export const allMetrics = (family) => [
  ...TRADITIONAL.map((metric) => ({ ...metric, group: "traditional" })),
  ...ADVANCED[family].map((metric) => ({ ...metric, group: "advanced" })),
];

// A value from the address, or the default when it is not one of the keys.
export function pickKey(entries, value, fallback) {
  return entries.some((entry) => entry.key === value) ? value : fallback;
}

// One record row as the page shows it. The picture of a player is the headshot (`portraitUrl`), of a club its crest (`crestUrl`); the second line is
// a player's club (with its crest beside it) or the opponent of a team game. A part the row does not have is null.
export function describeRecord(family, group, row) {
  const slug = seasonSlug(row.seasonCode);
  const isClub = FAMILIES.find((entry) => entry.key === family)?.club ?? false;
  const clubName = row.clubName ?? null;
  const clubCode = row.clubTvCodes ?? row.clubTvCode ?? null;
  const opponent = row.opponentName ?? row.opponentTvCode ?? null;
  // A rating or a Game Score has decimals; a total is a whole number.
  const format = (value) => (group === "advanced" ? formatDecimal(value, 1) : formatCount(value));
  return {
    key: `${row.seasonCode}-${row.personKey ?? row.clubCode}-${row.gameCode ?? "season"}`,
    name: isClub ? (clubName ?? row.clubCode ?? "-") : displayName(row.playerName),
    to: isClub ? (row.clubCode ? `/${slug}/teams/${row.clubCode}` : null) : row.personKey ? `/${slug}/players/${row.personKey}` : null,
    portraitUrl: isClub ? null : (row.playerImageUrl ?? null),
    crestUrl: isClub ? (row.clubImageUrl ?? null) : null,
    line: isClub ? (opponent ? `vs ${opponent}` : null) : (clubName ?? clubCode),
    lineCrestUrl: isClub ? null : (row.clubImageUrl ?? null),
    seasonCode: row.seasonCode,
    season: formatSeasonLabel(row.seasonCode),
    date: row.scheduledAt ? formatDate(row.scheduledAt) : null,
    when: row.scheduledAt ? new Date(row.scheduledAt).getTime() : null,
    gameCode: row.gameCode ?? null,
    gameTo: row.gameCode ? `/${slug}/games/${row.gameCode}` : null,
    value: row.numericValue,
    valueText: format(row.numericValue),
    format,
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
