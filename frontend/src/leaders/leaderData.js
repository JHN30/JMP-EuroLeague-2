import { getLeaderStats } from "../lib/api";

export function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const number = Number(raw);
  return Number.isNaN(number) ? null : number;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

// Every player's line for one season, phase and mode, sorted by one stat on the server (so ties and order are the
// database's), read page by page. Filters and search are applied on the page, so the rank a row shows is its true rank.
export async function fetchFullPlayerBoard(seasonCode, phaseCode, mode, sort, order) {
  const players = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, { phase: phaseCode, mode, sort, order, limit: PAGE_LIMIT, offset });
    players.push(...data.players);
    if (!data.pagination.hasMore) break;
    offset += PAGE_LIMIT;
  }
  return players;
}

// Competition ranking (1, 2, 2, 4): equal values share a rank.
export function rankRows(rows, valueOf) {
  let lastValue;
  let lastRank = 0;
  return rows.map((row, index) => {
    const value = valueOf(row);
    if (index === 0 || value !== lastValue) {
      lastRank = index + 1;
      lastValue = value;
    }
    return { row, rank: lastRank, value };
  });
}

export function playerValue(player, stat) {
  return statNumber(player[stat.group]?.[stat.key]);
}

// The number as written: a percentage with a %, a count as a whole number in the accumulated view and one decimal per game.
export function formatPlayerValue(stat, value, mode) {
  if (value === null || value === undefined) return "—";
  if (stat.kind === "percent") return `${value.toFixed(1)}%`;
  if (stat.kind === "games") return String(Math.round(value));
  if (stat.kind === "count" && mode === "accumulated") return Math.round(value).toLocaleString();
  return value.toFixed(1);
}

// True when a player has enough volume to be ranked on a stat (3P% needs three-point attempts, and so on).
export function hasVolume(player, stat, mode) {
  if (!stat.volume) return true;
  const { group, fields, min } = stat.volume;
  const total = fields.reduce((sum, field) => sum + (statNumber(player[group]?.[field]) ?? 0), 0);
  const games = statNumber(player.traditional?.gamesPlayed) ?? 0;
  const perGame = mode === "accumulated" ? (games ? total / games : 0) : total;
  return perGame >= min;
}

export function formatAdvancedValue(stat, value) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  switch (stat.format) {
    case "decimal2":
      return number.toFixed(2);
    case "decimal3":
      return number.toFixed(3);
    case "percent":
    case "pie":
      return `${(number * 100).toFixed(1)}%`;
    case "signed":
      return `${number > 0 ? "+" : ""}${number.toFixed(1)}`;
    default:
      return number.toFixed(1);
  }
}

// The share of the bar a value fills: against the best value shown (so the list reads as a ranking).
export function barShare(value, best, worst = 0) {
  if (value === null || best === null || best === worst) return 0;
  return Math.max(4, Math.min(100, ((value - worst) / (best - worst)) * 100));
}
