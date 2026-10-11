import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "./client";
import { gamePlayerAdvanced, gameTeamAdvanced, playerRoundRatings, playerRoundWinShares, standingsStats } from "./season-advanced-schema";
import { catalogRead, SUPPORTED_SEASONS } from "./season-catalog";
import { getTeams } from "./season-identities";
import { gamePlayerStats, gameTeamStats, games, seasonStatsTraditional } from "./season-schema";
import { getSeasonRecordRows, type RecordMetric } from "./season-stats";

// The records the API serves: four kinds, each with the metrics it can rank. A metric is a key, a label and a group; the routes read this
// list, so a new record is one entry here and one value source below.
export const RECORD_KINDS = ["player-seasons", "single-games", "team-seasons", "team-games"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export type RecordGroup = "traditional" | "advanced";
// `minGames`: a record of a season's rating counts only players or clubs with at least that many games, so a season still being played does not
// put a club at the top after a few games.
export type RecordMetricDef = { key: string; label: string; group: RecordGroup; minGames?: number };

const LIMIT = 50;
// A regular season is 34 games: 20 leaves a finished season whole and keeps a season in progress out until it is past the middle.
const MIN_SEASON_GAMES = 20;
const COMPETITION_CODE = "E";

const TRADITIONAL: RecordMetricDef[] = [
  { key: "pointsScored", label: "Points", group: "traditional" },
  { key: "totalRebounds", label: "Rebounds", group: "traditional" },
  { key: "offensiveRebounds", label: "Offensive rebounds", group: "traditional" },
  { key: "defensiveRebounds", label: "Defensive rebounds", group: "traditional" },
  { key: "assists", label: "Assists", group: "traditional" },
  { key: "steals", label: "Steals", group: "traditional" },
  { key: "blocks", label: "Blocks", group: "traditional" },
  { key: "twoPointersMade", label: "2-pointers made", group: "traditional" },
  { key: "threePointersMade", label: "3-pointers made", group: "traditional" },
  { key: "freeThrowsMade", label: "Free throws made", group: "traditional" },
  { key: "pir", label: "PIR", group: "traditional" },
];

const OFFENSIVE_RATING: RecordMetricDef = { key: "offensiveRating", label: "Offensive rating", group: "advanced" };
const NET_RATING: RecordMetricDef = { key: "netRating", label: "Net rating", group: "advanced" };

const ADVANCED: Record<RecordKind, RecordMetricDef[]> = {
  "player-seasons": [
    { key: "per", label: "PER", group: "advanced", minGames: MIN_SEASON_GAMES },
    { key: "winShares", label: "Win Shares", group: "advanced" },
  ],
  "single-games": [{ key: "gameScore", label: "Game Score", group: "advanced" }],
  "team-seasons": [
    { ...OFFENSIVE_RATING, minGames: MIN_SEASON_GAMES },
    { ...NET_RATING, minGames: MIN_SEASON_GAMES },
  ],
  "team-games": [OFFENSIVE_RATING, NET_RATING],
};

// The names the single-game and team-season routes answered to before the metrics shared one vocabulary; they keep working.
const BOX_SCORE_NAMES: Record<string, string> = { points: "pointsScored", assistances: "assists", valuation: "pir" };
const ALIASES: Partial<Record<RecordKind, Record<string, string>>> = { "single-games": BOX_SCORE_NAMES, "team-seasons": BOX_SCORE_NAMES };

// What each route ranks when no metric is asked for.
export const DEFAULT_METRIC: Record<RecordKind, string> = {
  "player-seasons": "pointsScored",
  "single-games": "points",
  "team-seasons": "points",
  "team-games": "pointsScored",
};

export function isRecordKind(value: string): value is RecordKind {
  return (RECORD_KINDS as readonly string[]).includes(value);
}

// The catalogue entry a request asks for (by its own key or one of the old names), or null when the kind has no such metric.
export function findRecordMetric(kind: RecordKind, requested: string): RecordMetricDef | null {
  const key = ALIASES[kind]?.[requested] ?? requested;
  return [...TRADITIONAL, ...ADVANCED[kind]].find((metric) => metric.key === key) ?? null;
}

export type RecordRow = { seasonCode: string; value: string | null; numericValue: number } & Record<string, unknown>;

// A value as the tables store it: a numeric column comes back as a string, a measure as a number.
type Scored = { seasonCode: string; value: string | number | null };

// A picture URL as the pipeline stored it, or null when there is none (never an empty string).
const picture = (url: string | null | undefined) => (url ? url : null);

// Drops rows with no usable value, orders the rest highest first (ties broken by `tie`) and keeps the best 50.
// `value` always leaves as a string, as the routes have always sent it.
function best<Row extends Scored>(rows: Row[], tie: (a: Row, b: Row) => number): Array<Omit<Row, "value"> & { value: string; numericValue: number }> {
  return rows
    .filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)))
    .sort((a, b) => Number(b.value) - Number(a.value) || a.seasonCode.localeCompare(b.seasonCode) || tie(a, b))
    .slice(0, LIMIT)
    .map((row) => ({ ...row, value: String(row.value), numericValue: Number(row.value) }));
}

