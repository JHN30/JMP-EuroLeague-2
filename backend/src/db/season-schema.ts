import { boolean, integer, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const seasons = pgTable(
  "etl_flat_seasons",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    name: text("name"),
    startYear: integer("start_year"),
    competitionName: text("competition_name"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode] })],
);

export const rounds = pgTable(
  "etl_flat_rounds",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    roundKey: text("round_key").notNull(),
    phaseCode: text("phase_code").notNull(),
    roundNumber: integer("round_number").notNull(),
    roundIndex: integer("round_index"),
    name: text("name"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.roundKey] })],
);

export const games = pgTable(
  "etl_flat_games",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    sourceId: text("source_id"),
    identifier: text("identifier"),
    phaseCode: text("phase_code"),
    phaseName: text("phase_name"),
    groupId: text("group_id"),
    groupName: text("group_name"),
    roundNumber: integer("round_number"),
    roundName: text("round_name"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    played: boolean("played"),
    gameStatus: text("game_status"),
    localClubCode: text("local_club_code"),
    localClubName: text("local_club_name"),
    localClubAbbreviatedName: text("local_club_abbreviated_name"),
    roadClubCode: text("road_club_code"),
    roadClubName: text("road_club_name"),
    roadClubAbbreviatedName: text("road_club_abbreviated_name"),
    localScore: integer("local_score"),
    roadScore: integer("road_score"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode] })],
);

export const clubs = pgTable(
  "etl_flat_clubs",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    clubCode: text("club_code").notNull(),
    name: text("name"),
    abbreviatedName: text("abbreviated_name"),
    countryCode: text("country_code"),
    crestUrl: text("crest_url"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.clubCode] })],
);

export const people = pgTable(
  "etl_flat_people",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    personKey: text("person_key").notNull(),
    name: text("name"),
    jerseyName: text("jersey_name"),
    countryCode: text("country_code"),
    heightCm: integer("height_cm"),
    isReferee: boolean("is_referee"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.personKey] })],
);

export const registrations = pgTable(
  "etl_flat_registrations",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    registrationKey: text("registration_key").notNull(),
    personKey: text("person_key").notNull(),
    clubCode: text("club_code"),
    roleCode: text("role_code"),
    roleName: text("role_name"),
    active: boolean("active"),
    sortOrder: integer("sort_order"),
    dorsal: text("dorsal"),
    positionName: text("position_name"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.registrationKey] })],
);

function boxMeasureColumns() {
  return {
    points: numeric("points"),
    timePlayed: numeric("time_played"),
    valuation: numeric("valuation"),
    fieldGoalsMade2: numeric("field_goals_made2"),
    fieldGoalsAttempted2: numeric("field_goals_attempted2"),
    fieldGoalsMade3: numeric("field_goals_made3"),
    fieldGoalsAttempted3: numeric("field_goals_attempted3"),
    freeThrowsMade: numeric("free_throws_made"),
    freeThrowsAttempted: numeric("free_throws_attempted"),
    fieldGoalsMadeTotal: numeric("field_goals_made_total"),
    fieldGoalsAttemptedTotal: numeric("field_goals_attempted_total"),
    accuracyMade: numeric("accuracy_made"),
    accuracyAttempted: numeric("accuracy_attempted"),
    totalRebounds: numeric("total_rebounds"),
    defensiveRebounds: numeric("defensive_rebounds"),
    offensiveRebounds: numeric("offensive_rebounds"),
    assistances: numeric("assistances"),
    steals: numeric("steals"),
    turnovers: numeric("turnovers"),
    blocksFavour: numeric("blocks_favour"),
    blocksAgainst: numeric("blocks_against"),
    foulsCommited: numeric("fouls_commited"),
    foulsReceived: numeric("fouls_received"),
    plusMinus: numeric("plus_minus"),
  };
}

export const gamePeriodScores = pgTable(
  "etl_flat_game_period_scores",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    periodNumber: integer("period_number").notNull(),
    score: integer("score"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side, table.periodNumber] })],
);

export const gameTeamStats = pgTable(
  "etl_flat_game_team_stats",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    statsKind: text("stats_kind").notNull(),
    coachCode: text("coach_code"),
    coachName: text("coach_name"),
    ...boxMeasureColumns(),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side, table.statsKind] })],
);

export const gamePlayerStats = pgTable(
  "etl_flat_game_player_stats",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    gameCode: integer("game_code").notNull(),
    side: text("side").notNull(),
    personKey: text("person_key").notNull(),
    clubCode: text("club_code"),
    personName: text("person_name"),
    clubName: text("club_name"),
    playerTypeCode: text("player_type_code"),
    registrationActive: boolean("registration_active"),
    position: integer("position"),
    positionName: text("position_name"),
    dorsal: text("dorsal"),
    headshotUrl: text("headshot_url"),
    started: boolean("started"),
    startedAlt: boolean("started_alt"),
    ...boxMeasureColumns(),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.gameCode, table.side, table.personKey] })],
);

