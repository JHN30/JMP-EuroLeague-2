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

seasonRouter.use((_req, res) => {
  sendError(res, 404, "ROUTE_NOT_FOUND", "Season catalog route not found");
});

seasonRouter.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof URIError && "status" in error && error.status === 400) {
    const [, seasonCode, section, phaseCode, action] = req.path.split("/");
    if (hasMalformedEncoding(seasonCode)) {
      sendError(res, 400, "INVALID_SEASON", "Unsupported season");
    } else if (section === "phases" && action === "rounds" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 404, "PHASE_NOT_FOUND", "Phase not found");
    } else if (section === "teams" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 400, "INVALID_TEAM_CODE", "Invalid team code");
    } else if (section === "players" && hasMalformedEncoding(phaseCode)) {
      sendError(res, 400, "INVALID_PLAYER_KEY", "Invalid player key");
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
