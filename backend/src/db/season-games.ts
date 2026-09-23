import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { clubs, gamePeriodScores, gamePlayerStats, gameTeamStats, games } from "./season-schema";

const COMPETITION_CODE = "E";

export type GameTeam = {
  clubCode: string | null;
  name: string | null;
  abbreviatedName: string | null;
  crestUrl: string | null;
};

const localClubs = alias(clubs, "local_clubs");
const roadClubs = alias(clubs, "road_clubs");

export type Game = {
  gameCode: number;
  sourceId: string | null;
  identifier: string | null;
  phaseCode: string | null;
  phaseName: string | null;
  groupId: string | null;
  groupName: string | null;
  roundNumber: number | null;
  roundName: string | null;
  scheduledAt: string | null;
  played: boolean | null;
  gameStatus: string | null;
  localTeam: GameTeam | null;
  roadTeam: GameTeam | null;
  localScore: number | null;
  roadScore: number | null;
};

const gameFields = {
  gameCode: games.gameCode,
  sourceId: games.sourceId,
  identifier: games.identifier,
  phaseCode: games.phaseCode,
  phaseName: games.phaseName,
  groupId: games.groupId,
  groupName: games.groupName,
  roundNumber: games.roundNumber,
  roundName: games.roundName,
  scheduledAt: games.scheduledAt,
  played: games.played,
  gameStatus: games.gameStatus,
  localClubCode: games.localClubCode,
  localClubName: games.localClubName,
  localClubAbbreviatedName: games.localClubAbbreviatedName,
  localClubCrestUrl: localClubs.crestUrl,
  roadClubCode: games.roadClubCode,
  roadClubName: games.roadClubName,
  roadClubAbbreviatedName: games.roadClubAbbreviatedName,
  roadClubCrestUrl: roadClubs.crestUrl,
  localScore: games.localScore,
  roadScore: games.roadScore,
};

function gameTeam(
  code: string | null,
  name: string | null,
  abbreviatedName: string | null,
  crestUrl: string | null,
): GameTeam | null {
  return code === null && name === null && abbreviatedName === null && crestUrl === null
    ? null
    : { clubCode: code, name, abbreviatedName, crestUrl };
}

function toGame(row: {
  gameCode: number;
  sourceId: string | null;
  identifier: string | null;
  phaseCode: string | null;
  phaseName: string | null;
  groupId: string | null;
  groupName: string | null;
  roundNumber: number | null;
  roundName: string | null;
  scheduledAt: Date | null;
  played: boolean | null;
  gameStatus: string | null;
  localClubCode: string | null;
  localClubName: string | null;
  localClubAbbreviatedName: string | null;
  localClubCrestUrl: string | null;
  roadClubCode: string | null;
  roadClubName: string | null;
  roadClubAbbreviatedName: string | null;
  roadClubCrestUrl: string | null;
  localScore: number | null;
  roadScore: number | null;
}): Game {
  return {
    gameCode: row.gameCode,
    sourceId: row.sourceId,
    identifier: row.identifier,
    phaseCode: row.phaseCode,
    phaseName: row.phaseName,
    groupId: row.groupId,
    groupName: row.groupName,
    roundNumber: row.roundNumber,
    roundName: row.roundName,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    played: row.played,
    gameStatus: row.gameStatus,
    localTeam: gameTeam(row.localClubCode, row.localClubName, row.localClubAbbreviatedName, row.localClubCrestUrl),
    roadTeam: gameTeam(row.roadClubCode, row.roadClubName, row.roadClubAbbreviatedName, row.roadClubCrestUrl),
    localScore: row.localScore,
    roadScore: row.roadScore,
  };
}

