import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import {
  seasonStatsAdvanced,
  seasonStatsMisc,
  seasonStatsScoring,
  seasonStatsTraditional,
} from "./season-schema";

const COMPETITION_CODE = "E";

export type Page<T> = { items: T[]; hasMore: boolean; total: number };

export type StatsTraditional = {
  playerRanking: number | null;
  entryOrdinal: number;
  gamesPlayed: string | null;
  gamesStarted: string | null;
  minutesPlayed: string | null;
  pointsScored: string | null;
  twoPointersMade: string | null;
  twoPointersAttempted: string | null;
  twoPointersPercentage: string | null;
  threePointersMade: string | null;
  threePointersAttempted: string | null;
  threePointersPercentage: string | null;
  freeThrowsMade: string | null;
  freeThrowsAttempted: string | null;
  freeThrowsPercentage: string | null;
  offensiveRebounds: string | null;
  defensiveRebounds: string | null;
  totalRebounds: string | null;
  assists: string | null;
  steals: string | null;
  turnovers: string | null;
  blocks: string | null;
  blocksAgainst: string | null;
  foulsCommited: string | null;
  foulsDrawn: string | null;
  pir: string | null;
};

export type StatsAdvanced = {
  playerRanking: number | null;
  entryOrdinal: number;
  gamesPlayed: string | null;
  minutesPlayed: string | null;
  effectiveFieldGoalPercentage: string | null;
  trueShootingPercentage: string | null;
  offensiveReboundsPercentage: string | null;
  defensiveReboundsPercentage: string | null;
  reboundsPercentage: string | null;
  assistsToTurnoversRatio: string | null;
  assistsRatio: string | null;
  turnoversRatio: string | null;
  twoPointAttemptsRatio: string | null;
  threePointAttemptsRatio: string | null;
  freeThrowsRate: string | null;
  possessions: string | null;
};

export type StatsScoring = {
  playerRanking: number | null;
  entryOrdinal: number;
  gamesPlayed: string | null;
  gamesStarted: string | null;
  twoPointAttemptsShare: string | null;
  threePointAttemptsShare: string | null;
  freeThrowsAttemptsShare: string | null;
  twoPointersMadeShare: string | null;
  threePointersMadeShare: string | null;
  freeThrowsMadeShare: string | null;
  twoPointRate: string | null;
  threePointRate: string | null;
  pointsFromTwoPointersPercentage: string | null;
  pointsFromThreePointersPercentage: string | null;
  pointsFromFreeThrowsPercentage: string | null;
};

export type StatsMisc = {
  playerRanking: number | null;
  entryOrdinal: number;
  gamesPlayed: string | null;
  gamesStarted: string | null;
  wins: string | null;
  losses: string | null;
  minutesPlayed: string | null;
  doubleDoubles: string | null;
  tripleDoubles: string | null;
};

export type StatsEntry = {
  personKey: string;
  clubCode: string | null;
  playerName: string | null;
  playerAge: number | null;
  playerImageUrl: string | null;
  isCalculated: boolean | null;
  minGames: number | null;
  qualified: boolean | null;
  clubName: string | null;
  clubTvCodes: string | null;
  clubImageUrl: string | null;
  traditional: StatsTraditional;
  advanced: StatsAdvanced | null;
  scoring: StatsScoring | null;
  misc: StatsMisc | null;
};

const traditionalFields = {
  playerRanking: seasonStatsTraditional.playerRanking,
  entryOrdinal: seasonStatsTraditional.entryOrdinal,
  gamesPlayed: seasonStatsTraditional.gamesPlayed,
  gamesStarted: seasonStatsTraditional.gamesStarted,
  minutesPlayed: seasonStatsTraditional.minutesPlayed,
  pointsScored: seasonStatsTraditional.pointsScored,
  twoPointersMade: seasonStatsTraditional.twoPointersMade,
  twoPointersAttempted: seasonStatsTraditional.twoPointersAttempted,
  twoPointersPercentage: seasonStatsTraditional.twoPointersPercentage,
  threePointersMade: seasonStatsTraditional.threePointersMade,
  threePointersAttempted: seasonStatsTraditional.threePointersAttempted,
  threePointersPercentage: seasonStatsTraditional.threePointersPercentage,
  freeThrowsMade: seasonStatsTraditional.freeThrowsMade,
  freeThrowsAttempted: seasonStatsTraditional.freeThrowsAttempted,
  freeThrowsPercentage: seasonStatsTraditional.freeThrowsPercentage,
  offensiveRebounds: seasonStatsTraditional.offensiveRebounds,
  defensiveRebounds: seasonStatsTraditional.defensiveRebounds,
  totalRebounds: seasonStatsTraditional.totalRebounds,
  assists: seasonStatsTraditional.assists,
  steals: seasonStatsTraditional.steals,
  turnovers: seasonStatsTraditional.turnovers,
  blocks: seasonStatsTraditional.blocks,
  blocksAgainst: seasonStatsTraditional.blocksAgainst,
  foulsCommited: seasonStatsTraditional.foulsCommited,
  foulsDrawn: seasonStatsTraditional.foulsDrawn,
  pir: seasonStatsTraditional.pir,
};

