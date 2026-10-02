import { Router, type NextFunction, type Request, type Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { catalogRead } from "../db/season-catalog";
import {
  CatalogDatabaseError,
  getPhases,
  getRounds,
  getSeason,
  getSeasons,
  SUPPORTED_SEASONS,
  type Season,
} from "../db/season-catalog";
import {
  getPlayer,
  getPlayerRegistrations,
  getPlayers,
  getTeam,
  getTeamRoster,
  getTeams,
} from "../db/season-identities";
import { getBoxScore, getGame, getGames, getPhaseResults, getPlayByPlay, getPlayerGameLog, getPostseasonSeries, getShots, getTeamGames, getTeamStatsSummary } from "../db/season-games";
import { getCoverage } from "../db/season-coverage";
import { getLatestStandingsRound, getStandings } from "../db/season-standings";
import {
  getGameAdvanced,
  getGameFlow,
  getGameLineups,
  getGameTeamFlow,
  getLineupRatings,
  getPerLeaders,
  getPlayerClubs,
  getPlayerOnOff,
  getPlayerRapm,
  getPlayerRoundRatings,
  getPlayerRoundStats,
  getPlayerRoundWinShares,
  getPlayersSeasonToDate,
  getPlayerStatsScopes,
  getStandingsStats,
  getStatsRounds,
  getStatsScopes,
  getTeamPbpStats,
  getTeamRoundRatings,
  getTeamRoundSplits,
  getTeamRoundStats,
  getTeamShotZoneStats,
  getTeamsSeasonToDate,
  getTeamStatsScopes,
  getWinShareLeaders,
} from "../db/season-advanced";
import { getSeasonStats, SORTABLE_STATS_FIELDS, type SortableStatsField } from "../db/season-stats";
import { gamePlayerStats, gameTeamStats, games } from "../db/season-schema";

export const seasonRouter = Router();

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function hasMalformedEncoding(segment: string | undefined): boolean {
  if (segment === undefined) return false;
  try {
    decodeURIComponent(segment);
    return false;
  } catch {
    return true;
  }
}

function pageParameter(value: unknown, fallback: number, minimum: number, maximum: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum ? number : null;
}

function requestedPage(req: Request, res: Response): { limit: number; offset: number } | null {
  const limit = pageParameter(req.query.limit, 50, 1, 100);
  const offset = pageParameter(req.query.offset, 0, 0, 10000);
  if (limit === null || offset === null) {
    sendError(res, 400, "INVALID_QUERY", "Invalid pagination query");
    return null;
  }
  return { limit, offset };
}

function validIdentity(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{1,128}$/.test(value);
}

function requestedSearch(req: Request, res: Response): string | undefined | null {
  const value = req.query.search;
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    sendError(res, 400, "INVALID_QUERY", "Invalid search query");
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 100) {
    sendError(res, 400, "INVALID_QUERY", "Invalid search query");
    return null;
  }
  return trimmed;
}

function requestedGameCode(value: unknown, res: Response): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    sendError(res, 400, "INVALID_GAME_CODE", "Invalid game code");
    return null;
  }
  const gameCode = Number(value);
  if (!Number.isSafeInteger(gameCode) || gameCode > 2147483647) {
    sendError(res, 400, "INVALID_GAME_CODE", "Invalid game code");
    return null;
  }
  return gameCode;
}

function requestedRound(req: Request, res: Response): { round: number | undefined } | null {
  const value = req.query.round;
  if (value === undefined) return { round: undefined };
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    sendError(res, 400, "INVALID_ROUND", "Invalid round");
    return null;
  }
  const round = Number(value);
  if (!Number.isSafeInteger(round) || round > 2147483647) {
    sendError(res, 400, "INVALID_ROUND", "Invalid round");
    return null;
  }
  return { round };
}

const ADVANCED_SCOPES = ["RS", "all", "PS"];
const SEASON_STATS_PHASES = ["RS", "PI", "PO", "FF", "all"];
const SEASON_STATS_MODES = ["accumulated", "perGame"];
const RECORD_METRICS = ["pointsScored", "totalRebounds", "assists", "pir"] as const;

function requestedStatsPhase(req: Request, res: Response): string | null {
  const value = req.query.phase;
  if (value === undefined) return "all";
  if (typeof value !== "string" || !SEASON_STATS_PHASES.includes(value)) {
    sendError(res, 400, "INVALID_PHASE", "Invalid phase");
    return null;
  }
  return value;
}

function requestedStatsMode(req: Request, res: Response): string | null {
  const value = req.query.mode;
  if (value === undefined) return "accumulated";
  if (typeof value !== "string" || !SEASON_STATS_MODES.includes(value)) {
    sendError(res, 400, "INVALID_MODE", "Invalid mode");
    return null;
  }
  return value;
}

function requestedStatsSort(req: Request, res: Response): string | undefined | null {
  const value = req.query.sort;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !SORTABLE_STATS_FIELDS.includes(value)) {
    sendError(res, 400, "INVALID_QUERY", "Invalid sort field");
    return null;
  }
  return value;
}

