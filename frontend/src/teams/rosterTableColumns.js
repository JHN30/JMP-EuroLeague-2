// The Roster table's columns, in two levels of groups. Each column reads one player's row: `stats` is the season-stats feed
// (its `traditional`, `advanced`, `scoring` and `misc` blocks, numbers written as strings, percentages already in percent)
// and `advanced` the per-round figures from players-advanced (rates as fractions). `get` returns a number or null;
// `format` turns it into the cell's text, given the table's mode ("perGame" or "accumulated"). `fewestFirst` columns sort
// the fewest first on the first click. `bar` draws the column's value as a bar.
import { formatCount, formatDecimal, formatMissing, formatPerGame, formatSignedDecimal } from "../lib/format";

function number(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

const fromFeed = (block, key) => ({ stats }) => number(stats?.[block]?.[key]);
const traditional = (key) => fromFeed("traditional", key);
const advancedFeed = (key) => fromFeed("advanced", key);
const scoring = (key) => fromFeed("scoring", key);
const misc = (key) => fromFeed("misc", key);
// Per-round getters are marked, so the table knows which cells wait for the players-advanced request.
const markedPerRound = (get) => Object.assign(get, { perRound: true });
const perRound = (key) => markedPerRound(({ advanced }) => number(advanced?.[key]));
// A per-round rate kept as a fraction, shown in percent.
const perRoundPercent = (key) =>
  markedPerRound(({ advanced }) => {
    const value = number(advanced?.[key]);
    return value === null ? null : value * 100;
  });

const missing = (value) => (value === null ? formatMissing(null) : null);
// A count in the mode's unit: a per-game average with one decimal, or a whole total.
const count = (value, mode) => missing(value) ?? (mode === "perGame" ? formatPerGame(value) : formatCount(Math.round(value)));
const whole = (value) => missing(value) ?? formatCount(Math.round(value));
const minutes = (value, mode) => missing(value) ?? (mode === "perGame" ? formatPerGame(value) : formatCount(Math.round(value)));
const percent = (value) => missing(value) ?? `${value.toFixed(1)}%`;
const oneDecimal = (value) => missing(value) ?? formatDecimal(value, 1);
const twoDecimals = (value) => missing(value) ?? formatDecimal(value, 2);
const threeDecimals = (value) => missing(value) ?? formatDecimal(value, 3);
const signed = (value) => missing(value) ?? formatSignedDecimal(value, 1);

function winPercent({ stats }) {
  const wins = number(stats?.misc?.wins);
  const losses = number(stats?.misc?.losses);
  return wins === null || losses === null || wins + losses === 0 ? null : (wins / (wins + losses)) * 100;
}

const col = (key, label, title, get, format, extra = {}) => ({ key, label, title, get, format, ...extra });

const GP = col("gp", "GP", "Games played", traditional("gamesPlayed"), whole);
const GS = col("gs", "GS", "Games started", traditional("gamesStarted"), whole);
const MIN = col("min", "MIN", "Minutes", traditional("minutesPlayed"), minutes);
const PTS = col("pts", "PTS", "Points", traditional("pointsScored"), count, { bar: true });
const REB = col("reb", "REB", "Rebounds", traditional("totalRebounds"), count);
const AST = col("ast", "AST", "Assists", traditional("assists"), count);
const STL = col("stl", "STL", "Steals", traditional("steals"), count);
const BLK = col("blk", "BLK", "Blocks", traditional("blocks"), count);
const TO = col("to", "TO", "Turnovers (fewest first)", traditional("turnovers"), count, { fewestFirst: true });
const AST_TO = col("astTo", "AST/TO", "Assists per turnover", advancedFeed("assistsToTurnoversRatio"), oneDecimal);

export const ROSTER_TABLE_LEVELS = [
  {
    key: "traditional",
    label: "Traditional",
    groups: [
      {
        key: "overview",
        label: "Overview",
        position: true,
        columns: [GP, GS, MIN, PTS, REB, AST, STL, BLK, TO, col("pir", "PIR", "Performance index rating", traditional("pir"), count)],
      },
      {
        key: "scoring",
        label: "Scoring",
        columns: [
          PTS,
          col("twoMade", "2PM", "Two-pointers made", traditional("twoPointersMade"), count),
          col("twoAttempted", "2PA", "Two-pointers attempted", traditional("twoPointersAttempted"), count),
          col("twoPct", "2P%", "Two-point percentage", traditional("twoPointersPercentage"), percent),
          col("threeMade", "3PM", "Three-pointers made", traditional("threePointersMade"), count),
          col("threeAttempted", "3PA", "Three-pointers attempted", traditional("threePointersAttempted"), count),
          col("threePct", "3P%", "Three-point percentage", traditional("threePointersPercentage"), percent),
          col("ftMade", "FTM", "Free throws made", traditional("freeThrowsMade"), count),
          col("ftAttempted", "FTA", "Free throws attempted", traditional("freeThrowsAttempted"), count),
          col("ftPct", "FT%", "Free throw percentage", traditional("freeThrowsPercentage"), percent),
        ],
      },
      {
        key: "rebounding",
        label: "Rebounding",
        columns: [
          col("oreb", "OREB", "Offensive rebounds", traditional("offensiveRebounds"), count),
          col("dreb", "DREB", "Defensive rebounds", traditional("defensiveRebounds"), count),
          { ...REB, bar: true },
        ],
      },
      {
        key: "playmaking",
        label: "Playmaking",
        columns: [{ ...AST, bar: true }, TO, AST_TO, col("foulsDrawn", "FD", "Fouls drawn", traditional("foulsDrawn"), count)],
      },
      {
        key: "defense",
        label: "Defense",
        columns: [
          STL,
          BLK,
          col("blocked", "BLKA", "Shots blocked by the opponent (fewest first)", traditional("blocksAgainst"), count, { fewestFirst: true }),
          col("fouls", "PF", "Fouls committed (fewest first)", traditional("foulsCommited"), count, { fewestFirst: true }),
        ],
      },
      {
        key: "record",
        label: "Record",
        columns: [
          GP,
          col("wins", "W", "Wins in the games played", misc("wins"), whole),
          col("losses", "L", "Losses in the games played (fewest first)", misc("losses"), whole, { fewestFirst: true }),
          col("winPct", "Win%", "Share of the games played that were won", winPercent, percent),
          col("doubleDoubles", "DD", "Double-doubles", misc("doubleDoubles"), whole),
          col("tripleDoubles", "TD", "Triple-doubles", misc("tripleDoubles"), whole),
        ],
      },
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    groups: [
      {
        key: "efficiency",
        label: "Efficiency",
        columns: [
          col("efg", "eFG%", "Effective field goal percentage: threes weighted 1.5", advancedFeed("effectiveFieldGoalPercentage"), percent),
          col("ts", "TS%", "True shooting percentage: points per shooting possession, counting free throws", advancedFeed("trueShootingPercentage"), percent),
          col("ftRate", "FTr", "Free throw rate: free throws per field goal attempt", advancedFeed("freeThrowsRate"), percent),
          col("usg", "USG%", "Usage: the share of the team's plays the player finished while on the floor", perRoundPercent("usgPct"), percent),
          col("per", "PER", "Player efficiency rating (league average 15)", perRound("per"), oneDecimal, { bar: true }),
          col("gameScore", "GmSc", "Game score per game", perRound("gameScoreAverage"), oneDecimal),
          col("pie", "PIE", "Player impact estimate: the share of game events the player took part in", perRoundPercent("pie"), percent),
        ],
      },
      {
        key: "shotProfile",
        label: "Shot profile",
        columns: [
          col("twoRate", "2PT rate", "The share of the player's field goal attempts that are two-pointers", scoring("twoPointRate"), percent),
          col("threeRate", "3PT rate", "The share of the player's field goal attempts that are threes", scoring("threePointRate"), percent),
          col("pointsTwo", "PTS 2s", "The share of the player's points from two-pointers", scoring("pointsFromTwoPointersPercentage"), percent),
          col("pointsThree", "PTS 3s", "The share of the player's points from threes", scoring("pointsFromThreePointersPercentage"), percent),
          col("pointsFt", "PTS FT", "The share of the player's points from free throws", scoring("pointsFromFreeThrowsPercentage"), percent),
          col("teamTwoAttempts", "Team 2PA", "The player's share of the team's two-point attempts", scoring("twoPointAttemptsShare"), percent),
          col("teamThreeAttempts", "Team 3PA", "The player's share of the team's three-point attempts", scoring("threePointAttemptsShare"), percent),
          col("teamFtAttempts", "Team FTA", "The player's share of the team's free throw attempts", scoring("freeThrowsAttemptsShare"), percent),
          col("teamTwoMade", "Team 2PM", "The player's share of the team's made two-pointers", scoring("twoPointersMadeShare"), percent),
          col("teamThreeMade", "Team 3PM", "The player's share of the team's made threes", scoring("threePointersMadeShare"), percent),
          col("teamFtMade", "Team FTM", "The player's share of the team's made free throws", scoring("freeThrowsMadeShare"), percent),
          col("twoRatio", "2PA ratio", "Two-point attempts ratio, as the league publishes it", advancedFeed("twoPointAttemptsRatio"), percent),
          col("threeRatio", "3PA ratio", "Three-point attempts ratio, as the league publishes it", advancedFeed("threePointAttemptsRatio"), percent),
        ],
      },
      {
        key: "reboundRates",
        label: "Rebounding",
        columns: [
          col("orbPct", "OREB%", "The share of available offensive rebounds the player took while on the floor", advancedFeed("offensiveReboundsPercentage"), percent),
          col("drbPct", "DREB%", "The share of available defensive rebounds the player took while on the floor", advancedFeed("defensiveReboundsPercentage"), percent),
          col("trbPct", "REB%", "The share of available rebounds the player took while on the floor", advancedFeed("reboundsPercentage"), percent, { bar: true }),
        ],
      },
      {
        key: "playmakingRates",
        label: "Playmaking",
        columns: [
          col("astPct", "AST%", "The share of teammates' baskets the player assisted while on the floor", perRoundPercent("astPct"), percent, { bar: true }),
          col("assistRatio", "AST ratio", "Assists per 100 plays the player finished", advancedFeed("assistsRatio"), oneDecimal),
          col("tovPct", "TOV%", "Turnovers per 100 plays the player finished (fewest first)", perRoundPercent("tovPct"), percent, { fewestFirst: true }),
          col("turnoverRatio", "TO ratio", "Turnover ratio, as the league publishes it (fewest first)", advancedFeed("turnoversRatio"), oneDecimal, { fewestFirst: true }),
          AST_TO,
        ],
      },
      {
        key: "defenseRates",
        label: "Defense",
        columns: [
          col("stlPct", "STL%", "Opponent possessions ending in the player's steal while on the floor", perRoundPercent("stlPct"), percent),
          col("blkPct", "BLK%", "Opponent two-point attempts the player blocked while on the floor", perRoundPercent("blkPct"), percent),
          col("drbPctDefense", "DREB%", "The share of available defensive rebounds the player took while on the floor", advancedFeed("defensiveReboundsPercentage"), percent),
          col("defWinShares", "DWS", "Defensive win shares", perRound("defWinShares"), twoDecimals),
          col("rapmDefense", "RAPM D", "Defensive RAPM over the whole season, points per 100 possessions (positive means fewer allowed)", perRound("rapmDefense"), signed),
        ],
      },
      {
        key: "per100",
        label: "Per 100",
        columns: [
          col("pointsPer100", "PTS", "Points per 100 possessions on the floor", perRound("pointsPer100"), oneDecimal, { bar: true }),
          col("reboundsPer100", "REB", "Rebounds per 100 possessions on the floor", perRound("reboundsPer100"), oneDecimal),
          col("assistsPer100", "AST", "Assists per 100 possessions on the floor", perRound("assistsPer100"), oneDecimal),
          col("stealsPer100", "STL", "Steals per 100 possessions on the floor", perRound("stealsPer100"), oneDecimal),
          col("blocksPer100", "BLK", "Blocks per 100 possessions on the floor", perRound("blocksPer100"), oneDecimal),
          col("turnoversPer100", "TO", "Turnovers per 100 possessions on the floor (fewest first)", perRound("turnoversPer100"), oneDecimal, { fewestFirst: true }),
          col("possessions", "Poss", "Possessions played", perRound("possessionsPlayed"), whole),
        ],
      },
      {
        key: "impact",
        label: "Impact",
        columns: [
          col("winShares", "WS", "Win shares", perRound("winShares"), twoDecimals, { bar: true }),
          col("offWinShares", "OWS", "Offensive win shares", perRound("offWinShares"), twoDecimals),
          col("defWinSharesImpact", "DWS", "Defensive win shares", perRound("defWinShares"), twoDecimals),
          col("winSharesPer40", "WS/40", "Win shares per 40 minutes", perRound("winSharesPer40"), threeDecimals),
          col("onNet", "On", "The team's net rating with the player on the floor", perRound("onNetRating"), signed),
          col("offNet", "Off", "The team's net rating with the player off the floor", perRound("offNetRating"), signed),
          col("onOff", "On/off", "On-floor net rating minus off-floor net rating", perRound("netRatingDiff"), signed),
          col("rapm", "RAPM", "Regularised plus-minus over the whole season, points per 100 possessions", perRound("rapm"), signed),
          col("rapmOffense", "RAPM O", "Offensive RAPM over the whole season, points per 100 possessions", perRound("rapmOffense"), signed),
        ],
      },
    ],
  },
];

// Whether a column reads the per-round figures (players-advanced) rather than the season-stats feed.
export function usesPerRound(column) {
  return Boolean(column.get.perRound);
}
