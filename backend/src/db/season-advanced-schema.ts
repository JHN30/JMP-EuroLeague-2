import { boolean, customType, integer, pgTable, primaryKey, text, type AnyPgColumn } from "drizzle-orm/pg-core";

// The pipeline's advanced tables (feature 30g), read-only and filled for E2025 and E2026 only.
// NUMERIC columns come back from pg as strings, so they are decoded to numbers here; NULL stays
// null (missing input or a zero denominator). Percentages are fractions, ratings are per 100 possessions.
const measure = customType<{ data: number; driverData: string }>({
  dataType: () => "numeric",
  fromDriver: (value) => Number(value),
});

function teamRoundKey() {
  return {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    roundNumber: integer("round_number").notNull(),
    clubCode: text("club_code").notNull(),
  };
}

function playerRoundKey() {
  return {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    roundNumber: integer("round_number").notNull(),
    personKey: text("person_key").notNull(),
    clubCode: text("club_code"),
    playerName: text("player_name"),
  };
}

function teamRecordColumns() {
  return {
    clubName: text("club_name"),
    gamesPlayed: integer("games_played").notNull(),
    wins: integer("wins").notNull(),
    losses: integer("losses").notNull(),
    pointsFor: measure("points_for"),
    pointsAgainst: measure("points_against"),
  };
}

function teamPerformanceColumns() {
  return {
    possessions: measure("possessions"),
    mov: measure("mov"),
    pythagoreanWinPct: measure("pythagorean_win_pct"),
    pythagoreanWins: measure("pythagorean_wins"),
    pace: measure("pace"),
    offensiveRating: measure("offensive_rating"),
    defensiveRating: measure("defensive_rating"),
    netRating: measure("net_rating"),
    efgPct: measure("efg_pct"),
    tovPct: measure("tov_pct"),
    orbPct: measure("orb_pct"),
    drbPct: measure("drb_pct"),
    ftRate: measure("ft_rate"),
    oppEfgPct: measure("opp_efg_pct"),
    oppTovPct: measure("opp_tov_pct"),
    oppFtRate: measure("opp_ft_rate"),
    trueShootingPct: measure("true_shooting_pct"),
    assistRatio: measure("assist_ratio"),
  };
}

function teamRatingColumns() {
  return {
    connected: boolean("connected").notNull(),
    leagueOffensiveRating: measure("league_offensive_rating"),
    leaguePace: measure("league_pace"),
    relativeOffensiveRating: measure("relative_offensive_rating"),
    relativeDefensiveRating: measure("relative_defensive_rating"),
    relativePace: measure("relative_pace"),
    srs: measure("srs"),
    sos: measure("sos"),
    sov: measure("sov"),
    adjOffensiveRating: measure("adj_offensive_rating"),
    adjDefensiveRating: measure("adj_defensive_rating"),
    adjNetRating: measure("adj_net_rating"),
  };
}

function teamSplitColumns() {
  return {
    homeGames: integer("home_games").notNull(),
    homeWins: integer("home_wins").notNull(),
    homeMov: measure("home_mov"),
    homeOffensiveRating: measure("home_offensive_rating"),
    homeDefensiveRating: measure("home_defensive_rating"),
    homeNetRating: measure("home_net_rating"),
    homePace: measure("home_pace"),
    awayGames: integer("away_games").notNull(),
    awayWins: integer("away_wins").notNull(),
    awayMov: measure("away_mov"),
    awayOffensiveRating: measure("away_offensive_rating"),
    awayDefensiveRating: measure("away_defensive_rating"),
    awayNetRating: measure("away_net_rating"),
    awayPace: measure("away_pace"),
    last5Games: integer("last5_games").notNull(),
    last5Wins: integer("last5_wins").notNull(),
    last5Mov: measure("last5_mov"),
    last5OffensiveRating: measure("last5_offensive_rating"),
    last5DefensiveRating: measure("last5_defensive_rating"),
    last5NetRating: measure("last5_net_rating"),
    last5Pace: measure("last5_pace"),
    last10Games: integer("last10_games").notNull(),
    last10Wins: integer("last10_wins").notNull(),
    last10Mov: measure("last10_mov"),
    last10OffensiveRating: measure("last10_offensive_rating"),
    last10DefensiveRating: measure("last10_defensive_rating"),
    last10NetRating: measure("last10_net_rating"),
    last10Pace: measure("last10_pace"),
  };
}

type RoundKeyColumns = { competitionCode: AnyPgColumn; seasonCode: AnyPgColumn; scope: AnyPgColumn; roundNumber: AnyPgColumn };

const teamRoundPrimaryKey = (table: RoundKeyColumns & { clubCode: AnyPgColumn }) =>
  [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.roundNumber, table.clubCode] })];

