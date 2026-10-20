// What the Leaders page can rank: players' season statistics, the pipeline's advanced player metrics, and team numbers.
// `family` groups the picker, `kind` says how a number is written, `lowerIsBetter` flips the default order, and `volume`
// keeps a percentage honest: nobody tops the 3-point board on three attempts, and the feed has no attempt-based minimum.

// ---- Players (per-game and accumulated season statistics) ----

export const PLAYER_FAMILIES = ["Scoring", "Playmaking", "Rebounding", "Defense", "Overall"];

// `volume`: the player must average at least `min` of `field` per game to be ranked on this stat.
const FIELD_GOALS = { group: "traditional", fields: ["twoPointersAttempted", "threePointersAttempted"], min: 4, label: "4+ field goal attempts a game" };
const MINUTES = { group: "traditional", fields: ["minutesPlayed"], min: 10, label: "10+ minutes a game" };

export const PLAYER_STATS = [
  { key: "pointsScored", family: "Scoring", label: "Points", short: "PTS", group: "traditional", kind: "count" },
  { key: "twoPointersMade", family: "Scoring", label: "2-pointers made", short: "2PM", group: "traditional", kind: "count" },
  { key: "twoPointersAttempted", family: "Scoring", label: "2-pointers attempted", short: "2PA", group: "traditional", kind: "count" },
  { key: "threePointersMade", family: "Scoring", label: "3-pointers made", short: "3PM", group: "traditional", kind: "count" },
  { key: "threePointersAttempted", family: "Scoring", label: "3-pointers attempted", short: "3PA", group: "traditional", kind: "count" },
  { key: "threePointersPercentage", family: "Scoring", label: "3-point %", short: "3P%", group: "traditional", kind: "percent",
    volume: { group: "traditional", fields: ["threePointersAttempted"], min: 1, label: "1+ three-point attempt a game" } },
  { key: "twoPointersPercentage", family: "Scoring", label: "2-point %", short: "2P%", group: "traditional", kind: "percent",
    volume: { group: "traditional", fields: ["twoPointersAttempted"], min: 2, label: "2+ two-point attempts a game" } },
  { key: "freeThrowsMade", family: "Scoring", label: "Free throws made", short: "FTM", group: "traditional", kind: "count" },
  { key: "freeThrowsAttempted", family: "Scoring", label: "Free throws attempted", short: "FTA", group: "traditional", kind: "count" },
  { key: "freeThrowsPercentage", family: "Scoring", label: "Free throw %", short: "FT%", group: "traditional", kind: "percent",
    volume: { group: "traditional", fields: ["freeThrowsAttempted"], min: 1, label: "1+ free throw attempt a game" } },
  { key: "effectiveFieldGoalPercentage", family: "Scoring", label: "Effective FG%", short: "eFG%", group: "advanced", kind: "percent", volume: FIELD_GOALS,
    tip: "Field goal percentage with threes weighted 1.5" },
  { key: "trueShootingPercentage", family: "Scoring", label: "True shooting %", short: "TS%", group: "advanced", kind: "percent", volume: FIELD_GOALS,
    tip: "Points per shooting possession, counting free throws and threes" },
  { key: "freeThrowsRate", family: "Scoring", label: "Free throw rate", short: "FT rate", group: "advanced", kind: "percent", volume: FIELD_GOALS,
    tip: "Free throws made per field goal attempt" },

  { key: "assists", family: "Playmaking", label: "Assists", short: "AST", group: "traditional", kind: "count" },
  { key: "assistsToTurnoversRatio", family: "Playmaking", label: "Assist to turnover", short: "AST/TO", group: "advanced", kind: "decimal", volume: MINUTES },
  { key: "assistsRatio", family: "Playmaking", label: "Assist ratio", short: "AST ratio", group: "advanced", kind: "decimal", volume: MINUTES,
    tip: "Assists per 100 possessions the player used" },
  { key: "turnovers", family: "Playmaking", label: "Turnovers", short: "TO", group: "traditional", kind: "count", lowerIsBetter: true, showMost: true },
  { key: "turnoversRatio", family: "Playmaking", label: "Turnover ratio", short: "TO ratio", group: "advanced", kind: "decimal", lowerIsBetter: true, volume: MINUTES,
    tip: "Turnovers per 100 possessions the player used" },

  { key: "totalRebounds", family: "Rebounding", label: "Rebounds", short: "REB", group: "traditional", kind: "count" },
  { key: "offensiveRebounds", family: "Rebounding", label: "Offensive rebounds", short: "OREB", group: "traditional", kind: "count" },
  { key: "defensiveRebounds", family: "Rebounding", label: "Defensive rebounds", short: "DREB", group: "traditional", kind: "count" },
  { key: "reboundsPercentage", family: "Rebounding", label: "Rebound %", short: "REB%", group: "advanced", kind: "percent", volume: MINUTES,
    tip: "The share of available rebounds the player took while on the floor" },
  { key: "offensiveReboundsPercentage", family: "Rebounding", label: "Offensive rebound %", short: "OREB%", group: "advanced", kind: "percent", volume: MINUTES },
  { key: "defensiveReboundsPercentage", family: "Rebounding", label: "Defensive rebound %", short: "DREB%", group: "advanced", kind: "percent", volume: MINUTES },

  { key: "steals", family: "Defense", label: "Steals", short: "STL", group: "traditional", kind: "count" },
  { key: "blocks", family: "Defense", label: "Blocks", short: "BLK", group: "traditional", kind: "count" },
  { key: "foulsDrawn", family: "Defense", label: "Fouls drawn", short: "FD", group: "traditional", kind: "count" },
  { key: "foulsCommited", family: "Defense", label: "Fouls committed", short: "FC", group: "traditional", kind: "count", lowerIsBetter: true, showMost: true },

  { key: "pir", family: "Overall", label: "Valuation (PIR)", short: "PIR", group: "traditional", kind: "count",
    tip: "Performance index rating: the league's all-round valuation of a game" },
  { key: "minutesPlayed", family: "Overall", label: "Minutes", short: "MIN", group: "traditional", kind: "minutes" },
  { key: "doubleDoubles", family: "Overall", label: "Double-doubles", short: "DD", group: "misc", kind: "games" },
  { key: "tripleDoubles", family: "Overall", label: "Triple-doubles", short: "TD", group: "misc", kind: "games" },
  { key: "possessions", family: "Overall", label: "Possessions", short: "POSS", group: "advanced", kind: "count" },
  { key: "gamesPlayed", family: "Overall", label: "Games played", short: "GP", group: "traditional", kind: "games" },
];

