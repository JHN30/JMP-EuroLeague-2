// The Statistics tab's rows: every number the season-statistics feed has for a player, in groups, plus a few worked out
// from it. A row reads the feed's `group`.`field`, or `compute(entry, mode)` for a worked-out number. `kind` says how it
// is written (a count is one decimal per game and a whole number in season totals; a percentage has one decimal and a %;
// games are whole numbers). `direction` says how it ranks: "higher" (the default) or "lower" is better, "style" ranks
// the most first without calling it good or bad, and "none" is not ranked or compared (games played is not a measure of
// anything). `column` places the group from xl.
import { statNumber } from "./playerOverview";

const feed = (group, field) => ({ group, field });

const sum = (...values) => (values.every((value) => value !== null) ? values.reduce((total, value) => total + value, 0) : null);

const traditional = (entry, field) => statNumber(entry.traditional?.[field]);
const scoring = (entry, field) => statNumber(entry.scoring?.[field]);

// Field goal % from the two shooting percentages, weighted by the share of shots that are twos and threes (exact in both
// modes, where adding up the rounded per-game makes and attempts would not be).
function fieldGoalPercentage(entry) {
  const [twoPct, threePct, twoRate, threeRate] = [
    traditional(entry, "twoPointersPercentage"),
    traditional(entry, "threePointersPercentage"),
    scoring(entry, "twoPointRate"),
    scoring(entry, "threePointRate"),
  ];
  if ([twoPct, threePct, twoRate, threeRate].some((value) => value === null) || twoRate + threeRate === 0) return null;
  return (twoPct * twoRate + threePct * threeRate) / (twoRate + threeRate);
}

function winPercentage(entry) {
  const wins = statNumber(entry.misc?.wins);
  const losses = statNumber(entry.misc?.losses);
  return wins === null || losses === null || wins + losses === 0 ? null : (wins / (wins + losses)) * 100;
}

// The feed gives possessions per game in both modes, so the season total is worked out.
function possessionsUsed(entry, mode) {
  const perGame = statNumber(entry.advanced?.possessions);
  const games = traditional(entry, "gamesPlayed");
  if (perGame === null) return null;
  return mode === "accumulated" ? (games === null ? null : perGame * games) : perGame;
}

const POSSESSIONS_TIP = "plays the player finished: field goal attempts, free throw trips (0.44 per attempt), turnovers and assists";

