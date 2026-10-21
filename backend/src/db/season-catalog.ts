import { and, desc, eq, inArray } from "drizzle-orm";
import { ENV } from "../config/env";
import { db } from "./client";
import { games, rounds, seasons } from "./season-schema";

const COMPETITION_CODE = "E";
// The seasons the API serves. Neon holds E2018 to E2026, the nine the site shows. A local development database has no such limit and may hold any
// season from 2000, so with DB_TARGET=local every season from E2000 to E2026 is accepted; one the database lacks answers as a season it lacks
// (omitted from the list, 404 on its own address, no rows in the records).
const NEON_SEASONS = Array.from({ length: 9 }, (_, index) => `E${2018 + index}`);
const LOCAL_SEASONS = Array.from({ length: 27 }, (_, index) => `E${2000 + index}`);
export const SUPPORTED_SEASONS: readonly string[] = ENV.DB_TARGET === "local" ? LOCAL_SEASONS : NEON_SEASONS;

export type Season = {
  seasonCode: string;
  name: string | null;
  startYear: number | null;
  competition: { code: string; name: string | null };
};

export type Phase = { code: string; name: string | null };
export type Round = { key: string; number: number; index: number | null; name: string | null };

export class CatalogDatabaseError extends Error {
  constructor() {
    super("Database unavailable");
  }
}

export async function catalogRead<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch {
    throw new CatalogDatabaseError();
  }
}

function toSeason(row: {
  seasonCode: string;
  name: string | null;
  startYear: number | null;
  competitionCode: string;
  competitionName: string | null;
}): Season {
  return {
    seasonCode: row.seasonCode,
    name: row.name,
    startYear: row.startYear,
    competition: { code: row.competitionCode, name: row.competitionName },
  };
}

const seasonFields = {
  seasonCode: seasons.seasonCode,
  name: seasons.name,
  startYear: seasons.startYear,
  competitionCode: seasons.competitionCode,
  competitionName: seasons.competitionName,
};

export async function getSeasons(): Promise<Season[]> {
  const rows = await catalogRead(() =>
    db
      .select(seasonFields)
      .from(seasons)
      .where(
        and(
          eq(seasons.competitionCode, COMPETITION_CODE),
          inArray(seasons.seasonCode, SUPPORTED_SEASONS),
        ),
      )
      .orderBy(desc(seasons.seasonCode)),
  );
  return rows.map(toSeason);
}

export async function getSeason(seasonCode: string): Promise<Season | null> {
  const rows = await catalogRead(() =>
    db
      .select(seasonFields)
      .from(seasons)
      .where(
        and(
          eq(seasons.competitionCode, COMPETITION_CODE),
          eq(seasons.seasonCode, seasonCode),
        ),
      )
      .limit(1),
  );
  return rows[0] ? toSeason(rows[0]) : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function getPhases(seasonCode: string): Promise<Phase[]> {
  const scope = and(
    eq(rounds.competitionCode, COMPETITION_CODE),
    eq(rounds.seasonCode, seasonCode),
  );
  const gameScope = and(
    eq(games.competitionCode, COMPETITION_CODE),
    eq(games.seasonCode, seasonCode),
  );
  const [roundRows, gameRows] = await Promise.all([
    catalogRead(() =>
      db.select({ code: rounds.phaseCode, number: rounds.roundNumber }).from(rounds).where(scope),
    ),
    catalogRead(() =>
      db.selectDistinct({ code: games.phaseCode, name: games.phaseName })
        .from(games)
        .where(gameScope),
    ),
  ]);

  const phases = new Map<string, { firstRound: number | null; names: Set<string> }>();
  for (const row of roundRows) {
    const phase = phases.get(row.code) ?? { firstRound: null, names: new Set<string>() };
    if (phase.firstRound === null || row.number < phase.firstRound) {
      phase.firstRound = row.number;
    }
    phases.set(row.code, phase);
  }
  for (const row of gameRows) {
    if (row.code === null) continue;
    const phase = phases.get(row.code) ?? { firstRound: null, names: new Set<string>() };
    if (row.name !== null) phase.names.add(row.name);
    phases.set(row.code, phase);
  }
  return [...phases.entries()]
    .sort(([leftCode, left], [rightCode, right]) =>
      (left.firstRound ?? Infinity) - (right.firstRound ?? Infinity) || compareText(leftCode, rightCode),
    )
    .map(([code, phase]) => ({
      code,
      name: phase.names.size === 1 ? [...phase.names][0] : null,
    }));
}

export async function getRounds(seasonCode: string, phaseCode: string): Promise<Round[]> {
  const rows = await catalogRead(() =>
    db.select({
      key: rounds.roundKey,
      number: rounds.roundNumber,
      index: rounds.roundIndex,
      name: rounds.name,
    })
      .from(rounds)
      .where(and(
        eq(rounds.competitionCode, COMPETITION_CODE),
        eq(rounds.seasonCode, seasonCode),
        eq(rounds.phaseCode, phaseCode),
      )),
  );
  return rows.sort((left, right) =>
    (left.index ?? Infinity) - (right.index ?? Infinity) ||
    left.number - right.number ||
    compareText(left.key, right.key),
  );
}
