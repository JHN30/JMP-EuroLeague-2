import { boolean, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

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

export const games = pgTable("etl_flat_games", {
  competitionCode: text("competition_code").notNull(),
  seasonCode: text("season_code").notNull(),
  phaseCode: text("phase_code"),
  phaseName: text("phase_name"),
});

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