export const STAT_GROUPS = [
  {
    title: "Games and impact",
    column: "left",
    stats: [
      { ...feed("traditional", "gamesPlayed"), key: "gp", label: "Games played", kind: "games", direction: "none" },
      { ...feed("traditional", "gamesStarted"), key: "gs", label: "Games started", kind: "games", direction: "none" },
      { ...feed("traditional", "minutesPlayed"), key: "min", label: "Minutes", kind: "count" },
      { ...feed("traditional", "pir"), key: "pir", label: "Valuation (PIR)", kind: "count", tip: "Performance index rating: the league's all-round valuation of a game" },
      { ...feed("misc", "doubleDoubles"), key: "dd", label: "Double-doubles", kind: "games", tip: "Games with ten or more in two of points, rebounds, assists, steals and blocks" },
      { ...feed("misc", "tripleDoubles"), key: "td", label: "Triple-doubles", kind: "games", tip: "Games with ten or more in three of points, rebounds, assists, steals and blocks" },
      { ...feed("misc", "wins"), key: "wins", label: "Team wins", kind: "games", direction: "none", tip: "The team's wins in the games the player played" },
      { ...feed("misc", "losses"), key: "losses", label: "Team losses", kind: "games", direction: "none", tip: "The team's losses in the games the player played" },
      { key: "winPct", label: "Win %", kind: "percent", direction: "none", tip: "The team's share of wins in the games the player played", compute: winPercentage },
    ],
  },
  {
    title: "Scoring",
    column: "left",
    stats: [
      { ...feed("traditional", "pointsScored"), key: "pts", label: "Points", kind: "count" },
      {
        key: "fgm",
        label: "Field goals made",
        kind: "count",
        tip: "Two- and three-pointers made",
        compute: (entry) => sum(traditional(entry, "twoPointersMade"), traditional(entry, "threePointersMade")),
      },
      {
        key: "fga",
        label: "Field goals attempted",
        kind: "count",
        tip: "Two- and three-point attempts; most ranks first",
        compute: (entry) => sum(traditional(entry, "twoPointersAttempted"), traditional(entry, "threePointersAttempted")),
      },
      { key: "fgPct", label: "FG %", kind: "percent", tip: "Field goals made per field goal attempted", compute: fieldGoalPercentage },
      { ...feed("traditional", "twoPointersMade"), key: "twoMade", label: "2PT made", kind: "count" },
      { ...feed("traditional", "twoPointersAttempted"), key: "twoAttempted", label: "2PT attempted", kind: "count", tip: "Most ranks first" },
      { ...feed("traditional", "twoPointersPercentage"), key: "twoPct", label: "2PT %", kind: "percent" },
      { ...feed("traditional", "threePointersMade"), key: "threeMade", label: "3PT made", kind: "count" },
      { ...feed("traditional", "threePointersAttempted"), key: "threeAttempted", label: "3PT attempted", kind: "count", tip: "Most ranks first" },
      { ...feed("traditional", "threePointersPercentage"), key: "threePct", label: "3PT %", kind: "percent" },
      { ...feed("traditional", "freeThrowsMade"), key: "ftMade", label: "Free throws made", kind: "count" },
      { ...feed("traditional", "freeThrowsAttempted"), key: "ftAttempted", label: "Free throws attempted", kind: "count", tip: "Most ranks first" },
      { ...feed("traditional", "freeThrowsPercentage"), key: "ftPct", label: "FT %", kind: "percent" },
    ],
  },
  {
    title: "Efficiency",
    column: "left",
    stats: [
      { ...feed("advanced", "effectiveFieldGoalPercentage"), key: "efg", label: "eFG %", kind: "percent", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5" },
      { ...feed("advanced", "trueShootingPercentage"), key: "ts", label: "True shooting %", kind: "percent", tip: "Points per shooting possession, counting free throws and threes" },
      { ...feed("advanced", "freeThrowsRate"), key: "ftr", label: "Free throw rate", kind: "percent", tip: "Free throw attempts per field goal attempt" },
      {
        ...feed("advanced", "twoPointAttemptsRatio"),
        key: "twoPer100",
        label: "2PT att. per 100 poss.",
        kind: "decimal",
        direction: "style",
        tip: `Two-point attempts for every 100 possessions the player used (${POSSESSIONS_TIP}); most ranks first`,
      },
      {
        ...feed("advanced", "threePointAttemptsRatio"),
        key: "threePer100",
        label: "3PT att. per 100 poss.",
        kind: "decimal",
        direction: "style",
        tip: `Three-point attempts for every 100 possessions the player used (${POSSESSIONS_TIP}); most ranks first`,
      },
    ],
  },
  {
    title: "Rebounding",
    column: "right",
    stats: [
      { ...feed("traditional", "totalRebounds"), key: "reb", label: "Rebounds", kind: "count" },
      { ...feed("traditional", "offensiveRebounds"), key: "oreb", label: "Off. rebounds", kind: "count" },
      { ...feed("traditional", "defensiveRebounds"), key: "dreb", label: "Def. rebounds", kind: "count" },
      { ...feed("advanced", "reboundsPercentage"), key: "rebPct", label: "Rebound %", kind: "percent", tip: "The share of available rebounds the player took while on the floor" },
      { ...feed("advanced", "offensiveReboundsPercentage"), key: "orebPct", label: "Off. rebound %", kind: "percent", tip: "The share of available offensive rebounds the player took while on the floor" },
      { ...feed("advanced", "defensiveReboundsPercentage"), key: "drebPct", label: "Def. rebound %", kind: "percent", tip: "The share of available defensive rebounds the player took while on the floor" },
    ],
  },
  {
    title: "Playmaking",
    column: "right",
    stats: [
      { ...feed("traditional", "assists"), key: "ast", label: "Assists", kind: "count" },
      { ...feed("traditional", "turnovers"), key: "tov", label: "Turnovers", kind: "count", direction: "lower", tip: "Fewest ranks first" },
      { ...feed("advanced", "assistsToTurnoversRatio"), key: "ato", label: "Assist/turnover", kind: "decimal", tip: "Assists per turnover" },
      { ...feed("advanced", "assistsRatio"), key: "astRatio", label: "Assist ratio", kind: "decimal", tip: `Assists for every 100 possessions the player used (${POSSESSIONS_TIP})` },
      {
        ...feed("advanced", "turnoversRatio"),
        key: "tovRatio",
        label: "Turnover ratio",
        kind: "decimal",
        direction: "lower",
        tip: `Turnovers for every 100 possessions the player used (${POSSESSIONS_TIP}); fewest ranks first`,
      },
      { ...feed("advanced", "possessions"), key: "poss", label: "Possessions used", kind: "count", tip: `The ${POSSESSIONS_TIP}`, compute: possessionsUsed },
    ],
  },
  {
    title: "Defense and fouls",
    column: "right",
    stats: [
      { ...feed("traditional", "steals"), key: "stl", label: "Steals", kind: "count" },
      { ...feed("traditional", "blocks"), key: "blk", label: "Blocks", kind: "count" },
      { ...feed("traditional", "blocksAgainst"), key: "blocked", label: "Shots blocked", kind: "count", direction: "lower", tip: "The player's shots an opponent blocked; fewest ranks first" },
      { ...feed("traditional", "foulsCommited"), key: "pf", label: "Fouls committed", kind: "count", direction: "lower", tip: "Fewest ranks first" },
      { ...feed("traditional", "foulsDrawn"), key: "fd", label: "Fouls drawn", kind: "count" },
    ],
  },
  {
    title: "Shot and point mix",
    column: "right",
    stats: [
      { ...feed("scoring", "twoPointRate"), key: "twoRate", label: "Shots that are 2s", kind: "percent", direction: "style", tip: "The share of field goal attempts that are twos; most ranks first" },
      { ...feed("scoring", "threePointRate"), key: "threeRate", label: "Shots that are 3s", kind: "percent", direction: "style", tip: "The share of field goal attempts that are threes; most ranks first" },
      { ...feed("scoring", "pointsFromTwoPointersPercentage"), key: "twoShare", label: "Points from 2s", kind: "percent", direction: "style", tip: "The share of points scored on two-pointers; most ranks first" },
      { ...feed("scoring", "pointsFromThreePointersPercentage"), key: "threeShare", label: "Points from 3s", kind: "percent", direction: "style", tip: "The share of points scored on three-pointers; most ranks first" },
      { ...feed("scoring", "pointsFromFreeThrowsPercentage"), key: "ftShare", label: "Points from free throws", kind: "percent", direction: "style", tip: "The share of points scored on free throws; most ranks first" },
    ],
  },
  {
    title: "Share of the team",
    column: "right",
    stats: [
      { ...feed("scoring", "twoPointAttemptsShare"), key: "teamTwoAttempts", label: "2PT attempts", kind: "percent", tip: "The share of the team's two-point attempts the player took" },
      { ...feed("scoring", "threePointAttemptsShare"), key: "teamThreeAttempts", label: "3PT attempts", kind: "percent", tip: "The share of the team's three-point attempts the player took" },
      { ...feed("scoring", "freeThrowsAttemptsShare"), key: "teamFtAttempts", label: "Free throw attempts", kind: "percent", tip: "The share of the team's free throw attempts the player took" },
      { ...feed("scoring", "twoPointersMadeShare"), key: "teamTwoMade", label: "2PT made", kind: "percent", tip: "The share of the team's made two-pointers that were the player's" },
      { ...feed("scoring", "threePointersMadeShare"), key: "teamThreeMade", label: "3PT made", kind: "percent", tip: "The share of the team's made three-pointers that were the player's" },
      { ...feed("scoring", "freeThrowsMadeShare"), key: "teamFtMade", label: "Free throws made", kind: "percent", tip: "The share of the team's made free throws that were the player's" },
    ],
  },
];

// How a row's number is written: a percentage with one decimal and a %, games whole, a count whole in season totals and with
// one decimal per game.
export function formatSheetValue(stat, value, mode) {
  if (value === null || value === undefined) return "—";
  if (stat.kind === "percent") return `${value.toFixed(1)}%`;
  if (stat.kind === "games") return String(Math.round(value));
  if (stat.kind === "count" && mode === "accumulated") return Math.round(value).toLocaleString();
  return value.toFixed(1);
}

// One row's number for a player's entry (null when there is none).
export function statValue(stat, entry, mode) {
  if (!entry) return null;
  return stat.compute ? stat.compute(entry, mode) : statNumber(entry[stat.group]?.[stat.field]);
}

// A row is ranked and averaged among the players with the phase's minimum games when it is per game, a percentage or a
// ratio; a season total of a count, among everyone who played.
export function qualifiedOnly(stat, mode) {
  return mode === "perGame" || stat.kind === "percent" || stat.kind === "decimal";
}

// The player's rank and the league average on one row, measured over the same players. Null for a row that is not
// compared or before the league has loaded. `rank` is null for a player under the minimum games (`unqualified`), and for
// a zero that is nothing to rank (no blocks at all).
export function leagueStanding(stat, league, entry, mode) {
  if (!league || stat.direction === "none") return null;
  const onlyQualified = qualifiedOnly(stat, mode);
  const pool = onlyQualified ? league.filter((player) => player.qualified !== false) : league;
  const values = pool.map((player) => statValue(stat, player, mode)).filter((value) => value !== null);
  const average = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
  const value = statValue(stat, entry, mode);
  const unqualified = onlyQualified && entry.qualified === false;
  if (value === null || unqualified || (value === 0 && stat.direction !== "lower")) {
    return { average, rank: null, of: values.length, unqualified: unqualified && value !== null };
  }
  const lower = stat.direction === "lower";
  const rank = values.filter((other) => (lower ? other < value : other > value)).length + 1;
  return { average, rank, of: values.length, unqualified: false };
}