// The landing's cards, listed in the order they appear. The landing groups them under their stat's family, so each family's run
// reads as one story: attempts, makes, then the percentage for each kind of shot. A card with a `volume` stat is read from a
// longer list and filtered before its top 5.
// `showMost`: a card (and the board it opens) lists who has the most of a lower-is-better count, since the fewest is just the
// players who barely played.
export const PLAYER_CARDS = [
  "pointsScored", "effectiveFieldGoalPercentage", "trueShootingPercentage",
  "twoPointersAttempted", "twoPointersMade", "twoPointersPercentage",
  "threePointersAttempted", "threePointersMade", "threePointersPercentage",
  "freeThrowsAttempted", "freeThrowsMade", "freeThrowsPercentage",
  "assists", "assistsRatio", "turnovers", "turnoversRatio", "assistsToTurnoversRatio",
  "totalRebounds", "reboundsPercentage", "offensiveRebounds", "offensiveReboundsPercentage", "defensiveRebounds", "defensiveReboundsPercentage",
  "steals", "blocks", "foulsDrawn", "foulsCommited",
  "pir",
];
// Season totals have no percentage, ratio or valuation card: those are per-game measures.
export const PLAYER_TOTAL_CARDS = [
  "pointsScored",
  "twoPointersAttempted", "twoPointersMade",
  "threePointersAttempted", "threePointersMade",
  "freeThrowsAttempted", "freeThrowsMade",
  "assists", "turnovers",
  "totalRebounds", "offensiveRebounds", "defensiveRebounds",
  "steals", "blocks", "foulsDrawn", "foulsCommited",
  "doubleDoubles", "tripleDoubles",
];

// The stats the form endpoint (hot right now, rank movement) covers.
export const FORM_STATS = [
  { key: "pts", label: "Points", short: "PTS", field: "pointsScored" },
  { key: "reb", label: "Rebounds", short: "REB", field: "totalRebounds" },
  { key: "ast", label: "Assists", short: "AST", field: "assists" },
  { key: "stl", label: "Steals", short: "STL", field: "steals" },
  { key: "blk", label: "Blocks", short: "BLK", field: "blocks" },
  { key: "pir", label: "Valuation", short: "PIR", field: "pir" },
];

// ---- Advanced players (the pipeline's round tables) ----

export const ADVANCED_FAMILIES = ["Overall", "Per 100 possessions", "Rates"];