// The box-score column of a game table (player or team) behind a traditional metric.
function boxColumn(table: typeof gamePlayerStats | typeof gameTeamStats, key: string): PgColumn {
  const columns: Record<string, PgColumn> = {
    pointsScored: table.points,
    totalRebounds: table.totalRebounds,
    offensiveRebounds: table.offensiveRebounds,
    defensiveRebounds: table.defensiveRebounds,
    assists: table.assistances,
    steals: table.steals,
    blocks: table.blocksFavour,
    twoPointersMade: table.fieldGoalsMade2,
    threePointersMade: table.fieldGoalsMade3,
    freeThrowsMade: table.freeThrowsMade,
    pir: table.valuation,
  };
  return columns[key];
}

// Each season's club crests and TV codes, by club code, from the season's team list (which already carries the TV codes). A club the list
// does not have keeps its club code as its TV code and has no crest.
async function clubLooks(seasonCode: string) {
  const teams = new Map((await getTeams(seasonCode)).map((team) => [team.clubCode, team]));
  return {
    crestOf: (clubCode: string | null) => (clubCode ? picture(teams.get(clubCode)?.crestUrl) : null),
    tvCodeOf: (clubCode: string | null) => (clubCode ? (teams.get(clubCode)?.tvCode ?? clubCode) : null),
  };
}

// ---- Player seasons ----

// PER and Win Shares after the season's latest round (scope `all`, as the Leaders Advanced board reads them), for the players the season
// statistics mark qualified, so that nobody sets a record in a handful of games.
async function advancedPlayerSeasonRows(seasonCode: string, key: string, minGames: number | undefined) {
  const table = key === "per" ? playerRoundRatings : playerRoundWinShares;
  const column = key === "per" ? playerRoundRatings.per : playerRoundWinShares.winShares;
  const inSeason = and(eq(table.competitionCode, COMPETITION_CODE), eq(table.seasonCode, seasonCode), eq(table.scope, "all"));
  const [latest] = await catalogRead(() => db.select({ round: sql<number | null>`max(${table.roundNumber})` }).from(table).where(inSeason));
  if (latest?.round === null || latest?.round === undefined) return [];
  const round = latest.round;
  return catalogRead(() =>
    db.select({
      personKey: table.personKey,
      playerName: seasonStatsTraditional.playerName,
      clubName: seasonStatsTraditional.clubName,
      clubTvCodes: seasonStatsTraditional.clubTvCodes,
      playerImageUrl: seasonStatsTraditional.playerImageUrl,
      clubImageUrl: seasonStatsTraditional.clubImageUrl,
      gamesPlayed: seasonStatsTraditional.gamesPlayed,
      value: column,
    })
      .from(table)
      .innerJoin(seasonStatsTraditional, and(
        eq(seasonStatsTraditional.competitionCode, table.competitionCode),
        eq(seasonStatsTraditional.seasonCode, table.seasonCode),
        eq(seasonStatsTraditional.personKey, table.personKey),
        eq(seasonStatsTraditional.phaseCode, "all"),
        eq(seasonStatsTraditional.mode, "accumulated"),
        eq(seasonStatsTraditional.qualified, true),
      ))
      .where(and(inSeason, eq(table.roundNumber, round), isNotNull(column), minGames === undefined ? undefined : sql`${seasonStatsTraditional.gamesPlayed} >= ${minGames}`))
      .orderBy(desc(column), asc(table.personKey))
      .limit(LIMIT),
  );
}

