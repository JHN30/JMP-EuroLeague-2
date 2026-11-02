import { getLeaderStats } from "../lib/api";

export function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const number = Number(raw);
  return Number.isNaN(number) ? null : number;
}

const PAGE_LIMIT = 100;

// Every qualified player's line for one season, phase and mode, in the API's order (its tie-break when it sorts), so the landing
// ranks all its cards from one pool: the first page says how many there are, and the rest are read together. `minGames` (half the
// rounds played, useRankingRule) replaces the feed's own minimum when the stage has rounds.
export async function fetchQualifiedPool(seasonCode, phaseCode, mode, minGames = null) {
  const filter = minGames ? { minGames } : { qualified: true };
  const page = (offset) => getLeaderStats(seasonCode, { phase: phaseCode, mode, ...filter, limit: PAGE_LIMIT, offset });
  const first = await page(0);
  const offsets = [];
  for (let offset = PAGE_LIMIT; offset < first.pagination.total; offset += PAGE_LIMIT) offsets.push(offset);
  const rest = await Promise.all(offsets.map(page));
  return [first, ...rest].flatMap((data) => data.players);
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

// True when a player has enough volume to be ranked on a stat (3P% needs three-point attempts, and so on). `rule` (useVolumeRule):
// with `rounds`, the stage's rounds played, the player needs `min` times the rounds over the season, so missed games count against
// him; his season totals come from `totals` (by person) in the per-game view, whose numbers are rounded. Without rounds (a stage
// with no standings) he needs `min` a game over the games he played.
export function hasVolume(player, stat, mode, rule = {}) {
  if (!stat.volume) return true;
  const { group, fields, min } = stat.volume;
  const sum = (line) => fields.reduce((total, field) => total + (statNumber(line?.[group]?.[field]) ?? 0), 0);
  const games = statNumber(player.traditional?.gamesPlayed) ?? 0;
  if (rule.rounds) {
    const totals = mode === "accumulated" ? player : rule.totals?.get(player.personKey);
    return (totals ? sum(totals) : sum(player) * games) >= min * rule.rounds;
  }
  const perGame = mode === "accumulated" ? (games ? sum(player) / games : 0) : sum(player);
  return perGame >= min;
}

// What a stat's volume asks for, as the cards and boards say it: the season total with rounds ("45+ field goal attempts"), or
// "5+ field goal attempts a game" without them.
export function volumeText(volume, rounds) {
  return rounds ? `${volume.min * rounds}+ ${volume.noun}` : `${volume.min}+ ${volume.noun} a game`;
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