export async function getGames(
  seasonCode: string,
  limit: number,
  offset: number,
  status?: "played" | "scheduled",
  order: "asc" | "desc" = "asc",
  phaseCode?: string,
  round?: number,
) {
  const conditions = [eq(games.competitionCode, COMPETITION_CODE), eq(games.seasonCode, seasonCode)];
  if (status === "played") conditions.push(eq(games.played, true));
  if (status === "scheduled") conditions.push(or(eq(games.played, false), isNull(games.played))!);
  if (phaseCode !== undefined) conditions.push(eq(games.phaseCode, phaseCode));
  if (round !== undefined) conditions.push(eq(games.roundNumber, round));

  const [rows, countRows] = await Promise.all([
    catalogRead(() =>
      db.select(gameFields)
        .from(games)
        .leftJoin(localClubs, and(
          eq(localClubs.competitionCode, games.competitionCode),
          eq(localClubs.seasonCode, games.seasonCode),
          eq(localClubs.clubCode, games.localClubCode),
        ))
        .leftJoin(roadClubs, and(
          eq(roadClubs.competitionCode, games.competitionCode),
          eq(roadClubs.seasonCode, games.seasonCode),
          eq(roadClubs.clubCode, games.roadClubCode),
        ))
        .where(and(...conditions))
        .orderBy(
          order === "desc" ? sql`${games.scheduledAt} DESC NULLS LAST` : asc(games.scheduledAt),
          asc(games.gameCode),
        )
        .limit(limit + 1)
        .offset(offset),
    ),
    catalogRead(() =>
      db.select({ count: sql<number>`count(*)::int` }).from(games).where(and(...conditions)),
    ),
  ]);
  return { items: rows.slice(0, limit).map(toGame), hasMore: rows.length > limit, total: countRows[0]?.count ?? 0 };
}

export async function getTeamGames(
  seasonCode: string,
  clubCode: string,
  limit: number,
  offset: number,
  status?: "played" | "scheduled",
  order: "asc" | "desc" = "asc",
) {
  const conditions = [
    eq(games.competitionCode, COMPETITION_CODE),
    eq(games.seasonCode, seasonCode),
    or(eq(games.localClubCode, clubCode), eq(games.roadClubCode, clubCode))!,
  ];
  if (status === "played") conditions.push(eq(games.played, true));
  if (status === "scheduled") conditions.push(or(eq(games.played, false), isNull(games.played))!);

  const rows = await catalogRead(() =>
    db.select(gameFields)
      .from(games)
      .leftJoin(localClubs, and(
        eq(localClubs.competitionCode, games.competitionCode),
        eq(localClubs.seasonCode, games.seasonCode),
        eq(localClubs.clubCode, games.localClubCode),
      ))
      .leftJoin(roadClubs, and(
        eq(roadClubs.competitionCode, games.competitionCode),
        eq(roadClubs.seasonCode, games.seasonCode),
        eq(roadClubs.clubCode, games.roadClubCode),
      ))
      .where(and(...conditions))
      .orderBy(
        order === "desc" ? sql`${games.scheduledAt} DESC NULLS LAST` : asc(games.scheduledAt),
        asc(games.gameCode),
      )
      .limit(limit + 1)
      .offset(offset),
  );
  return { items: rows.slice(0, limit).map(toGame), hasMore: rows.length > limit };
}

export async function getPlayerGameLog(
  seasonCode: string,
  personKey: string,
  limit: number,
  offset: number,
) {
  const rows = await catalogRead(() =>
    db.select({
      game: gameFields,
      side: gamePlayerStats.side,
      headshotUrl: gamePlayerStats.headshotUrl,
      ...measureFields(gamePlayerStats),
    })
      .from(gamePlayerStats)
      .innerJoin(games, and(
        eq(games.competitionCode, gamePlayerStats.competitionCode),
        eq(games.seasonCode, gamePlayerStats.seasonCode),
        eq(games.gameCode, gamePlayerStats.gameCode),
      ))
      .leftJoin(localClubs, and(
        eq(localClubs.competitionCode, games.competitionCode),
        eq(localClubs.seasonCode, games.seasonCode),
        eq(localClubs.clubCode, games.localClubCode),
      ))
      .leftJoin(roadClubs, and(
        eq(roadClubs.competitionCode, games.competitionCode),
        eq(roadClubs.seasonCode, games.seasonCode),
        eq(roadClubs.clubCode, games.roadClubCode),
      ))
      .where(and(
        eq(gamePlayerStats.competitionCode, COMPETITION_CODE),
        eq(gamePlayerStats.seasonCode, seasonCode),
        eq(gamePlayerStats.personKey, personKey),
      ))
      .orderBy(asc(games.scheduledAt), asc(games.gameCode))
      .limit(limit + 1)
      .offset(offset),
  );
  return {
    items: rows.slice(0, limit).map(({ game, ...stats }) => ({ ...toGame(game), ...stats })),
    hasMore: rows.length > limit,
  };
}

