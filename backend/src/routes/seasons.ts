import { Router, type NextFunction, type Request, type Response } from "express";
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
import { getBoxScore, getGame, getGames, getTeamGames } from "../db/season-games";
import { getLatestStandingsRound, getStandings } from "../db/season-standings";
import { getSeasonStats } from "../db/season-stats";

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

function requestedGameCode(req: Request, res: Response): number | null {
  const value = req.params.gameCode;
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

const SEASON_STATS_PHASES = ["RS", "PI", "PO", "FF", "all"];
const SEASON_STATS_MODES = ["accumulated", "perGame"];

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

seasonRouter.get("/:seasonCode/season-stats", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const phase = requestedStatsPhase(req, res);
  if (phase === null) return;
  const mode = requestedStatsMode(req, res);
  if (mode === null) return;
  const page = requestedPage(req, res);
  if (!page) return;
  const result = await getSeasonStats(season.seasonCode, phase, mode, page.limit, page.offset);
  res.json({ phase, mode, players: result.items, pagination: { ...page, hasMore: result.hasMore } });
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

seasonRouter.get("/:seasonCode/players", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const page = requestedPage(req, res);
  if (!page) return;
  const result = await getPlayers(season.seasonCode, page.limit, page.offset);
  res.json({ players: result.items, pagination: { ...page, hasMore: result.hasMore } });
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
  res.json({ games: result.items, pagination: { ...page, hasMore: result.hasMore } });
});

seasonRouter.get("/:seasonCode/games/:gameCode", async (req, res) => {
  const season = await requestedSeason(req, res);
  if (!season) return;
  const gameCode = requestedGameCode(req, res);
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
  const gameCode = requestedGameCode(req, res);
  if (gameCode === null) return;
  if (!await getGame(season.seasonCode, gameCode)) {
    sendError(res, 404, "GAME_NOT_FOUND", "Game not found");
    return;
  }
  res.json(await getBoxScore(season.seasonCode, gameCode));
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
