import { and, asc, eq, exists, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "./client";
import { gamePlayerAdvanced, gameTeamShotSplits } from "./season-advanced-schema";
import { CatalogDatabaseError, catalogRead } from "./season-catalog";
import { seasonFormat } from "./season-format-registry";
import { type ClubTvCodes, getClubTvCodes, tvCodeOf } from "./season-identities";
import { clubs, gameOfficials, gamePeriodScores, gamePlayerStats, gameTeamStats, games, playByPlay, postseasonSeries, registrations, shots, teamSeasonStats } from "./season-schema";

const COMPETITION_CODE = "E";

export type GameTeam = {
  clubCode: string | null;
  name: string | null;
  abbreviatedName: string | null;
  crestUrl: string | null;
  // The code the club goes by on TV this season (see getClubTvCodes); null only for a side with no club code and no name.
  tvCode: string | null;
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
  // Only with `cards` (the Games page's cards): each side's top scorer, the periods played after the fourth, and the arena.
  topScorers?: { local: TopScorer | null; road: TopScorer | null };
  overtimes?: number | null;
  venueName?: string | null;
};

export type TopScorer = { personKey: string; personName: string | null; headshotUrl: string | null; points: number };

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
  codes: ClubTvCodes,
): GameTeam | null {
  return code === null && name === null && abbreviatedName === null && crestUrl === null
    ? null
    : {
        clubCode: code,
        name,
        abbreviatedName,
        crestUrl,
        tvCode: tvCodeOf(codes, code, abbreviatedName) ?? (abbreviatedName?.trim() || name?.trim() || null),
      };
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
}, codes: ClubTvCodes): Game {
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
    localTeam: gameTeam(row.localClubCode, row.localClubName, row.localClubAbbreviatedName, row.localClubCrestUrl, codes),
    roadTeam: gameTeam(row.roadClubCode, row.roadClubName, row.roadClubAbbreviatedName, row.roadClubCrestUrl, codes),
    localScore: row.localScore,
    roadScore: row.roadScore,
  };
}

// Games still owed: not played, not cancelled by the league, and in a season that was not cancelled as a whole (E2019's
// unplayed rounds were never going to be played).
function scheduledCondition(seasonCode: string) {
  if (seasonFormat(seasonCode)?.cancelled) return sql`false`;
  return and(
    or(eq(games.played, false), isNull(games.played)),
    or(isNull(games.gameStatus), sql`${games.gameStatus} <> 'Cancelled'`),
  )!;
}

