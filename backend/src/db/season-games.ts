import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { gamePeriodScores, gamePlayerStats, gameTeamStats, games } from "./season-schema";

const COMPETITION_CODE = "E";

export type GameTeam = {
  clubCode: string | null;
  name: string | null;
  abbreviatedName: string | null;
};

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
  roadClubCode: games.roadClubCode,
  roadClubName: games.roadClubName,
  roadClubAbbreviatedName: games.roadClubAbbreviatedName,
  localScore: games.localScore,
  roadScore: games.roadScore,
};

function gameTeam(code: string | null, name: string | null, abbreviatedName: string | null): GameTeam | null {
  return code === null && name === null && abbreviatedName === null
    ? null
    : { clubCode: code, name, abbreviatedName };
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
  roadClubCode: string | null;
  roadClubName: string | null;
  roadClubAbbreviatedName: string | null;
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
    localTeam: gameTeam(row.localClubCode, row.localClubName, row.localClubAbbreviatedName),
    roadTeam: gameTeam(row.roadClubCode, row.roadClubName, row.roadClubAbbreviatedName),
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
) {
  const conditions = [eq(games.competitionCode, COMPETITION_CODE), eq(games.seasonCode, seasonCode)];
  if (status === "played") conditions.push(eq(games.played, true));
  if (status === "scheduled") conditions.push(or(eq(games.played, false), isNull(games.played))!);

  const rows = await catalogRead(() =>
    db.select(gameFields)
      .from(games)
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

export async function getGame(seasonCode: string, gameCode: number): Promise<Game | null> {
  const rows = await catalogRead(() =>
    db.select(gameFields)
      .from(games)
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