async function playerSeasonRecords(metric: RecordMetricDef) {
  const perSeason = await Promise.all(
    SUPPORTED_SEASONS.map(async (seasonCode) => {
      const rows = metric.group === "traditional" ? await getSeasonRecordRows(seasonCode, metric.key as RecordMetric, LIMIT) : await advancedPlayerSeasonRows(seasonCode, metric.key, metric.minGames);
      return rows.map((player) => ({
        // The games behind a rating that has a minimum.
        ...(metric.minGames !== undefined && "gamesPlayed" in player ? { gamesPlayed: Number(player.gamesPlayed) } : {}),
        seasonCode,
        personKey: player.personKey,
        playerName: player.playerName,
        clubName: player.clubName,
        clubTvCodes: player.clubTvCodes,
        playerImageUrl: picture(player.playerImageUrl),
        clubImageUrl: picture(player.clubImageUrl),
        value: player.value,
      }));
    }),
  );
  return best(perSeason.flat(), () => 0);
}

// ---- Single games ----

async function singleGameRecords(metric: RecordMetricDef) {
  const perSeason = await Promise.all(
    SUPPORTED_SEASONS.map(async (seasonCode) => {
      const shape = {
        gameCode: gamePlayerStats.gameCode,
        personKey: gamePlayerStats.personKey,
        playerName: gamePlayerStats.personName,
        clubName: gamePlayerStats.clubName,
        clubCode: gamePlayerStats.clubCode,
        playerImageUrl: gamePlayerStats.headshotUrl,
        scheduledAt: games.scheduledAt,
      };
      const gameJoin = and(
        eq(games.competitionCode, gamePlayerStats.competitionCode),
        eq(games.seasonCode, gamePlayerStats.seasonCode),
        eq(games.gameCode, gamePlayerStats.gameCode),
      );
      const played = and(eq(gamePlayerStats.competitionCode, COMPETITION_CODE), eq(gamePlayerStats.seasonCode, seasonCode), eq(games.played, true));
      const [rows, looks] = await Promise.all([
        metric.group === "traditional"
          ? catalogRead(() => {
              const column = boxColumn(gamePlayerStats, metric.key);
              return db.select({ ...shape, value: column }).from(gamePlayerStats).innerJoin(games, gameJoin).where(played).orderBy(desc(column)).limit(LIMIT);
            })
          : catalogRead(() =>
              db.select({ ...shape, value: gamePlayerAdvanced.gameScore })
                .from(gamePlayerAdvanced)
                .innerJoin(gamePlayerStats, and(
                  eq(gamePlayerStats.competitionCode, gamePlayerAdvanced.competitionCode),
                  eq(gamePlayerStats.seasonCode, gamePlayerAdvanced.seasonCode),
                  eq(gamePlayerStats.gameCode, gamePlayerAdvanced.gameCode),
                  eq(gamePlayerStats.side, gamePlayerAdvanced.side),
                  eq(gamePlayerStats.personKey, gamePlayerAdvanced.personKey),
                ))
                .innerJoin(games, gameJoin)
                .where(and(played, isNotNull(gamePlayerAdvanced.gameScore)))
                .orderBy(desc(gamePlayerAdvanced.gameScore))
                .limit(LIMIT),
            ),
        clubLooks(seasonCode),
      ]);
      return rows.map(({ clubCode, playerImageUrl, ...row }) => ({
        ...row,
        seasonCode,
        playerImageUrl: picture(playerImageUrl),
        clubImageUrl: looks.crestOf(clubCode),
        clubTvCode: clubCode === null ? null : looks.tvCodeOf(clubCode),
      }));
    }),
  );
  return best(perSeason.flat(), (a, b) => a.gameCode - b.gameCode || a.personKey.localeCompare(b.personKey));
}