export async function getGames(
  seasonCode: string,
  limit: number,
  offset: number,
  status?: "played" | "scheduled",
  order: "asc" | "desc" = "asc",
  phaseCode?: string,
  round?: number,
  cards = false,
) {
  const codes = await getClubTvCodes(seasonCode);
  const conditions = [eq(games.competitionCode, COMPETITION_CODE), eq(games.seasonCode, seasonCode)];
  if (status === "played") conditions.push(eq(games.played, true));
  if (status === "scheduled") conditions.push(scheduledCondition(seasonCode));
  if (phaseCode !== undefined) conditions.push(eq(games.phaseCode, phaseCode));
  if (round !== undefined) conditions.push(eq(games.roundNumber, round));

  const [rows, countRows] = await Promise.all([
    catalogRead(() =>
      db.select({ ...gameFields, venueName: games.venueName })
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
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => toGame(row, codes));
  if (cards) {
    pageRows.forEach((row, index) => {
      items[index].venueName = row.venueName?.trim() || null;
    });
    await addCardDetails(seasonCode, items);
  }
  return { items, hasMore: rows.length > limit, total: countRows[0]?.count ?? 0 };
}

// The top scorer of each side of each played game (most points, then the higher PIR, then the name), and how many periods
// each game played after the fourth (null for a game without period scores). One query each over all the games.
async function addCardDetails(seasonCode: string, items: Game[]) {
  const playedCodes = items.filter((game) => game.played).map((game) => game.gameCode);
  const allCodes = items.map((game) => game.gameCode);
  if (allCodes.length === 0) return;
  const [scorers, periods] = await Promise.all([
    playedCodes.length === 0 ? [] : catalogRead(() =>
      db.selectDistinctOn([gamePlayerStats.gameCode, gamePlayerStats.side], {
        gameCode: gamePlayerStats.gameCode,
        side: gamePlayerStats.side,
        personKey: gamePlayerStats.personKey,
        personName: gamePlayerStats.personName,
        headshotUrl: gamePlayerStats.headshotUrl,
        points: gamePlayerStats.points,
      }).from(gamePlayerStats).where(and(
        eq(gamePlayerStats.competitionCode, COMPETITION_CODE),
        eq(gamePlayerStats.seasonCode, seasonCode),
        inArray(gamePlayerStats.gameCode, playedCodes),
        isNotNull(gamePlayerStats.points),
      )).orderBy(
        asc(gamePlayerStats.gameCode),
        asc(gamePlayerStats.side),
        sql`${gamePlayerStats.points} DESC`,
        sql`${gamePlayerStats.valuation} DESC NULLS LAST`,
        asc(gamePlayerStats.personName),
        asc(gamePlayerStats.personKey),
      ),
    ),
    catalogRead(() =>
      db.select({
        gameCode: gamePeriodScores.gameCode,
        overtimes: sql<number>`count(distinct ${gamePeriodScores.periodNumber}) filter (where ${gamePeriodScores.periodNumber} > 4)::int`,
      }).from(gamePeriodScores).where(and(
        eq(gamePeriodScores.competitionCode, COMPETITION_CODE),
        eq(gamePeriodScores.seasonCode, seasonCode),
        inArray(gamePeriodScores.gameCode, allCodes),
      )).groupBy(gamePeriodScores.gameCode),
    ),
  ]);
  const scorerOf = (gameCode: number, side: "local" | "road"): TopScorer | null => {
    const row = scorers.find((entry) => entry.gameCode === gameCode && entry.side === side);
    return row ? { personKey: row.personKey, personName: row.personName, headshotUrl: row.headshotUrl, points: Number(row.points) } : null;
  };
  const overtimesByGame = new Map(periods.map((row) => [row.gameCode, row.overtimes]));
  for (const game of items) {
    game.topScorers = { local: scorerOf(game.gameCode, "local"), road: scorerOf(game.gameCode, "road") };
    game.overtimes = overtimesByGame.get(game.gameCode) ?? null;
  }
}

export async function getTeamGames(
  seasonCode: string,
  clubCode: string,
  limit: number,
  offset: number,
  status?: "played" | "scheduled",
  order: "asc" | "desc" = "asc",
) {
  const codes = await getClubTvCodes(seasonCode);
  const conditions = [
    eq(games.competitionCode, COMPETITION_CODE),
    eq(games.seasonCode, seasonCode),
    or(eq(games.localClubCode, clubCode), eq(games.roadClubCode, clubCode))!,
  ];
  if (status === "played") conditions.push(eq(games.played, true));
  if (status === "scheduled") conditions.push(scheduledCondition(seasonCode));

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
  return { items: rows.slice(0, limit).map((row) => toGame(row, codes)), hasMore: rows.length > limit };
}

export async function getPlayerGameLog(
  seasonCode: string,
  personKey: string,
  limit: number,
  offset: number,
) {
  const codes = await getClubTvCodes(seasonCode);
  const rows = await catalogRead(() =>
    db.select({
      game: gameFields,
      side: gamePlayerStats.side,
      headshotUrl: gamePlayerStats.headshotUrl,
      // Whether he was in the starting five (null when the feed does not say).
      started: gamePlayerStats.started,
      ...measureFields(gamePlayerStats),
      // The pipeline's advanced numbers for his game (percentages as fractions), where the season has them.
      advanced: {
        secondsPlayed: gamePlayerAdvanced.secondsPlayed,
        gameScore: gamePlayerAdvanced.gameScore,
        gamePer: gamePlayerAdvanced.gamePer,
        trueShootingPct: gamePlayerAdvanced.trueShootingPct,
        efgPct: gamePlayerAdvanced.efgPct,
        usagePct: gamePlayerAdvanced.usagePct,
        assistPct: gamePlayerAdvanced.assistPct,
        tovPct: gamePlayerAdvanced.tovPct,
        orbPct: gamePlayerAdvanced.orbPct,
        drbPct: gamePlayerAdvanced.drbPct,
        stealPct: gamePlayerAdvanced.stealPct,
        blockPct: gamePlayerAdvanced.blockPct,
      },
    })
      .from(gamePlayerStats)
      .innerJoin(games, and(
        eq(games.competitionCode, gamePlayerStats.competitionCode),
        eq(games.seasonCode, gamePlayerStats.seasonCode),
        eq(games.gameCode, gamePlayerStats.gameCode),
      ))
      .leftJoin(gamePlayerAdvanced, and(
        eq(gamePlayerAdvanced.competitionCode, gamePlayerStats.competitionCode),
        eq(gamePlayerAdvanced.seasonCode, gamePlayerStats.seasonCode),
        eq(gamePlayerAdvanced.gameCode, gamePlayerStats.gameCode),
        eq(gamePlayerAdvanced.side, gamePlayerStats.side),
        eq(gamePlayerAdvanced.personKey, gamePlayerStats.personKey),
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
    // A game without an advanced row has `advanced` null rather than an object of nulls.
    items: rows.slice(0, limit).map(({ game, advanced, ...stats }) => ({
      ...toGame(game, codes),
      ...stats,
      advanced: advanced && Object.values(advanced).some((value) => value !== null) ? advanced : null,
    })),
    hasMore: rows.length > limit,
  };
}

export async function getGame(seasonCode: string, gameCode: number): Promise<Game | null> {
  const codes = await getClubTvCodes(seasonCode);
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
  return rows[0] ? toGame(rows[0], codes) : null;
}

export type GameVenue = { name: string | null; capacity: number | null; attendance: number | null; neutral: boolean };

// One game's arena and crowd. A capacity or attendance of 0 means the feed has none; null when the game has neither venue nor crowd.
export async function getGameVenue(seasonCode: string, gameCode: number): Promise<GameVenue | null> {
  const rows = await catalogRead(() =>
    db.select({
      name: games.venueName,
      capacity: games.venueCapacity,
      attendance: games.audience,
      neutral: games.isNeutralVenue,
    })
      .from(games)
      .where(and(
        eq(games.competitionCode, COMPETITION_CODE),
        eq(games.seasonCode, seasonCode),
        eq(games.gameCode, gameCode),
      ))
      .limit(1),
  );
  const row = rows[0];
  if (!row) return null;
  const venue = { name: row.name || null, capacity: row.capacity || null, attendance: row.attendance || null, neutral: row.neutral === true };
  return venue.name === null && venue.capacity === null && venue.attendance === null ? null : venue;
}

export type GameOfficial = { number: number; code: string; name: string; countryCode: string | null; countryName: string | null };

// One game's officials in the feed's order; an empty list when the game has none (not played, or not assigned yet).
export async function getGameOfficials(seasonCode: string, gameCode: number): Promise<GameOfficial[]> {
  return catalogRead(() =>
    db.select({
      number: gameOfficials.officialNumber,
      code: gameOfficials.officialCode,
      name: gameOfficials.name,
      countryCode: gameOfficials.countryCode,
      countryName: gameOfficials.countryName,
    })
      .from(gameOfficials)
      .where(and(
        eq(gameOfficials.competitionCode, COMPETITION_CODE),
        eq(gameOfficials.seasonCode, seasonCode),
        eq(gameOfficials.gameCode, gameCode),
      ))
      .orderBy(asc(gameOfficials.officialNumber)),
  );
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

type PostseasonClub = { clubCode: string; name: string | null; abbreviatedName: string | null; crestUrl: string | null; tvCode: string };

export async function getPostseasonSeries(seasonCode: string) {
  const codes = await getClubTvCodes(seasonCode);
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
      ))
      // The phases in the order they are played, each by its first game, so every database returns the same order.
      .orderBy(
        sql`case ${postseasonSeries.phaseCode} when 'PI' then 1 when 'PO' then 2 when 'FF' then 3 else 4 end`,
        sql`(${postseasonSeries.games}->0->>'gameCode')::int`,
        asc(postseasonSeries.clubACode),
        asc(postseasonSeries.clubBCode),
      ),
  );

  const series = rows.map((row) => ({
    phaseCode: row.phaseCode,
    clubA: {
      clubCode: row.clubACode,
      name: row.clubAName,
      abbreviatedName: row.clubAAbbreviatedName,
      crestUrl: row.clubACrestUrl,
      tvCode: tvCodeOf(codes, row.clubACode, row.clubAAbbreviatedName) ?? row.clubACode,
    } satisfies PostseasonClub,
    clubB: {
      clubCode: row.clubBCode,
      name: row.clubBName,
      abbreviatedName: row.clubBAbbreviatedName,
      crestUrl: row.clubBCrestUrl,
      tvCode: tvCodeOf(codes, row.clubBCode, row.clubBAbbreviatedName) ?? row.clubBCode,
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

const SHOT_COLUMNS = {
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
};

// Free throws have no real court coordinates in the source feed, so this
// scopes to field-goal attempts only - the domain of a shot chart.
export async function getShots(seasonCode: string, gameCode: number) {
  const rows = await catalogRead(() =>
    db
      .select(SHOT_COLUMNS)
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

// One player's field-goal attempts across the season's games of one phase, so the player Shooting tab does not
// download both teams' shots for every game.
export async function getPlayerShots(seasonCode: string, personKey: string, phaseCode: string) {
  const rows = await catalogRead(() =>
    db
      .select(SHOT_COLUMNS)
      .from(shots)
      .innerJoin(games, and(
        eq(games.competitionCode, shots.competitionCode),
        eq(games.seasonCode, shots.seasonCode),
        eq(games.gameCode, shots.gameCode),
      ))
      .where(and(
        eq(shots.competitionCode, COMPETITION_CODE),
        eq(shots.seasonCode, seasonCode),
        eq(shots.personCode, personKey),
        eq(games.phaseCode, phaseCode),
        inArray(shots.actionCode, FIELD_GOAL_ACTION_CODES),
      ))
      .orderBy(asc(shots.gameCode), asc(shots.shotOrdinal)),
  );

  return { shots: rows };
}

// Shot context flags packed into one number in a compact shot row.
const FAST_BREAK_FLAG = 1;
const SECOND_CHANCE_FLAG = 2;
const OFF_TURNOVER_FLAG = 4;

// Every field-goal attempt in one phase by the players registered at `position` in the season (any club), or by
// every player without one: what a player is set against on his Shooting tab. A regular season is about 16,000 shots a
// position, so each is a compact row [coordX, coordY, actionCode, minute, flags, personCode] (flags: 1 fast break,
// 2 second chance, 4 off a turnover). `players` lists each shooter once: name, club (the one of his latest game in the
// phase) and games played in the phase.
export async function getPositionShots(seasonCode: string, phaseCode: string, position: string | null) {
  const rows = await catalogRead(() =>
    db
      .select({
        coordX: shots.coordX,
        coordY: shots.coordY,
        actionCode: shots.actionCode,
        minute: shots.minute,
        fastbreak: shots.fastbreak,
        secondChance: shots.secondChance,
        pointsOffTurnover: shots.pointsOffTurnover,
        personCode: shots.personCode,
      })
      .from(shots)
      .innerJoin(games, and(
        eq(games.competitionCode, shots.competitionCode),
        eq(games.seasonCode, shots.seasonCode),
        eq(games.gameCode, shots.gameCode),
      ))
      .where(and(
        eq(shots.competitionCode, COMPETITION_CODE),
        eq(shots.seasonCode, seasonCode),
        eq(games.phaseCode, phaseCode),
        inArray(shots.actionCode, FIELD_GOAL_ACTION_CODES),
        position
          ? exists(db.select({ one: sql`1` }).from(registrations).where(and(
            eq(registrations.competitionCode, COMPETITION_CODE),
            eq(registrations.seasonCode, seasonCode),
            eq(registrations.personKey, shots.personCode),
            eq(registrations.positionName, position),
          )))
          : undefined,
      )),
  );

  const shooters = [...new Set(rows.map((row) => row.personCode).filter((code): code is string => Boolean(code)))];
  const [codes, appearances] = await Promise.all([
    getClubTvCodes(seasonCode),
    shooters.length === 0
      ? Promise.resolve([])
      : catalogRead(() =>
        db
          .select({
            personKey: gamePlayerStats.personKey,
            clubCode: gamePlayerStats.clubCode,
            name: sql<string | null>`max(${gamePlayerStats.personName})`,
            games: sql<number>`count(distinct ${gamePlayerStats.gameCode})::int`,
            lastAt: sql<string | null>`max(${games.scheduledAt})`,
          })
          .from(gamePlayerStats)
          .innerJoin(games, and(
            eq(games.competitionCode, gamePlayerStats.competitionCode),
            eq(games.seasonCode, gamePlayerStats.seasonCode),
            eq(games.gameCode, gamePlayerStats.gameCode),
          ))
          .where(and(
            eq(gamePlayerStats.competitionCode, COMPETITION_CODE),
            eq(gamePlayerStats.seasonCode, seasonCode),
            eq(games.phaseCode, phaseCode),
            inArray(gamePlayerStats.personKey, shooters),
          ))
          .groupBy(gamePlayerStats.personKey, gamePlayerStats.clubCode),
      ),
  ]);
  // A player traded during the phase has a row per club: his games add up, and his club is the latest one's.
  const byPlayer = new Map<string, { name: string | null; club: string | null; games: number; lastAt: string }>();
  for (const row of appearances) {
    const lastAt = String(row.lastAt ?? "");
    const entry = byPlayer.get(row.personKey);
    if (!entry) {
      byPlayer.set(row.personKey, { name: row.name, club: tvCodeOf(codes, row.clubCode), games: row.games, lastAt });
      continue;
    }
    entry.games += row.games;
    entry.name ??= row.name;
    if (lastAt > entry.lastAt) {
      entry.club = tvCodeOf(codes, row.clubCode);
      entry.lastAt = lastAt;
    }
  }

  const coordinate = (value: string | null) => (value === null ? null : Number(value));
  return {
    players: shooters.map((code) => {
      const entry = byPlayer.get(code);
      return { personCode: code, name: entry?.name ?? null, club: entry?.club ?? null, games: entry?.games ?? 0 };
    }),
    shots: rows.map((row) => [
      coordinate(row.coordX),
      coordinate(row.coordY),
      row.actionCode,
      row.minute,
      (row.fastbreak ? FAST_BREAK_FLAG : 0) | (row.secondChance ? SECOND_CHANCE_FLAG : 0) | (row.pointsOffTurnover ? OFF_TURNOVER_FLAG : 0),
      row.personCode,
    ]),
  };
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

// Scoring-context totals from the per-game shot splits, beside the box-score sums. `splitGames` counts the games that have
// a split row (none before E2007); `contextGames` counts those with the fast-break, second-chance and off-turnover points,
// which are recorded from E2015 only (null in a game with an unflagged shot), so their per-game averages divide by it.
// Every field is null when the club has no split row.
type SplitSums = {
  splitGames: number | null;
  contextGames: number | null;
  fastBreakPoints: number | null;
  secondChancePoints: number | null;
  pointsOffTurnoverPoints: number | null;
  splitFieldGoalsMade: number | null;
  assistedFieldGoals: number | null;
};
type TeamSums = MeasureSums & SplitSums;

const EMPTY_SPLITS: SplitSums = {
  splitGames: null,
  contextGames: null,
  fastBreakPoints: null,
  secondChancePoints: null,
  pointsOffTurnoverPoints: null,
  splitFieldGoalsMade: null,
  assistedFieldGoals: null,
};

function splitNumber(raw: string | number | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new CatalogDatabaseError();
  return value;
}

function splitSums(row: { games: string | number; contextGames: string | number; fastBreak: string | null; secondChance: string | null; offTurnovers: string | null; made: string | null; assisted: string | null }): SplitSums {
  const games = splitNumber(row.games);
  if (!games) return EMPTY_SPLITS;
  return {
    splitGames: games,
    contextGames: splitNumber(row.contextGames),
    fastBreakPoints: splitNumber(row.fastBreak),
    secondChancePoints: splitNumber(row.secondChance),
    pointsOffTurnoverPoints: splitNumber(row.offTurnovers),
    splitFieldGoalsMade: splitNumber(row.made),
    assistedFieldGoals: splitNumber(row.assisted),
  };
}

// Each club's own split totals in the phase's games and its opponents' (the other side of the same games), by club code.
async function getSplitSums(seasonCode: string, phaseCode: string, clubCode?: string) {
  const otherSide = alias(gameTeamShotSplits, "other_side");
  const total = (column: AnyPgColumn) => sql<string | null>`sum(${column})`;
  const rows = await catalogRead(() =>
    db.select({
      clubCode: gameTeamShotSplits.clubCode,
      ownGames: sql<string>`count(*)`,
      ownContextGames: sql<string>`count(${gameTeamShotSplits.fastBreakPoints})`,
      ownFastBreak: total(gameTeamShotSplits.fastBreakPoints),
      ownSecondChance: total(gameTeamShotSplits.secondChancePoints),
      ownOffTurnovers: total(gameTeamShotSplits.pointsOffTurnoverPoints),
      ownMade: total(gameTeamShotSplits.fieldGoalsMade),
      ownAssisted: total(gameTeamShotSplits.assistedFieldGoals),
      oppGames: sql<string>`count(${otherSide.gameCode})`,
      oppContextGames: sql<string>`count(${otherSide.fastBreakPoints})`,
      oppFastBreak: total(otherSide.fastBreakPoints),
      oppSecondChance: total(otherSide.secondChancePoints),
      oppOffTurnovers: total(otherSide.pointsOffTurnoverPoints),
      oppMade: total(otherSide.fieldGoalsMade),
      oppAssisted: total(otherSide.assistedFieldGoals),
    })
      .from(gameTeamShotSplits)
      .innerJoin(games, and(
        eq(games.competitionCode, gameTeamShotSplits.competitionCode),
        eq(games.seasonCode, gameTeamShotSplits.seasonCode),
        eq(games.gameCode, gameTeamShotSplits.gameCode),
      ))
      .leftJoin(otherSide, and(
        eq(otherSide.competitionCode, gameTeamShotSplits.competitionCode),
        eq(otherSide.seasonCode, gameTeamShotSplits.seasonCode),
        eq(otherSide.gameCode, gameTeamShotSplits.gameCode),
        sql`${otherSide.side} <> ${gameTeamShotSplits.side}`,
      ))
      .where(and(
        eq(gameTeamShotSplits.competitionCode, COMPETITION_CODE),
        eq(gameTeamShotSplits.seasonCode, seasonCode),
        eq(games.phaseCode, phaseCode),
        ...(clubCode ? [eq(gameTeamShotSplits.clubCode, clubCode)] : []),
      ))
      .groupBy(gameTeamShotSplits.clubCode),
  );

  return new Map(rows.map((row) => [row.clubCode, {
    own: splitSums({ games: row.ownGames, contextGames: row.ownContextGames, fastBreak: row.ownFastBreak, secondChance: row.ownSecondChance, offTurnovers: row.ownOffTurnovers, made: row.ownMade, assisted: row.ownAssisted }),
    opponent: splitSums({ games: row.oppGames, contextGames: row.oppContextGames, fastBreak: row.oppFastBreak, secondChance: row.oppSecondChance, offTurnovers: row.oppOffTurnovers, made: row.oppMade, assisted: row.oppAssisted }),
  }]));
}

export type TeamStatsSummary = {
  phaseCode: string;
  gamesPlayed: number;
  own: TeamSums;
  opponent: TeamSums;
};

const teamStatsColumns = {
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
};

// Every club's season totals for a phase, so one request can rank a club against the league. Clubs with no games in the
// phase are left out.
export type LeagueTeamStats = {
  phaseCode: string;
  teams: Array<{ clubCode: string; gamesPlayed: number; own: TeamSums; opponent: TeamSums }>;
};

export async function getLeagueTeamStats(seasonCode: string, phaseCode: string): Promise<LeagueTeamStats> {
  const [rows, splits] = await Promise.all([
    catalogRead(() =>
      db.select({ clubCode: teamSeasonStats.clubCode, ...teamStatsColumns })
        .from(teamSeasonStats)
        .where(and(
          eq(teamSeasonStats.competitionCode, COMPETITION_CODE),
          eq(teamSeasonStats.seasonCode, seasonCode),
          eq(teamSeasonStats.phaseCode, phaseCode),
        )),
    ),
    getSplitSums(seasonCode, phaseCode),
  ]);

  return {
    phaseCode,
    teams: rows
      .filter((row) => row.gamesPlayed > 0)
      .map((row) => ({
        clubCode: row.clubCode,
        gamesPlayed: row.gamesPlayed,
        own: { ...numericMeasures(row.own), ...(splits.get(row.clubCode)?.own ?? EMPTY_SPLITS) },
        opponent: { ...numericMeasures(row.opponent), ...(splits.get(row.clubCode)?.opponent ?? EMPTY_SPLITS) },
      })),
  };
}

export async function getTeamStatsSummary(
  seasonCode: string,
  phaseCode: string,
  clubCode: string,
): Promise<TeamStatsSummary> {
  const [rows, splits] = await Promise.all([
    catalogRead(() =>
      db.select(teamStatsColumns)
        .from(teamSeasonStats)
        .where(and(
          eq(teamSeasonStats.competitionCode, COMPETITION_CODE),
          eq(teamSeasonStats.seasonCode, seasonCode),
          eq(teamSeasonStats.phaseCode, phaseCode),
          eq(teamSeasonStats.clubCode, clubCode),
        ))
        .limit(1),
    ),
    getSplitSums(seasonCode, phaseCode, clubCode),
  ]);

  const row = rows[0];
  if (!row) return { phaseCode, gamesPlayed: 0, own: { ...emptySums(), ...EMPTY_SPLITS }, opponent: { ...emptySums(), ...EMPTY_SPLITS } };
  const split = splits.get(clubCode);
  return {
    phaseCode: row.phaseCode,
    gamesPlayed: row.gamesPlayed,
    own: { ...numericMeasures(row.own), ...(split?.own ?? EMPTY_SPLITS) },
    opponent: { ...numericMeasures(row.opponent), ...(split?.opponent ?? EMPTY_SPLITS) },
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
