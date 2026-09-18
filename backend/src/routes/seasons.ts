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
