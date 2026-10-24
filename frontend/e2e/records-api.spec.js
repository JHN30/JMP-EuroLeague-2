import { test, expect } from "@playwright/test";

// The records API on the live local backend: four kinds of record, each with its traditional and advanced metrics, the old metric names,
// the picture fields and the qualified-players rule. The Records page itself is records.spec.js.
const API = "http://localhost:3000/api";
const SEASON = "2025";

const TRADITIONAL = [
  ["pointsScored", "Points"],
  ["totalRebounds", "Rebounds"],
  ["offensiveRebounds", "Offensive rebounds"],
  ["defensiveRebounds", "Defensive rebounds"],
  ["assists", "Assists"],
  ["steals", "Steals"],
  ["blocks", "Blocks"],
  ["twoPointersMade", "2-pointers made"],
  ["threePointersMade", "3-pointers made"],
  ["freeThrowsMade", "Free throws made"],
  ["pir", "PIR"],
];
// A third entry is the minimum number of games a season rating needs (the server leaves out players and clubs with fewer).
const MIN_SEASON_GAMES = 20;
const RATINGS = [
  ["offensiveRating", "Offensive rating"],
  ["netRating", "Net rating"],
];
const SEASON_RATINGS = RATINGS.map(([key, label]) => [key, label, MIN_SEASON_GAMES]);
const KINDS = {
  "player-seasons": { advanced: [["per", "PER", MIN_SEASON_GAMES], ["winShares", "Win Shares"]], players: true },
  "single-games": { advanced: [["gameScore", "Game Score"]], players: true },
  "team-seasons": { advanced: SEASON_RATINGS, players: false },
  "team-games": { advanced: RATINGS, players: false },
};

const records = (request, kind, metric) => request.get(`${API}/seasons/${SEASON}/records/${kind}${metric === undefined ? "" : `?metric=${metric}`}`);
const isPicture = (value) => value === null || (typeof value === "string" && value.length > 0);

test("the backend reads the local database", async ({ request }) => {
  const health = await (await request.get(`${API}/health`)).json();
  expect(health.target).toBe("local");
});

for (const [kind, info] of Object.entries(KINDS)) {
  const metrics = [...TRADITIONAL.map(([key, label]) => ({ key, label, group: "traditional" })), ...info.advanced.map(([key, label, minGames]) => ({ key, label, group: "advanced", minGames }))];
  for (const metric of metrics) {
    test(`${kind}: ${metric.key} is the best 50, highest first, with its label, group and pictures`, async ({ request }) => {
      const response = await records(request, kind, metric.key);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.metric).toBe(metric.key);
      expect(body.label).toBe(metric.label);
      expect(body.group).toBe(metric.group);
      // The minimum number of games of a 34-game regular season: said by the answer. Each row of a metric that has one says its
      // season's share of it and keeps it.
      expect(body.minGames).toBe(metric.minGames ?? null);
      expect(body.records.length).toBeGreaterThan(0);
      expect(body.records.length).toBeLessThanOrEqual(50);

      let previous = Infinity;
      for (const row of body.records) {
        expect(typeof row.seasonCode).toBe("string");
        expect(typeof row.value).toBe("string");
        expect(Number.isFinite(row.numericValue)).toBe(true);
        if (metric.minGames === undefined) expect("gamesPlayed" in row || "minGames" in row).toBe(false);
        else {
          expect(Number.isInteger(row.minGames) && row.minGames > 0, `${metric.key} ${row.seasonCode} minGames`).toBe(true);
          expect(row.gamesPlayed, `${metric.key} ${row.seasonCode}`).toBeGreaterThanOrEqual(row.minGames);
        }
        expect(row.numericValue).toBeLessThanOrEqual(previous);
        previous = row.numericValue;
        // A picture is a URL or null, never an empty string, and every row says which.
        expect("clubImageUrl" in row && isPicture(row.clubImageUrl), "clubImageUrl").toBe(true);
        if (info.players) expect("playerImageUrl" in row && isPicture(row.playerImageUrl), "playerImageUrl").toBe(true);
        else expect("playerImageUrl" in row).toBe(false);
        if (kind === "team-games") {
          expect(typeof row.gameCode).toBe("number");
          expect(row.opponentClubCode).toEqual(expect.any(String));
          expect(row.opponentClubCode).not.toBe(row.clubCode);
          expect(row.opponentName).toEqual(expect.any(String));
          expect(row.opponentTvCode).toEqual(expect.any(String));
          expect(row.scheduledAt).toEqual(expect.any(String));
        }
      }

      // The best of each season: one per season, oldest first, at least as high as any of the best 50 from its season.
      const seasonCodes = body.bySeason.map((row) => row.seasonCode);
      expect(seasonCodes).toEqual([...new Set(seasonCodes)].sort());
      for (const row of body.records) expect(body.bySeason.find((best) => best.seasonCode === row.seasonCode).numericValue).toBeGreaterThanOrEqual(row.numericValue);
      // The progression: opens with the first season's best, every step higher than the one before, and ends at the record that stands.
      expect(body.progression[0]).toEqual(body.bySeason[0]);
      body.progression.slice(1).forEach((row, index) => expect(row.numericValue).toBeGreaterThan(body.progression[index].numericValue));
      expect(body.progression.at(-1).numericValue).toBe(body.records[0].numericValue);
    });
  }
}