// ---- Team seasons ----

async function teamSeasonRecords(metric: RecordMetricDef) {
  if (metric.group === "advanced") {
    // A club's rating after the season's latest round (scope `all`), as the standings read it.
    const perSeason = await Promise.all(
      SUPPORTED_SEASONS.map(async (seasonCode) => {
        const column = metric.key === "netRating" ? standingsStats.netRating : standingsStats.offensiveRating;
        const inSeason = and(eq(standingsStats.competitionCode, COMPETITION_CODE), eq(standingsStats.seasonCode, seasonCode), eq(standingsStats.scope, "all"));
        const [latest] = await catalogRead(() => db.select({ round: sql<number | null>`max(${standingsStats.roundNumber})` }).from(standingsStats).where(inSeason));
        if (latest?.round === null || latest?.round === undefined) return [];
        const round = latest.round;
        const [rows, looks] = await Promise.all([
          catalogRead(() =>
            db.select({ clubCode: standingsStats.clubCode, clubName: standingsStats.clubName, gamesPlayed: standingsStats.gamesPlayed, value: column })
              .from(standingsStats)
              .where(and(inSeason, eq(standingsStats.roundNumber, round), isNotNull(column), metric.minGames === undefined ? undefined : gte(standingsStats.gamesPlayed, metric.minGames)))
              .orderBy(desc(column), asc(standingsStats.clubCode))
              .limit(LIMIT),
          ),
          clubLooks(seasonCode),
        ]);
        return rows.map((row) => ({ seasonCode, ...row, clubTvCode: looks.tvCodeOf(row.clubCode), clubImageUrl: looks.crestOf(row.clubCode) }));
      }),
    );
    return best(perSeason.flat(), (a, b) => a.clubCode.localeCompare(b.clubCode));
  }

  // The season's sum of the club's game totals, over the games played.
  const column = boxColumn(gameTeamStats, metric.key);
  const clubCode = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubCode} else ${games.roadClubCode} end`;
  const clubName = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubName} else ${games.roadClubName} end`;
  const total = sql<string | null>`sum(${column})`;
  const rows = await catalogRead(() =>
    db.select({ seasonCode: gameTeamStats.seasonCode, clubCode, clubName, value: total })
      .from(gameTeamStats)
      .innerJoin(games, and(
        eq(games.competitionCode, gameTeamStats.competitionCode),
        eq(games.seasonCode, gameTeamStats.seasonCode),
        eq(games.gameCode, gameTeamStats.gameCode),
      ))
      .where(and(
        eq(gameTeamStats.competitionCode, COMPETITION_CODE),
        inArray(gameTeamStats.seasonCode, [...SUPPORTED_SEASONS]),
        eq(gameTeamStats.statsKind, "total"),
        eq(games.played, true),
      ))
      .groupBy(gameTeamStats.seasonCode, clubCode, clubName),
  );
  const looks = new Map<string, Awaited<ReturnType<typeof clubLooks>>>(await Promise.all(SUPPORTED_SEASONS.map(async (seasonCode) => [seasonCode, await clubLooks(seasonCode)] as const)));
  const withClub = rows.flatMap((row) => {
    if (row.clubCode === null) return [];
    const seasonLooks = looks.get(row.seasonCode);
    return [{ ...row, clubCode: row.clubCode, clubTvCode: seasonLooks?.tvCodeOf(row.clubCode) ?? row.clubCode, clubImageUrl: seasonLooks?.crestOf(row.clubCode) ?? null }];
  });
  return best(withClub, (a, b) => a.clubCode.localeCompare(b.clubCode));
}

// ---- Team games ----

type TeamGameRow = {
  gameCode: number;
  clubCode: string | null;
  clubName: string | null;
  opponentClubCode: string | null;
  opponentName: string | null;
  scheduledAt: (typeof games.$inferSelect)["scheduledAt"];
  value: string | number | null;
};

