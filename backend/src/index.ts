import express from "express";
import cors from "cors";
import { sql } from "drizzle-orm";
import { ENV } from "./config/env";
import { db } from "./db/client";

const app = express();

app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/api/health", async (req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database unavailable" },
    });
  }
});

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`);
});
