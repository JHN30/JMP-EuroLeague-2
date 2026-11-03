import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "./client";
import { gamePlayerAdvanced, gameTeamAdvanced, playerRoundRatings, playerRoundStats, playerRoundWinShares, standingsStats } from "./season-advanced-schema";
import { catalogRead, SUPPORTED_SEASONS } from "./season-catalog";
import { seasonFormat } from "./season-format-registry";
import { getTeams } from "./season-identities";
import { gamePlayerStats, gameTeamStats, games, seasonStatsTraditional } from "./season-schema";
import { getLoadedSeasonsRecordRows, getSeasonRecordRows, regularSeasonGames, type RecordMetric } from "./season-stats";

// The records the API serves: four kinds, each with the metrics it can rank. A metric is a key, a label and a group; the routes read this
// list, so a new record is one entry here and one value source below.
export const RECORD_KINDS = ["player-seasons", "single-games", "team-seasons", "team-games"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export type RecordGroup = "traditional" | "advanced";
// `minGames`: a record of a season's rate counts only players or clubs with at least two thirds of the season's regular-season games. It is
// the minimum of a 34-game regular season; each season has its own (seasonMinGames), and every row says the minimum of its season.
// `lowerIsBetter` ranks from the lowest (the best defense allows the fewest points). `format` says how the page writes the value: whole
// numbers for totals, one decimal for rates, a sign for margins, and a stored fraction as a percentage.
// `volume` names a minimum beyond games (minutes, shots) for the page to say.
export type RecordFormat = "count" | "decimal" | "decimal3" | "signed" | "percent";
export type RecordMetricDef = { key: string; label: string; group: RecordGroup; minGames?: number; lowerIsBetter?: boolean; format?: RecordFormat; volume?: string };
// A season record as the season's total or as its per-game average.
export const RECORD_PERS = ["total", "game"] as const;
export type RecordPer = (typeof RECORD_PERS)[number];

const LIMIT = 50;
// Two thirds of a season's regular-season games, rounded up: 23 of 34, 26 of 38, 16 of a 10-game group stage and a 14-game Top 16. That is
// stricter than the Leaders boards' half, since a record stands against every season. The regular season is the group stage and the Top 16
// where there was one; the postseason counts neither toward the minimum nor toward a player's games. It counts the whole schedule rather
// than the games played so far, so a season in progress stays out of the all-time lists until two thirds of it are played. The answer's
// `minGames` is the minimum of a 34-game season, and every row says the minimum of its own.
const REFERENCE_SEASON_GAMES = 34;
const minimumOf = (regularSeason: number) => Math.ceil((regularSeason * 2) / 3);
export const MIN_SEASON_GAMES = minimumOf(REFERENCE_SEASON_GAMES);

// A season's own minimum, from a club's games in the group stage and the Top 16. A season without a format counts 34 games.
function seasonMinGames(seasonCode: string): number {
  const stages = seasonFormat(seasonCode)?.stages.filter((stage) => stage.code === "RS" || stage.code === "TS") ?? [];
  const regularSeason = stages.reduce((total, stage) => total + (stage.gamesPerClub ?? 0), 0) || REFERENCE_SEASON_GAMES;
  return minimumOf(regularSeason);
}
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

const advanced = (key: string, label: string, extra: Partial<RecordMetricDef> = {}): RecordMetricDef => ({ key, label, group: "advanced", ...extra });
const OFFENSIVE_RATING = advanced("offensiveRating", "Offensive rating");
const DEFENSIVE_RATING = advanced("defensiveRating", "Defensive rating", { lowerIsBetter: true });
const NET_RATING = advanced("netRating", "Net rating", { format: "signed" });
const PACE = advanced("pace", "Pace");
const EFG = advanced("effectiveFieldGoalPct", "Effective FG%", { format: "percent" });
const TRUE_SHOOTING = advanced("trueShootingPct", "True shooting %", { format: "percent" });

// The season metrics of the advanced standings, in the order the page lists them, each with its column.
const TEAM_SEASON_ADVANCED: Array<[RecordMetricDef, PgColumn]> = [
  [OFFENSIVE_RATING, standingsStats.offensiveRating],
  [DEFENSIVE_RATING, standingsStats.defensiveRating],
  [NET_RATING, standingsStats.netRating],
  [advanced("adjustedOffensiveRating", "Adjusted offensive rating"), standingsStats.adjOffensiveRating],
  [advanced("adjustedDefensiveRating", "Adjusted defensive rating", { lowerIsBetter: true }), standingsStats.adjDefensiveRating],
  [advanced("adjustedNetRating", "Adjusted net rating", { format: "signed" }), standingsStats.adjNetRating],
  [advanced("marginOfVictory", "Margin of victory", { format: "signed" }), standingsStats.mov],
  [advanced("srs", "Simple rating (SRS)", { format: "signed" }), standingsStats.srs],
  [PACE, standingsStats.pace],
  [EFG, standingsStats.efgPct],
  [advanced("opponentEffectiveFieldGoalPct", "Opponents' eFG%", { format: "percent", lowerIsBetter: true }), standingsStats.oppEfgPct],
  [TRUE_SHOOTING, standingsStats.trueShootingPct],
  [advanced("turnoverPct", "Turnover %", { format: "percent", lowerIsBetter: true }), standingsStats.tovPct],
  [advanced("offensiveReboundPct", "Offensive rebound %", { format: "percent" }), standingsStats.orbPct],
  [advanced("defensiveReboundPct", "Defensive rebound %", { format: "percent" }), standingsStats.drbPct],
  [advanced("assistRatio", "Assist ratio", { format: "percent" }), standingsStats.assistRatio],
];

// The same for a club's single game.
const TEAM_GAME_ADVANCED: Array<[RecordMetricDef, PgColumn]> = [
  [OFFENSIVE_RATING, gameTeamAdvanced.offensiveRating],
  [DEFENSIVE_RATING, gameTeamAdvanced.defensiveRating],
  [NET_RATING, gameTeamAdvanced.netRating],
  [PACE, gameTeamAdvanced.pace],
  [EFG, gameTeamAdvanced.efgPct],
  [TRUE_SHOOTING, gameTeamAdvanced.trueShootingPct],
];
const columnOf = (catalogue: Array<[RecordMetricDef, PgColumn]>, key: string) => catalogue.find(([metric]) => metric.key === key)![1];

// Every advanced player record needs two thirds of the season's games. A rate also needs 10 minutes a game, and a
// shooting percentage 5 field goal attempts a game as well (the Leaders boards' FIELD_GOALS rule), so a few minutes or shots cannot set a
// record. Both read the same round row as the value.
type PlayerVolume = "minutes" | "shooting";
const PLAYER_VOLUME_TEXT: Record<PlayerVolume, string> = { minutes: "10+ minutes a game", shooting: "10+ minutes and 5+ field goal attempts a game" };
type PlayerRoundTable = typeof playerRoundRatings | typeof playerRoundWinShares | typeof playerRoundStats;
type PlayerSeasonSource = { metric: RecordMetricDef; table: PlayerRoundTable; column: PgColumn; volume?: PlayerVolume };
const playerSeason = (key: string, label: string, table: PlayerRoundTable, column: PgColumn, extra: Partial<RecordMetricDef> = {}, volume?: PlayerVolume): PlayerSeasonSource => ({
  metric: { key, label, group: "advanced", minGames: MIN_SEASON_GAMES, ...extra, ...(volume ? { volume: PLAYER_VOLUME_TEXT[volume] } : {}) },
  table,
  column,
  volume,
});
const PLAYER_SEASON_ADVANCED: PlayerSeasonSource[] = [
  playerSeason("per", "PER", playerRoundRatings, playerRoundRatings.per),
  playerSeason("winShares", "Win Shares", playerRoundWinShares, playerRoundWinShares.winShares),
  playerSeason("offensiveWinShares", "Offensive Win Shares", playerRoundWinShares, playerRoundWinShares.offWinShares),
  playerSeason("defensiveWinShares", "Defensive Win Shares", playerRoundWinShares, playerRoundWinShares.defWinShares),
  playerSeason("winSharesPer40", "Win Shares / 40", playerRoundWinShares, playerRoundWinShares.winSharesPer40, { format: "decimal3" }, "minutes"),
  playerSeason("trueShootingPct", "True shooting %", playerRoundStats, playerRoundStats.tsPct, { format: "percent" }, "shooting"),
  playerSeason("effectiveFieldGoalPct", "Effective FG%", playerRoundStats, playerRoundStats.efgPct, { format: "percent" }, "shooting"),
  playerSeason("usagePct", "Usage %", playerRoundStats, playerRoundStats.usgPct, { format: "percent" }, "minutes"),
  playerSeason("assistPct", "Assist %", playerRoundStats, playerRoundStats.astPct, { format: "percent" }, "minutes"),
  playerSeason("reboundPct", "Rebound %", playerRoundStats, playerRoundStats.trbPct, { format: "percent" }, "minutes"),
  playerSeason("stealPct", "Steal %", playerRoundStats, playerRoundStats.stlPct, { format: "percent" }, "minutes"),
  playerSeason("blockPct", "Block %", playerRoundStats, playerRoundStats.blkPct, { format: "percent" }, "minutes"),
  playerSeason("gameScoreAverage", "Game Score average", playerRoundStats, playerRoundStats.gameScoreAverage, {}, "minutes"),
  playerSeason("pie", "PIE", playerRoundStats, playerRoundStats.pie, { format: "percent" }, "minutes"),
];

const ADVANCED: Record<RecordKind, RecordMetricDef[]> = {
  "player-seasons": PLAYER_SEASON_ADVANCED.map((source) => source.metric),
  // Game PER counts players with 10 minutes in the game, as the game page's best player does; a few minutes can give any number.
  "single-games": [advanced("gameScore", "Game Score"), advanced("gamePer", "Game PER", { volume: "10+ minutes in the game" })],
  "team-seasons": TEAM_SEASON_ADVANCED.map(([metric]) => ({ ...metric, minGames: MIN_SEASON_GAMES })),
  "team-games": TEAM_GAME_ADVANCED.map(([metric]) => metric),
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

// Per game is a season reading of a counted total: a single game is already one game, and the advanced metrics are already rates.
export function perGameAvailable(kind: RecordKind, metric: RecordMetricDef): boolean {
  return (kind === "player-seasons" || kind === "team-seasons") && metric.group === "traditional";
}

// How the page writes a metric's values; a per-game average always has one decimal.
export function recordFormat(metric: RecordMetricDef, per: RecordPer): RecordFormat {
  if (per === "game") return "decimal";
  return metric.format ?? (metric.group === "traditional" ? "count" : "decimal");
}

// The catalogue entry a request asks for (by its own key or one of the old names), or null when the kind has no such metric.
export function findRecordMetric(kind: RecordKind, requested: string): RecordMetricDef | null {
  const key = ALIASES[kind]?.[requested] ?? requested;
  return [...TRADITIONAL, ...ADVANCED[kind]].find((metric) => metric.key === key) ?? null;
}

export type RecordRow = { seasonCode: string; value: string | null; numericValue: number } & Record<string, unknown>;

// A value as the tables store it: a numeric column comes back as a string, a measure as a number. A game row also has its day and code.
type Scored = { seasonCode: string; value: string | number | null; scheduledAt?: Date | null; gameCode?: number };
type Ranked<Row extends Scored> = Omit<Row, "value"> & { value: string; numericValue: number };

// What a records route answers for one metric: the best 50 over the loaded seasons, the best of each season that has any, and the record
// progression. The last two come from every row read, so a season that never reaches the best 50 still has its entry.
export type RecordLists = { records: RecordRow[]; bySeason: RecordRow[]; progression: RecordRow[] };

// A picture URL as the pipeline stored it, or null when there is none (never an empty string).
const picture = (url: string | null | undefined) => (url ? url : null);

// Season by season; within a season, games by day and then by code (a season total has neither).
function oldestFirst(a: Ranked<Scored>, b: Ranked<Scored>) {
  return a.seasonCode.localeCompare(b.seasonCode) || (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0) || (a.gameCode ?? 0) - (b.gameCode ?? 0);
}

// The first season's best opens the progression; after it, every row that beat the standing record, oldest first. Only the first season's
// best counts from that season, so the chain does not open with the first nights of the archive. `sign` is 1 when higher is better and -1
// when lower is.
function progressionOf<Row extends Scored>(ranked: Ranked<Row>[], first: Ranked<Row> | undefined, sign: number): Ranked<Row>[] {
  if (!first) return [];
  const later = ranked.filter((row) => row.seasonCode !== first.seasonCode).sort(oldestFirst);
  return later.reduce((steps, row) => (sign * (row.numericValue - steps[steps.length - 1].numericValue) > 0 ? [...steps, row] : steps), [first]);
}

// Drops rows with no usable value, orders the rest best first (highest, or lowest when lower is better; ties broken by `tie`), and answers the
// best 50, the best of each season and the progression. `value` always leaves as a string, as the routes have always sent it.
function best<Row extends Scored>(rows: Row[], tie: (a: Row, b: Row) => number, lowerIsBetter = false) {
  const sign = lowerIsBetter ? -1 : 1;
  const ranked: Ranked<Row>[] = rows
    .filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)))
    .sort((a, b) => sign * (Number(b.value) - Number(a.value)) || a.seasonCode.localeCompare(b.seasonCode) || tie(a, b))
    .map((row) => ({ ...row, value: String(row.value), numericValue: Number(row.value) }));
  const seasonBest = new Map<string, Ranked<Row>>();
  for (const row of ranked) if (!seasonBest.has(row.seasonCode)) seasonBest.set(row.seasonCode, row);
  const bySeason = [...seasonBest.values()].sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
  return { records: ranked.slice(0, LIMIT), bySeason, progression: progressionOf(ranked, bySeason[0], sign) };
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

