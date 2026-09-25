import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./client";
import { CatalogDatabaseError, catalogRead } from "./season-catalog";
import { clubs, gamePeriodScores, gamePlayerStats, gameTeamStats, games, playByPlay, postseasonSeries, shots, teamSeasonStats } from "./season-schema";

const COMPETITION_CODE = "E";

export type GameTeam = {
  clubCode: string | null;
  name: string | null;
  abbreviatedName: string | null;
  crestUrl: string | null;
};

const localClubs = alias(clubs, "local_clubs");
const roadClubs = alias(clubs, "road_clubs");
const seriesClubA = alias(clubs, "series_club_a");
const seriesClubB = alias(clubs, "series_club_b");

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

// `period` is source text, not chronological order; map each name to its
// regulation quarter number. "ExtraTime" bundles every overtime under one
// label, so overtimes are told apart by counting each one's own "Begin
// Period" (`BP`) marker in event order, not by clock `minute`: a period's
// trailing "End Period"/"End Game" markers are stamped one minute into the
// *next* period, which would misattribute a single-overtime game's closing
// markers to a phantom second overtime if `minute` alone decided the split.
const REGULATION_PERIOD_NUMBERS: Record<string, number> = {
  FirstQuarter: 1,
  SecondQuarter: 2,
  ThirdQuarter: 3,
  ForthQuarter: 4,
};

function overtimeNumbersByEventOrdinal(rows: { period: string; eventOrdinal: number; playType: string | null }[]) {
  const extraTime = rows
    .filter((row) => row.period === "ExtraTime")
    .sort((a, b) => a.eventOrdinal - b.eventOrdinal);
  const byOrdinal = new Map<number, number>();
  let overtimeIndex = 0;
  for (const row of extraTime) {
    if (row.playType === "BP") overtimeIndex += 1;
    byOrdinal.set(row.eventOrdinal, Math.max(overtimeIndex, 1));
  }
  return byOrdinal;
}

export async function getPlayByPlay(seasonCode: string, gameCode: number) {
  const rows = await catalogRead(() =>
    db
      .select({
        period: playByPlay.period,
        eventOrdinal: playByPlay.eventOrdinal,
        clubCode: playByPlay.clubCode,
        personCode: playByPlay.personCode,
        playType: playByPlay.playType,
        playerName: playByPlay.playerName,
        teamName: playByPlay.teamName,
        dorsal: playByPlay.dorsal,
        minute: playByPlay.minute,
        markerTime: playByPlay.markerTime,
        pointsA: playByPlay.pointsA,
        pointsB: playByPlay.pointsB,
        playInfo: playByPlay.playInfo,
      })
      .from(playByPlay)
      .where(and(
        eq(playByPlay.competitionCode, COMPETITION_CODE),
        eq(playByPlay.seasonCode, seasonCode),
        eq(playByPlay.gameCode, gameCode),
      )),
  );

  const overtimeNumbers = overtimeNumbersByEventOrdinal(rows);
  const events = rows.map((row) => {
    const periodNumber = REGULATION_PERIOD_NUMBERS[row.period]
      ?? (row.period === "ExtraTime" ? 4 + (overtimeNumbers.get(row.eventOrdinal) ?? 1) : 0);
    return { ...row, periodNumber };
  });
  events.sort((a, b) => a.periodNumber - b.periodNumber || a.eventOrdinal - b.eventOrdinal);
  return { events };
}

type PostseasonClub = { clubCode: string; name: string | null; abbreviatedName: string | null; crestUrl: string | null };