function standingIdentityColumns() {
  return {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    phaseCode: text("phase_code").notNull(),
    roundNumber: integer("round_number").notNull(),
    clubCode: text("club_code").notNull(),
    clubName: text("club_name"),
    clubTvCode: text("club_tv_code"),
    groupName: text("group_name"),
    position: integer("position"),
    positionChange: text("position_change"),
    gamesPlayed: integer("games_played"),
    gamesWon: integer("games_won"),
    gamesLost: integer("games_lost"),
    qualified: boolean("qualified"),
  };
}

export const standingsBasic = pgTable(
  "etl_flat_standings_basicstandings",
  {
    ...standingIdentityColumns(),
    winPercentage: numeric("win_percentage"),
    pointsDifference: integer("points_difference"),
    pointsFor: integer("points_for"),
    pointsAgainst: integer("points_against"),
    homeRecord: text("home_record"),
    awayRecord: text("away_record"),
    neutralRecord: text("neutral_record"),
    overtimeRecord: text("overtime_record"),
    lastTenRecord: text("last_ten_record"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode] })],
);

export const standingsCalendar = pgTable(
  "etl_flat_standings_calendarstandings",
  {
    ...standingIdentityColumns(),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode] })],
);

export const standingsStreaks = pgTable(
  "etl_flat_standings_streaks",
  {
    ...standingIdentityColumns(),
    homeRecord: text("home_record"),
    awayRecord: text("away_record"),
    last10: text("last10"),
    homeLast5: text("home_last5"),
    awayLast5: text("away_last5"),
    longestWinStreakCurrentSeason: integer("longest_wins_streak_current_season"),
    longestLoseStreakCurrentSeason: integer("longest_loses_streak_current_season"),
    longestWinStreakAnySeason: integer("longest_wins_streak_any_season"),
    longestLoseStreakAnySeason: integer("longest_loses_streak_any_season"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode] })],
);

export const standingsAheadBehind = pgTable(
  "etl_flat_standings_aheadbehind",
  {
    ...standingIdentityColumns(),
    winsPercentage: numeric("wins_percentage"),
    quarter1Ahead: text("quater1_ahead"),
    quarter1Behind: text("quater1_behind"),
    quarter1Tied: text("quater1_tied"),
    half1Ahead: text("half1_ahead"),
    half1Behind: text("half1_behind"),
    half1Tied: text("half1_tied"),
    quarter3Ahead: text("quater3_ahead"),
    quarter3Behind: text("quater3_behind"),
    quarter3Tied: text("quater3_tied"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode] })],
);

export const standingsMargins = pgTable(
  "etl_flat_standings_margins",
  {
    ...standingIdentityColumns(),
    pointDifference1To5: text("point_difference1to5"),
    pointDifference6To10: text("point_difference6to10"),
    pointDifference11To15: text("point_difference11to15"),
    pointDifferenceMoreThan15: text("point_difference_more_than15"),
    rebounds: text("rebounds"),
    assists: text("assists"),
    blocks: text("blocks"),
    threePointers: text("three_pointers"),
    twoPointers: text("two_pointers"),
    freeThrows: text("free_throws"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode] })],
);

export const standingsCalendarStreaks = pgTable(
  "etl_flat_standings_calendar_streaks",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    phaseCode: text("phase_code").notNull(),
    roundNumber: integer("round_number").notNull(),
    clubCode: text("club_code").notNull(),
    streakOrdinal: integer("streak_ordinal").notNull(),
    startAt: timestamp("start_at"),
    endAt: timestamp("end_at"),
    winLossRecord: text("win_loss_record"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode, table.streakOrdinal] })],
);

export const standingsForm = pgTable(
  "etl_flat_standings_basic_form",
  {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    phaseCode: text("phase_code").notNull(),
    roundNumber: integer("round_number").notNull(),
    clubCode: text("club_code").notNull(),
    resultOrdinal: integer("result_ordinal").notNull(),
    result: text("result"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.roundNumber, table.clubCode, table.resultOrdinal] })],
);

