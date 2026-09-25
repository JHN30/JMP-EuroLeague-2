import { and, asc, eq, max } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { standings } from "./season-schema";

const COMPETITION_CODE = "E";

export type StandingBasic = {
  position: number | null;
  positionChange: string | null;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  qualified: boolean | null;
  winPercentage: string | null;
  pointsDifference: number | null;
  pointsFor: number | null;
  pointsAgainst: number | null;
  homeRecord: string | null;
  awayRecord: string | null;
  neutralRecord: string | null;
  overtimeRecord: string | null;
  lastTenRecord: string | null;
};

export type StandingCalendar = {
  position: number | null;
  positionChange: string | null;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  qualified: boolean | null;
};

export type StandingStreaks = {
  position: number | null;
  positionChange: string | null;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  qualified: boolean | null;
  homeRecord: string | null;
  awayRecord: string | null;
  last10: string | null;
  homeLast5: string | null;
  awayLast5: string | null;
  longestWinStreakCurrentSeason: number | null;
  longestLoseStreakCurrentSeason: number | null;
  longestWinStreakAnySeason: number | null;
  longestLoseStreakAnySeason: number | null;
};

export type StandingAheadBehind = {
  position: number | null;
  positionChange: string | null;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  qualified: boolean | null;
  winsPercentage: string | null;
  quarter1Ahead: string | null;
  quarter1Behind: string | null;
  quarter1Tied: string | null;
  half1Ahead: string | null;
  half1Behind: string | null;
  half1Tied: string | null;
  quarter3Ahead: string | null;
  quarter3Behind: string | null;
  quarter3Tied: string | null;
};

export type StandingMargins = {
  position: number | null;
  positionChange: string | null;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  qualified: boolean | null;
  pointDifference1To5: string | null;
  pointDifference6To10: string | null;
  pointDifference11To15: string | null;
  pointDifferenceMoreThan15: string | null;
  rebounds: string | null;
  assists: string | null;
  blocks: string | null;
  threePointers: string | null;
  twoPointers: string | null;
  freeThrows: string | null;
};

export type StandingStreakHistoryEntry = {
  streakOrdinal: number;
  startAt: string | null;
  endAt: string | null;
  winLossRecord: string | null;
};

export type StandingFormEntry = {
  resultOrdinal: number;
  result: string | null;
};

export type StandingEntry = {
  clubCode: string;
  clubName: string | null;
  clubTvCode: string | null;
  crestUrl: string | null;
  groupName: string | null;
  basic: StandingBasic | null;
  calendar: StandingCalendar | null;
  streaks: StandingStreaks | null;
  aheadBehind: StandingAheadBehind | null;
  margins: StandingMargins | null;
  streakHistory: StandingStreakHistoryEntry[];
  form: StandingFormEntry[];
};

const basicFields = {
  position: standings.basicPosition,
  positionChange: standings.basicPositionChange,
  gamesPlayed: standings.basicGamesPlayed,
  gamesWon: standings.basicGamesWon,
  gamesLost: standings.basicGamesLost,
  qualified: standings.basicQualified,
  winPercentage: standings.basicWinPercentage,
  pointsDifference: standings.basicPointsDifference,
  pointsFor: standings.basicPointsFor,
  pointsAgainst: standings.basicPointsAgainst,
  homeRecord: standings.basicHomeRecord,
  awayRecord: standings.basicAwayRecord,
  neutralRecord: standings.basicNeutralRecord,
  overtimeRecord: standings.basicOvertimeRecord,
  lastTenRecord: standings.basicLastTenRecord,
};

const calendarFields = {
  position: standings.calendarPosition,
  positionChange: standings.calendarPositionChange,
  gamesPlayed: standings.calendarGamesPlayed,
  gamesWon: standings.calendarGamesWon,
  gamesLost: standings.calendarGamesLost,
  qualified: standings.calendarQualified,
};

const streaksFields = {
  position: standings.streaksPosition,
  positionChange: standings.streaksPositionChange,
  gamesPlayed: standings.streaksGamesPlayed,
  gamesWon: standings.streaksGamesWon,
  gamesLost: standings.streaksGamesLost,
  qualified: standings.streaksQualified,
  homeRecord: standings.streaksHomeRecord,
  awayRecord: standings.streaksAwayRecord,
  last10: standings.streaksLast10,
  homeLast5: standings.streaksHomeLast5,
  awayLast5: standings.streaksAwayLast5,
  longestWinStreakCurrentSeason: standings.streaksLongestWinStreakCurrentSeason,
  longestLoseStreakCurrentSeason: standings.streaksLongestLoseStreakCurrentSeason,
  longestWinStreakAnySeason: standings.streaksLongestWinStreakAnySeason,
  longestLoseStreakAnySeason: standings.streaksLongestLoseStreakAnySeason,
};

