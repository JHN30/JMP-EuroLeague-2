// Helpers shared by the streaks, margins and ahead/behind breakdowns.
import { seasonSlug } from "../lib/seasonSlug";

export const CLOSE_GAME_MARGIN = 3;

// Records arrive as "W-L" text ("16-3"); anything else means the record is missing.
export function parseRecord(text) {
  const match = /^(\d+)-(\d+)$/.exec(text ?? "");
  return match ? { w: Number(match[1]), l: Number(match[2]) } : null;
}

export function recordGames(record) {
  return record ? record.w + record.l : 0;
}

export function recordShare(record) {
  const games = recordGames(record);
  return games > 0 ? record.w / games : null;
}

export function formatShare(record) {
  const share = recordShare(record);
  return share === null ? "—" : `${Math.round(share * 100)}%`;
}

export function sumRecords(records) {
  return records.reduce(
    (total, record) => (record ? { w: total.w + record.w, l: total.l + record.l } : total),
    { w: 0, l: 0 },
  );
}

// Margin figures worked out from a club's game results (a result is { pointsFor, pointsAgainst }).
// They match the official 1-5 / 6-10 / 11-15 / 15+ records, which are checked against the same scores.
export function marginStats(results) {
  if (!results || results.length === 0) return null;
  const wins = results.filter((game) => game.pointsFor > game.pointsAgainst).map((game) => game.pointsFor - game.pointsAgainst);
  const losses = results.filter((game) => game.pointsFor < game.pointsAgainst).map((game) => game.pointsFor - game.pointsAgainst);
  const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
  return {
    avgMargin: average(results.map((game) => game.pointsFor - game.pointsAgainst)),
    avgWin: average(wins),
    avgLoss: average(losses),
    biggestWin: wins.length > 0 ? Math.max(...wins) : null,
    biggestLoss: losses.length > 0 ? Math.min(...losses) : null,
    close: {
      w: wins.filter((margin) => margin <= CLOSE_GAME_MARGIN).length,
      l: losses.filter((margin) => -margin <= CLOSE_GAME_MARGIN).length,
    },
  };
}

// From 2016-17 the published standings leave overtime out of points for, against and difference; earlier seasons
// count the final score. (Checked against every regular season's published totals.)
const REGULATION_POINTS_FROM_SEASON = 2016;

// Takes the season as the API names it ("E2026") or as the page address does ("2026").
export function countsRegulationPoints(seasonCode) {
  return Number(seasonSlug(seasonCode)) >= REGULATION_POINTS_FROM_SEASON;
}

// The table views whose figure columns count only some of a club's games.
export const SPLIT_VIEWS = ["home", "away", "last10"];

// A club's totals over only its home games (view "home"), its away games ("away") or its last 10 games ("last10"),
// from its own results (oldest first), counted the way the published standings count them: games after
// `throughRound` and games against clubs outside the table (`opponents`, such as the annulled 2021-22 games with the
// removed Russian clubs) are left out, and points follow the season's overtime rule, falling back to the final score
// when a game's quarter scores are missing.
export function splitTotals(results, view, { throughRound = null, opponents = null, regulationPoints = false } = {}) {
  const counted = (results ?? []).filter(
    (game) =>
      (view === "home" ? game.home : view === "away" ? !game.home : true) &&
      (throughRound == null || game.roundNumber == null || game.roundNumber <= throughRound) &&
      (!opponents || opponents.has(game.opponentCode)),
  );
  const games = view === "last10" ? counted.slice(-10) : counted;
  const wins = games.filter((game) => game.pointsFor > game.pointsAgainst).length;
  const pointsOf = (game, regulation, final) => (regulationPoints ? (game[regulation] ?? game[final]) : game[final]);
  const pointsFor = games.reduce((sum, game) => sum + pointsOf(game, "regulationPointsFor", "pointsFor"), 0);
  const pointsAgainst = games.reduce((sum, game) => sum + pointsOf(game, "regulationPointsAgainst", "pointsAgainst"), 0);
  return {
    gamesPlayed: games.length,
    gamesWon: wins,
    gamesLost: games.length - wins,
    // Same 0-100, one-decimal form as the published win percentage ("68.4").
    winPercentage: games.length > 0 ? ((wins / games.length) * 100).toFixed(1) : null,
    pointsFor,
    pointsAgainst,
    pointsDifference: pointsFor - pointsAgainst,
  };
}

