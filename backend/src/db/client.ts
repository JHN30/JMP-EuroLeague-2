import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "../config/env";

// A query that runs longer is abandoned and its connection closed, so a stuck query can't hold a pool slot forever. It is
// timed by the client because Neon's pooled host may refuse a server `statement_timeout` sent when a connection opens.
// 15 s leaves room for Neon waking a suspended compute; a cold career answer takes about 1-2 s.
const QUERY_TIMEOUT_MS = 15_000;

export const pool = new Pool({
  connectionString: ENV.DB_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: QUERY_TIMEOUT_MS,
  // pg's default, written out: the career routes read two seasons at a time (forEachSeasonInTurn) to stay within it.
  max: 10,
  // The local copy's app_* tables live in their own schema, so its connections look there for the unqualified table names.
  ...(ENV.DB_SCHEMA ? { options: `-c search_path=${ENV.DB_SCHEMA}` } : {}),
});

pool.on("error", () => {
  console.error("Database idle connection lost");
});

export const db = drizzle(pool);
