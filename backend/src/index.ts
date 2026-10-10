import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { sql } from "drizzle-orm";
import { ENV } from "./config/env";
import { db } from "./db/client";
import { responseCache } from "./response-cache";
import { seasonRouter } from "./routes/seasons";

const app = express();

app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/seasons", responseCache, seasonRouter);

app.get("/api/health", async (req, res) => {
  try {
    await db.execute(sql`select 1`);
    // Outside production the answer also says which database the server reads, so a dev backend can be checked without its .env.
    res.json({ status: "ok", database: "connected", ...(ENV.NODE_ENV === "production" ? {} : { target: ENV.DB_TARGET }) });
  } catch {
    res.status(503).json({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database unavailable" },
    });
  }
});

// Serve the built frontend (frontend/dist) when it exists, so one service hosts the whole app.
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
const frontendIndex = path.join(frontendDist, "index.html");
if (fs.existsSync(frontendIndex)) {
  app.use(
    express.static(frontendDist, {
      // Vite fingerprints everything under /assets, so it can be cached for good.
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  // Page addresses like /2026/standings are handled by the React router, so they get index.html.
  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(frontendIndex);
  });
}

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`);
  console.log(`Database: ${ENV.DB_TARGET}${ENV.DB_SCHEMA ? ` (${ENV.DB_SCHEMA})` : ""}`);
});