function requestedStatsOrder(req: Request, res: Response): "asc" | "desc" | null {
  const value = req.query.order;
  if (value === undefined) return "asc";
  if (value !== "asc" && value !== "desc") {
    sendError(res, 400, "INVALID_QUERY", "Invalid order");
    return null;
  }
  return value;
}

seasonRouter.use((req, res, next) => {
  if (hasMalformedEncoding(req.path.split("/")[1])) {
    sendError(res, 400, "INVALID_SEASON", "Unsupported season");
    return;
  }
  next();
});

async function requestedSeason(req: Request, res: Response): Promise<Season | null> {
  const seasonCode = req.params.seasonCode;
  if (typeof seasonCode !== "string" || !SUPPORTED_SEASONS.some((code) => code === seasonCode)) {
    sendError(res, 400, "INVALID_SEASON", "Unsupported season");
    return null;
  }
  const season = await getSeason(seasonCode);
  if (!season) {
    sendError(res, 404, "SEASON_NOT_FOUND", "Season not found");
    return null;
  }
  return season;
}

seasonRouter.get("/", async (_req, res) => {
  res.json({ seasons: await getSeasons() });
});

seasonRouter.get("/:seasonCode", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (season) res.json({ season });
});

seasonRouter.get("/:seasonCode/phases", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  res.json({ phases: await getPhases(season.seasonCode) });
});

seasonRouter.get("/:seasonCode/phases/:phaseCode/rounds", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phases = await getPhases(season.seasonCode);
  const phaseCode = req.params.phaseCode;
  if (typeof phaseCode !== "string" || !phases.some((phase) => phase.code === phaseCode)) {
    sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    return;
  }
  res.json({ rounds: await getRounds(season.seasonCode, phaseCode) });
});

seasonRouter.get("/:seasonCode/phases/:phaseCode/standings", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phases = await getPhases(season.seasonCode);
  const phaseCode = req.params.phaseCode;
  if (typeof phaseCode !== "string" || !phases.some((phase) => phase.code === phaseCode)) {
    sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    return;
  }
  const requested = requestedRound(req, res);
  if (!requested) return;

  let round = requested.round;
  if (round === undefined) {
    const latest = await getLatestStandingsRound(season.seasonCode, phaseCode);
    if (latest === null) {
      res.json({ round: null, standings: [] });
      return;
    }
    round = latest;
  } else {
    const rounds = await getRounds(season.seasonCode, phaseCode);
    if (!rounds.some((r) => r.number === round)) {
      sendError(res, 404, "ROUND_NOT_FOUND", "Round not found");
      return;
    }
  }

  res.json({ round, standings: await getStandings(season.seasonCode, phaseCode, round) });
});

seasonRouter.get("/:seasonCode/phases/:phaseCode/results", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phases = await getPhases(season.seasonCode);
  const phaseCode = req.params.phaseCode;
  if (typeof phaseCode !== "string" || !phases.some((phase) => phase.code === phaseCode)) {
    sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    return;
  }
  res.json({ results: await getPhaseResults(season.seasonCode, phaseCode) });
});

seasonRouter.get("/:seasonCode/advanced/game-flow", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const scope = requestedAdvancedScope(req, res);
  if (scope === null) return;
  const requestedScope = scope ?? "RS";
  res.json({ scope: requestedScope, clubs: await getGameFlow(season.seasonCode, requestedScope) });
});

seasonRouter.get("/:seasonCode/advanced/standings", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const scopeValue = req.query.scope;
  if (scopeValue !== undefined && (typeof scopeValue !== "string" || !ADVANCED_SCOPES.includes(scopeValue))) {
    sendError(res, 400, "INVALID_SCOPE", "Invalid scope");
    return;
  }
  const requested = requestedRound(req, res);
  if (!requested) return;

  // Only scopes with rows are offered, so a season never shows an empty scope.
  const available = new Set(await getStatsScopes(season.seasonCode));
  const scopes = ADVANCED_SCOPES.filter((code) => available.has(code));
  const scope = scopeValue ?? scopes[0];
  if (scope === undefined || !available.has(scope)) {
    res.json({ scope: scope ?? null, scopes, round: null, rounds: [], standings: [] });
    return;
  }

  const rounds = await getStatsRounds(season.seasonCode, scope);
  const round = requested.round ?? rounds[rounds.length - 1];
  if (!rounds.includes(round)) {
    sendError(res, 404, "ROUND_NOT_FOUND", "Round not found");
    return;
  }

  const [rows, teams] = await Promise.all([
    getStandingsStats(season.seasonCode, scope, round),
    getTeams(season.seasonCode),
  ]);
  const crests = new Map(teams.map((team) => [team.clubCode, team.crestUrl]));
  res.json({
    scope,
    scopes,
    round,
    rounds,
    standings: rows.map((row) => ({ ...row, crestUrl: crests.get(row.clubCode) ?? null })),
  });
});

