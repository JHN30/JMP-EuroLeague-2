import type { NextFunction, Request, Response } from "express";
import { ENV } from "./config/env";
import { DATA_TTL_MS } from "./db/remembered";
import { SUPPORTED_SEASONS } from "./db/season-catalog";

// Repeated reads within the window skip Neon, whose free plan meters every byte sent back.
const MAX_ENTRIES = 1000;

// In production a reload or a new tab within 5 minutes (the frontend's staleTime) reuses the browser's copy. `private` would
// keep shared caches out, but the live site's Cloudflare cache rules override it on purpose to save Neon traffic: the current
// season's answers are kept for 2 hours and older seasons' for 1 month. After a publish or a deploy, purge Cloudflare's cache
// for new data or headers to show at once. Development sends nothing, so a change of database or data shows at once.
const BROWSER_CACHE = ENV.NODE_ENV === "production" ? "private, max-age=300" : null;

const entries = new Map<string, { body: string; expiresAt: number }>();
// The answers being worked out now, by key: the body once it is a 200, or null when it will not be cached.
const pending = new Map<string, Promise<string | null>>();

function remember(key: string, body: string) {
  const now = Date.now();
  entries.delete(key);
  // Every entry lives DATA_TTL_MS from when it was stored and a re-store moves it to the end, so the map is in expiry order:
  // expired entries are all at the front, and dropping them here frees what no one has asked for again.
  for (const [oldKey, old] of entries) {
    if (old.expiresAt > now) break;
    entries.delete(oldKey);
  }
  entries.set(key, { body, expiresAt: now + DATA_TTL_MS });
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

function sendHit(res: Response, body: string) {
  res.setHeader("X-Cache", "HIT");
  if (BROWSER_CACHE) res.setHeader("Cache-Control", BROWSER_CACHE);
  res.type("json").send(body);
}

// Runs the route and stores a 200 answer. With `share`, identical requests arriving meanwhile wait for this answer instead of
// running the route too; whatever happens (a 200, an error, a connection closed before answering) the wait ends once.
function runRoute(key: string, res: Response, next: NextFunction, share: boolean) {
  let settle: (body: string | null) => void = () => {};
  if (share) {
    let resolve: (body: string | null) => void = () => {};
    const answer = new Promise<string | null>((done) => {
      resolve = done;
    });
    pending.set(key, answer);
    let settled = false;
    settle = (body) => {
      if (settled) return;
      settled = true;
      if (pending.get(key) === answer) pending.delete(key);
      resolve(body);
    };
    res.on("close", () => settle(null));
  }

  res.setHeader("X-Cache", "MISS");
  const json = res.json.bind(res);
  res.json = (data: unknown) => {
    if (res.statusCode !== 200) {
      settle(null);
      return json(data);
    }
    const body = JSON.stringify(data);
    remember(key, body);
    settle(body);
    if (BROWSER_CACHE) res.setHeader("Cache-Control", BROWSER_CACHE);
    return res.type("json").send(body);
  };
  next();
}

// Caches successful GET replies by full URL (the records routes by one URL for every season). Identical requests that arrive
// while the first is still running share its answer. Errors are never stored or shared: a request that was waiting on one
// runs the route itself.
export function responseCache(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") {
    next();
    return;
  }
  const key = cacheKey(req.originalUrl);
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    sendHit(res, hit.body);
    return;
  }
  if (hit) entries.delete(key);

  const waiting = pending.get(key);
  if (waiting) {
    void waiting.then((body) => {
      if (body !== null) sendHit(res, body);
      else runRoute(key, res, next, false);
    });
    return;
  }
  runRoute(key, res, next, true);
}