const playerRoundPrimaryKey = (table: RoundKeyColumns & { personKey: AnyPgColumn }) =>
  [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.roundNumber, table.personKey] })];

// One wide row per club, scope and round: the three team round tables joined.
export const standingsStats = pgTable(
  "app_standings_stats",
  {
    ...teamRoundKey(),
    ...teamRecordColumns(),
    ...teamPerformanceColumns(),
    ...teamRatingColumns(),
    ...teamSplitColumns(),
  },
  teamRoundPrimaryKey,
);

export const teamRoundStats = pgTable(
  "app_team_round_stats",
  {
    ...teamRoundKey(),
    ...teamRecordColumns(),
    ownFieldGoalsMade: measure("own_field_goals_made"),
    ownFieldGoalsAttempted: measure("own_field_goals_attempted"),
    ownThreePointersMade: measure("own_three_pointers_made"),
    ownFreeThrowsMade: measure("own_free_throws_made"),
    ownFreeThrowsAttempted: measure("own_free_throws_attempted"),
    ownOffensiveRebounds: measure("own_offensive_rebounds"),
    ownDefensiveRebounds: measure("own_defensive_rebounds"),
    ownTurnovers: measure("own_turnovers"),
    ownAssists: measure("own_assists"),
    oppFieldGoalsMade: measure("opp_field_goals_made"),
    oppFieldGoalsAttempted: measure("opp_field_goals_attempted"),
    oppThreePointersMade: measure("opp_three_pointers_made"),
    oppFreeThrowsMade: measure("opp_free_throws_made"),
    oppFreeThrowsAttempted: measure("opp_free_throws_attempted"),
    oppOffensiveRebounds: measure("opp_offensive_rebounds"),
    oppDefensiveRebounds: measure("opp_defensive_rebounds"),
    oppTurnovers: measure("opp_turnovers"),
    oppAssists: measure("opp_assists"),
    gameMinutes: measure("game_minutes"),
    pythagoreanExponent: measure("pythagorean_exponent"),
    ...teamPerformanceColumns(),
  },
  teamRoundPrimaryKey,
);

export const teamRoundRatings = pgTable(
  "app_team_round_ratings",
  { ...teamRoundKey(), ...teamRatingColumns() },
  teamRoundPrimaryKey,
);

export const teamRoundSplits = pgTable(
  "app_team_round_splits",
  { ...teamRoundKey(), ...teamSplitColumns() },
  teamRoundPrimaryKey,
);

export const playerRoundStats = pgTable(
  "app_player_round_stats",
  {
    ...playerRoundKey(),
    gamesPlayed: integer("games_played").notNull(),
    gamesStarted: integer("games_started").notNull(),
    secondsPlayed: measure("seconds_played"),
    points: measure("points"),
    fieldGoalsMade: measure("field_goals_made"),
    fieldGoalsAttempted: measure("field_goals_attempted"),
    threePointersMade: measure("three_pointers_made"),
    threePointersAttempted: measure("three_pointers_attempted"),
    freeThrowsMade: measure("free_throws_made"),
    freeThrowsAttempted: measure("free_throws_attempted"),
    offensiveRebounds: measure("offensive_rebounds"),
    defensiveRebounds: measure("defensive_rebounds"),
    totalRebounds: measure("total_rebounds"),
    assists: measure("assists"),
    steals: measure("steals"),
    turnovers: measure("turnovers"),
    blocks: measure("blocks"),
    foulsCommitted: measure("fouls_committed"),
    pir: measure("pir"),
    tsPct: measure("ts_pct"),
    efgPct: measure("efg_pct"),
    usgPct: measure("usg_pct"),
    astPct: measure("ast_pct"),
    orbPct: measure("orb_pct"),
    drbPct: measure("drb_pct"),
    trbPct: measure("trb_pct"),
    stlPct: measure("stl_pct"),
    blkPct: measure("blk_pct"),
    tovPct: measure("tov_pct"),
    possessionsPlayed: measure("possessions_played"),
    pointsPer100: measure("points_per_100"),
    reboundsPer100: measure("rebounds_per_100"),
    assistsPer100: measure("assists_per_100"),
    stealsPer100: measure("steals_per_100"),
    blocksPer100: measure("blocks_per_100"),
    turnoversPer100: measure("turnovers_per_100"),
    gameScoreTotal: measure("game_score_total"),
    gameScoreAverage: measure("game_score_average"),
    pie: measure("pie"),
  },
  playerRoundPrimaryKey,
);

export const playerRoundRatings = pgTable(
  "app_player_round_ratings",
  {
    ...playerRoundKey(),
    gamesPlayed: integer("games_played").notNull(),
    secondsPlayed: measure("seconds_played"),
    uper: measure("uper"),
    aper: measure("aper"),
    per: measure("per"),
  },
  playerRoundPrimaryKey,
);

