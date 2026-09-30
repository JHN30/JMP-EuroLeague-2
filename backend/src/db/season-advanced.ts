import { and, asc, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import {
  lineupRatings,
  playerOnOff,
  playerRapm,
  playerRoundRatings,
  playerRoundStats,
  playerRoundWinShares,
  standingsStats,
  teamPbpStats,
  teamRoundRatings,
  teamRoundSplits,
  teamRoundStats,
  teamShotZoneStats,
} from "./season-advanced-schema";

// Read-only access to the advanced tables. They exist for E2025 and E2026 only; callers pass a supported season.
// Round tables are cumulative (a row is the state after round_number), so nothing here sums across rounds or scopes.
const COMPETITION_CODE = "E";
const RAPM_SCOPE = "all";

export type StandingsStatsRow = typeof standingsStats.$inferSelect;
export type TeamRoundStatsRow = typeof teamRoundStats.$inferSelect;
export type TeamRoundRatingsRow = typeof teamRoundRatings.$inferSelect;
export type TeamRoundSplitsRow = typeof teamRoundSplits.$inferSelect;
export type PlayerRoundStatsRow = typeof playerRoundStats.$inferSelect;
export type PlayerRoundRatingsRow = typeof playerRoundRatings.$inferSelect;
export type PlayerRoundWinSharesRow = typeof playerRoundWinShares.$inferSelect;
export type TeamPbpStatsRow = typeof teamPbpStats.$inferSelect;
export type TeamShotZoneStatsRow = typeof teamShotZoneStats.$inferSelect;
export type PlayerOnOffRow = typeof playerOnOff.$inferSelect;
export type LineupRatingsRow = typeof lineupRatings.$inferSelect;
export type PlayerRapmRow = typeof playerRapm.$inferSelect;

type ScopedTable = { competitionCode: AnyPgColumn; seasonCode: AnyPgColumn; scope: AnyPgColumn };

function inScope(table: ScopedTable, seasonCode: string, scope: string): SQL[] {
  return [
    eq(table.competitionCode, COMPETITION_CODE),
    eq(table.seasonCode, seasonCode),
    eq(table.scope, scope),
  ];
}

const nullsLast = (column: AnyPgColumn) => sql`${column} DESC NULLS LAST`;

// Scopes and rounds come from the stats table itself: app_rounds lists rounds that have not been played
// and has no "all" or "PS" scope. The current table of a scope is its highest round.
export async function getStatsScopes(seasonCode: string): Promise<string[]> {
  const rows = await catalogRead(() =>
    db.selectDistinct({ scope: standingsStats.scope })
      .from(standingsStats)
      .where(and(eq(standingsStats.competitionCode, COMPETITION_CODE), eq(standingsStats.seasonCode, seasonCode))),
  );
  return rows.map((row) => row.scope);
}

export async function getTeamStatsScopes(seasonCode: string, clubCode: string): Promise<string[]> {
  const rows = await catalogRead(() =>
    db.selectDistinct({ scope: teamRoundStats.scope })
      .from(teamRoundStats)
      .where(and(
        eq(teamRoundStats.competitionCode, COMPETITION_CODE),
        eq(teamRoundStats.seasonCode, seasonCode),
        eq(teamRoundStats.clubCode, clubCode),
      )),
  );
  return rows.map((row) => row.scope);
}

export async function getPlayerStatsScopes(seasonCode: string, personKey: string): Promise<string[]> {
  const rows = await catalogRead(() =>
    db.selectDistinct({ scope: playerRoundStats.scope })
      .from(playerRoundStats)
      .where(and(
        eq(playerRoundStats.competitionCode, COMPETITION_CODE),
        eq(playerRoundStats.seasonCode, seasonCode),
        eq(playerRoundStats.personKey, personKey),
      )),
  );
  return rows.map((row) => row.scope);
}

export async function getStatsRounds(seasonCode: string, scope: string): Promise<number[]> {
  const rows = await catalogRead(() =>
    db.selectDistinct({ round: standingsStats.roundNumber })
      .from(standingsStats)
      .where(and(...inScope(standingsStats, seasonCode, scope)))
      .orderBy(asc(standingsStats.roundNumber)),
  );
  return rows.map((row) => row.round);
}

export async function getStandingsStats(seasonCode: string, scope: string, round: number): Promise<StandingsStatsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(standingsStats)
      .where(and(...inScope(standingsStats, seasonCode, scope), eq(standingsStats.roundNumber, round)))
      .orderBy(nullsLast(standingsStats.netRating), asc(standingsStats.clubCode)),
  );
}