export const ADVANCED_STATS = [
  { key: "per", family: "Overall", label: "PER", format: "decimal", tip: "Player efficiency rating, scaled so the league average is 15" },
  { key: "pie", family: "Overall", label: "PIE", format: "pie", tip: "Player impact estimate: the share of the game's positive plays the player produced" },
  { key: "gameScoreAverage", family: "Overall", label: "Game score", format: "decimal", tip: "John Hollinger's game score, averaged per game" },
  { key: "winShares", family: "Overall", label: "Win Shares", format: "decimal2", tip: "How many of the team's wins the player is responsible for" },
  { key: "offWinShares", family: "Overall", label: "Offensive Win Shares", format: "decimal2", tip: "The part of the player's Win Shares earned on offense" },
  { key: "defWinShares", family: "Overall", label: "Defensive Win Shares", format: "decimal2", tip: "The part of the player's Win Shares earned on defense" },
  { key: "winSharesPer40", family: "Overall", label: "Win Shares / 40", format: "decimal3", tip: "Win Shares per 40 minutes played" },
  { key: "rapm", family: "Overall", label: "RAPM", format: "signed", minutes: 500, tip: "Regularized adjusted plus-minus: points per 100 possessions against an average player" },
  { key: "onOff", family: "Overall", label: "On/off net rating", format: "signed", minutes: 300, tip: "How much better the team's net rating is with the player on the floor" },
  { key: "pointsPer100", family: "Per 100 possessions", label: "Points", format: "decimal", tip: "Points the player scores per 100 possessions he plays" },
  { key: "twoPointersAttemptedPer100", family: "Per 100 possessions", label: "2-pointers attempted", format: "decimal", tip: "Two-point attempts the player takes per 100 possessions he plays" },
  { key: "twoPointersMadePer100", family: "Per 100 possessions", label: "2-pointers made", format: "decimal", tip: "Two-pointers the player makes per 100 possessions he plays" },
  { key: "threePointersAttemptedPer100", family: "Per 100 possessions", label: "3-pointers attempted", format: "decimal", tip: "Three-point attempts the player takes per 100 possessions he plays" },
  { key: "threePointersMadePer100", family: "Per 100 possessions", label: "3-pointers made", format: "decimal", tip: "Three-pointers the player makes per 100 possessions he plays" },
  { key: "freeThrowsAttemptedPer100", family: "Per 100 possessions", label: "Free throws attempted", format: "decimal", tip: "Free throws the player attempts per 100 possessions he plays" },
  { key: "freeThrowsMadePer100", family: "Per 100 possessions", label: "Free throws made", format: "decimal", tip: "Free throws the player makes per 100 possessions he plays" },
  { key: "assistsPer100", family: "Per 100 possessions", label: "Assists", format: "decimal", tip: "Assists the player gives per 100 possessions he plays" },
  { key: "turnoversPer100", family: "Per 100 possessions", label: "Turnovers", format: "decimal", lowerIsBetter: true, tip: "Turnovers the player commits per 100 possessions he plays (fewer is better)" },
  { key: "reboundsPer100", family: "Per 100 possessions", label: "Rebounds", format: "decimal", tip: "Rebounds the player takes per 100 possessions he plays" },
  { key: "offensiveReboundsPer100", family: "Per 100 possessions", label: "Offensive rebounds", format: "decimal", tip: "Offensive rebounds the player takes per 100 possessions he plays" },
  { key: "defensiveReboundsPer100", family: "Per 100 possessions", label: "Defensive rebounds", format: "decimal", tip: "Defensive rebounds the player takes per 100 possessions he plays" },
  { key: "stealsPer100", family: "Per 100 possessions", label: "Steals", format: "decimal", tip: "Steals the player makes per 100 possessions he plays" },
  { key: "blocksPer100", family: "Per 100 possessions", label: "Blocks", format: "decimal", tip: "Blocks the player makes per 100 possessions he plays" },
  { key: "foulsPer100", family: "Per 100 possessions", label: "Fouls committed", format: "decimal", lowerIsBetter: true, tip: "Fouls the player commits per 100 possessions he plays (fewer is better)" },
  { key: "usgPct", family: "Rates", label: "Usage %", format: "percent", tip: "The share of the team's possessions that end with the player" },
  { key: "tsPct", family: "Rates", label: "True shooting %", format: "percent", tip: "True shooting: points per shooting possession, counting free throws and threes" },
  { key: "efgPct", family: "Rates", label: "Effective FG%", format: "percent", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5" },
  { key: "astPct", family: "Rates", label: "Assist %", format: "percent", tip: "Assist percentage: the share of teammates' baskets the player assisted while on the court" },
  { key: "tovPct", family: "Rates", label: "Turnover %", format: "percent", lowerIsBetter: true, tip: "Turnover percentage: turnovers per 100 shooting and turnover possessions (lower is better)" },
  { key: "trbPct", family: "Rates", label: "Rebound %", format: "percent", tip: "Total rebound percentage: the share of all available rebounds the player took while on the court" },
  { key: "orbPct", family: "Rates", label: "Offensive rebound %", format: "percent", tip: "The share of available offensive rebounds the player took while on the court" },
  { key: "drbPct", family: "Rates", label: "Defensive rebound %", format: "percent", tip: "The share of available defensive rebounds the player took while on the court" },
  { key: "stlPct", family: "Rates", label: "Steal %", format: "percent", tip: "Steal percentage: steals per 100 opponent possessions while the player is on the court" },
  { key: "blkPct", family: "Rates", label: "Block %", format: "percent", tip: "Block percentage: the share of opponent two-point attempts the player blocked while on the court" },
];

export const ADVANCED_SCOPES = [
  { key: "RS", label: "Regular season" },
  { key: "TS", label: "Top 16" },
  { key: "all", label: "All games" },
  { key: "PS", label: "Postseason" },
];
