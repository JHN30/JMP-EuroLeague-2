// A player's game log as it is shown on the Games tab: each game from the player's side, and the averages over a set of
// games. The log comes from the API with the box-score numbers as strings ("14.0").
import { statNumber } from "./playerOverview";

// The stats the bar chart can show, each with how to read it from a game. `percent` is a rate (made over attempted over
// the games, not a mean of the games' rates); `signed` goes below zero.
export const BAR_STATS = [
  { key: "pts", label: "Points", short: "PTS", digits: 0 },
  { key: "reb", label: "Rebounds", short: "REB", digits: 0 },
  { key: "ast", label: "Assists", short: "AST", digits: 0 },
  { key: "pir", label: "Valuation (PIR)", short: "PIR", digits: 0 },
  { key: "min", label: "Minutes", short: "MIN", digits: 0 },
  { key: "fgPct", label: "Field goal percentage", short: "FG%", digits: 1, percent: { made: "fgm", attempted: "fga" } },
  { key: "tpm", label: "Threes made", short: "3PM", digits: 0 },
  { key: "plusMinus", label: "Plus-minus", short: "+/-", digits: 0, signed: true },
];

// Only games the player played in. A game on the log with no minutes is not one they played.
export function playedLog(games) {
  return games
    .filter((game) => game.played && (statNumber(game.timePlayed) ?? 0) > 0)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// One game from the player's side: the opponent, where it was played, the result and the numbers.
export function viewGame(game) {
  const home = game.side === "local";
  const opponent = home ? game.roadTeam : game.localTeam;
  const clubScore = home ? game.localScore : game.roadScore;
  const opponentScore = home ? game.roadScore : game.localScore;
  const hasScore = clubScore != null && opponentScore != null;
  const number = (field) => statNumber(game[field]) ?? 0;
  const fgm = number("fieldGoalsMade2") + number("fieldGoalsMade3");
  const fga = number("fieldGoalsAttempted2") + number("fieldGoalsAttempted3");
  return {
    game,
    home,
    opponent,
    clubScore,
    opponentScore,
    won: hasScore ? clubScore > opponentScore : null,
    // null when the feed does not say whether he started.
    started: typeof game.started === "boolean" ? game.started : null,
    // The pipeline's advanced numbers for the game, or null for a season without them.
    advanced: game.advanced ?? null,
    seconds: number("timePlayed"),
    min: number("timePlayed") / 60,
    pts: number("points"),
    reb: number("totalRebounds"),
    oreb: number("offensiveRebounds"),
    dreb: number("defensiveRebounds"),
    ast: number("assistances"),
    stl: number("steals"),
    blk: number("blocksFavour"),
    tov: number("turnovers"),
    pf: number("foulsCommited"),
    fd: number("foulsReceived"),
    pir: number("valuation"),
    plusMinus: statNumber(game.plusMinus),
    fgm,
    fga,
    fgPct: fga > 0 ? (fgm / fga) * 100 : null,
    tpm: number("fieldGoalsMade3"),
    two: `${number("fieldGoalsMade2")}/${number("fieldGoalsAttempted2")}`,
    three: `${number("fieldGoalsMade3")}/${number("fieldGoalsAttempted3")}`,
    ft: `${number("freeThrowsMade")}/${number("freeThrowsAttempted")}`,
  };
}

export function averageOf(views, key) {
  return views.length === 0 ? null : views.reduce((sum, view) => sum + view[key], 0) / views.length;
}

// A stat over a set of games: a rate over their attempts for a percentage, otherwise the mean of the games that have it.
// null when no game has it.
export function statOver(views, stat) {
  if (stat.percent) {
    const attempted = views.reduce((sum, view) => sum + view[stat.percent.attempted], 0);
    return attempted > 0 ? (views.reduce((sum, view) => sum + view[stat.percent.made], 0) / attempted) * 100 : null;
  }
  const values = views.map((view) => view[stat.key]).filter((value) => value !== null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The stat over the last `size` games at each game, from the `size`th game on (null before it); views run oldest first.
export function rollingAverage(views, stat, size = 5) {
  return views.map((_, index) => (index + 1 < size ? null : statOver(views.slice(index + 1 - size, index + 1), stat)));
}

// The best value of a stat and the games that share it, for the season highs.
export function seasonHighs(views) {
  const highs = {};
  for (const stat of ["pts", "reb", "ast", "pir"]) highs[stat] = views.reduce((best, view) => Math.max(best, view[stat]), 0);
  return highs;
}

// The game of each season high (the latest on a tie), or null when the best is 0. Views run oldest first. `stats` are the view keys
// to look at (points, rebounds, assists and PIR by default).
export function seasonHighGames(views, stats = ["pts", "reb", "ast", "pir"]) {
  const games = {};
  for (const stat of stats) {
    let best = null;
    for (const view of views) {
      if (view[stat] > 0 && (best === null || view[stat] >= best[stat])) best = view;
    }
    games[stat] = best;
  }
  return games;
}

// The rows of the split table, each with the games it covers. Views run oldest first, so the last five are the latest.
export const SPLIT_ROWS = [
  { key: "all", label: "All games", pick: (views) => views },
  { key: "home", label: "Home", pick: (views) => views.filter((view) => view.home) },
  { key: "away", label: "Away", pick: (views) => views.filter((view) => !view.home) },
  { key: "wins", label: "Wins", pick: (views) => views.filter((view) => view.won === true) },
  { key: "losses", label: "Losses", pick: (views) => views.filter((view) => view.won === false) },
  { key: "last5", label: "Last 5", pick: (views) => views.slice(-5) },
  { key: "started", label: "Started", pick: (views) => views.filter((view) => view.started === true) },
  { key: "bench", label: "Off the bench", pick: (views) => views.filter((view) => view.started === false) },
];

// The split table's columns, per game. `clear` is how far from the All games row a value must be to be tinted.
export const SPLIT_COLUMNS = [
  { key: "min", short: "MIN", digits: 1, clear: 1 },
  { key: "pts", short: "PTS", digits: 1, clear: 1 },
  { key: "reb", short: "REB", digits: 1, clear: 0.5 },
  { key: "ast", short: "AST", digits: 1, clear: 0.5 },
  { key: "fgPct", short: "FG%", digits: 1, clear: 3, percent: { made: "fgm", attempted: "fga" } },
  { key: "pir", short: "PIR", digits: 1, clear: 1 },
];

export const SORTS = [
  { key: "newest", label: "Newest first", compare: (a, b) => new Date(b.game.scheduledAt) - new Date(a.game.scheduledAt) },
  { key: "oldest", label: "Oldest first", compare: (a, b) => new Date(a.game.scheduledAt) - new Date(b.game.scheduledAt) },
  { key: "pts", label: "Most points", compare: (a, b) => b.pts - a.pts },
  { key: "pir", label: "Best valuation", compare: (a, b) => b.pir - a.pir },
];

export const GAME_FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "wins", label: "Wins", test: (view) => view.won === true },
  { key: "losses", label: "Losses", test: (view) => view.won === false },
  { key: "home", label: "Home", test: (view) => view.home },
  { key: "away", label: "Away", test: (view) => !view.home },
];
