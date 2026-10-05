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
  getPlayerImages,
  getPlayers,
  getTeam,
  getTeamCoaches,
  getTeamRoster,
  getTeams,
} from "../db/season-identities";
import { getBoxScore, getGame, getGames, getLeagueTeamStats, getPhaseResults, getPlayByPlay, getPlayerGameLog, getPostseasonSeries, getShots, getTeamGames, getTeamStatsSummary } from "../db/season-games";
import { getCoverage } from "../db/season-coverage";
import { getLatestStandingsRound, getStandings } from "../db/season-standings";
import {
  getGameAdvanced,
  getGameFlow,
  getGameLineups,
  getGameTeamFlow,
  getLineupRatings,
  getPerLeaders,
  getRoundStatLeaders,
  getRoundStatRows,
  getClubPlayersAdvanced,
  ROUND_STAT_METRICS,
  type RoundStatMetric,
  getUsageLeaders,
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
import { getPlayerForm } from "../db/season-form";
import { getSeasonStats, SORTABLE_STATS_FIELDS, type SortableStatsField, type StatsFilters } from "../db/season-stats";
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

// ?qualified=true keeps only players who meet the minimum games; ?minGames=N keeps players with at least N games.
function requestedStatsFilters(req: Request, res: Response): StatsFilters | null {
  const filters: StatsFilters = {};
  const { qualified, minGames } = req.query;
  if (qualified !== undefined) {
    if (qualified !== "true" && qualified !== "false") {
      sendError(res, 400, "INVALID_QUERY", "Invalid qualified filter");
      return null;
    }
    filters.qualified = qualified === "true";
  }
  if (minGames !== undefined) {
    const parsed = typeof minGames === "string" && /^\d{1,3}$/.test(minGames) ? Number(minGames) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
      sendError(res, 400, "INVALID_QUERY", "Invalid minimum games");
      return null;
    }
    filters.minGames = parsed;
  }
  return filters;
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

// A season is addressed by its code ("E2026") or by its year alone ("2026", which is what the site's addresses show).
async function requestedSeason(req: Request, res: Response): Promise<Season | null> {
  const requested = req.params.seasonCode;
  const seasonCode = typeof requested === "string" && /^\d{4}$/.test(requested) ? "E" + requested : requested;
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

const ROUND_STAT_METRIC_KEYS = Object.keys(ROUND_STAT_METRICS);
const ADVANCED_LEADER_METRICS = ["per", "winShares", "winSharesPer40", "rapm", "onOff", ...ROUND_STAT_METRIC_KEYS];
// Default minimum minutes (on court for RAPM and on/off) per metric in a full season. Early in a season nobody has
// that many, so the default drops to a small floor and the response says the season is still early. A metric not listed
// here (the round-table rates) uses the PER default.
const LEADER_DEFAULT_MIN_MINUTES: Record<string, number> = { per: 100, winSharesPer40: 100, rapm: 500, onOff: 300 };
const EARLY_SEASON_MIN_MINUTES = 20;
const LEADERS_EVERYONE = 1000;

// One leaderboard of the advanced player metrics. PER, Win Shares and the round-table rates (per-100 figures, usage,
// shooting and rebounding percentages, PIE, game score) read each player's cumulative row at the scope's latest round;
// on/off reads the scope; RAPM is a whole-season table, so its scope is always "all". `total` is how many players qualify, and
// `offset` and `limit` page through them; `order=asc` ranks the lowest first (fewest turnovers).
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
  const order = req.query.order === undefined ? "desc" : req.query.order;
  if (order !== "asc" && order !== "desc") {
    sendError(res, 400, "INVALID_QUERY", "Invalid order");
    return;
  }

  const [available, allRounds, teams] = await Promise.all([
    getStatsScopes(season.seasonCode),
    getStatsRounds(season.seasonCode, "all"),
    getTeams(season.seasonCode),
  ]);
  const scopes = ADVANCED_SCOPES.filter((code) => available.includes(code));
  const earlySeason = allRounds.length < EARLY_SEASON_ROUNDS;
  const defaultMinMinutes = earlySeason ? EARLY_SEASON_MIN_MINUTES : (LEADER_DEFAULT_MIN_MINUTES[metric] ?? LEADER_DEFAULT_MIN_MINUTES.per);
  const minMinutes = pageParameter(req.query.minMinutes, defaultMinMinutes, 0, 3000);
  const limit = pageParameter(req.query.limit, 50, 1, 100);
  const offset = pageParameter(req.query.offset, 0, 0, 900);
  if (minMinutes === null || limit === null || offset === null) {
    sendError(res, 400, "INVALID_QUERY", "Invalid leaderboard filter");
    return;
  }

  const scope = metric === "rapm" ? "all" : (scopeValue ?? scopes[0]);
  const base = { metric, scopes, earlySeason, roundsPlayed: allRounds.length, minMinutes, defaultMinMinutes };
  if (scope === undefined || !available.includes(scope)) {
    res.json({ ...base, scope: scope ?? null, round: null, total: 0, entries: [] });
    return;
  }

  const minSeconds = minMinutes * 60;
  const clubs = new Map(teams.map((team) => [team.clubCode, team]));
  const club = (clubCode: string | null) => ({
    clubCode,
    clubName: clubCode === null ? null : (clubs.get(clubCode)?.name ?? null),
    crestUrl: clubCode === null ? null : (clubs.get(clubCode)?.crestUrl ?? null),
  });
  const page = <T,>(rows: T[]) => rows.slice(offset, offset + limit);

  let round: number | null = null;
  let total = 0;
  let entries: Record<string, unknown>[];
  if (metric === "rapm") {
    const rows = await getPlayerRapm(season.seasonCode, { minSeconds, limit: LEADERS_EVERYONE });
    total = rows.length;
    const shown = page(rows);
    const lastRound = allRounds[allRounds.length - 1];
    const playerClubs = lastRound === undefined
      ? new Map<string, string | null>()
      : await getPlayerClubs(season.seasonCode, "all", lastRound, shown.map((row) => row.personKey));
    entries = shown.map((row) => ({
      personKey: row.personKey, playerName: row.playerName, ...club(playerClubs.get(row.personKey) ?? null),
      games: null, seconds: row.seconds, value: row.rapm, offense: row.offense, defense: row.defense,
    }));
  } else if (metric === "onOff") {
    const rows = await getPlayerOnOff(season.seasonCode, scope, { minSeconds, limit: LEADERS_EVERYONE });
    total = rows.length;
    entries = page(rows).map((row) => ({
      personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
      games: row.games, seconds: row.onSeconds, value: row.netRatingDiff,
      onNetRating: row.onNetRating, offNetRating: row.offNetRating,
    }));
  } else {
    // PER, Win Shares and the round-table rates all read one round: the scope's latest.
    const rounds = await getStatsRounds(season.seasonCode, scope);
    round = rounds[rounds.length - 1] ?? null;
    if (round === null) {
      res.json({ ...base, scope, round, total: 0, entries: [] });
      return;
    }
    if (metric === "per") {
      const rows = await getPerLeaders(season.seasonCode, scope, round, minSeconds, LEADERS_EVERYONE);
      total = rows.length;
      entries = page(rows).map((row) => ({
        personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
        games: row.gamesPlayed, seconds: row.secondsPlayed, value: row.per,
      }));
    } else if (metric === "winSharesPer40" || metric === "winShares") {
      const rows = await getWinShareLeaders(season.seasonCode, scope, round, minSeconds, LEADERS_EVERYONE);
      if (metric === "winShares") rows.sort((x, y) => Number(y.winShares ?? -Infinity) - Number(x.winShares ?? -Infinity));
      total = rows.length;
      entries = page(rows).map((row) => ({
        personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
        games: row.gamesPlayed, seconds: row.secondsPlayed,
        value: metric === "winShares" ? row.winShares : row.winSharesPer40,
        winShares: row.winShares, winSharesPer40: row.winSharesPer40,
      }));
    } else {
      const rows = await getRoundStatLeaders(season.seasonCode, scope, round, metric as RoundStatMetric, minSeconds, order === "asc", LEADERS_EVERYONE);
      total = rows.length;
      entries = page(rows).map((row) => ({
        personKey: row.personKey, playerName: row.playerName, ...club(row.clubCode),
        games: row.gamesPlayed, seconds: row.secondsPlayed, value: row.value,
      }));
    }
  }
  // The advanced tables carry no photo, so each entry gets the one from the season statistics.
  const images = await getPlayerImages(season.seasonCode, entries.map((entry) => String(entry.personKey)));
  res.json({ ...base, scope, round, total, offset, entries: entries.map((entry) => ({ ...entry, imageUrl: images.get(String(entry.personKey)) ?? null })) });
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

const FORM_PHASES = ["RS", "PI", "PO", "FF"];

// Who is hot and who has moved: every qualified player's per-game numbers over their last N games and over the phase, and
// their rank on each stat now and before the latest round. `games` is the length of "hot right now" (default 5).
seasonRouter.get("/:seasonCode/leaders/form", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phase = req.query.phase === undefined ? "RS" : req.query.phase;
  if (typeof phase !== "string" || !FORM_PHASES.includes(phase)) {
    sendError(res, 400, "INVALID_PHASE", "Invalid phase");
    return;
  }
  const games = pageParameter(req.query.games, 5, 1, 20);
  if (games === null) {
    sendError(res, 400, "INVALID_QUERY", "Invalid number of games");
    return;
  }
  const { lastRound, players } = await getPlayerForm(season.seasonCode, phase, games);
  res.json({ phase, games, lastRound, players });
});

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
  const filters = requestedStatsFilters(req, res);
  if (filters === null) return;
  const result = await getSeasonStats(
    season.seasonCode,
    phase,
    mode,
    page.limit,
    page.offset,
    personKey,
    sort as SortableStatsField | undefined,
    order,
    filters,
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

// The head coach and assistants, for the roster page. Staff come from the same registrations as players.
seasonRouter.get("/:seasonCode/teams/:clubCode/coaches", async (req, res) => {
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
  res.json({ coaches: await getTeamCoaches(season.seasonCode, clubCode) });
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

// Every club's season totals for one phase, for ranking a club against the league.
seasonRouter.get("/:seasonCode/team-stats", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phases = await getPhases(season.seasonCode);
  const phaseCode = req.query.phase;
  if (typeof phaseCode !== "string" || !phases.some((phase) => phase.code === phaseCode)) {
    sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    return;
  }
  res.json(await getLeagueTeamStats(season.seasonCode, phaseCode));
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

// The advanced figures of a club's players (PER, Win Shares, Win Shares per 40, usage, true shooting, PIE, game score) as they
// stand after the scope's last round. The page decides which players are worth showing.
seasonRouter.get("/:seasonCode/teams/:clubCode/players-advanced", async (req, res) => {
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
  const scope = scopeValue ?? "RS";
  const rounds = await getStatsRounds(season.seasonCode, scope);
  const round = rounds[rounds.length - 1];
  const players = round === undefined ? [] : await getClubPlayersAdvanced(season.seasonCode, scope, round, clubCode);
  res.json({ scope, round: round ?? null, earlySeason: rounds.length < EARLY_SEASON_ROUNDS, players });
});

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

// Where one player stands on a metric among the players with enough minutes (the same minimum the leaderboards use):
// the rank (1 is the highest value), the percentile (100 is the top) and the spread of the whole group, so a page can
// say whether a value is good without guessing a scale. `rank` is null when the player has no value or too few minutes.
type AdvancedRank = {
  rank: number | null;
  of: number;
  value: number | null;
  percentile: number | null;
  spread: { p10: number; p25: number; p50: number; p75: number; p90: number } | null;
  minMinutes: number;
};

function quantile(sorted: number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

// `values` is the group, `own` the player's value in it (null when the player is not in the group).
function rankAmong(values: number[], own: number | null, minMinutes: number, lowerIsBetter = false): AdvancedRank {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((x, y) => x - y);
  const spread = sorted.length > 0
    ? { p10: quantile(sorted, 0.1), p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75), p90: quantile(sorted, 0.9) }
    : null;
  if (own === null || !Number.isFinite(own)) return { rank: null, of: sorted.length, value: null, percentile: null, spread, minMinutes };
  const rank = sorted.filter((value) => (lowerIsBetter ? value < own : value > own)).length + 1;
  const percentile = sorted.length > 1 ? Math.round(((sorted.length - rank) / (sorted.length - 1)) * 100) : 100;
  return { rank, of: sorted.length, value: own, percentile, spread, minMinutes };
}

function rankPlayerIn(rows: { personKey: string; value: number | null }[], personKey: string, minMinutes: number): AdvancedRank {
  const valued = rows.filter((row): row is { personKey: string; value: number } => row.value !== null && row.value !== undefined);
  const own = valued.find((row) => row.personKey === personKey);
  return rankAmong(valued.map((row) => Number(row.value)), own ? Number(own.value) : null, minMinutes);
}

// The player's rank on PER, Win Shares, Win Shares per 40, usage, RAPM and on/off net rating. PER, Win Shares and usage
// are the scope's running totals after its last round; RAPM is a whole-season table, so it does not depend on the scope;
// on/off uses the club the player spent most minutes with.
async function getPlayerAdvancedRanks(seasonCode: string, scope: string, personKey: string, earlySeason: boolean) {
  const minutesFor = (metric: string) => (earlySeason ? EARLY_SEASON_MIN_MINUTES : LEADER_DEFAULT_MIN_MINUTES[metric]);
  const rounds = await getStatsRounds(seasonCode, scope);
  const round = rounds[rounds.length - 1];
  const everyone = 1000;
  const [perRows, wsRows, usageRows, rapmRows, onOffRows] = await Promise.all([
    round === undefined ? [] : getPerLeaders(seasonCode, scope, round, minutesFor("per") * 60, everyone),
    round === undefined ? [] : getWinShareLeaders(seasonCode, scope, round, minutesFor("winSharesPer40") * 60, everyone),
    round === undefined ? [] : getUsageLeaders(seasonCode, scope, round, minutesFor("per") * 60, everyone),
    getPlayerRapm(seasonCode, { minSeconds: minutesFor("rapm") * 60, limit: everyone }),
    getPlayerOnOff(seasonCode, scope, { minSeconds: minutesFor("onOff") * 60, limit: everyone }),
  ]);
  const ownOnOff = onOffRows
    .filter((row) => row.personKey === personKey && row.netRatingDiff !== null)
    .sort((x, y) => Number(y.onSeconds) - Number(x.onSeconds))[0];
  return {
    per: rankPlayerIn(perRows.map((row) => ({ personKey: row.personKey, value: row.per })), personKey, minutesFor("per")),
    winShares: rankPlayerIn(wsRows.map((row) => ({ personKey: row.personKey, value: row.winShares })), personKey, minutesFor("winSharesPer40")),
    winSharesPer40: rankPlayerIn(wsRows.map((row) => ({ personKey: row.personKey, value: row.winSharesPer40 })), personKey, minutesFor("winSharesPer40")),
    usgPct: rankPlayerIn(usageRows.map((row) => ({ personKey: row.personKey, value: row.usgPct })), personKey, minutesFor("per")),
    rapm: rankPlayerIn(rapmRows.map((row) => ({ personKey: row.personKey, value: row.rapm })), personKey, minutesFor("rapm")),
    onOffNet: rankAmong(
      onOffRows.map((row) => Number(row.netRatingDiff)).filter((value) => Number.isFinite(value)),
      ownOnOff ? Number(ownOnOff.netRatingDiff) : null,
      minutesFor("onOff"),
    ),
  };
}

// Per-100 and rate figures that count against a player when high (turnovers) rank lowest first.
const LOWER_IS_BETTER_ROUND_STATS = new Set(["turnoversPer100", "tovPct"]);

// The player's per-100 and rate figures after the scope's last round and where each ranks among the players with enough
// minutes. A value is returned for a player under the minimum too, only without a rank.
async function getExtendedAdvanced(seasonCode: string, scope: string, personKey: string, earlySeason: boolean, own: Record<string, unknown> | undefined) {
  const rounds = await getStatsRounds(seasonCode, scope);
  const round = rounds[rounds.length - 1];
  const minMinutes = earlySeason ? EARLY_SEASON_MIN_MINUTES : LEADER_DEFAULT_MIN_MINUTES.per;
  const rows = round === undefined ? [] : await getRoundStatRows(seasonCode, scope, round, minMinutes * 60);
  const values: Record<string, number | null> = {};
  const ranks: Record<string, AdvancedRank> = {};
  for (const key of ROUND_STAT_METRIC_KEYS) {
    const raw = own?.[key];
    values[key] = raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : Number(raw);
    const group = rows
      .map((row) => (row as Record<string, unknown>)[key])
      .filter((value) => value !== null && value !== undefined)
      .map(Number);
    const inGroup = rows.some((row) => row.personKey === personKey);
    ranks[key] = rankAmong(group, inGroup ? values[key] : null, minMinutes, LOWER_IS_BETTER_ROUND_STATS.has(key));
  }
  return { values, ranks };
}

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

  const [stats, ratings, winShares, onOff, teams, ranks] = await Promise.all([
    getPlayerRoundStats(season.seasonCode, scope, personKey),
    getPlayerRoundRatings(season.seasonCode, scope, personKey),
    getPlayerRoundWinShares(season.seasonCode, scope, personKey),
    getPlayerOnOff(season.seasonCode, scope, { personKey, limit: 10 }),
    getTeams(season.seasonCode),
    getPlayerAdvancedRanks(season.seasonCode, scope, personKey, base.earlySeason),
  ]);
  // With `extended=true`: the per-100 and rate figures (and their ranks) the player comparison reads.
  const extended = req.query.extended === "true"
    ? await getExtendedAdvanced(season.seasonCode, scope, personKey, base.earlySeason, stats[stats.length - 1] as unknown as Record<string, unknown> | undefined)
    : undefined;
  const ratingsByRound = new Map(ratings.map((row) => [row.roundNumber, row]));
  const winSharesByRound = new Map(winShares.map((row) => [row.roundNumber, row]));
  const clubs = new Map(teams.map((team) => [team.clubCode, team]));
  res.json({
    ...base,
    scope,
    ranks,
    ...(extended ? { extended } : {}),
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
