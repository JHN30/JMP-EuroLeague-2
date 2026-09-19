import { and, asc, eq, max } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import {
  standingsAheadBehind,
  standingsBasic,
  standingsCalendar,
  standingsCalendarStreaks,
  standingsForm,
  standingsMargins,
  standingsStreaks,
  clubs,
} from "./season-schema";

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
  position: standingsBasic.position,
  positionChange: standingsBasic.positionChange,
  gamesPlayed: standingsBasic.gamesPlayed,
  gamesWon: standingsBasic.gamesWon,
  gamesLost: standingsBasic.gamesLost,
  qualified: standingsBasic.qualified,
  winPercentage: standingsBasic.winPercentage,
  pointsDifference: standingsBasic.pointsDifference,
  pointsFor: standingsBasic.pointsFor,
  pointsAgainst: standingsBasic.pointsAgainst,
  homeRecord: standingsBasic.homeRecord,
  awayRecord: standingsBasic.awayRecord,
  neutralRecord: standingsBasic.neutralRecord,
  overtimeRecord: standingsBasic.overtimeRecord,
  lastTenRecord: standingsBasic.lastTenRecord,
};

const calendarFields = {
  position: standingsCalendar.position,
  positionChange: standingsCalendar.positionChange,
  gamesPlayed: standingsCalendar.gamesPlayed,
  gamesWon: standingsCalendar.gamesWon,
  gamesLost: standingsCalendar.gamesLost,
  qualified: standingsCalendar.qualified,
};

const streaksFields = {
  position: standingsStreaks.position,
  positionChange: standingsStreaks.positionChange,
  gamesPlayed: standingsStreaks.gamesPlayed,
  gamesWon: standingsStreaks.gamesWon,
  gamesLost: standingsStreaks.gamesLost,
  qualified: standingsStreaks.qualified,
  homeRecord: standingsStreaks.homeRecord,
  awayRecord: standingsStreaks.awayRecord,
  last10: standingsStreaks.last10,
  homeLast5: standingsStreaks.homeLast5,
  awayLast5: standingsStreaks.awayLast5,
  longestWinStreakCurrentSeason: standingsStreaks.longestWinStreakCurrentSeason,
  longestLoseStreakCurrentSeason: standingsStreaks.longestLoseStreakCurrentSeason,
  longestWinStreakAnySeason: standingsStreaks.longestWinStreakAnySeason,
  longestLoseStreakAnySeason: standingsStreaks.longestLoseStreakAnySeason,
};

const aheadBehindFields = {
  position: standingsAheadBehind.position,
  positionChange: standingsAheadBehind.positionChange,
  gamesPlayed: standingsAheadBehind.gamesPlayed,
  gamesWon: standingsAheadBehind.gamesWon,
  gamesLost: standingsAheadBehind.gamesLost,
  qualified: standingsAheadBehind.qualified,
  winsPercentage: standingsAheadBehind.winsPercentage,
  quarter1Ahead: standingsAheadBehind.quarter1Ahead,
  quarter1Behind: standingsAheadBehind.quarter1Behind,
  quarter1Tied: standingsAheadBehind.quarter1Tied,
  half1Ahead: standingsAheadBehind.half1Ahead,
  half1Behind: standingsAheadBehind.half1Behind,
  half1Tied: standingsAheadBehind.half1Tied,
  quarter3Ahead: standingsAheadBehind.quarter3Ahead,
  quarter3Behind: standingsAheadBehind.quarter3Behind,
  quarter3Tied: standingsAheadBehind.quarter3Tied,
};

const marginsFields = {
  position: standingsMargins.position,
  positionChange: standingsMargins.positionChange,
  gamesPlayed: standingsMargins.gamesPlayed,
  gamesWon: standingsMargins.gamesWon,
  gamesLost: standingsMargins.gamesLost,
  qualified: standingsMargins.qualified,
  pointDifference1To5: standingsMargins.pointDifference1To5,
  pointDifference6To10: standingsMargins.pointDifference6To10,
  pointDifference11To15: standingsMargins.pointDifference11To15,
  pointDifferenceMoreThan15: standingsMargins.pointDifferenceMoreThan15,
  rebounds: standingsMargins.rebounds,
  assists: standingsMargins.assists,
  blocks: standingsMargins.blocks,
  threePointers: standingsMargins.threePointers,
  twoPointers: standingsMargins.twoPointers,
  freeThrows: standingsMargins.freeThrows,
};

function standingScope(seasonCode: string, phaseCode: string, round: number) {
  return and(
    eq(standingsBasic.competitionCode, COMPETITION_CODE),
    eq(standingsBasic.seasonCode, seasonCode),
    eq(standingsBasic.phaseCode, phaseCode),
    eq(standingsBasic.roundNumber, round),
  );
}