// An advanced player metric after the season's latest round (scope `all`, as the Leaders Advanced board reads them), for the players with two thirds
// of the season's games and the metric's minutes or shots a game, so that nobody sets a record in a handful of games or minutes.
async function advancedPlayerSeasonRows(seasonCode: string, key: string, minGames: number | undefined) {
  const { table, column, volume } = PLAYER_SEASON_ADVANCED.find((source) => source.metric.key === key)!;
  const regular = regularSeasonGames(seasonCode);
  const minutes = volume ? sql`${table.secondsPlayed} >= 600 * ${table.gamesPlayed}` : undefined;
  const shots = volume === "shooting" ? sql`${playerRoundStats.fieldGoalsAttempted} >= 5 * ${playerRoundStats.gamesPlayed}` : undefined;
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
      gamesPlayed: regular.games,
      value: column,
    })
      .from(table)
      .innerJoin(seasonStatsTraditional, and(
        eq(seasonStatsTraditional.competitionCode, table.competitionCode),
        eq(seasonStatsTraditional.seasonCode, table.seasonCode),
        eq(seasonStatsTraditional.personKey, table.personKey),
        eq(seasonStatsTraditional.phaseCode, "all"),
        eq(seasonStatsTraditional.mode, "accumulated"),
      ))
      .leftJoin(regular, eq(regular.personKey, table.personKey))
      .where(and(inSeason, eq(table.roundNumber, round), isNotNull(column), minutes, shots, minGames === undefined ? undefined : sql`coalesce(${regular.games}, 0) >= ${minGames}`))
      .orderBy(desc(column), asc(table.personKey))
      .limit(LIMIT),
  );
}