// In a left-joined group the first field must never be null: Drizzle drops the whole group when it is, and
// playerRanking is null on the rows the pipeline calculated. entryOrdinal is part of the primary key, so it never is.
const advancedFields = {
  entryOrdinal: seasonStatsAdvanced.entryOrdinal,
  playerRanking: seasonStatsAdvanced.playerRanking,
  gamesPlayed: seasonStatsAdvanced.gamesPlayed,
  minutesPlayed: seasonStatsAdvanced.minutesPlayed,
  effectiveFieldGoalPercentage: seasonStatsAdvanced.effectiveFieldGoalPercentage,
  trueShootingPercentage: seasonStatsAdvanced.trueShootingPercentage,
  offensiveReboundsPercentage: seasonStatsAdvanced.offensiveReboundsPercentage,
  defensiveReboundsPercentage: seasonStatsAdvanced.defensiveReboundsPercentage,
  reboundsPercentage: seasonStatsAdvanced.reboundsPercentage,
  assistsToTurnoversRatio: seasonStatsAdvanced.assistsToTurnoversRatio,
  assistsRatio: seasonStatsAdvanced.assistsRatio,
  turnoversRatio: seasonStatsAdvanced.turnoversRatio,
  twoPointAttemptsRatio: seasonStatsAdvanced.twoPointAttemptsRatio,
  threePointAttemptsRatio: seasonStatsAdvanced.threePointAttemptsRatio,
  freeThrowsRate: seasonStatsAdvanced.freeThrowsRate,
  possessions: seasonStatsAdvanced.possessions,
};

const scoringFields = {
  entryOrdinal: seasonStatsScoring.entryOrdinal,
  playerRanking: seasonStatsScoring.playerRanking,
  gamesPlayed: seasonStatsScoring.gamesPlayed,
  gamesStarted: seasonStatsScoring.gamesStarted,
  twoPointAttemptsShare: seasonStatsScoring.twoPointAttemptsShare,
  threePointAttemptsShare: seasonStatsScoring.threePointAttemptsShare,
  freeThrowsAttemptsShare: seasonStatsScoring.freeThrowsAttemptsShare,
  twoPointersMadeShare: seasonStatsScoring.twoPointersMadeShare,
  threePointersMadeShare: seasonStatsScoring.threePointersMadeShare,
  freeThrowsMadeShare: seasonStatsScoring.freeThrowsMadeShare,
  twoPointRate: seasonStatsScoring.twoPointRate,
  threePointRate: seasonStatsScoring.threePointRate,
  pointsFromTwoPointersPercentage: seasonStatsScoring.pointsFromTwoPointersPercentage,
  pointsFromThreePointersPercentage: seasonStatsScoring.pointsFromThreePointersPercentage,
  pointsFromFreeThrowsPercentage: seasonStatsScoring.pointsFromFreeThrowsPercentage,
};

const miscFields = {
  entryOrdinal: seasonStatsMisc.entryOrdinal,
  playerRanking: seasonStatsMisc.playerRanking,
  gamesPlayed: seasonStatsMisc.gamesPlayed,
  gamesStarted: seasonStatsMisc.gamesStarted,
  wins: seasonStatsMisc.wins,
  losses: seasonStatsMisc.losses,
  minutesPlayed: seasonStatsMisc.minutesPlayed,
  doubleDoubles: seasonStatsMisc.doubleDoubles,
  tripleDoubles: seasonStatsMisc.tripleDoubles,
};

function joinOn(
  joined: { competitionCode: unknown; seasonCode: unknown; phaseCode: unknown; mode: unknown; personKey: unknown },
) {
  return and(
    eq(joined.competitionCode as never, seasonStatsTraditional.competitionCode),
    eq(joined.seasonCode as never, seasonStatsTraditional.seasonCode),
    eq(joined.phaseCode as never, seasonStatsTraditional.phaseCode),
    eq(joined.mode as never, seasonStatsTraditional.mode),
    eq(joined.personKey as never, seasonStatsTraditional.personKey),
  );
}

