// A player across every season in the archive: one card per season they appear in, and the numbers worked out
// from those cards (career averages, changes from one season to the next, career highs, club stints). Each card
// holds both the regular season and every phase, so the tab switches between them without loading again.
import { getPlayer, getPlayerAdvanced, getPlayerGames, getPlayerRegistrations, getPlayerSeasonStats } from "../lib/api";
import { formatSeasonLabel } from "../lib/format";
import { statNumber } from "./playerOverview";

const GAMES_LIMIT = 100;

// Fewer games than this and a season's averages are mostly noise: it is shown, but never compared.
export const SMALL_SAMPLE_GAMES = 10;

// The tab's two views of a career: every phase (the default), or the regular season alone.
export const CAREER_PHASES = [
  { key: "all", label: "All games" },
  { key: "RS", label: "Regular season" },
];

// Oldest season first. A season the player is not in (404) is left out; any other failure fails the whole tab.
export async function fetchPlayerCareer(seasons, personKey) {
  const ordered = [...seasons].sort((a, b) => a.startYear - b.startYear);
  const cards = await Promise.all(
    ordered.map(async (season) => {
      try {
        const { player } = await getPlayer(season.seasonCode, personKey);
        const [registrationsData, regularStats, allStats, gamesData, regularAdvanced, allAdvanced] = await Promise.all([
          getPlayerRegistrations(season.seasonCode, personKey),
          getPlayerSeasonStats(season.seasonCode, personKey, { phase: "RS", mode: "perGame" }),
          getPlayerSeasonStats(season.seasonCode, personKey, { phase: "all", mode: "perGame" }),
          getPlayerGames(season.seasonCode, personKey, { limit: GAMES_LIMIT }),
          // Only some seasons have advanced statistics; a season without them just has no PER column.
          getPlayerAdvanced(season.seasonCode, personKey, { scope: "RS" }).catch(() => null),
          getPlayerAdvanced(season.seasonCode, personKey, { scope: "all" }).catch(() => null),
        ]);
        return {
          seasonCode: season.seasonCode,
          label: formatSeasonLabel(season.seasonCode),
          player,
          registrations: registrationsData.registrations ?? [],
          entries: { RS: regularStats.players?.[0] ?? null, all: allStats.players?.[0] ?? null },
          games: (gamesData.games ?? []).filter((game) => game.played && statNumber(game.timePlayed) > 0),
          advanced: { RS: lastRound(regularAdvanced), all: lastRound(allAdvanced) },
        };
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    }),
  );
  return cards.filter(Boolean);
}

// The last round's running totals are the season's value.
function lastRound(advancedData) {
  const rounds = advancedData?.rounds ?? [];
  return rounds.length > 0 ? rounds[rounds.length - 1] : null;
}

// The games a view counts: every phase, or the regular season alone.
function gamesInPhase(card, phase) {
  return phase === "all" ? card.games : card.games.filter((game) => game.phaseCode === "RS");
}

export const TOTAL_KEYS = ["gp", "min", "pts", "reb", "ast", "stl", "blk", "pir", "m2", "a2", "m3", "a3", "mft", "aft"];

// A season's exact totals, added up from its game log.
function totalsFromGames(games) {
  const sum = (field) => games.reduce((total, game) => total + (statNumber(game[field]) ?? 0), 0);
  return {
    gp: games.length,
    min: Math.round(sum("timePlayed") / 60),
    pts: sum("points"),
    reb: sum("totalRebounds"),
    ast: sum("assistances"),
    stl: sum("steals"),
    blk: sum("blocksFavour"),
    pir: sum("valuation"),
    m2: sum("fieldGoalsMade2"),
    a2: sum("fieldGoalsAttempted2"),
    m3: sum("fieldGoalsMade3"),
    a3: sum("fieldGoalsAttempted3"),
    mft: sum("freeThrowsMade"),
    aft: sum("freeThrowsAttempted"),
  };
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

// One season in one view (`all` or `RS`) as flat numbers (null where there are none), with its totals from the game
// log. `played` is false for a season with no games in the view, which the tab leaves out. `calculated` marks a season
// whose per-game numbers the database worked out from the player's season totals (the league lists per-game numbers
// only from a minimum of games).
export function seasonLine(card, phase) {
  const entry = card.entries[phase];
  const advanced = card.advanced[phase];
  const base = entry ? lineFromFeed(entry) : EMPTY_LINE;
  const games = gamesInPhase(card, phase);
  const totals = totalsFromGames(games);
  const usg = statNumber(advanced?.usgPct);
  // Beyond the regular season: the old Top 16 group stage, and the postseason (play-in, playoffs, Final Four).
  const stages = {
    topSixteen: games.filter((game) => game.phaseCode === "TS").length,
    postseason: games.filter((game) => ["PI", "PO", "FF"].includes(game.phaseCode)).length,
  };
  return {
    seasonCode: card.seasonCode,
    label: card.label,
    ...base,
    per: statNumber(advanced?.per),
    ws: statNumber(advanced?.winShares),
    usg: usg === null ? null : usg * 100,
    totals,
    stages,
    played: totals.gp > 0 || (base.gp ?? 0) > 0,
    small: base.gp !== null && base.gp < SMALL_SAMPLE_GAMES,
    calculated: entry?.isCalculated === true,
    qualified: entry?.qualified ?? null,
    minGames: entry?.minGames ?? null,
  };
}

// How a number moved from the season before. Null when either season is missing the number or is a small sample.
export function changeFrom(previous, current, key) {
  if (!previous || !current || previous.small || current.small) return null;
  if (previous[key] === null || current[key] === null) return null;
  return Math.round((current[key] - previous[key]) * 10) / 10;
}

// Career averages, each season weighted by its games (counting stats and usage) or by its minutes played (shooting
// percentages, which are about possessions, not games).
const COUNTING = ["min", "pts", "reb", "ast", "stl", "blk", "pir", "usg"];
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

// The career's exact totals: every season's game-log totals added up.
export function careerTotals(lines) {
  const totals = {};
  for (const key of TOTAL_KEYS) totals[key] = lines.reduce((sum, line) => sum + line.totals[key], 0);
  totals.stages = {
    topSixteen: lines.reduce((sum, line) => sum + line.stages.topSixteen, 0),
    postseason: lines.reduce((sum, line) => sum + line.stages.postseason, 0),
  };
  return totals;
}

export const CAREER_HIGHS = [
  { label: "Points", field: "points" },
  { label: "Rebounds", field: "totalRebounds" },
  { label: "Assists", field: "assistances" },
  { label: "Steals", field: "steals" },
  { label: "Blocks", field: "blocksFavour" },
  { label: "Threes made", field: "fieldGoalsMade3" },
  { label: "Free throws made", field: "freeThrowsMade" },
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

// The clubs as stints: consecutive registered seasons at one club are one stint, and a club the player comes back to
// after a gap starts a new one. Within a season the club they left (an inactive registration) comes first. Every
// registered season counts, with or without games, since this is about rosters.
export function clubStints(cards) {
  const stints = [];
  let previous = new Map();
  for (const card of cards) {
    const current = new Map();
    const registrations = [...card.registrations].sort((a, b) => (a.active === false ? 0 : 1) - (b.active === false ? 0 : 1));
    for (const registration of registrations) {
      const clubCode = registration.team?.clubCode ?? registration.clubCode;
      let stint = current.get(clubCode) ?? previous.get(clubCode);
      if (!stint) {
        stint = { key: `${clubCode}-${card.seasonCode}`, clubCode, seasons: [], roles: [] };
        stints.push(stint);
      }
      if (stint.seasons[stint.seasons.length - 1] !== card) stint.seasons.push(card);
      // The latest season's name and crest, and whether the player had left the club by then.
      stint.team = registration.team ?? stint.team ?? null;
      stint.former = registration.active === false;
      const role = [registration.positionName, registration.dorsal ? `#${registration.dorsal}` : null].filter(Boolean).join(" · ");
      if (role && !stint.roles.includes(role)) stint.roles.push(role);
      current.set(clubCode, stint);
    }
    previous = current;
  }
  return stints;
}