// The team and player round readers return one entity across every round of a scope, oldest first, for trends.
export async function getTeamRoundStats(seasonCode: string, scope: string, clubCode: string): Promise<TeamRoundStatsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(teamRoundStats)
      .where(and(...inScope(teamRoundStats, seasonCode, scope), eq(teamRoundStats.clubCode, clubCode)))
      .orderBy(asc(teamRoundStats.roundNumber)),
  );
}

export async function getTeamRoundRatings(seasonCode: string, scope: string, clubCode: string): Promise<TeamRoundRatingsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(teamRoundRatings)
      .where(and(...inScope(teamRoundRatings, seasonCode, scope), eq(teamRoundRatings.clubCode, clubCode)))
      .orderBy(asc(teamRoundRatings.roundNumber)),
  );
}

export async function getTeamRoundSplits(seasonCode: string, scope: string, clubCode: string): Promise<TeamRoundSplitsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(teamRoundSplits)
      .where(and(...inScope(teamRoundSplits, seasonCode, scope), eq(teamRoundSplits.clubCode, clubCode)))
      .orderBy(asc(teamRoundSplits.roundNumber)),
  );
}

export async function getPlayerRoundStats(seasonCode: string, scope: string, personKey: string): Promise<PlayerRoundStatsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(playerRoundStats)
      .where(and(...inScope(playerRoundStats, seasonCode, scope), eq(playerRoundStats.personKey, personKey)))
      .orderBy(asc(playerRoundStats.roundNumber)),
  );
}

export async function getPlayerRoundRatings(seasonCode: string, scope: string, personKey: string): Promise<PlayerRoundRatingsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(playerRoundRatings)
      .where(and(...inScope(playerRoundRatings, seasonCode, scope), eq(playerRoundRatings.personKey, personKey)))
      .orderBy(asc(playerRoundRatings.roundNumber)),
  );
}

export async function getPlayerRoundWinShares(seasonCode: string, scope: string, personKey: string): Promise<PlayerRoundWinSharesRow[]> {
  return catalogRead(() =>
    db.select()
      .from(playerRoundWinShares)
      .where(and(...inScope(playerRoundWinShares, seasonCode, scope), eq(playerRoundWinShares.personKey, personKey)))
      .orderBy(asc(playerRoundWinShares.roundNumber)),
  );
}

// Leaderboards read one round only: each player's row there already holds his cumulative totals, so
// rounds are never added together. `minSeconds` drops small samples before ranking and limiting.
export async function getPerLeaders(
  seasonCode: string,
  scope: string,
  round: number,
  minSeconds: number,
  limit: number,
): Promise<PlayerRoundRatingsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(playerRoundRatings)
      .where(and(
        ...inScope(playerRoundRatings, seasonCode, scope),
        eq(playerRoundRatings.roundNumber, round),
        gte(playerRoundRatings.secondsPlayed, minSeconds),
      ))
      .orderBy(nullsLast(playerRoundRatings.per), asc(playerRoundRatings.personKey))
      .limit(limit),
  );
}

export async function getWinShareLeaders(
  seasonCode: string,
  scope: string,
  round: number,
  minSeconds: number,
  limit: number,
): Promise<PlayerRoundWinSharesRow[]> {
  return catalogRead(() =>
    db.select()
      .from(playerRoundWinShares)
      .where(and(
        ...inScope(playerRoundWinShares, seasonCode, scope),
        eq(playerRoundWinShares.roundNumber, round),
        gte(playerRoundWinShares.secondsPlayed, minSeconds),
      ))
      .orderBy(nullsLast(playerRoundWinShares.winSharesPer48), asc(playerRoundWinShares.personKey))
      .limit(limit),
  );
}

// app_player_rapm has no club, so leaderboards borrow each player's club from the round table's latest row.
export async function getPlayerClubs(seasonCode: string, scope: string, round: number, personKeys: string[]): Promise<Map<string, string | null>> {
  if (personKeys.length === 0) return new Map();
  const rows = await catalogRead(() =>
    db.select({ personKey: playerRoundStats.personKey, clubCode: playerRoundStats.clubCode })
      .from(playerRoundStats)
      .where(and(
        ...inScope(playerRoundStats, seasonCode, scope),
        eq(playerRoundStats.roundNumber, round),
        inArray(playerRoundStats.personKey, personKeys),
      )),
  );
  return new Map(rows.map((row) => [row.personKey, row.clubCode]));
}

