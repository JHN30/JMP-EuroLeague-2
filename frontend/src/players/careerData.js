// A player across every season in the archive: one card per season they appear in, and the numbers worked out
// from those cards (career averages, changes from one season to the next, career highs).
import { getPlayer, getPlayerAdvanced, getPlayerGames, getPlayerRegistrations, getPlayerSeasonStats } from "../lib/api";
import { formatSeasonLabel } from "../lib/format";
import { statNumber } from "./playerOverview";

const GAMES_LIMIT = 100;

// Fewer games than this and a season's averages are mostly noise: it is shown, but never compared.
export const SMALL_SAMPLE_GAMES = 10;

// Oldest season first. A season the player is not in (404) is left out; any other failure fails the whole tab.
export async function fetchPlayerCareer(seasons, personKey) {
  const ordered = [...seasons].sort((a, b) => a.startYear - b.startYear);
  const cards = await Promise.all(
    ordered.map(async (season) => {
      try {
        const { player } = await getPlayer(season.seasonCode, personKey);
        const [registrationsData, statsData, gamesData, advancedData] = await Promise.all([
          getPlayerRegistrations(season.seasonCode, personKey),
          getPlayerSeasonStats(season.seasonCode, personKey, { phase: "RS", mode: "perGame" }),
          getPlayerGames(season.seasonCode, personKey, { limit: GAMES_LIMIT }),
          // Only some seasons have advanced statistics; a season without them just has no PER column.
          getPlayerAdvanced(season.seasonCode, personKey, { scope: "RS" }).catch(() => null),
        ]);
        const rounds = advancedData?.rounds ?? [];
        return {
          seasonCode: season.seasonCode,
          label: formatSeasonLabel(season.seasonCode),
          player,
          registrations: registrationsData.registrations ?? [],
          entry: statsData.players?.[0] ?? null,
          games: (gamesData.games ?? []).filter((game) => game.played && statNumber(game.timePlayed) > 0),
          // The last round's running totals are the season's value.
          advanced: rounds.length > 0 ? rounds[rounds.length - 1] : null,
        };
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    }),
  );
  return cards.filter(Boolean);
}

function lineFromFeed(entry) {
  const traditional = entry.traditional;
  const scoring = entry.scoring;
  return {
    age: statNumber(entry.playerAge),
    gp: statNumber(traditional?.gamesPlayed),
    gs: statNumber(traditional?.gamesStarted),
    min: statNumber(traditional?.minutesPlayed),
    pts: statNumber(traditional?.pointsScored),
    reb: statNumber(traditional?.totalRebounds),
    ast: statNumber(traditional?.assists),
    stl: statNumber(traditional?.steals),
    blk: statNumber(traditional?.blocks),
    pir: statNumber(traditional?.pir),
    p2: statNumber(traditional?.twoPointersPercentage),
    p3: statNumber(traditional?.threePointersPercentage),
    ft: statNumber(traditional?.freeThrowsPercentage),
    ts: statNumber(entry.advanced?.trueShootingPercentage),
    mixTwos: statNumber(scoring?.pointsFromTwoPointersPercentage),
    mixThrees: statNumber(scoring?.pointsFromThreePointersPercentage),
    mixFt: statNumber(scoring?.pointsFromFreeThrowsPercentage),
  };
}

const EMPTY_LINE = {
  age: null, gp: null, gs: null, min: null, pts: null, reb: null, ast: null, stl: null, blk: null, pir: null,
  p2: null, p3: null, ft: null, ts: null, mixTwos: null, mixThrees: null, mixFt: null,
};

// One season as flat numbers (null where there are none). `calculated` marks a season whose per-game numbers the
// database worked out from the player's season totals (the league lists per-game numbers only from a minimum of games).
export function seasonLine(card) {
  const base = card.entry ? lineFromFeed(card.entry) : EMPTY_LINE;
  const usg = statNumber(card.advanced?.usgPct);
  return {
    seasonCode: card.seasonCode,
    label: card.label,
    ...base,
    per: statNumber(card.advanced?.per),
    ws: statNumber(card.advanced?.winShares),
    usg: usg === null ? null : usg * 100,
    small: base.gp !== null && base.gp < SMALL_SAMPLE_GAMES,
    calculated: card.entry?.isCalculated === true,
    minGames: card.entry?.minGames ?? null,
  };
}

// How a number moved from the season before. Null when either season is missing the number or is a small sample.
export function changeFrom(previous, current, key) {
  if (!previous || !current || previous.small || current.small) return null;
  if (previous[key] === null || current[key] === null) return null;
  return Math.round((current[key] - previous[key]) * 10) / 10;
}

// Career averages, each season weighted by its games (counting stats) or by its minutes played (shooting
// percentages, which are about possessions, not games).
const COUNTING = ["min", "pts", "reb", "ast", "stl", "blk", "pir"];
const SHOOTING = ["p2", "p3", "ft", "ts"];

function weightedAverage(lines, key, weightOf) {
  let sum = 0;
  let weight = 0;
  for (const line of lines) {
    const w = weightOf(line);
    if (line[key] === null || !w) continue;
    sum += line[key] * w;
    weight += w;
  }
  return weight === 0 ? null : sum / weight;
}

export function careerAverages(lines) {
  const played = lines.filter((line) => line.gp);
  const averages = { gp: played.reduce((sum, line) => sum + line.gp, 0) };
  for (const key of COUNTING) averages[key] = weightedAverage(played, key, (line) => line.gp);
  for (const key of SHOOTING) averages[key] = weightedAverage(played, key, (line) => line.gp * (line.min ?? 0));
  return averages;
}

// Exact totals from the regular-season games in the game logs.
export function careerTotals(cards) {
  const games = cards.flatMap((card) => card.games.filter((game) => game.phaseCode === "RS"));
  const sum = (field) => games.reduce((total, game) => total + (statNumber(game[field]) ?? 0), 0);
  return {
    games: games.length,
    minutes: Math.round(sum("timePlayed") / 60),
    points: Math.round(sum("points")),
    rebounds: Math.round(sum("totalRebounds")),
    assists: Math.round(sum("assistances")),
  };
}

export const CAREER_HIGHS = [
  { label: "Points", field: "points" },
  { label: "Rebounds", field: "totalRebounds" },
  { label: "Assists", field: "assistances" },
  { label: "Steals", field: "steals" },
  { label: "Blocks", field: "blocksFavour" },
  { label: "Threes made", field: "fieldGoalsMade3" },
  { label: "Valuation (PIR)", field: "valuation" },
];

// The best single game for each stat across every season and phase; the most recent one wins a tie.
export function careerHighs(cards) {
  return CAREER_HIGHS.map((stat) => {
    let best = null;
    for (const card of cards) {
      for (const game of card.games) {
        const value = statNumber(game[stat.field]);
        if (value === null) continue;
        if (best === null || value >= best.value) best = { value, game, seasonCode: card.seasonCode, label: card.label };
      }
    }
    return { ...stat, best };
  });
}
