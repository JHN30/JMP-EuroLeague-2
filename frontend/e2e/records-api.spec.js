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
// An advanced entry is key, label, format, whether lower is better, the minimum number of games a season rating needs (two thirds of a
// 34-game regular season; the server leaves out players and clubs with fewer), and the minutes or shots it also needs, as the answer
// words them.
const MIN_SEASON_GAMES = 23;
const ORTG = ["offensiveRating", "Offensive rating", "decimal"];
const DRTG = ["defensiveRating", "Defensive rating", "decimal", true];
const NET = ["netRating", "Net rating", "signed"];
const PACE = ["pace", "Pace", "decimal"];
const EFG = ["effectiveFieldGoalPct", "Effective FG%", "percent"];
const TS = ["trueShootingPct", "True shooting %", "percent"];
const TEAM_SEASON = [
  ORTG,
  DRTG,
  NET,
  ["adjustedOffensiveRating", "Adjusted offensive rating", "decimal"],
  ["adjustedDefensiveRating", "Adjusted defensive rating", "decimal", true],
  ["adjustedNetRating", "Adjusted net rating", "signed"],
  ["marginOfVictory", "Margin of victory", "signed"],
  ["srs", "Simple rating (SRS)", "signed"],
  PACE,
  EFG,
  ["opponentEffectiveFieldGoalPct", "Opponents' eFG%", "percent", true],
  TS,
  ["turnoverPct", "Turnover %", "percent", true],
  ["offensiveReboundPct", "Offensive rebound %", "percent"],
  ["defensiveReboundPct", "Defensive rebound %", "percent"],
  ["assistRatio", "Assist ratio", "percent"],
].map(([key, label, format, lower]) => [key, label, format, lower, MIN_SEASON_GAMES]);
const MINUTES = "10+ minutes a game";
const SHOOTING = "10+ minutes and 5+ field goal attempts a game";
const PLAYER_SEASON = [
  ["per", "PER", "decimal"],
  ["winShares", "Win Shares", "decimal"],
  ["offensiveWinShares", "Offensive Win Shares", "decimal"],
  ["defensiveWinShares", "Defensive Win Shares", "decimal"],
  ["winSharesPer40", "Win Shares / 40", "decimal3", false, MIN_SEASON_GAMES, MINUTES],
  ["trueShootingPct", "True shooting %", "percent", false, MIN_SEASON_GAMES, SHOOTING],
  ["effectiveFieldGoalPct", "Effective FG%", "percent", false, MIN_SEASON_GAMES, SHOOTING],
  ["usagePct", "Usage %", "percent", false, MIN_SEASON_GAMES, MINUTES],
  ["assistPct", "Assist %", "percent", false, MIN_SEASON_GAMES, MINUTES],
  ["reboundPct", "Rebound %", "percent", false, MIN_SEASON_GAMES, MINUTES],
  ["stealPct", "Steal %", "percent", false, MIN_SEASON_GAMES, MINUTES],
  ["blockPct", "Block %", "percent", false, MIN_SEASON_GAMES, MINUTES],
  ["gameScoreAverage", "Game Score average", "decimal", false, MIN_SEASON_GAMES, MINUTES],
  ["pie", "PIE", "percent", false, MIN_SEASON_GAMES, MINUTES],
].map(([key, label, format, lower, minGames = MIN_SEASON_GAMES, volume]) => [key, label, format, lower, minGames, volume]);
const KINDS = {
  "player-seasons": { advanced: PLAYER_SEASON, players: true },
  "single-games": { advanced: [["gameScore", "Game Score", "decimal"], ["gamePer", "Game PER", "decimal", false, undefined, "10+ minutes in the game"]], players: true },
  "team-seasons": { advanced: TEAM_SEASON, players: false },
  "team-games": { advanced: [ORTG, DRTG, NET, PACE, EFG, TS], players: false },
};