export async function getGame(seasonCode: string, gameCode: number): Promise<Game | null> {
  const rows = await catalogRead(() =>
    db.select(gameFields)
      .from(games)
      .leftJoin(localClubs, and(
        eq(localClubs.competitionCode, games.competitionCode),
        eq(localClubs.seasonCode, games.seasonCode),
        eq(localClubs.clubCode, games.localClubCode),
      ))
      .leftJoin(roadClubs, and(
        eq(roadClubs.competitionCode, games.competitionCode),
        eq(roadClubs.seasonCode, games.seasonCode),
        eq(roadClubs.clubCode, games.roadClubCode),
      ))
      .where(and(
        eq(games.competitionCode, COMPETITION_CODE),
        eq(games.seasonCode, seasonCode),
        eq(games.gameCode, gameCode),
      ))
      .limit(1),
  );
  return rows[0] ? toGame(rows[0]) : null;
}

function measureFields(table: typeof gameTeamStats | typeof gamePlayerStats) {
  // PostgreSQL NUMERIC is delivered as text by pg, preserving source precision.
  return {
    points: table.points,
    timePlayed: table.timePlayed,
    valuation: table.valuation,
    fieldGoalsMade2: table.fieldGoalsMade2,
    fieldGoalsAttempted2: table.fieldGoalsAttempted2,
    fieldGoalsMade3: table.fieldGoalsMade3,
    fieldGoalsAttempted3: table.fieldGoalsAttempted3,
    freeThrowsMade: table.freeThrowsMade,
    freeThrowsAttempted: table.freeThrowsAttempted,
    fieldGoalsMadeTotal: table.fieldGoalsMadeTotal,
    fieldGoalsAttemptedTotal: table.fieldGoalsAttemptedTotal,
    accuracyMade: table.accuracyMade,
    accuracyAttempted: table.accuracyAttempted,
    totalRebounds: table.totalRebounds,
    defensiveRebounds: table.defensiveRebounds,
    offensiveRebounds: table.offensiveRebounds,
    assistances: table.assistances,
    steals: table.steals,
    turnovers: table.turnovers,
    blocksFavour: table.blocksFavour,
    blocksAgainst: table.blocksAgainst,
    foulsCommited: table.foulsCommited,
    foulsReceived: table.foulsReceived,
    plusMinus: table.plusMinus,
  };
}