const ADVANCED_LEADER_METRICS = ["per", "winSharesPer40", "rapm", "onOff"];
// Default minimum minutes (on court for RAPM and on/off) per metric in a full season. Early in a season nobody has
// that many, so the default drops to a small floor and the response says the season is still early.
const LEADER_DEFAULT_MIN_MINUTES: Record<string, number> = { per: 100, winSharesPer40: 100, rapm: 500, onOff: 300 };
const EARLY_SEASON_MIN_MINUTES = 20;

// One leaderboard of the advanced player metrics. PER and WS/40 read each player's cumulative row at the
// scope's latest round; on/off reads the scope; RAPM is a whole-season table, so its scope is always "all".
seasonRouter.get("/:seasonCode/advanced/leaders", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const metric = req.query.metric === undefined ? "per" : req.query.metric;
  if (typeof metric !== "string" || !ADVANCED_LEADER_METRICS.includes(metric)) {
    sendError(res, 400, "INVALID_QUERY", "Invalid metric");
    return;
  }
  const scopeValue = requestedAdvancedScope(req, res);
  if (scopeValue === null) return;

  const [available, allRounds, teams] = await Promise.all([
    getStatsScopes(season.seasonCode),
    getStatsRounds(season.seasonCode, "all"),
    getTeams(season.seasonCode),
  ]);
  const scopes = ADVANCED_SCOPES.filter((code) => available.includes(code));
  const earlySeason = allRounds.length < EARLY_SEASON_ROUNDS;
  const defaultMinMinutes = earlySeason ? EARLY_SEASON_MIN_MINUTES : LEADER_DEFAULT_MIN_MINUTES[metric];
  const minMinutes = pageParameter(req.query.minMinutes, defaultMinMinutes, 0, 3000);
  const limit = pageParameter(req.query.limit, 50, 1, 100);
  if (minMinutes === null || limit === null) {
    sendError(res, 400, "INVALID_QUERY", "Invalid leaderboard filter");
    return;
  }

  const scope = metric === "rapm" ? "all" : (scopeValue ?? scopes[0]);
  const base = { metric, scopes, earlySeason, roundsPlayed: allRounds.length, minMinutes, defaultMinMinutes };
  if (scope === undefined || !available.includes(scope)) {
    res.json({ ...base, scope: scope ?? null, round: null, entries: [] });
    return;
  }

  const minSeconds = minMinutes * 60;
  const clubs = new Map(teams.map((team) => [team.clubCode, team]));
  const club = (clubCode: string | null) => ({
    clubCode,
    clubName: clubCode === null ? null : (clubs.get(clubCode)?.name ?? null),
    crestUrl: clubCode === null ? null : (clubs.get(clubCode)?.crestUrl ?? null),
  });

  let round: number | null = null;
  let entries: Record<string, unknown>[];
  if (metric === "per" || metric === "winSharesPer40") {
    const rounds = await getStatsRounds(season.seasonCode, scope);
    round = rounds[rounds.length - 1] ?? null;
    if (round === null) {
      res.json({ ...base, scope, round, entries: [] });
      return;
    }
    if (metric === "per") {
      const rows = await getPerLeaders(season.seasonCode, scope, round, minSeconds, limit);
      entries = rows.map((row) => ({
        personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
        games: row.gamesPlayed, seconds: row.secondsPlayed, value: row.per,
      }));
    } else {
      const rows = await getWinShareLeaders(season.seasonCode, scope, round, minSeconds, limit);
      entries = rows.map((row) => ({
        personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
        games: row.gamesPlayed, seconds: row.secondsPlayed, value: row.winSharesPer40, winShares: row.winShares,
      }));
    }
  } else if (metric === "rapm") {
    const rows = await getPlayerRapm(season.seasonCode, { minSeconds, limit });
    const lastRound = allRounds[allRounds.length - 1];
    const playerClubs = lastRound === undefined
      ? new Map<string, string | null>()
      : await getPlayerClubs(season.seasonCode, "all", lastRound, rows.map((row) => row.personKey));
    entries = rows.map((row) => ({
      personKey: row.personKey, playerName: row.playerName, ...club(playerClubs.get(row.personKey) ?? null),
      games: null, seconds: row.seconds, value: row.rapm, offense: row.offense, defense: row.defense,
    }));
  } else {
    const rows = await getPlayerOnOff(season.seasonCode, scope, { minSeconds, limit });
    entries = rows.map((row) => ({
      personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
      games: row.games, seconds: row.onSeconds, value: row.netRatingDiff,
      onNetRating: row.onNetRating, offNetRating: row.offNetRating,
    }));
  }
  res.json({ ...base, scope, round, entries });
});

function requestedPersonKeyFilter(req: Request, res: Response): string | undefined | null {
  const value = req.query.personKey;
  if (value === undefined) return undefined;
  if (!validIdentity(value)) {
    sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    return null;
  }
  return value;
}