async function teamGameRecords(metric: RecordMetricDef) {
  const perSeason = await Promise.all(
    SUPPORTED_SEASONS.map(async (seasonCode) => {
      const isLocal = (table: typeof gameTeamStats | typeof gameTeamAdvanced) => sql`${table.side} = 'local'`;
      const ownCode = (table: typeof gameTeamStats | typeof gameTeamAdvanced) => sql<string | null>`case when ${isLocal(table)} then ${games.localClubCode} else ${games.roadClubCode} end`;
      const ownName = (table: typeof gameTeamStats | typeof gameTeamAdvanced) => sql<string | null>`case when ${isLocal(table)} then ${games.localClubName} else ${games.roadClubName} end`;
      const otherCode = (table: typeof gameTeamStats | typeof gameTeamAdvanced) => sql<string | null>`case when ${isLocal(table)} then ${games.roadClubCode} else ${games.localClubCode} end`;
      const otherName = (table: typeof gameTeamStats | typeof gameTeamAdvanced) => sql<string | null>`case when ${isLocal(table)} then ${games.roadClubName} else ${games.localClubName} end`;
      const [rows, looks] = await Promise.all([
        (metric.group === "traditional"
          ? catalogRead(() => {
              const column = boxColumn(gameTeamStats, metric.key);
              return db.select({
                gameCode: gameTeamStats.gameCode,
                clubCode: ownCode(gameTeamStats),
                clubName: ownName(gameTeamStats),
                opponentClubCode: otherCode(gameTeamStats),
                opponentName: otherName(gameTeamStats),
                scheduledAt: games.scheduledAt,
                value: column,
              })
                .from(gameTeamStats)
                .innerJoin(games, and(
                  eq(games.competitionCode, gameTeamStats.competitionCode),
                  eq(games.seasonCode, gameTeamStats.seasonCode),
                  eq(games.gameCode, gameTeamStats.gameCode),
                ))
                .where(and(eq(gameTeamStats.competitionCode, COMPETITION_CODE), eq(gameTeamStats.seasonCode, seasonCode), eq(gameTeamStats.statsKind, "total"), eq(games.played, true)))
                .orderBy(desc(column))
                .limit(LIMIT);
            })
          : catalogRead(() => {
              const column = metric.key === "netRating" ? gameTeamAdvanced.netRating : gameTeamAdvanced.offensiveRating;
              return db.select({
                gameCode: gameTeamAdvanced.gameCode,
                clubCode: ownCode(gameTeamAdvanced),
                clubName: ownName(gameTeamAdvanced),
                opponentClubCode: otherCode(gameTeamAdvanced),
                opponentName: otherName(gameTeamAdvanced),
                scheduledAt: games.scheduledAt,
                value: column,
              })
                .from(gameTeamAdvanced)
                .innerJoin(games, and(
                  eq(games.competitionCode, gameTeamAdvanced.competitionCode),
                  eq(games.seasonCode, gameTeamAdvanced.seasonCode),
                  eq(games.gameCode, gameTeamAdvanced.gameCode),
                ))
                .where(and(eq(gameTeamAdvanced.competitionCode, COMPETITION_CODE), eq(gameTeamAdvanced.seasonCode, seasonCode), eq(games.played, true), isNotNull(column)))
                .orderBy(desc(column))
                .limit(LIMIT);
            })) as Promise<TeamGameRow[]>,
        clubLooks(seasonCode),
      ]);
      return rows.flatMap((row) =>
        row.clubCode === null
          ? []
          : [{ ...row, seasonCode, clubCode: row.clubCode, clubTvCode: looks.tvCodeOf(row.clubCode), clubImageUrl: looks.crestOf(row.clubCode), opponentTvCode: looks.tvCodeOf(row.opponentClubCode) }],
      );
    }),
  );
  return best(perSeason.flat(), (a, b) => a.gameCode - b.gameCode || a.clubCode.localeCompare(b.clubCode));
}

// The best 50 rows of one record kind and metric over the loaded seasons, highest first.
export async function getRecordRows(kind: RecordKind, metric: RecordMetricDef): Promise<RecordRow[]> {
  if (kind === "player-seasons") return playerSeasonRecords(metric);
  if (kind === "single-games") return singleGameRecords(metric);
  if (kind === "team-seasons") return teamSeasonRecords(metric);
  return teamGameRecords(metric);
}
