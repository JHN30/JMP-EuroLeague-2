import { and, asc, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import {
  gamePlayerAdvanced,
  gamePlayerOnCourt,
  gameTeamAdvanced,
  gameTeamLineupStints,
  gameTeamPossessions,
  gameTeamScoreFlow,
  gameTeamShotSplits,
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

// Read-only access to the advanced tables. They are filled for every supported season (E2024 onward); callers pass a supported season.
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
export type GamePlayerAdvancedRow = typeof gamePlayerAdvanced.$inferSelect;
export type GameTeamAdvancedRow = typeof gameTeamAdvanced.$inferSelect;

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

// Every player's running usage at one round with at least `minSeconds` played, for ranking a player's usage.
export async function getUsageLeaders(
  seasonCode: string,
  scope: string,
  round: number,
  minSeconds: number,
  limit: number,
) {
  return catalogRead(() =>
    db.select({ personKey: playerRoundStats.personKey, usgPct: playerRoundStats.usgPct })
      .from(playerRoundStats)
      .where(and(
        ...inScope(playerRoundStats, seasonCode, scope),
        eq(playerRoundStats.roundNumber, round),
        gte(playerRoundStats.secondsPlayed, minSeconds),
      ))
      .orderBy(nullsLast(playerRoundStats.usgPct), asc(playerRoundStats.personKey))
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
      .orderBy(nullsLast(playerRoundWinShares.winSharesPer40), asc(playerRoundWinShares.personKey))
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

// Time spent leading, tied and trailing for every club in a scope (play-by-play based).
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

// Both sides of one game, as the pipeline published them. No rows means the game has no advanced data.
export async function getGameAdvanced(
  seasonCode: string,
  gameCode: number,
): Promise<{ teams: GameTeamAdvancedRow[]; players: GamePlayerAdvancedRow[] }> {
  const [teams, players] = await Promise.all([
    catalogRead(() =>
      db.select()
        .from(gameTeamAdvanced)
        .where(and(
          eq(gameTeamAdvanced.competitionCode, COMPETITION_CODE),
          eq(gameTeamAdvanced.seasonCode, seasonCode),
          eq(gameTeamAdvanced.gameCode, gameCode),
        ))
        .orderBy(asc(gameTeamAdvanced.side)),
    ),
    catalogRead(() =>
      db.select()
        .from(gamePlayerAdvanced)
        .where(and(
          eq(gamePlayerAdvanced.competitionCode, COMPETITION_CODE),
          eq(gamePlayerAdvanced.seasonCode, seasonCode),
          eq(gamePlayerAdvanced.gameCode, gameCode),
        ))
        .orderBy(asc(gamePlayerAdvanced.side), asc(gamePlayerAdvanced.personKey)),
    ),
  ]);
  return { teams, players };
}

export type PlayerSeasonToDate = {
  secondsPlayed: number | null;
  per: number | null;
  usgPct: number | null;
  winShares: number | null;
};

// Season-to-date PER, USG% and Win Shares for some players: their cumulative row at one round of the `all`
// scope (round numbers run across phases). A player with no row at that round is left out of the map.
export async function getPlayersSeasonToDate(
  seasonCode: string,
  roundNumber: number,
  personKeys: string[],
): Promise<Map<string, PlayerSeasonToDate>> {
  const result = new Map<string, PlayerSeasonToDate>();
  if (personKeys.length === 0) return result;
  const roundScope = (table: typeof playerRoundRatings | typeof playerRoundStats | typeof playerRoundWinShares) =>
    and(
      ...inScope(table, seasonCode, "all"),
      eq(table.roundNumber, roundNumber),
      inArray(table.personKey, personKeys),
    );
  const [ratings, stats, winShares] = await Promise.all([
    catalogRead(() =>
      db.select({ personKey: playerRoundRatings.personKey, secondsPlayed: playerRoundRatings.secondsPlayed, per: playerRoundRatings.per })
        .from(playerRoundRatings)
        .where(roundScope(playerRoundRatings)),
    ),
    catalogRead(() =>
      db.select({ personKey: playerRoundStats.personKey, secondsPlayed: playerRoundStats.secondsPlayed, usgPct: playerRoundStats.usgPct })
        .from(playerRoundStats)
        .where(roundScope(playerRoundStats)),
    ),
    catalogRead(() =>
      db.select({ personKey: playerRoundWinShares.personKey, secondsPlayed: playerRoundWinShares.secondsPlayed, winShares: playerRoundWinShares.winShares })
        .from(playerRoundWinShares)
        .where(roundScope(playerRoundWinShares)),
    ),
  ]);
  const entry = (personKey: string) => {
    let current = result.get(personKey);
    if (!current) {
      current = { secondsPlayed: null, per: null, usgPct: null, winShares: null };
      result.set(personKey, current);
    }
    return current;
  };
  for (const row of ratings) Object.assign(entry(row.personKey), { per: row.per, secondsPlayed: row.secondsPlayed });
  for (const row of stats) Object.assign(entry(row.personKey), { usgPct: row.usgPct, secondsPlayed: row.secondsPlayed });
  for (const row of winShares) Object.assign(entry(row.personKey), { winShares: row.winShares, secondsPlayed: row.secondsPlayed });
  return result;
}

export type TeamSeasonToDate = Pick<
  StandingsStatsRow,
  | "clubCode" | "gamesPlayed" | "pace" | "offensiveRating" | "defensiveRating" | "netRating" | "efgPct" | "tovPct"
  | "orbPct" | "drbPct" | "ftRate" | "oppEfgPct" | "oppTovPct" | "oppFtRate"
>;

// Season-to-date team values for some clubs: their cumulative row at one round of the `all` scope. A club with no
// row at that round is left out of the map.
export async function getTeamsSeasonToDate(
  seasonCode: string,
  roundNumber: number,
  clubCodes: string[],
): Promise<Map<string, TeamSeasonToDate>> {
  if (clubCodes.length === 0) return new Map();
  const rows = await catalogRead(() =>
    db.select({
      clubCode: standingsStats.clubCode,
      gamesPlayed: standingsStats.gamesPlayed,
      pace: standingsStats.pace,
      offensiveRating: standingsStats.offensiveRating,
      defensiveRating: standingsStats.defensiveRating,
      netRating: standingsStats.netRating,
      efgPct: standingsStats.efgPct,
      tovPct: standingsStats.tovPct,
      orbPct: standingsStats.orbPct,
      drbPct: standingsStats.drbPct,
      ftRate: standingsStats.ftRate,
      oppEfgPct: standingsStats.oppEfgPct,
      oppTovPct: standingsStats.oppTovPct,
      oppFtRate: standingsStats.oppFtRate,
    })
      .from(standingsStats)
      .where(and(
        ...inScope(standingsStats, seasonCode, "all"),
        eq(standingsStats.roundNumber, roundNumber),
        inArray(standingsStats.clubCode, clubCodes),
      )),
  );
  return new Map(rows.map((row) => [row.clubCode, row]));
}

type GameTeamTableRow = { side: string; clubCode: string };

// The part of a per-game team row that is not its key: what the page shows.
function without<Row extends GameTeamTableRow>(row: Row | undefined) {
  if (!row) return null;
  const { side: _side, clubCode: _club, opponentClubCode: _opponent, competitionCode: _competition, seasonCode: _season, gameCode: _game, ...rest } =
    row as Row & { opponentClubCode?: unknown; competitionCode?: unknown; seasonCode?: unknown; gameCode?: unknown };
  return rest as Omit<Row, "side" | "clubCode" | "opponentClubCode" | "competitionCode" | "seasonCode" | "gameCode">;
}

// Score flow, shot splits and counted possessions of both sides of one game. A side's block is null when its table
// has no row for it; no teams at all means the game has none of the three.
export async function getGameTeamFlow(seasonCode: string, gameCode: number) {
  const scopeOf = (table: { competitionCode: AnyPgColumn; seasonCode: AnyPgColumn; gameCode: AnyPgColumn }) =>
    and(eq(table.competitionCode, COMPETITION_CODE), eq(table.seasonCode, seasonCode), eq(table.gameCode, gameCode));
  const [flow, splits, possessions] = await Promise.all([
    catalogRead(() => db.select().from(gameTeamScoreFlow).where(scopeOf(gameTeamScoreFlow))),
    catalogRead(() => db.select().from(gameTeamShotSplits).where(scopeOf(gameTeamShotSplits))),
    catalogRead(() => db.select().from(gameTeamPossessions).where(scopeOf(gameTeamPossessions))),
  ]);
  const clubs = new Map<string, string>();
  for (const row of [...flow, ...splits, ...possessions]) clubs.set(row.side, row.clubCode);
  return ["local", "road"]
    .filter((side) => clubs.has(side))
    .map((side) => ({
      side,
      clubCode: clubs.get(side) as string,
      flow: without(flow.find((row) => row.side === side)),
      splits: without(splits.find((row) => row.side === side)),
      possessions: without(possessions.find((row) => row.side === side)),
    }));
}

const REGULATION_SECONDS = 2400;
const OVERTIME_SECONDS = 300;

type UnitTotals = {
  side: string;
  clubCode: string;
  players: string[];
  seconds: number;
  stints: number;
  possessionsFor: number;
  possessionsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
};

const twoDecimals = (value: number) => Math.round(value * 100) / 100;

// Points per 100 possessions, or null when there were no possessions.
const per100 = (points: number, possessions: number) => (possessions > 0 ? (100 * points) / possessions : null);

// Each player's on-court intervals and the game's lineup stints rolled up by five-man unit, both read as the pipeline
// published them. A unit is the sorted person_keys of one side; its totals sum every stint of that unit.
export async function getGameLineups(seasonCode: string, gameCode: number) {
  const scopeOf = (table: { competitionCode: AnyPgColumn; seasonCode: AnyPgColumn; gameCode: AnyPgColumn }) =>
    and(eq(table.competitionCode, COMPETITION_CODE), eq(table.seasonCode, seasonCode), eq(table.gameCode, gameCode));
  const [intervals, stints] = await Promise.all([
    catalogRead(() =>
      db.select().from(gamePlayerOnCourt).where(scopeOf(gamePlayerOnCourt))
        .orderBy(asc(gamePlayerOnCourt.side), asc(gamePlayerOnCourt.personKey), asc(gamePlayerOnCourt.intervalOrdinal)),
    ),
    catalogRead(() => db.select().from(gameTeamLineupStints).where(scopeOf(gameTeamLineupStints))),
  ]);

  const onCourt = new Map<string, {
    side: string;
    clubCode: string | null;
    personKey: string;
    intervals: { startSeconds: number; endSeconds: number }[];
  }>();
  let lastSecond = 0;
  for (const row of intervals) {
    if (row.startSeconds === null || row.endSeconds === null) continue;
    const key = `${row.side}|${row.personKey}`;
    let player = onCourt.get(key);
    if (!player) {
      player = { side: row.side, clubCode: row.clubCode, personKey: row.personKey, intervals: [] };
      onCourt.set(key, player);
    }
    player.intervals.push({ startSeconds: row.startSeconds, endSeconds: row.endSeconds });
    lastSecond = Math.max(lastSecond, row.endSeconds);
  }

  const units = new Map<string, UnitTotals>();
  for (const row of stints) {
    if (row.players === null || row.startSeconds === null || row.endSeconds === null) continue;
    const key = `${row.side}|${row.players}`;
    let unit = units.get(key);
    if (!unit) {
      unit = {
        side: row.side,
        clubCode: row.clubCode ?? "",
        players: row.players.split(","),
        seconds: 0,
        stints: 0,
        possessionsFor: 0,
        possessionsAgainst: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      units.set(key, unit);
    }
    unit.seconds += row.endSeconds - row.startSeconds;
    unit.stints += 1;
    unit.possessionsFor += row.possessionsFor ?? 0;
    unit.possessionsAgainst += row.possessionsAgainst ?? 0;
    unit.pointsFor += row.pointsFor ?? 0;
    unit.pointsAgainst += row.pointsAgainst ?? 0;
    lastSecond = Math.max(lastSecond, row.endSeconds);
  }

  const overtimes = lastSecond > REGULATION_SECONDS ? Math.ceil((lastSecond - REGULATION_SECONDS) / OVERTIME_SECONDS) : 0;
  return {
    available: onCourt.size > 0 || units.size > 0,
    gameSeconds: REGULATION_SECONDS + overtimes * OVERTIME_SECONDS,
    onCourt: [...onCourt.values()],
    units: [...units.values()].map((unit) => {
      const offensive = per100(unit.pointsFor, unit.possessionsFor);
      const defensive = per100(unit.pointsAgainst, unit.possessionsAgainst);
      return {
        ...unit,
        plusMinus: unit.pointsFor - unit.pointsAgainst,
        offensiveRating: offensive === null ? null : twoDecimals(offensive),
        defensiveRating: defensive === null ? null : twoDecimals(defensive),
        netRating: offensive === null || defensive === null ? null : twoDecimals(offensive - defensive),
      };
    }),
  };
}
