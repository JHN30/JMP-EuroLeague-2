import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "../config/env";

export const pool = new Pool({
  connectionString: ENV.DB_URL,
  connectionTimeoutMillis: 5000,
});

pool.on("error", () => {
  console.error("Database idle connection lost");
});

export const db = drizzle(pool);
