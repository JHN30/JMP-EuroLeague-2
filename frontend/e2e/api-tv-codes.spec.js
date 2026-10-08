import { test, expect } from "@playwright/test";

// The API contract of feature 32a, read from the running backend and the live data: every club a response names carries
// its TV code for the requested season (`tvCode` on a club object, `clubTvCode` on a flat row).
const API = "http://localhost:3000/api/seasons";

async function get(page, path) {
  const response = await page.request.get(`${API}${path}`);
  expect(response.status(), path).toBe(200);
  return response.json();
}

const filled = (value) => typeof value === "string" && value.trim() !== "";

// The teams of a season and their TV codes, keyed by club code.
async function teamCodes(page, season) {
  const { teams } = await get(page, `/${season}/teams`);
  return new Map(teams.map((team) => [team.clubCode, team.tvCode]));
}

test("every team of a season has a TV code, and a single team agrees with the list", async ({ page }) => {
  for (const season of ["2025", "2026"]) {
    const { teams } = await get(page, `/${season}/teams`);
    expect(teams.length).toBeGreaterThan(10);
    for (const team of teams) {
      expect(filled(team.tvCode), `${season} ${team.clubCode}`).toBe(true);
      // The fields it had before are still there.
      expect(team).toEqual(expect.objectContaining({ clubCode: expect.any(String), name: expect.anything(), crestUrl: expect.anything() }));
    }
  }
  const { teams } = await get(page, "/2025/teams");
  const { team } = await get(page, `/2025/teams/${teams[0].clubCode}`);
  expect(team.tvCode).toBe(teams[0].tvCode);
});

test("a team's TV code is the one its standings carry, and standings and season statistics keep their fields", async ({ page }) => {
  const codes = await teamCodes(page, "2025");
  const { standings } = await get(page, "/2025/phases/RS/standings");
  expect(standings.length).toBeGreaterThan(10);
  let compared = 0;
  for (const entry of standings) {
    expect(entry).toHaveProperty("clubTvCode");
    if (filled(entry.clubTvCode)) {
      expect(codes.get(entry.clubCode), entry.clubCode).toBe(entry.clubTvCode.trim());
      compared += 1;
    }
  }
  expect(compared).toBeGreaterThan(10);

  const stats = await get(page, "/2025/season-stats?limit=3");
  const rows = stats.players ?? stats.items ?? [];
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(row).toHaveProperty("clubTvCodes");
});

test("both clubs of every game carry their TV code, and a side still to be set is null", async ({ page }) => {
  const codes = await teamCodes(page, "2025");
  const { games } = await get(page, "/2025/games?limit=100");
  expect(games.length).toBeGreaterThan(50);
  for (const game of games) {
    for (const side of [game.localTeam, game.roadTeam]) {
      if (side === null) continue;
      expect(filled(side.tvCode), `game ${game.gameCode}`).toBe(true);
      if (side.clubCode !== null && codes.has(side.clubCode)) expect(side.tvCode).toBe(codes.get(side.clubCode));
    }
  }
  const [anyTeam] = codes.keys();
  const single = await get(page, `/2025/games/${games[0].gameCode}`);
  expect(filled(single.game.localTeam.tvCode)).toBe(true);
  const teamGames = await get(page, `/2025/teams/${anyTeam}/games?limit=5`);
  for (const game of teamGames.games) {
    expect(filled(game.localTeam.tvCode) && filled(game.roadTeam.tvCode)).toBe(true);
  }
  const live = await get(page, "/2026/games?limit=100");
  for (const game of live.games) {
    for (const side of [game.localTeam, game.roadTeam]) if (side !== null) expect(filled(side.tvCode), `2026 game ${game.gameCode}`).toBe(true);
  }
});

test("the postseason series clubs carry their TV code", async ({ page }) => {
  const codes = await teamCodes(page, "2025");
  const { series } = await get(page, "/2025/postseason-series");
  expect(series.length).toBeGreaterThan(0);
  for (const entry of series) {
    for (const club of [entry.clubA, entry.clubB]) {
      expect(filled(club.tvCode)).toBe(true);
      if (codes.has(club.clubCode)) expect(club.tvCode).toBe(codes.get(club.clubCode));
    }
  }
});

test("rows that name a club carry a clubTvCode that matches the team's", async ({ page }) => {
  const codes = await teamCodes(page, "2025");
  const matches = (row, label) => {
    expect(filled(row.clubTvCode), label).toBe(true);
    if (codes.has(row.clubCode)) expect(row.clubTvCode, label).toBe(codes.get(row.clubCode));
  };

  const advanced = await get(page, "/2025/advanced/standings");
  expect(advanced.standings.length).toBeGreaterThan(10);
  for (const row of advanced.standings) matches(row, `advanced standings ${row.clubCode}`);

  const leaders = await get(page, "/2025/advanced/leaders?metric=per&limit=10");
  expect(leaders.entries.length).toBeGreaterThan(0);
  for (const row of leaders.entries) if (row.clubCode !== null) matches(row, `advanced leaders ${row.personKey}`);

  const players = await get(page, "/2025/players?limit=20");
  for (const player of players.players) if (player.clubCode !== null) matches(player, `player ${player.personKey}`);
  const { player } = await get(page, `/2025/players/${players.players[0].personKey}`);
  if (player.clubCode !== null) matches(player, "player page");

  const form = await get(page, "/2025/leaders/form");
  expect(form.players.length).toBeGreaterThan(0);
  for (const row of form.players) if (row.clubCode !== null) matches(row, `form ${row.personKey}`);

  const teamSeasons = await get(page, "/2025/records/team-seasons");
  expect(teamSeasons.records.length).toBeGreaterThan(0);
  for (const row of teamSeasons.records) expect(filled(row.clubTvCode), `${row.seasonCode} ${row.clubCode}`).toBe(true);

  const singleGames = await get(page, "/2025/records/single-games");
  expect(singleGames.records.length).toBeGreaterThan(0);
  for (const row of singleGames.records) expect(row).toHaveProperty("clubTvCode");
  expect(singleGames.records.some((row) => filled(row.clubTvCode))).toBe(true);
  expect(singleGames.records.every((row) => !("clubCode" in row))).toBe(true);

  const playerSeasons = await get(page, "/2025/records/player-seasons");
  for (const row of playerSeasons.records) expect(row).toHaveProperty("clubTvCodes");
});

test("a player's registrations name their club with its TV code", async ({ page }) => {
  const codes = await teamCodes(page, "2025");
  const { players } = await get(page, "/2025/players?limit=5");
  const { registrations } = await get(page, `/2025/players/${players[0].personKey}/registrations`);
  expect(registrations.length).toBeGreaterThan(0);
  for (const registration of registrations) {
    if (registration.team === null) continue;
    expect(filled(registration.team.tvCode)).toBe(true);
    expect(registration.team.tvCode).toBe(codes.get(registration.team.clubCode));
  }
});
