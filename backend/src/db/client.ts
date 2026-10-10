import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "../config/env";

export const pool = new Pool({
  connectionString: ENV.DB_URL,
  connectionTimeoutMillis: 5000,
  // The local copy's app_* tables live in their own schema, so its connections look there for the unqualified table names.
  ...(ENV.DB_SCHEMA ? { options: `-c search_path=${ENV.DB_SCHEMA}` } : {}),
});

pool.on("error", () => {
  console.error("Database idle connection lost");
});

export const db = drizzle(pool);