export async function getTeamPbpStats(seasonCode: string, scope: string, clubCode: string): Promise<TeamPbpStatsRow | null> {
  const rows = await catalogRead(() =>
    db.select()
      .from(teamPbpStats)
      .where(and(...inScope(teamPbpStats, seasonCode, scope), eq(teamPbpStats.clubCode, clubCode)))
      .limit(1),
  );
  return rows[0] ?? null;
}

export type GameFlowRow = Pick<
  TeamPbpStatsRow,
  "clubCode" | "games" | "timeLeadingSeconds" | "timeTrailingSeconds" | "timeTiedSeconds" | "leadChangesPerGame" | "largestLead"
>;

// Time spent leading, tied and trailing for every club in a scope (play-by-play based, so E2025 and E2026 only).
export async function getGameFlow(seasonCode: string, scope: string): Promise<GameFlowRow[]> {
  return catalogRead(() =>
    db.select({
      clubCode: teamPbpStats.clubCode,
      games: teamPbpStats.games,
      timeLeadingSeconds: teamPbpStats.timeLeadingSeconds,
      timeTrailingSeconds: teamPbpStats.timeTrailingSeconds,
      timeTiedSeconds: teamPbpStats.timeTiedSeconds,
      leadChangesPerGame: teamPbpStats.leadChangesPerGame,
      largestLead: teamPbpStats.largestLead,
    })
      .from(teamPbpStats)
      .where(and(...inScope(teamPbpStats, seasonCode, scope)))
      .orderBy(asc(teamPbpStats.clubCode)),
  );
}

export async function getTeamShotZoneStats(seasonCode: string, scope: string, clubCode: string): Promise<TeamShotZoneStatsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(teamShotZoneStats)
      .where(and(...inScope(teamShotZoneStats, seasonCode, scope), eq(teamShotZoneStats.clubCode, clubCode)))
      .orderBy(asc(teamShotZoneStats.zone)),
  );
}

export type PlayerOnOffFilter = {
  clubCode?: string;
  personKey?: string;
  // On-court seconds; rows below it (or with no on-court time) are left out.
  minSeconds?: number;
  limit: number;
};

// A traded player has one row per club, so a personKey filter can return several rows.
export async function getPlayerOnOff(seasonCode: string, scope: string, filter: PlayerOnOffFilter): Promise<PlayerOnOffRow[]> {
  const conditions = inScope(playerOnOff, seasonCode, scope);
  if (filter.clubCode !== undefined) conditions.push(eq(playerOnOff.clubCode, filter.clubCode));
  if (filter.personKey !== undefined) conditions.push(eq(playerOnOff.personKey, filter.personKey));
  if (filter.minSeconds !== undefined) conditions.push(gte(playerOnOff.onSeconds, filter.minSeconds));
  return catalogRead(() =>
    db.select()
      .from(playerOnOff)
      .where(and(...conditions))
      .orderBy(nullsLast(playerOnOff.netRatingDiff), asc(playerOnOff.personKey), asc(playerOnOff.clubCode))
      .limit(filter.limit),
  );
}

export type LineupFilter = {
  clubCode: string;
  lineupSize: 2 | 3 | 5;
  // Lineups are not filtered for sample size in Neon, so a minimum is always applied here.
  minPossessions: number;
  limit: number;
};

export async function getLineupRatings(seasonCode: string, scope: string, filter: LineupFilter): Promise<LineupRatingsRow[]> {
  return catalogRead(() =>
    db.select()
      .from(lineupRatings)
      .where(and(
        ...inScope(lineupRatings, seasonCode, scope),
        eq(lineupRatings.clubCode, filter.clubCode),
        eq(lineupRatings.lineupSize, filter.lineupSize),
        gte(lineupRatings.possessionsFor, filter.minPossessions),
      ))
      .orderBy(nullsLast(lineupRatings.netRating), desc(lineupRatings.possessionsFor), asc(lineupRatings.lineup))
      .limit(filter.limit),
  );
}

export type PlayerRapmFilter = {
  personKey?: string;
  // Tracked seconds; players below it are left out.
  minSeconds?: number;
  limit: number;
};

export async function getPlayerRapm(seasonCode: string, filter: PlayerRapmFilter): Promise<PlayerRapmRow[]> {
  const conditions = inScope(playerRapm, seasonCode, RAPM_SCOPE);
  if (filter.personKey !== undefined) conditions.push(eq(playerRapm.personKey, filter.personKey));
  if (filter.minSeconds !== undefined) conditions.push(gte(playerRapm.seconds, filter.minSeconds));
  return catalogRead(() =>
    db.select()
      .from(playerRapm)
      .where(and(...conditions))
      .orderBy(nullsLast(playerRapm.rapm), asc(playerRapm.personKey))
      .limit(filter.limit),
  );
}