// Per game: the season records of the traditional metrics, for qualified players and clubs with the season's share of 20 games (each row
// says its games and that minimum).
for (const kind of ["player-seasons", "team-seasons"]) {
  test(`${kind}: every traditional metric per game is the best 50 of the averages, with its games and minimum`, async ({ request }) => {
    test.setTimeout(120_000);
    for (const [key, label] of TRADITIONAL) {
      const response = await request.get(`${API}/seasons/${SEASON}/records/${kind}?metric=${key}&per=game`);
      expect(response.status(), key).toBe(200);
      const body = await response.json();
      expect(body.per, key).toBe("game");
      expect(body.label, key).toBe(`${label} per game`);
      expect(body.minGames, key).toBe(MIN_SEASON_GAMES);
      expect(body.records.length, key).toBeGreaterThan(0);
      body.records.forEach((row, index) => {
        if (index > 0) expect(row.numericValue, key).toBeLessThanOrEqual(body.records[index - 1].numericValue);
        expect(Number.isInteger(row.minGames) && row.minGames > 0, `${key} ${row.seasonCode} minGames`).toBe(true);
        expect(row.gamesPlayed, `${key} ${row.seasonCode}`).toBeGreaterThanOrEqual(row.minGames);
      });
      const seasonCodes = body.bySeason.map((row) => row.seasonCode);
      expect(seasonCodes, key).toEqual([...new Set(seasonCodes)].sort());
      body.progression.slice(1).forEach((row, index) => expect(row.numericValue, key).toBeGreaterThan(body.progression[index].numericValue));
      expect(body.progression.at(-1).numericValue, key).toBe(body.records[0].numericValue);
    }
  });
}

test("per=total is the default, and per game answers 400 where it does not apply", async ({ request }) => {
  const totals = await (await records(request, "player-seasons", "assists")).json();
  const explicit = await (await request.get(`${API}/seasons/${SEASON}/records/player-seasons?metric=assists&per=total`)).json();
  expect(totals.per).toBe("total");
  expect(explicit).toEqual(totals);
  const perGame = await (await request.get(`${API}/seasons/${SEASON}/records/player-seasons?metric=pointsScored&per=game`)).json();
  expect(perGame.bySeason[0].seasonCode).toBe("E2000");
  expect(perGame.records.some((row) => !Number.isInteger(row.numericValue))).toBe(true);

  const bogus = await request.get(`${API}/seasons/${SEASON}/records/player-seasons?metric=assists&per=bogus`);
  expect(bogus.status()).toBe(400);
  expect((await bogus.json()).error.code).toBe("INVALID_RECORD_PER");
  for (const path of ["single-games?metric=pointsScored", "team-games?metric=pointsScored", "player-seasons?metric=per", "team-seasons?metric=netRating"]) {
    const response = await request.get(`${API}/seasons/${SEASON}/records/${path}&per=game`);
    expect(response.status(), path).toBe(400);
    expect((await response.json()).error.code, path).toBe("RECORD_PER_NOT_AVAILABLE");
  }
});

test("the best of each season and the progression reach the seasons the best 50 leave out", async ({ request }) => {
  const body = await (await records(request, "player-seasons", "pointsScored")).json();
  expect(body.records.every((row) => row.seasonCode >= "E2016")).toBe(true);
  expect(body.bySeason[0].seasonCode).toBe("E2000");
  expect(body.bySeason.length).toBeGreaterThanOrEqual(27);
  expect(body.progression[0].seasonCode).toBe("E2000");
});

