// Hover tips for the Compare page's statistic rows that have none of their own on the team and player stat definitions. A row's own
// tip wins; these fill the gaps so every row explains itself.

export const TEAM_STAT_TIPS = {
  wins: "Games won in this phase",
  winPct: "Share of the games played that were won",
  mov: "Average points scored minus points allowed, per game",
  points: "Points scored per game",
  twoPointersMade: "Two-point field goals made per game",
  twoPointersAttempted: "Two-point field goals attempted per game",
  threePointersMade: "Three-point field goals made per game",
  threePointersAttempted: "Three-point field goals attempted per game",
  freeThrowsMade: "Free throws made per game",
  freeThrowsAttempted: "Free throws attempted per game",
  fieldGoalPct: "Share of all field goal attempts that went in",
  twoPct: "Share of two-point attempts that went in",
  threePct: "Share of three-point attempts that went in",
  freeThrowPct: "Share of free throw attempts that went in",
  tsPct: "Points per shooting possession, counting free throws and threes",
  rebounds: "Rebounds per game, offensive and defensive",
  offensiveRebounds: "Rebounds taken at the club's own basket, per game",
  defensiveRebounds: "Rebounds taken at the opponents' basket, per game",
  orbPct: "The share of available offensive rebounds the club took",
  drbPct: "The share of available defensive rebounds the club took",
  assists: "Assists per game",
  astTo: "Assists for every turnover",
  turnovers: "Turnovers per game. Fewest ranks first",
  tovPct: "Turnovers per 100 possessions. Fewest ranks first",
  oppPoints: "Points the opponents score per game. Fewest ranks first",
  oppFieldGoalPct: "Share of the opponents' field goal attempts that went in. Lowest ranks first",
  oppThreePct: "Share of the opponents' three-point attempts that went in. Lowest ranks first",
  oppEfgPct: "Opponents' field goal percentage with threes weighted 1.5. Lowest ranks first",
  steals: "Steals per game",
  blocks: "Blocks per game",
  fouls: "Fouls committed per game. Fewest ranks first",
  foulsDrawn: "Fouls the opponents commit on the club, per game",
};

export const PLAYER_STAT_TIPS = {
  pointsScored: "Points scored per game",
  totalRebounds: "Rebounds per game, offensive and defensive",
  assists: "Assists per game",
  steals: "Steals per game",
  turnovers: "Turnovers per game",
  blocks: "Shots blocked per game",
  minutesPlayed: "Minutes on the floor per game",
  gamesPlayed: "Games the player appeared in",
  twoPointRate: "Share of the player's shots that were two-pointers",
  threePointRate: "Share of the player's shots that were three-pointers",
  pointsFromTwoPointersPercentage: "Share of the player's points that came from two-pointers",
  pointsFromThreePointersPercentage: "Share of the player's points that came from three-pointers",
  pointsFromFreeThrowsPercentage: "Share of the player's points that came from free throws",
  wins: "Games the player appeared in that the team won",
  losses: "Games the player appeared in that the team lost",
};

export const ROSTER_SUMMARY_TIPS = {
  Players: "Players who have appeared for the club in this phase",
  "Average age": "Average age of the players, in years",
  "Average height": "Average height of the players",
  Nationalities: "Different countries the players come from",
  "Points of the top 3 scorers": "Points per game of the club's three best scorers added together",
  "Players on 15+ minutes": "Players averaging 15 or more minutes a game",
};

export const RECORD_TIPS = {
  "Home record": "Wins and losses in games played at home",
  "Away record": "Wins and losses in games played away",
};
