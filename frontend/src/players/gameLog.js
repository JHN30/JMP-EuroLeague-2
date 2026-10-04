// A player's game log as it is shown on the Games tab: each game from the player's side, and the averages over a set of
// games. The log comes from the API with the box-score numbers as strings ("14.0").
import { statNumber } from "./playerOverview";

// The stats the bar chart can show, each with how to read it from a game.
export const BAR_STATS = [
  { key: "pts", label: "Points", short: "PTS", digits: 0 },
  { key: "reb", label: "Rebounds", short: "REB", digits: 0 },
  { key: "ast", label: "Assists", short: "AST", digits: 0 },
  { key: "pir", label: "Valuation (PIR)", short: "PIR", digits: 0 },
  { key: "min", label: "Minutes", short: "MIN", digits: 0 },
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
  return {
    game,
    home,
    opponent,
    clubScore,
    opponentScore,
    won: hasScore ? clubScore > opponentScore : null,
    seconds: number("timePlayed"),
    min: number("timePlayed") / 60,
    pts: number("points"),
    reb: number("totalRebounds"),
    ast: number("assistances"),
    stl: number("steals"),
    tov: number("turnovers"),
    pir: number("valuation"),
    plusMinus: statNumber(game.plusMinus),
    two: `${number("fieldGoalsMade2")}/${number("fieldGoalsAttempted2")}`,
    three: `${number("fieldGoalsMade3")}/${number("fieldGoalsAttempted3")}`,
    ft: `${number("freeThrowsMade")}/${number("freeThrowsAttempted")}`,
  };
}

export function averageOf(views, key) {
  return views.length === 0 ? null : views.reduce((sum, view) => sum + view[key], 0) / views.length;
}

// The best value of a stat and the games that share it, for the season highs.
export function seasonHighs(views) {
  const highs = {};
  for (const stat of ["pts", "reb", "ast", "pir"]) highs[stat] = views.reduce((best, view) => Math.max(best, view[stat]), 0);
  return highs;
}

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