seasonRouter.get("/:seasonCode/season-stats", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phase = requestedStatsPhase(req, res);
  if (phase === null) return;
  const mode = requestedStatsMode(req, res);
  if (mode === null) return;
  const page = requestedPage(req, res);
  if (!page) return;
  const personKey = requestedPersonKeyFilter(req, res);
  if (personKey === null) return;
  const sort = requestedStatsSort(req, res);
  if (sort === null) return;
  const order = requestedStatsOrder(req, res);
  if (order === null) return;
  const result = await getSeasonStats(
    season.seasonCode,
    phase,
    mode,
    page.limit,
    page.offset,
    personKey,
    sort as SortableStatsField | undefined,
    order,
  );
  res.json({ phase, mode, players: result.items, pagination: { ...page, hasMore: result.hasMore, total: result.total } });
});

seasonRouter.get("/:seasonCode/records/player-seasons", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const metric = req.query.metric === undefined ? "pointsScored" : req.query.metric;
  if (typeof metric !== "string" || !RECORD_METRICS.includes(metric as typeof RECORD_METRICS[number])) {
    sendError(res, 400, "INVALID_RECORD_METRIC", "Invalid record metric");
    return;
  }
  const perSeason = await Promise.all(SUPPORTED_SEASONS.map(async (seasonCode) => {
    const result = await getSeasonStats(seasonCode, "all", "accumulated", 100, 0, undefined, metric as SortableStatsField, "desc");
    return result.items.map((player) => ({ seasonCode, personKey: player.personKey, playerName: player.playerName, clubName: player.clubName, value: player.traditional[metric as keyof typeof player.traditional] }));
  }));
  const rows = perSeason.flat().map((row) => ({ ...row, numericValue: Number(row.value) })).filter((row) => Number.isFinite(row.numericValue)).sort((a, b) => b.numericValue - a.numericValue || a.seasonCode.localeCompare(b.seasonCode));
  res.json({ metric, label: { pointsScored: "Points", totalRebounds: "Rebounds", assists: "Assists", pir: "PIR" }[metric], records: rows.slice(0, 50) });
});

seasonRouter.get("/:seasonCode/records/single-games", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const metric = req.query.metric === undefined ? "points" : req.query.metric;
  const columns = {
    points: gamePlayerStats.points,
    valuation: gamePlayerStats.valuation,
    totalRebounds: gamePlayerStats.totalRebounds,
    assistances: gamePlayerStats.assistances,
  };
  if (typeof metric !== "string" || !(metric in columns)) {
    sendError(res, 400, "INVALID_RECORD_METRIC", "Invalid record metric");
    return;
  }
  const column = columns[metric as keyof typeof columns];
  const rows = (await Promise.all(SUPPORTED_SEASONS.map(async (seasonCode) => {
    const seasonRows = await catalogRead(() => db.select({
      gameCode: gamePlayerStats.gameCode,
      personKey: gamePlayerStats.personKey,
      playerName: gamePlayerStats.personName,
      clubName: gamePlayerStats.clubName,
      scheduledAt: games.scheduledAt,
      value: column,
    }).from(gamePlayerStats).innerJoin(games, and(
      eq(games.competitionCode, gamePlayerStats.competitionCode),
      eq(games.seasonCode, gamePlayerStats.seasonCode),
      eq(games.gameCode, gamePlayerStats.gameCode),
    )).where(and(
      eq(gamePlayerStats.competitionCode, "E"),
      eq(gamePlayerStats.seasonCode, seasonCode),
      eq(games.played, true),
    )).orderBy(desc(column)).limit(50));
    return seasonRows.map((row) => ({ ...row, seasonCode }));
  }))).flat().map((row) => ({ ...row, numericValue: Number(row.value) })).filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(row.numericValue)).sort((a, b) => b.numericValue - a.numericValue || a.seasonCode.localeCompare(b.seasonCode) || a.gameCode - b.gameCode || a.personKey.localeCompare(b.personKey)).slice(0, 50);
  res.json({ metric, label: { points: "Points", valuation: "PIR", totalRebounds: "Rebounds", assistances: "Assists" }[metric], records: rows });
});