const records = (request, kind, metric) => request.get(`${API}/seasons/${SEASON}/records/${kind}${metric === undefined ? "" : `?metric=${metric}`}`);
const isPicture = (value) => value === null || (typeof value === "string" && value.length > 0);

test("the backend reads the local database", async ({ request }) => {
  const health = await (await request.get(`${API}/health`)).json();
  expect(health.target).toBe("local");
});

for (const [kind, info] of Object.entries(KINDS)) {
  const metrics = [
    ...TRADITIONAL.map(([key, label]) => ({ key, label, group: "traditional", format: "count", lowerIsBetter: false })),
    ...info.advanced.map(([key, label, format, lower, minGames, volume]) => ({ key, label, group: "advanced", format, lowerIsBetter: lower ?? false, minGames, volume })),
  ];
  for (const metric of metrics) {
    test(`${kind}: ${metric.key} is the best 50, best first, with its label, group, format, direction and pictures`, async ({ request }) => {
      const response = await records(request, kind, metric.key);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.metric).toBe(metric.key);
      expect(body.label).toBe(metric.label);
      expect(body.group).toBe(metric.group);
      expect(body.format).toBe(metric.format);
      expect(body.lowerIsBetter).toBe(metric.lowerIsBetter);
      expect(body.volume).toBe(metric.volume ?? null);
      // Every comparison below runs in the metric's direction: `better(a, b)` is how far a is ahead of b.
      const better = (a, b) => (metric.lowerIsBetter ? b - a : a - b);
      // The minimum number of games of a 34-game season: said by the answer. Each row of a metric that has one says its season's own
      // minimum (two thirds of the season's regular-season games) and keeps it.
      expect(body.minGames).toBe(metric.minGames ?? null);
      expect(body.records.length).toBeGreaterThan(0);
      expect(body.records.length).toBeLessThanOrEqual(50);

      let previous = null;
      for (const row of body.records) {
        expect(typeof row.seasonCode).toBe("string");
        expect(typeof row.value).toBe("string");
        expect(Number.isFinite(row.numericValue)).toBe(true);
        if (metric.minGames === undefined) expect("gamesPlayed" in row || "minGames" in row).toBe(false);
        else {
          expect(Number.isInteger(row.minGames) && row.minGames > 0, `${metric.key} ${row.seasonCode} minGames`).toBe(true);
          expect(row.gamesPlayed, `${metric.key} ${row.seasonCode}`).toBeGreaterThanOrEqual(row.minGames);
        }
        if (previous !== null) expect(better(previous, row.numericValue)).toBeGreaterThanOrEqual(0);
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

      // The best of each season: one per season, oldest first, at least as good as any of the best 50 from its season.
      const seasonCodes = body.bySeason.map((row) => row.seasonCode);
      expect(seasonCodes).toEqual([...new Set(seasonCodes)].sort());
      for (const row of body.records) expect(better(body.bySeason.find((best) => best.seasonCode === row.seasonCode).numericValue, row.numericValue)).toBeGreaterThanOrEqual(0);
      // The progression: opens with the first season's best, every step better than the one before, and ends at the record that stands.
      expect(body.progression[0]).toEqual(body.bySeason[0]);
      body.progression.slice(1).forEach((row, index) => expect(better(row.numericValue, body.progression[index].numericValue)).toBeGreaterThan(0));
      expect(body.progression.at(-1).numericValue).toBe(body.records[0].numericValue);
    });
  }
}

// Per game: the season records of the traditional metrics, for players and clubs with two thirds of the season's regular-season games (each row says its games
// and that minimum).
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