const SORTABLE_FIELDS = {
  gamesPlayed: seasonStatsTraditional.gamesPlayed,
  minutesPlayed: seasonStatsTraditional.minutesPlayed,
  pointsScored: seasonStatsTraditional.pointsScored,
  totalRebounds: seasonStatsTraditional.totalRebounds,
  assists: seasonStatsTraditional.assists,
  steals: seasonStatsTraditional.steals,
  turnovers: seasonStatsTraditional.turnovers,
  blocks: seasonStatsTraditional.blocks,
  pir: seasonStatsTraditional.pir,
  effectiveFieldGoalPercentage: seasonStatsAdvanced.effectiveFieldGoalPercentage,
  trueShootingPercentage: seasonStatsAdvanced.trueShootingPercentage,
  reboundsPercentage: seasonStatsAdvanced.reboundsPercentage,
  assistsToTurnoversRatio: seasonStatsAdvanced.assistsToTurnoversRatio,
  possessions: seasonStatsAdvanced.possessions,
  twoPointRate: seasonStatsScoring.twoPointRate,
  threePointRate: seasonStatsScoring.threePointRate,
  pointsFromTwoPointersPercentage: seasonStatsScoring.pointsFromTwoPointersPercentage,
  pointsFromThreePointersPercentage: seasonStatsScoring.pointsFromThreePointersPercentage,
  pointsFromFreeThrowsPercentage: seasonStatsScoring.pointsFromFreeThrowsPercentage,
  wins: seasonStatsMisc.wins,
  losses: seasonStatsMisc.losses,
  doubleDoubles: seasonStatsMisc.doubleDoubles,
  tripleDoubles: seasonStatsMisc.tripleDoubles,
} as const;

export const SORTABLE_STATS_FIELDS = Object.keys(SORTABLE_FIELDS);
export type SortableStatsField = keyof typeof SORTABLE_FIELDS;

// Which players a leaderboard keeps. `qualified` keeps the players who meet the season and phase minimum of games;
// `minGames` keeps players with at least that many games instead (it wins when both are given).
export type StatsFilters = { qualified?: boolean; minGames?: number };

export async function getSeasonStats(
  seasonCode: string,
  phaseCode: string,
  mode: string,
  limit: number,
  offset: number,
  personKey?: string,
  sort?: SortableStatsField,
  order: "asc" | "desc" = "asc",
  filters: StatsFilters = {},
): Promise<Page<StatsEntry>> {
  const conditions = [
    eq(seasonStatsTraditional.competitionCode, COMPETITION_CODE),
    eq(seasonStatsTraditional.seasonCode, seasonCode),
    eq(seasonStatsTraditional.phaseCode, phaseCode),
    eq(seasonStatsTraditional.mode, mode),
  ];
  if (personKey !== undefined) conditions.push(eq(seasonStatsTraditional.personKey, personKey));
  if (filters.minGames !== undefined) {
    conditions.push(sql`${seasonStatsTraditional.gamesPlayed} >= ${filters.minGames}`);
  } else if (filters.qualified) {
    conditions.push(eq(seasonStatsTraditional.qualified, true));
  }

  const sortColumn = sort !== undefined ? SORTABLE_FIELDS[sort] : undefined;
  const orderBy = sortColumn
    ? [
        order === "desc" ? sql`${sortColumn} DESC NULLS LAST` : asc(sortColumn),
        asc(seasonStatsTraditional.entryOrdinal),
      ]
    : [asc(seasonStatsTraditional.entryOrdinal), asc(seasonStatsTraditional.personKey)];

  const [rows, countRows] = await Promise.all([
    catalogRead(() =>
      db.select({
        personKey: seasonStatsTraditional.personKey,
        clubCode: seasonStatsTraditional.clubCode,
        playerName: seasonStatsTraditional.playerName,
        playerAge: seasonStatsTraditional.playerAge,
        playerImageUrl: seasonStatsTraditional.playerImageUrl,
        isCalculated: seasonStatsTraditional.isCalculated,
        minGames: seasonStatsTraditional.minGames,
        qualified: seasonStatsTraditional.qualified,
        clubName: seasonStatsTraditional.clubName,
        clubTvCodes: seasonStatsTraditional.clubTvCodes,
        clubImageUrl: seasonStatsTraditional.clubImageUrl,
        traditional: traditionalFields,
        advanced: advancedFields,
        scoring: scoringFields,
        misc: miscFields,
      })
        .from(seasonStatsTraditional)
        .leftJoin(seasonStatsAdvanced, joinOn(seasonStatsAdvanced))
        .leftJoin(seasonStatsScoring, joinOn(seasonStatsScoring))
        .leftJoin(seasonStatsMisc, joinOn(seasonStatsMisc))
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit + 1)
        .offset(offset),
    ),
    catalogRead(() =>
      db.select({ count: sql<number>`count(*)::int` })
        .from(seasonStatsTraditional)
        .where(and(...conditions)),
    ),
  ]);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit, total: countRows[0]?.count ?? 0 };
}
