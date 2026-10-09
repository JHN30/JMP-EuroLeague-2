import type { NextFunction, Request, Response } from "express";

// The data only changes when the pipeline publishes, so repeated reads within this window skip Neon,
// whose free plan meters every byte sent back.
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 1000;

const entries = new Map<string, { body: string; expiresAt: number }>();

function remember(key: string, body: string) {
  entries.delete(key);
  entries.set(key, { body, expiresAt: Date.now() + TTL_MS });
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
}

// Caches successful GET replies by full URL. Errors are never stored.
export function responseCache(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") {
    next();
    return;
  }
  const key = req.originalUrl;
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    res.setHeader("X-Cache", "HIT");
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
    return res.type("json").send(body);
  };
  next();
}
