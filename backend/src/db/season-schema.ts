import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

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