seasonRouter.get("/:seasonCode/records/team-seasons", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const metric = req.query.metric === undefined ? "points" : req.query.metric;
  const columns = {
    points: gameTeamStats.points,
    valuation: gameTeamStats.valuation,
    totalRebounds: gameTeamStats.totalRebounds,
    assistances: gameTeamStats.assistances,
  };
  if (typeof metric !== "string" || !(metric in columns)) {
    sendError(res, 400, "INVALID_RECORD_METRIC", "Invalid record metric");
    return;
  }
  const column = columns[metric as keyof typeof columns];
  const clubCode = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubCode} else ${games.roadClubCode} end`;
  const clubName = sql<string | null>`case when ${gameTeamStats.side} = 'local' then ${games.localClubName} else ${games.roadClubName} end`;
  const total = sql<string | null>`sum(${column})`;
  const rows = await catalogRead(() => db.select({
    seasonCode: gameTeamStats.seasonCode,
    clubCode,
    clubName,
    value: total,
  }).from(gameTeamStats).innerJoin(games, and(
    eq(games.competitionCode, gameTeamStats.competitionCode),
    eq(games.seasonCode, gameTeamStats.seasonCode),
    eq(games.gameCode, gameTeamStats.gameCode),
  )).where(and(
    eq(gameTeamStats.competitionCode, "E"),
    inArray(gameTeamStats.seasonCode, SUPPORTED_SEASONS),
    eq(gameTeamStats.statsKind, "total"),
    eq(games.played, true),
  )).groupBy(gameTeamStats.seasonCode, clubCode, clubName));
  const records = rows.flatMap((row) => {
    if (row.clubCode === null || row.value === null) return [];
    const numericValue = Number(row.value);
    return Number.isFinite(numericValue) ? [{ ...row, clubCode: row.clubCode, numericValue }] : [];
  })
    .sort((a, b) => b.numericValue - a.numericValue || a.seasonCode.localeCompare(b.seasonCode) || a.clubCode.localeCompare(b.clubCode))
    .slice(0, 50);
  res.json({ metric, label: { points: "Points", valuation: "PIR", totalRebounds: "Rebounds", assistances: "Assists" }[metric], records });
});

seasonRouter.get("/:seasonCode/teams", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (season) res.json({ teams: await getTeams(season.seasonCode) });
});

seasonRouter.get("/:seasonCode/teams/:clubCode", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  const team = await getTeam(season.seasonCode, clubCode);
  if (!team) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }
  res.json({ team });
});

seasonRouter.get("/:seasonCode/teams/:clubCode/roster", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  if (!await getTeam(season.seasonCode, clubCode)) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }
  const page = requestedPage(req, res);
  if (!page) return;
  const result = await getTeamRoster(season.seasonCode, clubCode, page.limit, page.offset);
  res.json({ registrations: result.items, pagination: { ...page, hasMore: result.hasMore } });
});

seasonRouter.get("/:seasonCode/teams/:clubCode/games", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  if (!await getTeam(season.seasonCode, clubCode)) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }
  const page = requestedPage(req, res);
  if (!page) return;
  const status = requestedGameStatus(req, res);
  if (status === null) return;
  const order = requestedGameOrder(req, res);
  if (order === null) return;
  const result = await getTeamGames(season.seasonCode, clubCode, page.limit, page.offset, status, order);
  res.json({ games: result.items, pagination: { ...page, hasMore: result.hasMore } });
});

seasonRouter.get("/:seasonCode/teams/:clubCode/team-stats", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  if (!await getTeam(season.seasonCode, clubCode)) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }
  const phases = await getPhases(season.seasonCode);
  const phaseCode = req.query.phase;
  if (typeof phaseCode !== "string" || !phases.some((phase) => phase.code === phaseCode)) {
    sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    return;
  }
  res.json(await getTeamStatsSummary(season.seasonCode, phaseCode, clubCode));
});

function requestedAdvancedScope(req: Request, res: Response): string | undefined | null {
  const value = req.query.scope;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !ADVANCED_SCOPES.includes(value)) {
    sendError(res, 400, "INVALID_SCOPE", "Invalid scope");
    return null;
  }
  return value;
}

// Trend, splits, play-by-play and shot zones for one club in one scope. The trend is one point per round of
// cumulative values (never summed); the splits are the state after the club's latest round in the scope.
seasonRouter.get("/:seasonCode/teams/:clubCode/advanced", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  const scopeValue = requestedAdvancedScope(req, res);
  if (scopeValue === null) return;
  if (!await getTeam(season.seasonCode, clubCode)) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }

  const available = new Set(await getTeamStatsScopes(season.seasonCode, clubCode));
  const scopes = ADVANCED_SCOPES.filter((code) => available.has(code));
  const scope = scopeValue ?? scopes[0];
  if (scope === undefined || !available.has(scope)) {
    res.json({ scope: scope ?? null, scopes, trend: [], splits: null, pbp: null, zones: [] });
    return;
  }

  const [stats, ratings, splits, pbp, zones] = await Promise.all([
    getTeamRoundStats(season.seasonCode, scope, clubCode),
    getTeamRoundRatings(season.seasonCode, scope, clubCode),
    getTeamRoundSplits(season.seasonCode, scope, clubCode),
    getTeamPbpStats(season.seasonCode, scope, clubCode),
    getTeamShotZoneStats(season.seasonCode, scope, clubCode),
  ]);
  const ratingsByRound = new Map(ratings.map((row) => [row.roundNumber, row]));
  res.json({
    scope,
    scopes,
    trend: stats.map((row) => {
      const rating = ratingsByRound.get(row.roundNumber);
      return {
        round: row.roundNumber,
        gamesPlayed: row.gamesPlayed,
        offensiveRating: row.offensiveRating,
        defensiveRating: row.defensiveRating,
        netRating: row.netRating,
        pace: row.pace,
        srs: rating?.srs ?? null,
        adjNetRating: rating?.adjNetRating ?? null,
      };
    }),
    splits: splits[splits.length - 1] ?? null,
    pbp,
    zones,
  });
});

const LINEUP_SIZES = [2, 3, 5];

seasonRouter.get("/:seasonCode/teams/:clubCode/lineups", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const clubCode = req.params.clubCode;
  if (!validIdentity(clubCode)) {
    sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    return;
  }
  const scope = requestedAdvancedScope(req, res);
  if (scope === null) return;
  const size = pageParameter(req.query.size, 5, 2, 5);
  if (size === null || !LINEUP_SIZES.includes(size)) {
    sendError(res, 400, "INVALID_QUERY", "Invalid lineup size");
    return;
  }
  const minPossessions = pageParameter(req.query.minPossessions, 100, 0, 5000);
  const limit = pageParameter(req.query.limit, 15, 1, 50);
  if (minPossessions === null || limit === null) {
    sendError(res, 400, "INVALID_QUERY", "Invalid lineup filter");
    return;
  }
  if (!await getTeam(season.seasonCode, clubCode)) {
    sendError(res, 404, "TEAM_NOT_FOUND", "Team not found");
    return;
  }

  const lineupScope = scope ?? "RS";
  const lineups = await getLineupRatings(season.seasonCode, lineupScope, {
    clubCode,
    lineupSize: size as 2 | 3 | 5,
    minPossessions,
    limit,
  });
  res.json({ scope: lineupScope, size, minPossessions, lineups });
});

seasonRouter.get("/:seasonCode/players", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const page = requestedPage(req, res);
  if (!page) return;
  const search = requestedSearch(req, res);
  if (search === null) return;
  const result = await getPlayers(season.seasonCode, page.limit, page.offset, search);
  res.json({ players: result.items, pagination: { ...page, hasMore: result.hasMore, total: result.total } });
});

seasonRouter.get("/:seasonCode/players/:personKey", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const personKey = req.params.personKey;
  if (!validIdentity(personKey)) {
    sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    return;
  }
  const player = await getPlayer(season.seasonCode, personKey);
  if (!player) {
    sendError(res, 404, "PLAYER_NOT_FOUND", "Player not found");
    return;
  }
  res.json({ player });
});

// A season with fewer rounds than this is still early: RAPM and on/off from it are too noisy to trust.
const EARLY_SEASON_ROUNDS = 10;

// Round-by-round PER, Win Shares and USG% for one player in one scope, plus on/off (one row per club, so a
// traded player has several) and the whole-season RAPM. Sample sizes come back with the values; the page
// decides what to hide.
seasonRouter.get("/:seasonCode/players/:personKey/advanced", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const personKey = req.params.personKey;
  if (!validIdentity(personKey)) {
    sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    return;
  }
  const scopeValue = requestedAdvancedScope(req, res);
  if (scopeValue === null) return;
  if (!await getPlayer(season.seasonCode, personKey)) {
    sendError(res, 404, "PLAYER_NOT_FOUND", "Player not found");
    return;
  }

  const available = new Set(await getPlayerStatsScopes(season.seasonCode, personKey));
  const scopes = ADVANCED_SCOPES.filter((code) => available.has(code));
  const scope = scopeValue ?? scopes[0];
  const [seasonRounds, rapmRows] = await Promise.all([
    getStatsRounds(season.seasonCode, "all"),
    getPlayerRapm(season.seasonCode, { personKey, limit: 1 }),
  ]);
  const base = { scopes, roundsPlayed: seasonRounds.length, earlySeason: seasonRounds.length < EARLY_SEASON_ROUNDS, rapm: rapmRows[0] ?? null };
  if (scope === undefined || !available.has(scope)) {
    res.json({ ...base, scope: scope ?? null, rounds: [], onOff: [] });
    return;
  }

  const [stats, ratings, winShares, onOff, teams] = await Promise.all([
    getPlayerRoundStats(season.seasonCode, scope, personKey),
    getPlayerRoundRatings(season.seasonCode, scope, personKey),
    getPlayerRoundWinShares(season.seasonCode, scope, personKey),
    getPlayerOnOff(season.seasonCode, scope, { personKey, limit: 10 }),
    getTeams(season.seasonCode),
  ]);
  const ratingsByRound = new Map(ratings.map((row) => [row.roundNumber, row]));
  const winSharesByRound = new Map(winShares.map((row) => [row.roundNumber, row]));
  const clubs = new Map(teams.map((team) => [team.clubCode, team]));
  res.json({
    ...base,
    scope,
    rounds: stats.map((row) => {
      const rating = ratingsByRound.get(row.roundNumber);
      const shares = winSharesByRound.get(row.roundNumber);
      return {
        round: row.roundNumber,
        clubCode: row.clubCode,
        gamesPlayed: row.gamesPlayed,
        secondsPlayed: row.secondsPlayed,
        usgPct: row.usgPct,
        per: rating?.per ?? null,
        winShares: shares?.winShares ?? null,
        winSharesPer40: shares?.winSharesPer40 ?? null,
      };
    }),
    onOff: onOff.map((row) => ({
      ...row,
      clubName: clubs.get(row.clubCode)?.name ?? null,
      crestUrl: clubs.get(row.clubCode)?.crestUrl ?? null,
    })),
  });
});

seasonRouter.get("/:seasonCode/players/:personKey/registrations", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const personKey = req.params.personKey;
  if (!validIdentity(personKey)) {
    sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    return;
  }
  if (!await getPlayer(season.seasonCode, personKey)) {
    sendError(res, 404, "PLAYER_NOT_FOUND", "Player not found");
    return;
  }
  res.json({ registrations: await getPlayerRegistrations(season.seasonCode, personKey) });
});

seasonRouter.get("/:seasonCode/players/:personKey/games", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const personKey = req.params.personKey;
  if (!validIdentity(personKey)) {
    sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    return;
  }
  if (!await getPlayer(season.seasonCode, personKey)) {
    sendError(res, 404, "PLAYER_NOT_FOUND", "Player not found");
    return;
  }
  const page = requestedPage(req, res);
  if (!page) return;
  const result = await getPlayerGameLog(season.seasonCode, personKey, page.limit, page.offset);
  res.json({ games: result.items, pagination: { ...page, hasMore: result.hasMore } });
});

function requestedGameStatus(req: Request, res: Response): "played" | "scheduled" | undefined | null {
  const value = req.query.status;
  if (value === undefined) return undefined;
  if (value !== "played" && value !== "scheduled") {
    sendError(res, 400, "INVALID_STATUS", "Invalid status");
    return null;
  }
  return value;
}

function requestedGameOrder(req: Request, res: Response): "asc" | "desc" | null {
  const value = req.query.order;
  if (value === undefined) return "asc";
  if (value !== "asc" && value !== "desc") {
    sendError(res, 400, "INVALID_ORDER", "Invalid order");
    return null;
  }
  return value;
}

seasonRouter.get("/:seasonCode/games", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const page = requestedPage(req, res);
  if (!page) return;
  const status = requestedGameStatus(req, res);
  if (status === null) return;
  const order = requestedGameOrder(req, res);
  if (order === null) return;

  const phaseValue = req.query.phase;
  if (phaseValue !== undefined && typeof phaseValue !== "string") {
    sendError(res, 400, "INVALID_PHASE", "Invalid phase");
    return;
  }
  const requestedRoundResult = requestedRound(req, res);
  if (!requestedRoundResult) return;
  const round = requestedRoundResult.round;

  if (round !== undefined && phaseValue === undefined) {
    sendError(res, 400, "INVALID_ROUND", "Round requires a phase");
    return;
  }

  let phaseCode: string | undefined;
  if (phaseValue !== undefined) {
    const phases = await getPhases(season.seasonCode);
    if (!phases.some((phase) => phase.code === phaseValue)) {
      sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
      return;
    }
    phaseCode = phaseValue;
    if (round !== undefined) {
      const rounds = await getRounds(season.seasonCode, phaseCode);
      if (!rounds.some((r) => r.number === round)) {
        sendError(res, 404, "ROUND_NOT_FOUND", "Round not found");
        return;
      }
    }
  }

  const result = await getGames(season.seasonCode, page.limit, page.offset, status, order, phaseCode, round);
  res.json({ games: result.items, pagination: { ...page, hasMore: result.hasMore, total: result.total } });
});

seasonRouter.get("/:seasonCode/games/:gameCode", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  const game = await getGame(season.seasonCode, gameCode);
  if (!game) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json({ game });
});

seasonRouter.get("/:seasonCode/games/:gameCode/box-score", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getBoxScore(season.seasonCode, gameCode));
});

// Season-to-date values come from the `all` scope at the game's own round. They are hidden (null) while the
// player's cumulative minutes are under the same minimum the advanced leaders use.
const GAME_SEASON_SCOPE = "all";
// A team average over fewer games than this is mostly the game itself, so it is hidden.
const MIN_SEASON_GAMES = 3;

seasonRouter.get("/:seasonCode/games/:gameCode/advanced", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  const game = await getGame(season.seasonCode, gameCode);
  if (!game) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  const round = game.roundNumber;
  const minSeasonMinutes = round !== null && round < EARLY_SEASON_ROUNDS ? EARLY_SEASON_MIN_MINUTES : LEADER_DEFAULT_MIN_MINUTES.per;
  const { teams, players } = await getGameAdvanced(season.seasonCode, gameCode);
  if (teams.length === 0 && players.length === 0) {
    res.json({ available: false, scope: GAME_SEASON_SCOPE, round, minSeasonMinutes, minSeasonGames: MIN_SEASON_GAMES, teams: [], players: [] });
    return;
  }

  const [seasonToDate, teamsToDate] = round === null
    ? [new Map(), new Map()]
    : await Promise.all([
        getPlayersSeasonToDate(season.seasonCode, round, players.map((row) => row.personKey)),
        getTeamsSeasonToDate(season.seasonCode, round, teams.map((row) => row.clubCode)),
      ]);
  res.json({
    available: true,
    scope: GAME_SEASON_SCOPE,
    round,
    minSeasonMinutes,
    minSeasonGames: MIN_SEASON_GAMES,
    teams: teams.map(({ competitionCode: _competition, seasonCode: _season, gameCode: _game, ...row }) => {
      const cumulative = teamsToDate.get(row.clubCode);
      const hidden = !cumulative || cumulative.gamesPlayed < MIN_SEASON_GAMES;
      return {
        ...row,
        season: cumulative
          ? {
              gamesPlayed: cumulative.gamesPlayed,
              hidden,
              pace: hidden ? null : cumulative.pace,
              offensiveRating: hidden ? null : cumulative.offensiveRating,
              defensiveRating: hidden ? null : cumulative.defensiveRating,
              netRating: hidden ? null : cumulative.netRating,
              efgPct: hidden ? null : cumulative.efgPct,
              tovPct: hidden ? null : cumulative.tovPct,
              orbPct: hidden ? null : cumulative.orbPct,
              drbPct: hidden ? null : cumulative.drbPct,
              ftRate: hidden ? null : cumulative.ftRate,
              oppEfgPct: hidden ? null : cumulative.oppEfgPct,
              oppTovPct: hidden ? null : cumulative.oppTovPct,
              oppFtRate: hidden ? null : cumulative.oppFtRate,
            }
          : null,
      };
    }),
    players: players.map(({ competitionCode: _competition, seasonCode: _season, gameCode: _game, ...row }) => {
      const cumulative = seasonToDate.get(row.personKey);
      const hidden = !cumulative || cumulative.secondsPlayed === null || cumulative.secondsPlayed < minSeasonMinutes * 60;
      return {
        ...row,
        season: cumulative
          ? {
              secondsPlayed: cumulative.secondsPlayed,
              hidden,
              per: hidden ? null : cumulative.per,
              usgPct: hidden ? null : cumulative.usgPct,
              winShares: hidden ? null : cumulative.winShares,
            }
          : null,
      };
    }),
  });
});

// Score flow, shot splits and counted possessions of one game, straight from the pipeline's per-game team tables.
seasonRouter.get("/:seasonCode/games/:gameCode/team-flow", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  const teams = await getGameTeamFlow(season.seasonCode, gameCode);
  res.json({ available: teams.length > 0, teams });
});

// Each player's on-court intervals and the game's five-man units, straight from the pipeline's per-game tables.
seasonRouter.get("/:seasonCode/games/:gameCode/lineups", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getGameLineups(season.seasonCode, gameCode));
});

seasonRouter.get("/:seasonCode/games/:gameCode/play-by-play", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getPlayByPlay(season.seasonCode, gameCode));
});

seasonRouter.get("/:seasonCode/games/:gameCode/shots", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req.params.gameCode, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getShots(season.seasonCode, gameCode));
});

seasonRouter.get("/:seasonCode/postseason-series", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  res.json(await getPostseasonSeries(season.seasonCode));
});

seasonRouter.get("/:seasonCode/coverage", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCodeValue = req.query.gameCode;
  if (gameCodeValue === undefined) {
    res.json(await getCoverage(season.seasonCode));
    return;
  }
  if (typeof gameCodeValue !== "string") {
    sendError(res, 400, "INVALID_GAME_CODE", "Invalid game code");
    return;
  }
  const gameCode = requestedGameCode(gameCodeValue, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getCoverage(season.seasonCode, gameCode));
});

seasonRouter.use((_req, res) => {
  sendError(res, 404, "ROUTE_NOT_FOUND", "Season catalog route not found");
});

seasonRouter.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof URIError && "status" in error && error.status === 400) {
    const [, seasonCode, section, phaseCode, action] = req.path.split("/");
    if (hasMalformedEncoding(seasonCode)) {
      sendError(res, 400, "INVALID_SEASON", "Unsupported season");
    } else if (section === "phases" && (action === "rounds" || action === "standings") && hasMalformedEncoding(phaseCode)) {
      sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    } else if (section === "teams" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    } else if (section === "players" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
    } else if (section === "games" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 400, "INVALID_GAME_CODE", "Invalid game code");
    } else {
      sendError(res, 404, "ROUTE_NOT_FOUND", "Season catalog route not found");
    }
    return;
  }
  if (error instanceof CatalogDatabaseError) {
    sendError(res, 503, "DATABASE_UNAVAILABLE", "Database unavailable");
    return;
  }
  sendError(res, 500, "INTERNAL_ERROR", "Unexpected server error");
});