// Each phase club's totals for a split view (home, away or last 10), or null for other views and until results arrive.
export function splitFiguresByClub(standings, view, resultsData, { round = null, seasonCode } = {}) {
  if (!SPLIT_VIEWS.includes(view) || !resultsData) return null;
  const games = resultsByClub(resultsData);
  const options = { throughRound: round, opponents: new Set(standings.map((entry) => entry.clubCode)), regulationPoints: countsRegulationPoints(seasonCode) };
  return new Map(standings.map((entry) => [entry.clubCode, splitTotals(games.get(entry.clubCode), view, options)]));
}

export function resultsByClub(resultsData) {
  return new Map((resultsData?.results ?? []).map((club) => [club.clubCode, club.games]));
}

export const BUCKETS = [
  { key: "b1", label: "1-5", max: 5 },
  { key: "b2", label: "6-10", max: 10 },
  { key: "b3", label: "11-15", max: 15 },
  { key: "b4", label: "over 15", max: Infinity },
];

export const CATEGORIES = [
  { key: "rebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "blocks", label: "Blocks" },
  { key: "threePointers", label: "3-pointers" },
  { key: "twoPointers", label: "2-pointers" },
  { key: "freeThrows", label: "Free throws" },
];

function bucketFor(margin) {
  const size = Math.abs(margin);
  return BUCKETS.find((bucket) => size <= bucket.max).key;
}

// Longest streaks, margin buckets and category records worked out from a club's own results, oldest first. The source
// publishes these per-view feeds separately and they can lag the basic standings by a game, so the page never reads them.
// (For a full season the buckets equal the official ones, which was checked for every club.)
export function derivedFigures(results) {
  if (!results) return null;
  const buckets = Object.fromEntries(BUCKETS.map((bucket) => [bucket.key, { w: 0, l: 0 }]));
  const categories = Object.fromEntries(CATEGORIES.map((category) => [category.key, { w: 0, l: 0 }]));
  let longestWin = 0;
  let longestLoss = 0;
  let run = 0;
  for (const game of results) {
    const won = game.pointsFor > game.pointsAgainst;
    buckets[bucketFor(game.pointsFor - game.pointsAgainst)][won ? "w" : "l"] += 1;
    for (const category of CATEGORIES) {
      if ((game.edges?.[category.key] ?? 0) > 0) categories[category.key][won ? "w" : "l"] += 1;
    }
    run = won ? (run > 0 ? run + 1 : 1) : run < 0 ? run - 1 : -1;
    longestWin = Math.max(longestWin, run);
    longestLoss = Math.max(longestLoss, -run);
  }
  return { longestWin, longestLoss, buckets, categories };
}

const average = (values) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

// Average net points in each regulation quarter, and the running total at tip-off, each quarter's end. Games with a
// missing quarter score are left out. Overtime is not part of a quarter, so the final figure can differ in those games.
export function quarterProfile(results) {
  const games = (results ?? []).filter((game) => game.quarterMargins);
  if (games.length === 0) return null;
  const quarters = [0, 1, 2, 3].map((index) => average(games.map((game) => game.quarterMargins[index])));
  const cumulative = [0];
  for (const quarter of quarters) cumulative.push(cumulative[cumulative.length - 1] + quarter);
  return { quarters, cumulative, games: games.length };
}

// Record when leading or trailing at half-time (games tied at the break are in neither), from the quarter scores.
export function halfTimeRecords(results) {
  const records = { lead: { w: 0, l: 0 }, trail: { w: 0, l: 0 } };
  for (const game of results ?? []) {
    if (!game.quarterMargins) continue;
    const half = game.quarterMargins[0] + game.quarterMargins[1];
    if (half === 0) continue;
    records[half > 0 ? "lead" : "trail"][game.pointsFor > game.pointsAgainst ? "w" : "l"] += 1;
  }
  return records;
}

// A plain-language label for how a team's typical game unfolds: which half it does its scoring in.
export function shapeLabel(profile) {
  const difference = profile.quarters[2] + profile.quarters[3] - (profile.quarters[0] + profile.quarters[1]);
  if (difference >= 1.5) return "Strong finisher";
  if (difference <= -1.5) return "Fast starter";
  return "Steady";
}