export async function getPostseasonSeries(seasonCode: string) {
  const rows = await catalogRead(() =>
    db
      .select({
        phaseCode: postseasonSeries.phaseCode,
        clubACode: postseasonSeries.clubACode,
        clubBCode: postseasonSeries.clubBCode,
        clubAName: postseasonSeries.clubAName,
        clubBName: postseasonSeries.clubBName,
        clubAAbbreviatedName: seriesClubA.abbreviatedName,
        clubBAbbreviatedName: seriesClubB.abbreviatedName,
        clubACrestUrl: seriesClubA.crestUrl,
        clubBCrestUrl: seriesClubB.crestUrl,
        gamesPlayed: postseasonSeries.gamesPlayed,
        clubAWins: postseasonSeries.clubAWins,
        clubBWins: postseasonSeries.clubBWins,
        winnerClubCode: postseasonSeries.winnerClubCode,
        games: postseasonSeries.games,
      })
      .from(postseasonSeries)
      .leftJoin(seriesClubA, and(
        eq(seriesClubA.competitionCode, postseasonSeries.competitionCode),
        eq(seriesClubA.seasonCode, postseasonSeries.seasonCode),
        eq(seriesClubA.clubCode, postseasonSeries.clubACode),
      ))
      .leftJoin(seriesClubB, and(
        eq(seriesClubB.competitionCode, postseasonSeries.competitionCode),
        eq(seriesClubB.seasonCode, postseasonSeries.seasonCode),
        eq(seriesClubB.clubCode, postseasonSeries.clubBCode),
      ))
      .where(and(
        eq(postseasonSeries.competitionCode, COMPETITION_CODE),
        eq(postseasonSeries.seasonCode, seasonCode),
      )),
  );

  const series = rows.map((row) => ({
    phaseCode: row.phaseCode,
    clubA: {
      clubCode: row.clubACode,
      name: row.clubAName,
      abbreviatedName: row.clubAAbbreviatedName,
      crestUrl: row.clubACrestUrl,
    } satisfies PostseasonClub,
    clubB: {
      clubCode: row.clubBCode,
      name: row.clubBName,
      abbreviatedName: row.clubBAbbreviatedName,
      crestUrl: row.clubBCrestUrl,
    } satisfies PostseasonClub,
    gamesPlayed: row.gamesPlayed,
    clubAWins: row.clubAWins,
    clubBWins: row.clubBWins,
    winnerClubCode: row.winnerClubCode,
    games: row.games,
  }));

  return { series };
}

const FIELD_GOAL_ACTION_CODES = ["2FGM", "2FGA", "3FGM", "3FGA"] as const;