const aheadBehindFields = {
  position: standings.aheadBehindPosition,
  positionChange: standings.aheadBehindPositionChange,
  gamesPlayed: standings.aheadBehindGamesPlayed,
  gamesWon: standings.aheadBehindGamesWon,
  gamesLost: standings.aheadBehindGamesLost,
  qualified: standings.aheadBehindQualified,
  winsPercentage: standings.aheadBehindWinsPercentage,
  quarter1Ahead: standings.aheadBehindQuarter1Ahead,
  quarter1Behind: standings.aheadBehindQuarter1Behind,
  quarter1Tied: standings.aheadBehindQuarter1Tied,
  half1Ahead: standings.aheadBehindHalf1Ahead,
  half1Behind: standings.aheadBehindHalf1Behind,
  half1Tied: standings.aheadBehindHalf1Tied,
  quarter3Ahead: standings.aheadBehindQuarter3Ahead,
  quarter3Behind: standings.aheadBehindQuarter3Behind,
  quarter3Tied: standings.aheadBehindQuarter3Tied,
};

const marginsFields = {
  position: standings.marginsPosition,
  positionChange: standings.marginsPositionChange,
  gamesPlayed: standings.marginsGamesPlayed,
  gamesWon: standings.marginsGamesWon,
  gamesLost: standings.marginsGamesLost,
  qualified: standings.marginsQualified,
  pointDifference1To5: standings.marginsPointDifference1To5,
  pointDifference6To10: standings.marginsPointDifference6To10,
  pointDifference11To15: standings.marginsPointDifference11To15,
  pointDifferenceMoreThan15: standings.marginsPointDifferenceMoreThan15,
  rebounds: standings.marginsRebounds,
  assists: standings.marginsAssists,
  blocks: standings.marginsBlocks,
  threePointers: standings.marginsThreePointers,
  twoPointers: standings.marginsTwoPointers,
  freeThrows: standings.marginsFreeThrows,
};

// app_standings is one wide row per club, so a view the source lacks comes back as all-null columns.
function presentOrNull<T extends object>(view: T): T | null {
  return Object.values(view).every((value) => value === null) ? null : view;
}

export async function getLatestStandingsRound(seasonCode: string, phaseCode: string): Promise<number | null> {
  const rows = await catalogRead(() =>
    db.select({ round: max(standings.roundNumber) })
      .from(standings)
      .where(and(
        eq(standings.competitionCode, COMPETITION_CODE),
        eq(standings.seasonCode, seasonCode),
        eq(standings.phaseCode, phaseCode),
      )),
  );
  return rows[0]?.round ?? null;
}

export async function getStandings(
  seasonCode: string,
  phaseCode: string,
  round: number,
): Promise<StandingEntry[]> {
  const rows = await catalogRead(() =>
    db.select({
      clubCode: standings.clubCode,
      clubName: standings.clubName,
      clubTvCode: standings.clubTvCode,
      crestUrl: standings.crestUrl,
      groupName: standings.groupName,
      basic: basicFields,
      calendar: calendarFields,
      streaks: streaksFields,
      aheadBehind: aheadBehindFields,
      margins: marginsFields,
      streakHistory: standings.streakHistory,
      form: standings.form,
    })
      .from(standings)
      .where(and(
        eq(standings.competitionCode, COMPETITION_CODE),
        eq(standings.seasonCode, seasonCode),
        eq(standings.phaseCode, phaseCode),
        eq(standings.roundNumber, round),
      ))
      .orderBy(asc(standings.groupName), asc(standings.basicPosition), asc(standings.clubCode)),
  );

  return rows.map((row) => ({
    clubCode: row.clubCode,
    clubName: row.clubName,
    clubTvCode: row.clubTvCode,
    crestUrl: row.crestUrl,
    groupName: row.groupName,
    basic: presentOrNull(row.basic),
    calendar: presentOrNull(row.calendar),
    streaks: presentOrNull(row.streaks),
    aheadBehind: presentOrNull(row.aheadBehind),
    margins: presentOrNull(row.margins),
    streakHistory: [...(row.streakHistory ?? [])].sort((a, b) => a.streakOrdinal - b.streakOrdinal),
    form: [...(row.form ?? [])].sort((a, b) => a.resultOrdinal - b.resultOrdinal),
  }));
}