function statsIdentityColumns() {
  return {
    competitionCode: text("competition_code").notNull(),
    seasonCode: text("season_code").notNull(),
    phaseCode: text("phase_code").notNull(),
    mode: text("mode").notNull(),
    entryOrdinal: integer("entry_ordinal").notNull(),
    personKey: text("person_key").notNull(),
    clubCode: text("club_code"),
    playerName: text("player_name"),
    playerAge: integer("player_age"),
    playerImageUrl: text("player_image_url"),
    clubName: text("club_name"),
    clubTvCodes: text("club_tv_codes"),
    clubImageUrl: text("club_image_url"),
    playerRanking: integer("player_ranking"),
  };
}

export const seasonStatsTraditional = pgTable(
  "etl_flat_season_stats_traditional",
  {
    ...statsIdentityColumns(),
    gamesPlayed: numeric("games_played"),
    gamesStarted: numeric("games_started"),
    minutesPlayed: numeric("minutes_played"),
    pointsScored: numeric("points_scored"),
    twoPointersMade: numeric("two_pointers_made"),
    twoPointersAttempted: numeric("two_pointers_attempted"),
    twoPointersPercentage: numeric("two_pointers_percentage"),
    threePointersMade: numeric("three_pointers_made"),
    threePointersAttempted: numeric("three_pointers_attempted"),
    threePointersPercentage: numeric("three_pointers_percentage"),
    freeThrowsMade: numeric("free_throws_made"),
    freeThrowsAttempted: numeric("free_throws_attempted"),
    freeThrowsPercentage: numeric("free_throws_percentage"),
    offensiveRebounds: numeric("offensive_rebounds"),
    defensiveRebounds: numeric("defensive_rebounds"),
    totalRebounds: numeric("total_rebounds"),
    assists: numeric("assists"),
    steals: numeric("steals"),
    turnovers: numeric("turnovers"),
    blocks: numeric("blocks"),
    blocksAgainst: numeric("blocks_against"),
    foulsCommited: numeric("fouls_commited"),
    foulsDrawn: numeric("fouls_drawn"),
    pir: numeric("pir"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.mode, table.entryOrdinal] })],
);

export const seasonStatsAdvanced = pgTable(
  "etl_flat_season_stats_advanced",
  {
    ...statsIdentityColumns(),
    gamesPlayed: numeric("games_played"),
    minutesPlayed: numeric("minutes_played"),
    effectiveFieldGoalPercentage: numeric("effective_field_goal_percentage"),
    trueShootingPercentage: numeric("true_shooting_percentage"),
    offensiveReboundsPercentage: numeric("offensive_rebounds_percentage"),
    defensiveReboundsPercentage: numeric("defensive_rebounds_percentage"),
    reboundsPercentage: numeric("rebounds_percentage"),
    assistsToTurnoversRatio: numeric("assists_to_turnovers_ratio"),
    assistsRatio: numeric("assists_ratio"),
    turnoversRatio: numeric("turnovers_ratio"),
    twoPointAttemptsRatio: numeric("two_point_attempts_ratio"),
    threePointAttemptsRatio: numeric("three_point_attempts_ratio"),
    freeThrowsRate: numeric("free_throws_rate"),
    possessions: numeric("possesions"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.mode, table.entryOrdinal] })],
);

export const seasonStatsScoring = pgTable(
  "etl_flat_season_stats_scoring",
  {
    ...statsIdentityColumns(),
    gamesPlayed: numeric("games_played"),
    gamesStarted: numeric("games_started"),
    twoPointAttemptsShare: numeric("two_point_attempts_share"),
    threePointAttemptsShare: numeric("three_point_attempts_share"),
    freeThrowsAttemptsShare: numeric("free_throws_attempts_share"),
    twoPointersMadeShare: numeric("two_pointers_made_share"),
    threePointersMadeShare: numeric("three_pointers_made_share"),
    freeThrowsMadeShare: numeric("free_throws_made_share"),
    twoPointRate: numeric("two_point_rate"),
    threePointRate: numeric("three_point_rate"),
    pointsFromTwoPointersPercentage: numeric("points_from_two_pointers_percentage"),
    pointsFromThreePointersPercentage: numeric("points_from_three_pointers_percentage"),
    pointsFromFreeThrowsPercentage: numeric("points_from_free_throws_percentage"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.mode, table.entryOrdinal] })],
);

export const seasonStatsMisc = pgTable(
  "etl_flat_season_stats_misc",
  {
    ...statsIdentityColumns(),
    gamesPlayed: numeric("games_played"),
    gamesStarted: numeric("games_started"),
    wins: numeric("wins"),
    losses: numeric("losses"),
    minutesPlayed: numeric("minutes_played"),
    doubleDoubles: numeric("double_doubles"),
    tripleDoubles: numeric("triple_doubles"),
  },
  (table) => [primaryKey({ columns: [table.competitionCode, table.seasonCode, table.phaseCode, table.mode, table.entryOrdinal] })],
);