test("the pictures are really there: portraits and crests come through where the data has them", async ({ request }) => {
  const seasons = await (await records(request, "player-seasons", "pointsScored")).json();
  expect(seasons.records.some((row) => row.playerImageUrl)).toBe(true);
  expect(seasons.records.some((row) => row.clubImageUrl)).toBe(true);
  const games = await (await records(request, "single-games", "points")).json();
  expect(games.records.some((row) => row.playerImageUrl)).toBe(true);
  expect(games.records.some((row) => row.clubImageUrl)).toBe(true);
  for (const kind of ["team-seasons", "team-games"]) {
    const teams = await (await records(request, kind, "pointsScored")).json();
    expect(teams.records.some((row) => row.clubImageUrl), kind).toBe(true);
  }
});

test("an unknown metric answers 400, and the old names still answer as before", async ({ request }) => {
  for (const kind of Object.keys(KINDS)) {
    const response = await records(request, kind, "notAMetric");
    expect(response.status(), kind).toBe(400);
    expect((await response.json()).error?.code ?? (await response.json()).code, kind).toBe("INVALID_RECORD_METRIC");
  }
  // A metric of another kind is unknown too: Game Score is a single-game record, not a season one.
  expect((await records(request, "player-seasons", "gameScore")).status()).toBe(400);
  expect((await records(request, "team-games", "per")).status()).toBe(400);

  for (const kind of ["single-games", "team-seasons"]) {
    for (const [oldName, label] of [["points", "Points"], ["assistances", "Assists"], ["valuation", "PIR"], ["totalRebounds", "Rebounds"]]) {
      const body = await (await records(request, kind, oldName)).json();
      expect(body.metric, `${kind} ${oldName}`).toBe(oldName);
      expect(body.label).toBe(label);
      expect(body.group).toBe("traditional");
    }
  }
  // No metric asked for: each route ranks points, and says which key it ranked.
  for (const kind of Object.keys(KINDS)) {
    const body = await (await records(request, kind, undefined)).json();
    expect(body.label, kind).toBe("Points");
  }
  expect((await request.get(`${API}/seasons/1999/records/team-games?metric=pointsScored`)).status()).toBe(400);
});

test("a records route is cached once for every season's address, and an unsupported season still answers 400", async ({ request }) => {
  const first = await request.get(`${API}/seasons/2025/records/team-seasons?metric=steals`);
  expect(first.status()).toBe(200);
  // The same records through another season's address (and in the E-code form) come from the cache with the same body.
  for (const season of ["2024", "E2023", "2026"]) {
    const again = await request.get(`${API}/seasons/${season}/records/team-seasons?metric=steals`);
    expect(again.status(), season).toBe(200);
    expect(again.headers()["x-cache"], season).toBe("HIT");
    expect(await again.text(), season).toBe(await first.text());
  }
  // A season the API does not support is never served from another season's entry.
  const unsupported = await request.get(`${API}/seasons/1999/records/team-seasons?metric=steals`);
  expect(unsupported.status()).toBe(400);
  expect(unsupported.headers()["x-cache"]).not.toBe("HIT");
});

test("PER and Win Shares records are qualified players only", async ({ request }) => {
  // The qualified players of each season, as the season statistics list them.
  async function qualifiedKeys(seasonCode) {
    const keys = new Set();
    for (let offset = 0; ; offset += 100) {
      const response = await request.get(`${API}/seasons/${seasonCode.replace(/^[A-Za-z]+/, "")}/season-stats?phase=all&mode=accumulated&qualified=true&limit=100&offset=${offset}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      for (const player of body.players) keys.add(player.personKey);
      if (!body.pagination.hasMore) return keys;
    }
  }
  const qualified = new Map();
  for (const metric of ["per", "winShares"]) {
    const body = await (await records(request, "player-seasons", metric)).json();
    for (const row of body.records) {
      if (!qualified.has(row.seasonCode)) qualified.set(row.seasonCode, await qualifiedKeys(row.seasonCode));
      expect(qualified.get(row.seasonCode).has(row.personKey), `${metric} ${row.seasonCode} ${row.playerName}`).toBe(true);
    }
  }
});
