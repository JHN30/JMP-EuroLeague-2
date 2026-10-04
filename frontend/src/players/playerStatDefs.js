// The Statistics tab's rows: every number the season-statistics feed has for a player, in groups. `kind` says how it is
// written (a count is a whole number in the accumulated view and one decimal per game; a percentage always has one
// decimal and a %), and `lowerIsBetter` flips the rank (the fewest turnovers ranks first). A row with `rank: false`
// is shown without a league rank (games played is not a measure of anything).
export const STAT_GROUPS = [
  {
    title: "Traditional",
    stats: [
      { group: "traditional", field: "gamesPlayed", label: "Games played", kind: "games", rank: false },
      { group: "traditional", field: "gamesStarted", label: "Games started", kind: "games", rank: false },
      { group: "traditional", field: "minutesPlayed", label: "Minutes", kind: "minutes" },
      { group: "traditional", field: "pointsScored", label: "Points", kind: "count" },
      { group: "traditional", field: "totalRebounds", label: "Rebounds", kind: "count" },
      { group: "traditional", field: "offensiveRebounds", label: "Offensive rebounds", kind: "count" },
      { group: "traditional", field: "defensiveRebounds", label: "Defensive rebounds", kind: "count" },
      { group: "traditional", field: "assists", label: "Assists", kind: "count" },
      { group: "traditional", field: "steals", label: "Steals", kind: "count" },
      { group: "traditional", field: "blocks", label: "Blocks", kind: "count" },
      { group: "traditional", field: "turnovers", label: "Turnovers", kind: "count", lowerIsBetter: true },
      { group: "traditional", field: "foulsCommited", label: "Fouls committed", kind: "count", lowerIsBetter: true },
      { group: "traditional", field: "foulsDrawn", label: "Fouls drawn", kind: "count" },
      { group: "traditional", field: "pir", label: "Valuation (PIR)", kind: "count", tip: "Performance index rating: the league's all-round valuation of a game" },
    ],
  },
  {
    title: "Shooting",
    stats: [
      { group: "traditional", field: "twoPointersMade", label: "Two-pointers made", kind: "count" },
      { group: "traditional", field: "twoPointersPercentage", label: "2-point %", kind: "percent" },
      { group: "traditional", field: "threePointersMade", label: "Three-pointers made", kind: "count" },
      { group: "traditional", field: "threePointersPercentage", label: "3-point %", kind: "percent" },
      { group: "traditional", field: "freeThrowsMade", label: "Free throws made", kind: "count" },
      { group: "traditional", field: "freeThrowsPercentage", label: "Free throw %", kind: "percent" },
      { group: "advanced", field: "effectiveFieldGoalPercentage", label: "eFG%", kind: "percent", tip: "Effective field goal percentage: field goals with threes weighted 1.5" },
      { group: "advanced", field: "trueShootingPercentage", label: "TS%", kind: "percent", tip: "True shooting: points per shooting possession, counting free throws and threes" },
      { group: "advanced", field: "freeThrowsRate", label: "Free throw rate", kind: "percent", tip: "Free throws made per field goal attempt" },
    ],
  },
  {
    title: "Advanced",
    stats: [
      { group: "advanced", field: "reboundsPercentage", label: "Rebound %", kind: "percent", tip: "The share of available rebounds the player took while on the floor" },
      { group: "advanced", field: "offensiveReboundsPercentage", label: "Offensive rebound %", kind: "percent" },
      { group: "advanced", field: "defensiveReboundsPercentage", label: "Defensive rebound %", kind: "percent" },
      { group: "advanced", field: "assistsRatio", label: "Assist ratio", kind: "decimal", tip: "Assists per 100 possessions the player used" },
      { group: "advanced", field: "turnoversRatio", label: "Turnover ratio", kind: "decimal", lowerIsBetter: true, tip: "Turnovers per 100 possessions the player used" },
      { group: "advanced", field: "assistsToTurnoversRatio", label: "Assist to turnover", kind: "decimal" },
      { group: "advanced", field: "possessions", label: "Possessions", kind: "count" },
    ],
  },
  {
    title: "Shot and point mix",
    stats: [
      { group: "scoring", field: "pointsFromTwoPointersPercentage", label: "Points from twos", kind: "percent", rank: false },
      { group: "scoring", field: "pointsFromThreePointersPercentage", label: "Points from threes", kind: "percent", rank: false },
      { group: "scoring", field: "pointsFromFreeThrowsPercentage", label: "Points from free throws", kind: "percent", rank: false },
      { group: "scoring", field: "twoPointRate", label: "Shots that are twos", kind: "percent", rank: false },
      { group: "scoring", field: "threePointRate", label: "Shots that are threes", kind: "percent", rank: false },
    ],
  },
  {
    title: "Record and milestones",
    stats: [
      { group: "misc", field: "wins", label: "Team wins when playing", kind: "games", rank: false },
      { group: "misc", field: "losses", label: "Team losses when playing", kind: "games", rank: false },
      { group: "misc", field: "doubleDoubles", label: "Double-doubles", kind: "games" },
      { group: "misc", field: "tripleDoubles", label: "Triple-doubles", kind: "games" },
    ],
  },
];
