import dotenv from "dotenv";

dotenv.config();

function required(name: "PORT" | "DB_URL" | "FRONTEND_URL"): string {
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

function databaseUrl(): string {
  const value = required("DB_URL");
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
      throw new Error("Invalid database URL");
    }
    return value;
  } catch {
    throw new Error("DB_URL must be a PostgreSQL URL");
  }
}

function port(): number {
  const value = required("PORT");
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  return parsed;
}

export const ENV = {
  PORT: port(),
  NODE_ENV: process.env.NODE_ENV,
  DB_URL: databaseUrl(),
  FRONTEND_URL: httpOrigin("FRONTEND_URL"),
};
