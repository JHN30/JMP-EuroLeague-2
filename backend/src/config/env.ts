import dotenv from "dotenv";

dotenv.config();

function required(name: "PORT" | "DB_URL" | "LOCAL_DB_URL" | "FRONTEND_URL"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function httpOrigin(name: "FRONTEND_URL"): string {
  const value = required(name);
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("Invalid origin");
    }
    return url.origin;
  } catch {
    throw new Error(`${name} must be an HTTP origin`);
  }
}

function databaseUrl(name: "DB_URL" | "LOCAL_DB_URL"): string {
  const value = required(name);
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
      throw new Error("Invalid database URL");
    }
    return value;
  } catch {
    throw new Error(`${name} must be a PostgreSQL URL`);
  }
}

// Which database the API reads: Neon (DB_URL), the default and what production uses, or a local PostgreSQL copy of the same
// tables (LOCAL_DB_URL) for development, so dev servers and browser tests do not spend Neon's network transfer.
function databaseTarget(): "neon" | "local" {
  const value = process.env.DB_TARGET?.trim() || "neon";
  if (value !== "neon" && value !== "local") {
    throw new Error("DB_TARGET must be neon or local");
  }
  return value;
}

// The local copy keeps the app_* tables in its own schema (the pipeline's gold layer), not in public as on Neon.
function localSchema(): string {
  const value = process.env.LOCAL_DB_SCHEMA?.trim() || "gold";
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error("LOCAL_DB_SCHEMA must be a plain schema name");
  }
  return value;
}

function port(): number {
  const value = required("PORT");
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  return parsed;
}

const DB_TARGET = databaseTarget();

export const ENV = {
  PORT: port(),
  NODE_ENV: process.env.NODE_ENV,
  DB_TARGET,
  DB_URL: databaseUrl(DB_TARGET === "local" ? "LOCAL_DB_URL" : "DB_URL"),
  // Only for the local database; Neon keeps its default search_path.
  DB_SCHEMA: DB_TARGET === "local" ? localSchema() : null,
  FRONTEND_URL: httpOrigin("FRONTEND_URL"),
};