// A season's minimum is two thirds of a club's regular-season games, rounded up: the group stage and the Top 16 where there was one (10 and 6 games in 2011-12),
// never the postseason, and the whole schedule of the season being played (38 games in 2026-27). A row's games are its regular-season games.
test("a season's minimum is two thirds of its regular-season schedule, and a row's games are its regular-season games", async ({ request }) => {
  const body = await (await records(request, "player-seasons", "per")).json();
  const minimums = new Map(body.bySeason.map((row) => [row.seasonCode, row.minGames]));
  expect(minimums.get("E2011")).toBe(11);
  expect(minimums.get("E2014")).toBe(16);
  expect(minimums.get("E2024")).toBe(23);
  if (minimums.has("E2026")) expect(minimums.get("E2026")).toBe(26);
  // Nobody has more regular-season games than the schedule.
  for (const row of body.records) expect(row.gamesPlayed, `${row.playerName} ${row.seasonCode}`).toBeLessThanOrEqual(Math.floor((row.minGames * 3) / 2));
});

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

test("PER and Win Shares records count regular-season games only, at least two thirds of the schedule", async ({ request }) => {
  test.setTimeout(120_000);
  // Each player's games in the group stage and the Top 16 (where the season had one), as the season statistics list them.
  async function regularGames(seasonCode) {
    const games = new Map();
    const year = seasonCode.replace(/^[A-Za-z]+/, "");
    for (const phase of ["RS", "TS"]) {
      for (let offset = 0; ; offset += 100) {
        const response = await request.get(`${API}/seasons/${year}/season-stats?phase=${phase}&mode=accumulated&limit=100&offset=${offset}`);
        // A season without a Top 16 has no such phase.
        if (phase === "TS" && [400, 404].includes(response.status())) break;
        expect(response.status(), `${seasonCode} ${phase}`).toBe(200);
        const body = await response.json();
        for (const player of body.players) games.set(player.personKey, (games.get(player.personKey) ?? 0) + Number(player.traditional?.gamesPlayed ?? 0));
        if (!body.pagination.hasMore) break;
      }
    }
    return games;
  }
  const bySeason = new Map();
  for (const metric of ["per", "winShares"]) {
    const body = await (await records(request, "player-seasons", metric)).json();
    for (const row of body.records.slice(0, 15)) {
      if (!bySeason.has(row.seasonCode)) bySeason.set(row.seasonCode, await regularGames(row.seasonCode));
      const where = `${metric} ${row.seasonCode} ${row.playerName}`;
      expect(row.gamesPlayed, where).toBe(bySeason.get(row.seasonCode).get(row.personKey));
      expect(row.gamesPlayed, where).toBeGreaterThanOrEqual(row.minGames);
    }
  }
});

// The record book: for every kind, the six headline metrics with their record and the row behind it, each record the first row of its
// kind's route.
test("the record book holds the headline records of every kind, each the first row of its route", async ({ request }) => {
  test.setTimeout(120_000);
  const response = await request.get(`${API}/seasons/${SEASON}/records/book`);
  expect(response.status()).toBe(200);
  const { sections } = await response.json();
  expect(sections.map((section) => section.kind)).toEqual(Object.keys(KINDS));
  for (const section of sections) {
    expect(section.cards.map((card) => card.metric), section.kind).toEqual(["pointsScored", "totalRebounds", "assists", "steals", "blocks", "pir"]);
    for (const card of section.cards) {
      const where = `${section.kind} ${card.metric}`;
      expect(card.format, where).toBe("count");
      expect(card.lowerIsBetter, where).toBe(false);
      expect(card.records.length, where).toBe(2);
      expect(card.records[1].numericValue, where).toBeLessThanOrEqual(card.records[0].numericValue);
      const route = await (await records(request, section.kind, card.metric)).json();
      expect(card.label, where).toBe(route.label);
      for (const index of [0, 1]) {
        const [mine, theirs] = [card.records[index], route.records[index]];
        expect([mine.numericValue, mine.seasonCode, mine.personKey ?? mine.clubCode, mine.gameCode ?? null], where).toEqual([theirs.numericValue, theirs.seasonCode, theirs.personKey ?? theirs.clubCode, theirs.gameCode ?? null]);
      }
    }
  }
  expect((await request.get(`${API}/seasons/1999/records/book`)).status()).toBe(400);
});