// Free throws have no real court coordinates in the source feed, so this
// scopes to field-goal attempts only - the domain of a shot chart.
export async function getShots(seasonCode: string, gameCode: number) {
  const rows = await catalogRead(() =>
    db
      .select({
        shotOrdinal: shots.shotOrdinal,
        clubCode: shots.clubCode,
        personCode: shots.personCode,
        playerName: shots.playerName,
        actionCode: shots.actionCode,
        points: shots.points,
        coordX: shots.coordX,
        coordY: shots.coordY,
        fastbreak: shots.fastbreak,
        secondChance: shots.secondChance,
        pointsOffTurnover: shots.pointsOffTurnover,
        minute: shots.minute,
        markerTime: shots.markerTime,
        pointsA: shots.pointsA,
        pointsB: shots.pointsB,
      })
      .from(shots)
      .where(and(
        eq(shots.competitionCode, COMPETITION_CODE),
        eq(shots.seasonCode, seasonCode),
        eq(shots.gameCode, gameCode),
        inArray(shots.actionCode, FIELD_GOAL_ACTION_CODES),
      ))
      .orderBy(asc(shots.shotOrdinal)),
  );

  return { shots: rows };
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
type MeasureSums = Record<MeasureKey, number | null>;

function emptySums(): MeasureSums {
  return Object.fromEntries(MEASURE_KEYS.map((key) => [key, null])) as MeasureSums;
}

function numericMeasures(row: { [key in MeasureKey]: string | null }): MeasureSums {
  const measures = emptySums();
  for (const key of MEASURE_KEYS) {
    const raw = row[key];
    if (raw === null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new CatalogDatabaseError();
    measures[key] = value;
  }
  return measures;
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
      phaseCode: teamSeasonStats.phaseCode,
      gamesPlayed: teamSeasonStats.gamesPlayed,
      own: {
        points: teamSeasonStats.ownPoints,
        fieldGoalsMade2: teamSeasonStats.ownFieldGoalsMade2,
        fieldGoalsAttempted2: teamSeasonStats.ownFieldGoalsAttempted2,
        fieldGoalsMade3: teamSeasonStats.ownFieldGoalsMade3,
        fieldGoalsAttempted3: teamSeasonStats.ownFieldGoalsAttempted3,
        freeThrowsMade: teamSeasonStats.ownFreeThrowsMade,
        freeThrowsAttempted: teamSeasonStats.ownFreeThrowsAttempted,
        fieldGoalsMadeTotal: teamSeasonStats.ownFieldGoalsMadeTotal,
        fieldGoalsAttemptedTotal: teamSeasonStats.ownFieldGoalsAttemptedTotal,
        totalRebounds: teamSeasonStats.ownTotalRebounds,
        defensiveRebounds: teamSeasonStats.ownDefensiveRebounds,
        offensiveRebounds: teamSeasonStats.ownOffensiveRebounds,
        assistances: teamSeasonStats.ownAssistances,
        steals: teamSeasonStats.ownSteals,
        turnovers: teamSeasonStats.ownTurnovers,
        blocksFavour: teamSeasonStats.ownBlocksFavour,
        blocksAgainst: teamSeasonStats.ownBlocksAgainst,
        foulsCommited: teamSeasonStats.ownFoulsCommited,
        foulsReceived: teamSeasonStats.ownFoulsReceived,
        valuation: teamSeasonStats.ownValuation,
      },
      opponent: {
        points: teamSeasonStats.oppPoints,
        fieldGoalsMade2: teamSeasonStats.oppFieldGoalsMade2,
        fieldGoalsAttempted2: teamSeasonStats.oppFieldGoalsAttempted2,
        fieldGoalsMade3: teamSeasonStats.oppFieldGoalsMade3,
        fieldGoalsAttempted3: teamSeasonStats.oppFieldGoalsAttempted3,
        freeThrowsMade: teamSeasonStats.oppFreeThrowsMade,
        freeThrowsAttempted: teamSeasonStats.oppFreeThrowsAttempted,
        fieldGoalsMadeTotal: teamSeasonStats.oppFieldGoalsMadeTotal,
        fieldGoalsAttemptedTotal: teamSeasonStats.oppFieldGoalsAttemptedTotal,
        totalRebounds: teamSeasonStats.oppTotalRebounds,
        defensiveRebounds: teamSeasonStats.oppDefensiveRebounds,
        offensiveRebounds: teamSeasonStats.oppOffensiveRebounds,
        assistances: teamSeasonStats.oppAssistances,
        steals: teamSeasonStats.oppSteals,
        turnovers: teamSeasonStats.oppTurnovers,
        blocksFavour: teamSeasonStats.oppBlocksFavour,
        blocksAgainst: teamSeasonStats.oppBlocksAgainst,
        foulsCommited: teamSeasonStats.oppFoulsCommited,
        foulsReceived: teamSeasonStats.oppFoulsReceived,
        valuation: teamSeasonStats.oppValuation,
      },
    })
      .from(teamSeasonStats)
      .where(and(
        eq(teamSeasonStats.competitionCode, COMPETITION_CODE),
        eq(teamSeasonStats.seasonCode, seasonCode),
        eq(teamSeasonStats.phaseCode, phaseCode),
        eq(teamSeasonStats.clubCode, clubCode),
      ))
      .limit(1),
  );

  const row = rows[0];
  if (!row) return { phaseCode, gamesPlayed: 0, own: emptySums(), opponent: emptySums() };
  return {
    phaseCode: row.phaseCode,
    gamesPlayed: row.gamesPlayed,
    own: numericMeasures(row.own),
    opponent: numericMeasures(row.opponent),
  };
}
