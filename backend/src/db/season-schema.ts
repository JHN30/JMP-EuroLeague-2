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