export const playerRoundWinShares = pgTable(
  "app_player_round_win_shares",
  {
    ...playerRoundKey(),
    gamesPlayed: integer("games_played").notNull(),
    secondsPlayed: measure("seconds_played"),
    offWinShares: measure("off_win_shares"),
    defWinShares: measure("def_win_shares"),
    winShares: measure("win_shares"),
    winSharesPer40: measure("win_shares_per_40"),
  },
  playerRoundPrimaryKey,
);

// Season totals per club and scope (not cumulative by round).
export const teamPbpStats = pgTable(
  "app_team_pbp_stats",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    clubCode: text("club_code").notNull(),
    games: integer("games"),
    countedPossessions: measure("counted_possessions"),
    estimatedPossessions: measure("estimated_possessions"),
    possessionSeconds: measure("possession_seconds"),
    timedGames: integer("timed_games"),
    timeLeadingSeconds: measure("time_leading_seconds"),
    timeTrailingSeconds: measure("time_trailing_seconds"),
    timeTiedSeconds: measure("time_tied_seconds"),
    runs6Plus: integer("runs_6_plus"),
    clutchGames: integer("clutch_games"),
    clutchSeconds: measure("clutch_seconds"),
    clutchPointsFor: measure("clutch_points_for"),
    clutchPointsAgainst: measure("clutch_points_against"),
    flaggedGames: integer("flagged_games"),
    fastBreakPoints: measure("fast_break_points"),
    secondChancePoints: measure("second_chance_points"),
    pointsOffTurnoverPoints: measure("points_off_turnover_points"),
    fieldGoalsMade: integer("field_goals_made"),
    assistedFieldGoals: integer("assisted_field_goals"),
    avgPossessionSeconds: measure("avg_possession_seconds"),
    leadChangesPerGame: measure("lead_changes_per_game"),
    tiesPerGame: measure("ties_per_game"),
    largestLead: measure("largest_lead"),
    longestRun: measure("longest_run"),
    assistedFgPct: measure("assisted_fg_pct"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.clubCode] })],
);

// Zones are the feed's letters A-J; a club has a row only for zones it shot from.
export const teamShotZoneStats = pgTable(
  "app_team_shot_zone_stats",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    clubCode: text("club_code").notNull(),
    zone: text("zone").notNull(),
    attempts: integer("attempts"),
    made: integer("made"),
    points: integer("points"),
    fgPct: measure("fg_pct"),
    attemptShare: measure("attempt_share"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.clubCode, table.zone] })],
);

// One row per club, so a traded player has one row for each club.
export const playerOnOff = pgTable(
  "app_player_on_off",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    clubCode: text("club_code").notNull(),
    personKey: text("person_key").notNull(),
    playerName: text("player_name"),
    games: integer("games").notNull(),
    onSeconds: integer("on_seconds"),
    onPossessionsFor: integer("on_possessions_for"),
    onPossessionsAgainst: integer("on_possessions_against"),
    onPointsFor: integer("on_points_for"),
    onPointsAgainst: integer("on_points_against"),
    offSeconds: integer("off_seconds"),
    offPossessionsFor: integer("off_possessions_for"),
    offPossessionsAgainst: integer("off_possessions_against"),
    offPointsFor: integer("off_points_for"),
    offPointsAgainst: integer("off_points_against"),
    onOrtg: measure("on_ortg"),
    onDrtg: measure("on_drtg"),
    onNetRating: measure("on_net_rating"),
    offOrtg: measure("off_ortg"),
    offDrtg: measure("off_drtg"),
    offNetRating: measure("off_net_rating"),
    ortgDiff: measure("ortg_diff"),
    drtgDiff: measure("drtg_diff"),
    netRatingDiff: measure("net_rating_diff"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.clubCode, table.personKey] })],
);

// lineup is the sorted person_keys joined by commas; lineup_names uses the same order joined by "; ".
export const lineupRatings = pgTable(
  "app_lineup_ratings",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    clubCode: text("club_code").notNull(),
    lineupSize: integer("lineup_size").notNull(),
    lineup: text("lineup").notNull(),
    lineupNames: text("lineup_names"),
    games: integer("games").notNull(),
    seconds: integer("seconds"),
    possessionsFor: integer("possessions_for"),
    possessionsAgainst: integer("possessions_against"),
    pointsFor: integer("points_for"),
    pointsAgainst: integer("points_against"),
    ortg: measure("ortg"),
    drtg: measure("drtg"),
    netRating: measure("net_rating"),
  },
  (table) => [
    primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.clubCode, table.lineupSize, table.lineup] }),
  ],
);

