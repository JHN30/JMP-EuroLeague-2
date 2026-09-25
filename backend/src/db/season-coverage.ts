import { and, countDistinct, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import {
  clubs,
  gamePeriodScores,
  gamePlayerStats,
  gameTeamStats,
  games,
  registrations,
  seasonStatsTraditional,
  standings as standingsTable,
} from "./season-schema";

const COMPETITION_CODE = "E";

export type CoverageStatus = "available" | "partial" | "incomplete" | "unavailable" | "notYetApplicable";

export type CoverageItem = {
  key: string;
  label: string;
  status: CoverageStatus;
  availableCount: number;
  applicableCount: number;
};

function gameStatus(availableCount: number, applicableCount: number): CoverageStatus {
  if (applicableCount === 0) return "notYetApplicable";
  if (availableCount === 0) return "unavailable";
  return availableCount >= applicableCount ? "available" : "partial";
}

function rosterStatus(availableCount: number, applicableCount: number): CoverageStatus {
  if (applicableCount === 0) return "notYetApplicable";
  if (availableCount === 0) return "unavailable";
  return availableCount >= applicableCount ? "available" : "incomplete";
}

function countValue(value: number | null | undefined): number {
  return Number(value ?? 0);
}

export async function getCoverage(seasonCode: string, gameCode?: number) {
  const gameScope = gameCode === undefined ? undefined : eq(games.gameCode, gameCode);
  const baseGameScope = [eq(games.competitionCode, COMPETITION_CODE), eq(games.seasonCode, seasonCode)];
  if (gameScope) baseGameScope.push(gameScope);
  const completedScope = and(...baseGameScope, eq(games.played, true));

  const [completedRows, boxRows, periodRows, clubRows, rosterRows, standingsRows, statsRows, photoRows] = await Promise.all([
    catalogRead(() => db.select({ count: sql<number>`count(*)::int` }).from(games).where(completedScope)),
    catalogRead(() => db.select({ count: countDistinct(gameTeamStats.gameCode) }).from(gameTeamStats)
      .innerJoin(games, and(eq(games.competitionCode, gameTeamStats.competitionCode), eq(games.seasonCode, gameTeamStats.seasonCode), eq(games.gameCode, gameTeamStats.gameCode)))
      .where(and(completedScope, eq(gameTeamStats.statsKind, "total")))),
    catalogRead(() => db.select({ count: countDistinct(gamePeriodScores.gameCode) }).from(gamePeriodScores)
      .innerJoin(games, and(eq(games.competitionCode, gamePeriodScores.competitionCode), eq(games.seasonCode, gamePeriodScores.seasonCode), eq(games.gameCode, gamePeriodScores.gameCode)))
      .where(completedScope)),
    catalogRead(() => db.select({ count: sql<number>`count(*)::int` }).from(clubs)
      .where(and(eq(clubs.competitionCode, COMPETITION_CODE), eq(clubs.seasonCode, seasonCode)))),
    catalogRead(() => db.select({ count: countDistinct(registrations.clubCode) }).from(registrations)
      .where(and(eq(registrations.competitionCode, COMPETITION_CODE), eq(registrations.seasonCode, seasonCode), isNotNull(registrations.clubCode)))),
    catalogRead(() => db.select({ count: countDistinct(standingsTable.clubCode) }).from(standingsTable)
      .where(and(eq(standingsTable.competitionCode, COMPETITION_CODE), eq(standingsTable.seasonCode, seasonCode)))),
    catalogRead(() => db.select({ count: countDistinct(seasonStatsTraditional.personKey) }).from(seasonStatsTraditional)
      .where(and(eq(seasonStatsTraditional.competitionCode, COMPETITION_CODE), eq(seasonStatsTraditional.seasonCode, seasonCode)))),
    catalogRead(() => db.select({ count: countDistinct(gamePlayerStats.personKey) }).from(gamePlayerStats)
      .innerJoin(games, and(eq(games.competitionCode, gamePlayerStats.competitionCode), eq(games.seasonCode, gamePlayerStats.seasonCode), eq(games.gameCode, gamePlayerStats.gameCode)))
      .where(and(completedScope, isNotNull(gamePlayerStats.headshotUrl)))),
  ]);

  const completed = countValue(completedRows[0]?.count);
  const boxScores = countValue(boxRows[0]?.count);
  const periodScores = countValue(periodRows[0]?.count);
  const clubsCount = countValue(clubRows[0]?.count);
  const rosters = countValue(rosterRows[0]?.count);
  const standings = countValue(standingsRows[0]?.count);
  const stats = countValue(statsRows[0]?.count);
  const photos = countValue(photoRows[0]?.count);

  return {
    scope: { seasonCode, gameCode: gameCode ?? null },
    items: [
      { key: "boxScores", label: "Box scores", status: gameStatus(boxScores, completed), availableCount: boxScores, applicableCount: completed },
      { key: "periodScores", label: "Period scores", status: gameStatus(periodScores, completed), availableCount: periodScores, applicableCount: completed },
      { key: "officialStandings", label: "Official standings", status: rosterStatus(standings, clubsCount), availableCount: standings, applicableCount: clubsCount },
      { key: "rosters", label: "Rosters", status: rosterStatus(rosters, clubsCount), availableCount: rosters, applicableCount: clubsCount },
      { key: "playerPhotos", label: "Player photos", status: gameStatus(photos, completed), availableCount: photos, applicableCount: completed },
      { key: "seasonStatistics", label: "Season statistics", status: rosterStatus(stats, clubsCount), availableCount: stats, applicableCount: clubsCount },
      { key: "shotLocations", label: "Shot locations", status: "unavailable" as const, availableCount: 0, applicableCount: completed },
      { key: "playByPlay", label: "Play-by-play", status: "unavailable" as const, availableCount: 0, applicableCount: completed },
    ] satisfies CoverageItem[],
  };
}
