import type { NextFunction, Request, Response } from "express";
import { ENV } from "./config/env";
import { SUPPORTED_SEASONS } from "./db/season-catalog";

// The data only changes when the pipeline publishes, so repeated reads within this window skip Neon,
// whose free plan meters every byte sent back.
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 1000;

// In production a reload or a new tab within 5 minutes (the frontend's staleTime) reuses the browser's copy. `private` keeps
// shared caches such as Cloudflare out, so a publish is never held back by a copy the app cannot clear. Development sends
// nothing, so a change of database or data shows at once.
const BROWSER_CACHE = ENV.NODE_ENV === "production" ? "private, max-age=300" : null;

const entries = new Map<string, { body: string; expiresAt: number }>();

function remember(key: string, body: string) {
  entries.delete(key);
  entries.set(key, { body, expiresAt: Date.now() + TTL_MS });
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
}

// The records routes rank the loaded seasons together, so the season in their address does not change the answer: one entry serves them
// all. A season that is not supported keeps its own key, so the route still answers it with its 400.
const RECORDS_URL = /^\/api\/seasons\/(E?\d{4})\/records\//;

function cacheKey(url: string) {
  const season = RECORDS_URL.exec(url)?.[1];
  if (!season) return url;
  const code = season.startsWith("E") ? season : `E${season}`;
  return SUPPORTED_SEASONS.some((supported) => supported === code) ? url.replace(RECORDS_URL, "/api/seasons/records/") : url;
}

// Caches successful GET replies by full URL (the records routes by one URL for every season). Errors are never stored.
export function responseCache(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") {
    next();
    return;
  }
  const key = cacheKey(req.originalUrl);
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    res.setHeader("X-Cache", "HIT");
    if (BROWSER_CACHE) res.setHeader("Cache-Control", BROWSER_CACHE);
    res.type("json").send(hit.body);
    return;
  }
  if (hit) entries.delete(key);

  res.setHeader("X-Cache", "MISS");
  const json = res.json.bind(res);
  res.json = (data: unknown) => {
    if (res.statusCode !== 200) return json(data);
    const body = JSON.stringify(data);
    remember(key, body);
    if (BROWSER_CACHE) res.setHeader("Cache-Control", BROWSER_CACHE);
    return res.type("json").send(body);
  };
  next();
}