export async function getBoxScore(seasonCode: string, gameCode: number) {
  const scope = and(
    eq(gamePeriodScores.competitionCode, COMPETITION_CODE),
    eq(gamePeriodScores.seasonCode, seasonCode),
    eq(gamePeriodScores.gameCode, gameCode),
  );
  const [periodScores, teamStats, playerStats] = await Promise.all([
    catalogRead(() => db.select({
      side: gamePeriodScores.side,
      periodNumber: gamePeriodScores.periodNumber,
      score: gamePeriodScores.score,
    }).from(gamePeriodScores).where(scope)
      .orderBy(asc(gamePeriodScores.periodNumber), asc(gamePeriodScores.side))),
    catalogRead(() => db.select({
      side: gameTeamStats.side,
      statsKind: gameTeamStats.statsKind,
      coachCode: gameTeamStats.coachCode,
      coachName: gameTeamStats.coachName,
      ...measureFields(gameTeamStats),
    }).from(gameTeamStats).where(and(
      eq(gameTeamStats.competitionCode, COMPETITION_CODE),
      eq(gameTeamStats.seasonCode, seasonCode),
      eq(gameTeamStats.gameCode, gameCode),
    )).orderBy(asc(gameTeamStats.side), asc(gameTeamStats.statsKind))),
    catalogRead(() => db.select({
      side: gamePlayerStats.side,
      personKey: gamePlayerStats.personKey,
      clubCode: gamePlayerStats.clubCode,
      personName: gamePlayerStats.personName,
      clubName: gamePlayerStats.clubName,
      playerTypeCode: gamePlayerStats.playerTypeCode,
      registrationActive: gamePlayerStats.registrationActive,
      position: gamePlayerStats.position,
      positionName: gamePlayerStats.positionName,
      dorsal: gamePlayerStats.dorsal,
      headshotUrl: gamePlayerStats.headshotUrl,
      started: gamePlayerStats.started,
      startedAlt: gamePlayerStats.startedAlt,
      ...measureFields(gamePlayerStats),
    }).from(gamePlayerStats).where(and(
      eq(gamePlayerStats.competitionCode, COMPETITION_CODE),
      eq(gamePlayerStats.seasonCode, seasonCode),
      eq(gamePlayerStats.gameCode, gameCode),
    )).orderBy(asc(gamePlayerStats.side), asc(gamePlayerStats.personName), asc(gamePlayerStats.personKey))),
  ]);
  return { periodScores, teamStats, playerStats };
}

const MEASURE_KEYS = [
  "points",
  "fieldGoalsMade2",
  "fieldGoalsAttempted2",
  "fieldGoalsMade3",
  "fieldGoalsAttempted3",
  "freeThrowsMade",
  "freeThrowsAttempted",
  "fieldGoalsMadeTotal",
  "fieldGoalsAttemptedTotal",
  "totalRebounds",
  "defensiveRebounds",
  "offensiveRebounds",
  "assistances",
  "steals",
  "turnovers",
  "blocksFavour",
  "blocksAgainst",
  "foulsCommited",
  "foulsReceived",
  "valuation",
] as const;

type MeasureKey = (typeof MEASURE_KEYS)[number];
type MeasureSums = Record<MeasureKey, number>;

function emptySums(): MeasureSums {
  return Object.fromEntries(MEASURE_KEYS.map((key) => [key, 0])) as MeasureSums;
}

function addMeasures(target: MeasureSums, row: { [key in MeasureKey]: string | null }) {
  for (const key of MEASURE_KEYS) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) target[key] += value;
  }
}

export type TeamStatsSummary = {
  phaseCode: string;
  gamesPlayed: number;
  own: MeasureSums;
  opponent: MeasureSums;
};

export async function getTeamStatsSummary(
  seasonCode: string,
  phaseCode: string,
  clubCode: string,
): Promise<TeamStatsSummary> {
  const rows = await catalogRead(() =>
    db.select({
      gameCode: games.gameCode,
      localClubCode: games.localClubCode,
      roadClubCode: games.roadClubCode,
      side: gameTeamStats.side,
      ...measureFields(gameTeamStats),
    })
      .from(games)
      .innerJoin(gameTeamStats, and(
        eq(gameTeamStats.competitionCode, games.competitionCode),
        eq(gameTeamStats.seasonCode, games.seasonCode),
        eq(gameTeamStats.gameCode, games.gameCode),
        eq(gameTeamStats.statsKind, "total"),
      ))
      .where(and(
        eq(games.competitionCode, COMPETITION_CODE),
        eq(games.seasonCode, seasonCode),
        eq(games.phaseCode, phaseCode),
        eq(games.played, true),
        or(eq(games.localClubCode, clubCode), eq(games.roadClubCode, clubCode))!,
      )),
  );

  const own = emptySums();
  const opponent = emptySums();
  const gameCodes = new Set<number>();

  for (const row of rows) {
    const ownSide = row.localClubCode === clubCode ? "local" : row.roadClubCode === clubCode ? "road" : null;
    if (!ownSide) continue;
    gameCodes.add(row.gameCode);
    if (row.side === ownSide) {
      addMeasures(own, row);
    } else {
      addMeasures(opponent, row);
    }
  }

  return { phaseCode, gamesPlayed: gameCodes.size, own, opponent };
}