// Shrunk estimates in points per 100 possessions; scope is always "all". A positive defense means fewer points allowed.
export const playerRapm = pgTable(
  "app_player_rapm",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    scope: text("scope").notNull(),
    personKey: text("person_key").notNull(),
    playerName: text("player_name"),
    seconds: integer("seconds"),
    possessionsOffense: integer("possessions_offense"),
    possessionsDefense: integer("possessions_defense"),
    penalty: measure("penalty"),
    offense: measure("offense"),
    defense: measure("defense"),
    rapm: measure("rapm"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.scope, table.personKey] })],
);

// Per-game advanced tables (feature 30h). Ratios are fractions. Zero-minute players have NULL rates and NULL
// PER; `game_per` has no minutes cutoff, so a short appearance can be extreme and the page applies its own.
export const gamePlayerAdvanced = pgTable(
  "app_game_player_advanced",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    personKey: text("person_key").notNull(),
    clubCode: text("club_code").notNull(),
    secondsPlayed: measure("seconds_played"),
    gameScore: measure("game_score"),
    usagePct: measure("usage_pct"),
    assistPct: measure("assist_pct"),
    orbPct: measure("orb_pct"),
    drbPct: measure("drb_pct"),
    trbPct: measure("trb_pct"),
    stealPct: measure("steal_pct"),
    blockPct: measure("block_pct"),
    tovPct: measure("tov_pct"),
    efgPct: measure("efg_pct"),
    trueShootingPct: measure("true_shooting_pct"),
    gameUper: measure("game_uper"),
    gameAper: measure("game_aper"),
    gamePer: measure("game_per"),
  },
  (table) => [
    primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side, table.personKey] }),
  ],
);

export const gameTeamAdvanced = pgTable(
  "app_game_team_advanced",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    clubCode: text("club_code").notNull(),
    gameMinutes: measure("game_minutes"),
    ownPossessionsEstimate: measure("own_possessions_estimate"),
    possessions: measure("possessions"),
    pace: measure("pace"),
    offensiveRating: measure("offensive_rating"),
    defensiveRating: measure("defensive_rating"),
    netRating: measure("net_rating"),
    efgPct: measure("efg_pct"),
    oppEfgPct: measure("opp_efg_pct"),
    tovPct: measure("tov_pct"),
    oppTovPct: measure("opp_tov_pct"),
    orbPct: measure("orb_pct"),
    drbPct: measure("drb_pct"),
    ftRate: measure("ft_rate"),
    oppFtRate: measure("opp_ft_rate"),
    trueShootingPct: measure("true_shooting_pct"),
    assistRatio: measure("assist_ratio"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side] })],
);

// Per-game team tables built from play-by-play and shots (feature 30i), one row per club per played game.
// Clock-based columns can be NULL for a game with an unusable clock; the three point columns of the shot splits
// are NULL before E2016 and for a game with an unflagged shot.
function gameTeamKey() {
  return {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    clubCode: text("club_code").notNull(),
    opponentClubCode: text("opponent_club_code"),
  };
}

const gameTeamPrimaryKey = (table: {
  competitionCode: AnyPgColumn;
  seasonCode: AnyPgColumn;
  gameCode: AnyPgColumn;
  side: AnyPgColumn;
}) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side] })];

export const gameTeamScoreFlow = pgTable(
  "app_game_team_score_flow",
  {
    ...gameTeamKey(),
    pointsFor: integer("points_for"),
    pointsAgainst: integer("points_against"),
    leadChanges: integer("lead_changes"),
    ties: integer("ties"),
    timeLeadingSeconds: measure("time_leading_seconds"),
    timeTrailingSeconds: measure("time_trailing_seconds"),
    timeTiedSeconds: measure("time_tied_seconds"),
    largestLead: integer("largest_lead"),
    longestRun: integer("longest_run"),
    runs6Plus: integer("runs_6_plus"),
    clutchSeconds: measure("clutch_seconds"),
    clutchPointsFor: integer("clutch_points_for"),
    clutchPointsAgainst: integer("clutch_points_against"),
  },
  gameTeamPrimaryKey,
);

export const gameTeamShotSplits = pgTable(
  "app_game_team_shot_splits",
  {
    ...gameTeamKey(),
    fastBreakPoints: integer("fast_break_points"),
    secondChancePoints: integer("second_chance_points"),
    pointsOffTurnoverPoints: integer("points_off_turnover_points"),
    fieldGoalsMade: integer("field_goals_made"),
    assistedFieldGoals: integer("assisted_field_goals"),
    assistedFgPct: measure("assisted_fg_pct"),
  },
  gameTeamPrimaryKey,
);

export const gameTeamPossessions = pgTable(
  "app_game_team_possessions",
  {
    ...gameTeamKey(),
    countedPossessions: integer("counted_possessions"),
    possessionSeconds: measure("possession_seconds"),
    avgPossessionSeconds: measure("avg_possession_seconds"),
    estimatedPossessions: measure("estimated_possessions"),
  },
  gameTeamPrimaryKey,
);
