import { and, asc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
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
  // PostgreSQL NUMERIC is delivered as text by pg ("14.0"). Callers that return a box score
  // convert these with withNumericMeasures; other readers of these columns still get the text.
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

type BoxMeasureKey = keyof ReturnType<typeof measureFields>;
type BoxNumericMeasures = { [Key in BoxMeasureKey]: number | null };

const BOX_MEASURE_KEYS = Object.keys(measureFields(gameTeamStats)) as BoxMeasureKey[];

function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// NULL stays null; anything that is not a finite number becomes null rather than NaN.
function withNumericMeasures<Row extends Record<BoxMeasureKey, string | null>>(row: Row): Omit<Row, BoxMeasureKey> & BoxNumericMeasures {
  const converted: Record<string, unknown> = { ...row };
  for (const key of BOX_MEASURE_KEYS) converted[key] = toNumber(row[key]);
  return converted as Omit<Row, BoxMeasureKey> & BoxNumericMeasures;
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
  return {
    periodScores,
    teamStats: teamStats.map(withNumericMeasures),
    playerStats: playerStats.map(withNumericMeasures),
  };
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

// How much more (or less) the club made than its opponent in each category, per game. The standings breakdown counts
// the games where this is above zero for its "what wins games" record.
export type CategoryEdges = {
  rebounds: number | null;
  assists: number | null;
  blocks: number | null;
  threePointers: number | null;
  twoPointers: number | null;
  freeThrows: number | null;
};

export type PhaseResult = {
  gameCode: number;
  roundNumber: number | null;
  opponentCode: string;
  home: boolean;
  pointsFor: number;
  pointsAgainst: number;
  edges: CategoryEdges;
  // The club's margin in each of the four regulation quarters (null when a quarter score is missing).
  quarterMargins: number[] | null;
};

export type ClubPhaseResults = { clubCode: string; games: PhaseResult[] };

const localTotals = alias(gameTeamStats, "local_totals");
const roadTotals = alias(gameTeamStats, "road_totals");

type Measures = { [K in keyof CategoryEdges]: string | null };

function edgeBetween(own: string | null | undefined, opponent: string | null | undefined): number | null {
  if (own == null || opponent == null) return null;
  const difference = Number(own) - Number(opponent);
  return Number.isFinite(difference) ? difference : null;
}

function edgesOf(own: Measures | null, opponent: Measures | null): CategoryEdges {
  return {
    rebounds: edgeBetween(own?.rebounds, opponent?.rebounds),
    assists: edgeBetween(own?.assists, opponent?.assists),
    blocks: edgeBetween(own?.blocks, opponent?.blocks),
    threePointers: edgeBetween(own?.threePointers, opponent?.threePointers),
    twoPointers: edgeBetween(own?.twoPointers, opponent?.twoPointers),
    freeThrows: edgeBetween(own?.freeThrows, opponent?.freeThrows),
  };
}

// Every played, scored game of a phase from each club's side, oldest first, with the box-score category edges.
// The standings breakdowns work these out themselves (results ribbon, streaks, margin buckets, what wins games)
// because the source's per-view feeds can lag the basic standings by a game.
export async function getPhaseResults(seasonCode: string, phaseCode: string): Promise<ClubPhaseResults[]> {
  const rows = await catalogRead(() =>
    db.select({
      gameCode: games.gameCode,
      roundNumber: games.roundNumber,
      localClubCode: games.localClubCode,
      roadClubCode: games.roadClubCode,
      localScore: games.localScore,
      roadScore: games.roadScore,
      local: {
        rebounds: localTotals.totalRebounds,
        assists: localTotals.assistances,
        blocks: localTotals.blocksFavour,
        threePointers: localTotals.fieldGoalsMade3,
        twoPointers: localTotals.fieldGoalsMade2,
        freeThrows: localTotals.freeThrowsMade,
      },
      road: {
        rebounds: roadTotals.totalRebounds,
        assists: roadTotals.assistances,
        blocks: roadTotals.blocksFavour,
        threePointers: roadTotals.fieldGoalsMade3,
        twoPointers: roadTotals.fieldGoalsMade2,
        freeThrows: roadTotals.freeThrowsMade,
      },
    })
      .from(games)
      .leftJoin(localTotals, and(
        eq(localTotals.competitionCode, games.competitionCode),
        eq(localTotals.seasonCode, games.seasonCode),
        eq(localTotals.gameCode, games.gameCode),
        eq(localTotals.side, "local"),
        eq(localTotals.statsKind, "total"),
      ))
      .leftJoin(roadTotals, and(
        eq(roadTotals.competitionCode, games.competitionCode),
        eq(roadTotals.seasonCode, games.seasonCode),
        eq(roadTotals.gameCode, games.gameCode),
        eq(roadTotals.side, "road"),
        eq(roadTotals.statsKind, "total"),
      ))
      .where(and(
        eq(games.competitionCode, COMPETITION_CODE),
        eq(games.seasonCode, seasonCode),
        eq(games.phaseCode, phaseCode),
        eq(games.played, true),
        isNotNull(games.localScore),
        isNotNull(games.roadScore),
        isNotNull(games.localClubCode),
        isNotNull(games.roadClubCode),
      ))
      .orderBy(asc(games.scheduledAt), asc(games.gameCode)),
  );

  const gameCodes = rows.map((row) => row.gameCode);
  const periodRows = gameCodes.length === 0 ? [] : await catalogRead(() =>
    db.select({
      gameCode: gamePeriodScores.gameCode,
      side: gamePeriodScores.side,
      period: gamePeriodScores.periodNumber,
      score: gamePeriodScores.score,
    })
      .from(gamePeriodScores)
      .where(and(
        eq(gamePeriodScores.competitionCode, COMPETITION_CODE),
        eq(gamePeriodScores.seasonCode, seasonCode),
        inArray(gamePeriodScores.gameCode, gameCodes),
      )),
  );
  const periodScores = new Map<number, { local: Map<number, number>; road: Map<number, number> }>();
  for (const row of periodRows) {
    if (row.score === null || (row.side !== "local" && row.side !== "road")) continue;
    const game = periodScores.get(row.gameCode) ?? { local: new Map(), road: new Map() };
    game[row.side].set(row.period, row.score);
    periodScores.set(row.gameCode, game);
  }
  const quarterMarginsOf = (gameCode: number, own: "local" | "road"): number[] | null => {
    const game = periodScores.get(gameCode);
    if (!game) return null;
    const opponent = own === "local" ? "road" : "local";
    const margins: number[] = [];
    for (const quarter of [1, 2, 3, 4]) {
      const mine = game[own].get(quarter);
      const theirs = game[opponent].get(quarter);
      if (mine === undefined || theirs === undefined) return null;
      margins.push(mine - theirs);
    }
    return margins;
  };

  const byClub = new Map<string, PhaseResult[]>();
  const add = (clubCode: string, result: PhaseResult) => {
    const list = byClub.get(clubCode) ?? [];
    list.push(result);
    byClub.set(clubCode, list);
  };
  for (const row of rows) {
    if (row.localClubCode === null || row.roadClubCode === null || row.localScore === null || row.roadScore === null) continue;
    add(row.localClubCode, { gameCode: row.gameCode, roundNumber: row.roundNumber, opponentCode: row.roadClubCode, home: true, pointsFor: row.localScore, pointsAgainst: row.roadScore, edges: edgesOf(row.local, row.road), quarterMargins: quarterMarginsOf(row.gameCode, "local") });
    add(row.roadClubCode, { gameCode: row.gameCode, roundNumber: row.roundNumber, opponentCode: row.localClubCode, home: false, pointsFor: row.roadScore, pointsAgainst: row.localScore, edges: edgesOf(row.road, row.local), quarterMargins: quarterMarginsOf(row.gameCode, "road") });
  }
  return [...byClub.entries()].map(([clubCode, clubGames]) => ({ clubCode, games: clubGames }));
}