function joinOn(
  joined: { competitionCode: unknown; seasonCode: unknown; phaseCode: unknown; roundNumber: unknown; clubCode: unknown },
) {
  return and(
    eq(joined.competitionCode as never, standingsBasic.competitionCode),
    eq(joined.seasonCode as never, standingsBasic.seasonCode),
    eq(joined.phaseCode as never, standingsBasic.phaseCode),
    eq(joined.roundNumber as never, standingsBasic.roundNumber),
    eq(joined.clubCode as never, standingsBasic.clubCode),
  );
}

export async function getLatestStandingsRound(seasonCode: string, phaseCode: string): Promise<number | null> {
  const rows = await catalogRead(() =>
    db.select({ round: max(standingsBasic.roundNumber) })
      .from(standingsBasic)
      .where(and(
        eq(standingsBasic.competitionCode, COMPETITION_CODE),
        eq(standingsBasic.seasonCode, seasonCode),
        eq(standingsBasic.phaseCode, phaseCode),
      )),
  );
  return rows[0]?.round ?? null;
}

export async function getStandings(
  seasonCode: string,
  phaseCode: string,
  round: number,
): Promise<StandingEntry[]> {
  const [rows, streakHistoryRows, formRows] = await Promise.all([
    catalogRead(() =>
      db.select({
        clubCode: standingsBasic.clubCode,
        clubName: standingsBasic.clubName,
        clubTvCode: standingsBasic.clubTvCode,
        crestUrl: clubs.crestUrl,
        groupName: standingsBasic.groupName,
        basic: basicFields,
        calendar: calendarFields,
        streaks: streaksFields,
        aheadBehind: aheadBehindFields,
        margins: marginsFields,
      })
        .from(standingsBasic)
        .leftJoin(clubs, and(
          eq(clubs.competitionCode, standingsBasic.competitionCode),
          eq(clubs.seasonCode, standingsBasic.seasonCode),
          eq(clubs.clubCode, standingsBasic.clubCode),
        ))
        .leftJoin(standingsCalendar, joinOn(standingsCalendar))
        .leftJoin(standingsStreaks, joinOn(standingsStreaks))
        .leftJoin(standingsAheadBehind, joinOn(standingsAheadBehind))
        .leftJoin(standingsMargins, joinOn(standingsMargins))
        .where(standingScope(seasonCode, phaseCode, round))
        .orderBy(asc(standingsBasic.groupName), asc(standingsBasic.position), asc(standingsBasic.clubCode)),
    ),
    catalogRead(() =>
      db.select({
        clubCode: standingsCalendarStreaks.clubCode,
        streakOrdinal: standingsCalendarStreaks.streakOrdinal,
        startAt: standingsCalendarStreaks.startAt,
        endAt: standingsCalendarStreaks.endAt,
        winLossRecord: standingsCalendarStreaks.winLossRecord,
      })
        .from(standingsCalendarStreaks)
        .where(and(
          eq(standingsCalendarStreaks.competitionCode, COMPETITION_CODE),
          eq(standingsCalendarStreaks.seasonCode, seasonCode),
          eq(standingsCalendarStreaks.phaseCode, phaseCode),
          eq(standingsCalendarStreaks.roundNumber, round),
        ))
        .orderBy(asc(standingsCalendarStreaks.clubCode), asc(standingsCalendarStreaks.streakOrdinal)),
    ),
    catalogRead(() =>
      db.select({
        clubCode: standingsForm.clubCode,
        resultOrdinal: standingsForm.resultOrdinal,
        result: standingsForm.result,
      })
        .from(standingsForm)
        .where(and(
          eq(standingsForm.competitionCode, COMPETITION_CODE),
          eq(standingsForm.seasonCode, seasonCode),
          eq(standingsForm.phaseCode, phaseCode),
          eq(standingsForm.roundNumber, round),
        ))
        .orderBy(asc(standingsForm.clubCode), asc(standingsForm.resultOrdinal)),
    ),
  ]);

  const streakHistoryByClub = new Map<string, StandingStreakHistoryEntry[]>();
  for (const row of streakHistoryRows) {
    const list = streakHistoryByClub.get(row.clubCode) ?? [];
    list.push({
      streakOrdinal: row.streakOrdinal,
      startAt: row.startAt?.toISOString() ?? null,
      endAt: row.endAt?.toISOString() ?? null,
      winLossRecord: row.winLossRecord,
    });
    streakHistoryByClub.set(row.clubCode, list);
  }

  const formByClub = new Map<string, StandingFormEntry[]>();
  for (const row of formRows) {
    const list = formByClub.get(row.clubCode) ?? [];
    list.push({ resultOrdinal: row.resultOrdinal, result: row.result });
    formByClub.set(row.clubCode, list);
  }

  return rows.map((row) => ({
    clubCode: row.clubCode,
    clubName: row.clubName,
    clubTvCode: row.clubTvCode,
    crestUrl: row.crestUrl,
    groupName: row.groupName,
    basic: row.basic,
    calendar: row.calendar,
    streaks: row.streaks,
    aheadBehind: row.aheadBehind,
    margins: row.margins,
    streakHistory: streakHistoryByClub.get(row.clubCode) ?? [],
    form: formByClub.get(row.clubCode) ?? [],
  }));
}