async function playerSeasonRecords(metric: RecordMetricDef, per: RecordPer) {
  const perSeason = await Promise.all(
    SUPPORTED_SEASONS.map(async (seasonCode) => {
      const minGames = metric.minGames === undefined ? undefined : seasonMinGames(seasonCode);
      // A per-game record needs two thirds of the season's regular-season games, as a rating does, so a few hot games cannot set one.
      const perGameMinGames = per === "game" ? seasonMinGames(seasonCode) : undefined;
      const rows =
        metric.group === "traditional" ? await getSeasonRecordRows(seasonCode, metric.key as RecordMetric, LIMIT, perGameMinGames) : await advancedPlayerSeasonRows(seasonCode, metric.key, minGames);
      return rows.map((player) => ({
        // The regular-season games behind a rating or a per-game average, and the season's minimum.
        ...(minGames !== undefined && "gamesPlayed" in player ? { gamesPlayed: Number(player.gamesPlayed), minGames } : {}),
        ...(perGameMinGames !== undefined && "regularGames" in player ? { gamesPlayed: Number(player.regularGames ?? 0), minGames: perGameMinGames } : {}),
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
              db.select({ ...shape, value: metric.key === "gamePer" ? gamePlayerAdvanced.gamePer : gamePlayerAdvanced.gameScore })
                .from(gamePlayerAdvanced)
                .innerJoin(gamePlayerStats, and(
                  eq(gamePlayerStats.competitionCode, gamePlayerAdvanced.competitionCode),
                  eq(gamePlayerStats.seasonCode, gamePlayerAdvanced.seasonCode),
                  eq(gamePlayerStats.gameCode, gamePlayerAdvanced.gameCode),
                  eq(gamePlayerStats.side, gamePlayerAdvanced.side),
                  eq(gamePlayerStats.personKey, gamePlayerAdvanced.personKey),
                ))
                .innerJoin(games, gameJoin)
                .where(
                  metric.key === "gamePer"
                    ? and(played, isNotNull(gamePlayerAdvanced.gamePer), gte(gamePlayerAdvanced.secondsPlayed, 600))
                    : and(played, isNotNull(gamePlayerAdvanced.gameScore)),
                )
                .orderBy(desc(metric.key === "gamePer" ? gamePlayerAdvanced.gamePer : gamePlayerAdvanced.gameScore))
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

// A club plays every game of its regular season, so its games so far meet the minimum once two thirds of a season in progress are played, and the
// postseason never decides it.
async function teamSeasonRecords(metric: RecordMetricDef, per: RecordPer) {
  if (metric.group === "advanced") {
    // A club's rating after the season's latest round (scope `all`), as the standings read it.
    const perSeason = await Promise.all(
      SUPPORTED_SEASONS.map(async (seasonCode) => {
        const column = columnOf(TEAM_SEASON_ADVANCED, metric.key);
        const inSeason = and(eq(standingsStats.competitionCode, COMPETITION_CODE), eq(standingsStats.seasonCode, seasonCode), eq(standingsStats.scope, "all"));
        const [latest] = await catalogRead(() => db.select({ round: sql<number | null>`max(${standingsStats.roundNumber})` }).from(standingsStats).where(inSeason));
        if (latest?.round === null || latest?.round === undefined) return [];
        const round = latest.round;
        const minGames = metric.minGames === undefined ? undefined : seasonMinGames(seasonCode);
        const [rows, looks] = await Promise.all([
          catalogRead(() =>
            db.select({ clubCode: standingsStats.clubCode, clubName: standingsStats.clubName, gamesPlayed: standingsStats.gamesPlayed, value: column })
              .from(standingsStats)
              .where(and(inSeason, eq(standingsStats.roundNumber, round), isNotNull(column), minGames === undefined ? undefined : gte(standingsStats.gamesPlayed, minGames)))
              .orderBy(metric.lowerIsBetter ? asc(column) : desc(column), asc(standingsStats.clubCode))
              .limit(LIMIT),
          ),
          clubLooks(seasonCode),
        ]);
        return rows.map((row) => ({ seasonCode, ...row, ...(minGames !== undefined ? { minGames } : {}), clubTvCode: looks.tvCodeOf(row.clubCode), clubImageUrl: looks.crestOf(row.clubCode) }));
      }),
    );
    return best(perSeason.flat(), (a, b) => a.clubCode.localeCompare(b.clubCode), metric.lowerIsBetter);
  }

  // The season's sum of the club's game totals, over the games played; per game, that sum over those games.
  const column = boxColumn(gameTeamStats, metric.key);
  const clubCode = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubCode} else ${games.roadClubCode} end`;
  const clubName = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubName} else ${games.roadClubName} end`;
  const total = sql<string | null>`sum(${column})`;
  const played = sql<number>`count(*)::int`;
  const totals = await catalogRead(() =>
    db.select({ seasonCode: gameTeamStats.seasonCode, clubCode, clubName, gamesPlayed: played, value: total })
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
  // A club needs two thirds of the season's regular-season games for a per-game record, as for the season ratings, so a few games cannot set one.
  const rows =
    per === "game"
      ? totals.flatMap(({ value, ...row }) => {
          const minGames = seasonMinGames(row.seasonCode);
          return row.gamesPlayed >= minGames && value !== null ? [{ ...row, minGames, value: Number(value) / row.gamesPlayed }] : [];
        })
      : totals.map(({ seasonCode, clubCode, clubName, value }) => ({ seasonCode, clubCode, clubName, value }));
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
              const column = columnOf(TEAM_GAME_ADVANCED, metric.key);
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
                .orderBy(metric.lowerIsBetter ? asc(column) : desc(column))
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
  return best(perSeason.flat(), (a, b) => a.gameCode - b.gameCode || a.clubCode.localeCompare(b.clubCode), metric.lowerIsBetter);
}

// The best 50 rows of one record kind and metric over the loaded seasons (highest first), the best of each season and the progression.
// `per` is "game" only where perGameAvailable says so; the route checks it.
export async function getRecordRows(kind: RecordKind, metric: RecordMetricDef, per: RecordPer = "total"): Promise<RecordLists> {
  if (kind === "player-seasons") return playerSeasonRecords(metric, per);
  if (kind === "single-games") return singleGameRecords(metric);
  if (kind === "team-seasons") return teamSeasonRecords(metric, per);
  return teamGameRecords(metric);
}

// ---- Record book ----

// The headline records of the book, the same six for every kind, in the order the page shows them.
const BOOK_METRICS = ["pointsScored", "totalRebounds", "assists", "steals", "blocks", "pir"] as const;
// The record and the row behind it, for the margin.
const BOOK_ROWS = 2;

// Each season's crests and TV codes, read only for the seasons a few rows come from.
async function looksFor(seasonCodes: string[]) {
  return new Map(await Promise.all([...new Set(seasonCodes)].map(async (seasonCode) => [seasonCode, await clubLooks(seasonCode)] as const)));
}

async function bookPlayerSeasons(metric: RecordMetricDef) {
  const rows = await getLoadedSeasonsRecordRows(metric.key as RecordMetric, BOOK_ROWS);
  const shaped = rows.map((player) => ({ ...player, playerImageUrl: picture(player.playerImageUrl), clubImageUrl: picture(player.clubImageUrl) }));
  return best(shaped, () => 0).records;
}

async function bookSingleGames(metric: RecordMetricDef) {
  const column = boxColumn(gamePlayerStats, metric.key);
  const rows = await catalogRead(() =>
    db.select({
      seasonCode: gamePlayerStats.seasonCode,
      gameCode: gamePlayerStats.gameCode,
      personKey: gamePlayerStats.personKey,
      playerName: gamePlayerStats.personName,
      clubName: gamePlayerStats.clubName,
      clubCode: gamePlayerStats.clubCode,
      playerImageUrl: gamePlayerStats.headshotUrl,
      scheduledAt: games.scheduledAt,
      value: column,
    })
      .from(gamePlayerStats)
      .innerJoin(games, and(eq(games.competitionCode, gamePlayerStats.competitionCode), eq(games.seasonCode, gamePlayerStats.seasonCode), eq(games.gameCode, gamePlayerStats.gameCode)))
      .where(and(eq(gamePlayerStats.competitionCode, COMPETITION_CODE), inArray(gamePlayerStats.seasonCode, [...SUPPORTED_SEASONS]), eq(games.played, true), isNotNull(column)))
      .orderBy(desc(column), asc(gamePlayerStats.seasonCode), asc(gamePlayerStats.gameCode), asc(gamePlayerStats.personKey))
      .limit(BOOK_ROWS),
  );
  const looks = await looksFor(rows.map((row) => row.seasonCode));
  const shaped = rows.map(({ clubCode, playerImageUrl, ...row }) => ({
    ...row,
    playerImageUrl: picture(playerImageUrl),
    clubImageUrl: looks.get(row.seasonCode)?.crestOf(clubCode) ?? null,
    clubTvCode: clubCode === null ? null : (looks.get(row.seasonCode)?.tvCodeOf(clubCode) ?? clubCode),
  }));
  return best(shaped, (a, b) => a.gameCode - b.gameCode || a.personKey.localeCompare(b.personKey)).records;
}

// A team row's own club and its opponent, from the game it belongs to.
const ownClubCode = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubCode} else ${games.roadClubCode} end`;
const ownClubName = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubName} else ${games.roadClubName} end`;
const otherClubCode = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.roadClubCode} else ${games.localClubCode} end`;
const otherClubName = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.roadClubName} else ${games.localClubName} end`;
const teamGameJoin = and(eq(games.competitionCode, gameTeamStats.competitionCode), eq(games.seasonCode, gameTeamStats.seasonCode), eq(games.gameCode, gameTeamStats.gameCode));
const playedTeamTotals = and(
  eq(gameTeamStats.competitionCode, COMPETITION_CODE),
  inArray(gameTeamStats.seasonCode, [...SUPPORTED_SEASONS]),
  eq(gameTeamStats.statsKind, "total"),
  eq(games.played, true),
  sql`${ownClubCode} is not null`,
);

async function bookTeamSeasons(metric: RecordMetricDef) {
  const total = sql<string | null>`sum(${boxColumn(gameTeamStats, metric.key)})`;
  const rows = await catalogRead(() =>
    db.select({ seasonCode: gameTeamStats.seasonCode, clubCode: ownClubCode, clubName: ownClubName, value: total })
      .from(gameTeamStats)
      .innerJoin(games, teamGameJoin)
      .where(playedTeamTotals)
      .groupBy(gameTeamStats.seasonCode, ownClubCode, ownClubName)
      .having(sql`${total} is not null`)
      .orderBy(sql`${total} desc`, asc(gameTeamStats.seasonCode), sql`${ownClubCode} asc`)
      .limit(BOOK_ROWS),
  );
  const looks = await looksFor(rows.map((row) => row.seasonCode));
  const shaped = rows.map((row) => {
    const clubCode = row.clubCode ?? "";
    return { ...row, clubCode, clubTvCode: looks.get(row.seasonCode)?.tvCodeOf(clubCode) ?? clubCode, clubImageUrl: looks.get(row.seasonCode)?.crestOf(clubCode) ?? null };
  });
  return best(shaped, (a, b) => a.clubCode.localeCompare(b.clubCode)).records;
}

async function bookTeamGames(metric: RecordMetricDef) {
  const column = boxColumn(gameTeamStats, metric.key);
  const rows = await catalogRead(() =>
    db.select({
      seasonCode: gameTeamStats.seasonCode,
      gameCode: gameTeamStats.gameCode,
      clubCode: ownClubCode,
      clubName: ownClubName,
      opponentClubCode: otherClubCode,
      opponentName: otherClubName,
      scheduledAt: games.scheduledAt,
      value: column,
    })
      .from(gameTeamStats)
      .innerJoin(games, teamGameJoin)
      .where(and(playedTeamTotals, isNotNull(column)))
      .orderBy(desc(column), asc(gameTeamStats.seasonCode), asc(gameTeamStats.gameCode), sql`${ownClubCode} asc`)
      .limit(BOOK_ROWS),
  );
  const looks = await looksFor(rows.map((row) => row.seasonCode));
  const shaped = rows.map((row) => {
    const clubCode = row.clubCode ?? "";
    const seasonLooks = looks.get(row.seasonCode);
    return { ...row, clubCode, clubTvCode: seasonLooks?.tvCodeOf(clubCode) ?? clubCode, clubImageUrl: seasonLooks?.crestOf(clubCode) ?? null, opponentTvCode: seasonLooks?.tvCodeOf(row.opponentClubCode) ?? null };
  });
  return best(shaped, (a, b) => a.gameCode - b.gameCode || a.clubCode.localeCompare(b.clubCode)).records;
}

const BOOK_ROWS_OF: Record<RecordKind, (metric: RecordMetricDef) => Promise<RecordRow[]>> = {
  "player-seasons": bookPlayerSeasons,
  "single-games": bookSingleGames,
  "team-seasons": bookTeamSeasons,
  "team-games": bookTeamGames,
};

// The record book: for every kind, the headline metrics with their record and the row behind it. One query per kind and metric reads
// every loaded season in the order best() ranks them, so each first row is the record that kind's route shows.
export async function getRecordBook() {
  const sections = await Promise.all(
    RECORD_KINDS.map(async (kind) => ({
      kind,
      cards: await Promise.all(
        BOOK_METRICS.map(async (key) => {
          const metric = findRecordMetric(kind, key)!;
          return { metric: key, label: metric.label, format: recordFormat(metric, "total"), lowerIsBetter: metric.lowerIsBetter ?? false, records: await BOOK_ROWS_OF[kind](metric) };
        }),
      ),
    })),
  );
  return { sections };
}
