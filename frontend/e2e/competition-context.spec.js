import { test, expect } from "@playwright/test";
import { competitionNotes } from "../src/lib/seasonFormat.js";

const API = "http://localhost:3000/api";
const get = async (request, season, path) => {
  const response = await request.get(`${API}/seasons/${season}${path}`);
  expect(response.ok(), path).toBe(true);
  return response.json();
};
const context = (page) => page.getByRole("complementary", { name: "Competition context" });

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("rulings match the season, game or exact standings snapshot without recalculating results", async ({ request }) => {
  const { format } = await get(request, "2022", "/format");
  expect(format.exceptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: "endedEarly", gameCode: 313 }),
    expect.objectContaining({ kind: "winsDeducted", clubCode: "PAN", stage: "RS", roundNumber: 34, wins: 2 }),
  ]));
  expect(competitionNotes(format, "E2022", { gameCode: "313" })).toHaveLength(1);
  for (const scope of [{ gameCode: 309 }, { phaseCode: "RS", roundNumber: 33 }, { phaseCode: "PO", roundNumber: 34 }, { phaseCode: "RS", roundNumber: 34, clubCode: "MAD" }]) {
    expect(competitionNotes(format, "2022", scope)).toEqual([]);
  }
  expect(competitionNotes(format, "2020", { gameCode: 313 })).toEqual([]);
  expect(competitionNotes(null, "2022", { gameCode: 313 })).toEqual([]);
  expect(competitionNotes(format, "2022", { phaseCode: "RS", roundNumber: 34, clubCode: "PAN" })).toHaveLength(1);
});

test("PAN final standings explain the deduction, earlier race snapshots do not", async ({ page, request }) => {
  const { standings } = await get(request, "2022", "/phases/RS/standings");
  expect(standings.find((row) => row.clubCode === "PAN").basic).toMatchObject({ position: 17, gamesPlayed: 34, gamesWon: 9, gamesLost: 23 });
  const { games } = await get(request, "2022", "/teams/PAN/games?limit=100&order=asc");
  const rs = games.filter((game) => game.phaseCode === "RS" && game.played);
  expect(rs).toHaveLength(34);
  expect(rs.filter((game) => game.localTeam.clubCode === "PAN" ? game.localScore > game.roadScore : game.roadScore > game.localScore)).toHaveLength(11);
  await page.goto("/2022/standings");
  await expect(context(page)).toContainText("two wins deducted");
  await expect(context(page)).toContainText("9-23");
  await expect(context(page)).toContainText("11-23");
  const row = page.locator("main tbody tr", { has: page.getByRole("link", { name: "Panathinaikos Athens", exact: true }) }).first();
  await expect(row).toContainText("9");
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  const round = page.getByRole("slider", { name: "Round shown in the race" });
  await expect(round).toHaveValue("34");
  await expect(context(page)).toContainText("two wins deducted");
  await round.press("ArrowLeft");
  await expect(round).toHaveValue("33");
  await expect(context(page)).toHaveCount(0);
  await round.press("End");
  await expect(context(page)).toContainText("two wins deducted");
});

test("the Home summary and PAN team explain standings credit while other clubs and seasons stay clean", async ({ page }) => {
  for (const path of ["/2022/home", "/2022/teams/PAN"]) {
    await page.goto(path);
    await expect(context(page)).toContainText("two wins deducted");
  }
  for (const path of ["/2022/teams/MAD", "/2020/teams/PAN", "/2020/standings", "/2022/games/309"]) {
    await page.goto(path);
    await expect(page.locator("main .loading")).toHaveCount(0);
    await expect(page.getByText("Loading competition context.")).toHaveCount(0);
    await expect(context(page)).toHaveCount(0);
  }
});

test("game 313 keeps its 80-95 result, statistics and recorded ending, with a contextual note", async ({ page, request }) => {
  const { game } = await get(request, "2022", "/games/313");
  expect(game).toMatchObject({ played: true, gameStatus: "Confirmed", localScore: 80, roadScore: 95, phaseCode: "PO", roundNumber: 36 });
  const box = await get(request, "2022", "/games/313/box-score");
  expect(box.playerStats).toHaveLength(24);
  const { events } = await get(request, "2022", "/games/313/play-by-play");
  expect(events.some((event) => event.periodNumber === 4 && event.markerTime === "01:40" && event.playType === "BF")).toBe(true);
  expect(events.at(-1).playType).toBe("EG");
  await page.goto("/2022/games/313");
  await expect(context(page)).toContainText("1:40 remaining");
  await expect(context(page)).toContainText("80-95");
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  await page.getByRole("tab", { name: "Play-by-play", exact: true }).click();
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("4");
  await page.getByRole("combobox", { name: "Event type", exact: true }).selectOption("all");
  await expect(page.getByText(/^End game$/i)).toBeVisible();
  await page.goto("/2022/postseason");
  await page.getByRole("group", { name: "3 v 6", exact: true }).getByRole("button").first().click();
  const second = page.locator(".scroll-mt-28 li", { has: page.locator('a[href="/2022/games/313"]') });
  await expect(second).toContainText("Game 2");
  await expect(second).toContainText("80-95");
  await expect(second.getByRole("complementary")).toContainText("1:40 remaining");
});

test("Partizan's second win is a series lead, not advancement despite the official early ending", async ({ page, request }) => {
  const { series } = await get(request, "2022", "/postseason-series");
  const live = series.filter((entry) => entry.phaseCode === "PO").map((entry) => {
    if (![entry.clubA.clubCode, entry.clubB.clubCode].includes("PAR")) return entry;
    return { ...entry, games: entry.games.slice(0, 2), gamesPlayed: 2, clubAWins: 0, clubBWins: 2, winnerClubCode: "PAR" };
  });
  await page.route(/\/postseason-series$/, (route) => route.fulfill({ json: { series: live } }));
  await page.goto("/2022/postseason");
  const quarter = page.getByRole("group", { name: "3 v 6", exact: true });
  await expect(quarter).toContainText("2");
  await expect(page.getByRole("button", { name: /Partizan.*, Semifinal/ })).toHaveCount(0);
  await expect(page.getByText(/are the champions/)).toHaveCount(0);
  await quarter.getByRole("button").first().click();
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(context(page)).toContainText("80-95");
});

test("format context loading and retry never hide the game's box score", async ({ page }) => {
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  let fail = true;
  await page.route(/\/format$/, async (route) => {
    await delayed;
    return fail ? route.fulfill({ status: 500, json: { error: "Unavailable" } }) : route.continue();
  });
  await page.goto("/2022/games/313");
  await expect(page.getByText("Loading competition context.")).toBeVisible();
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  release();
  await expect(page.getByText("Additional competition context is unavailable.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main table").first()).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(context(page)).toContainText("1:40 remaining");
  await expect(page.locator("main table").first()).toBeVisible();
});

test("format note text is rendered safely", async ({ page, request }) => {
  const { format } = await get(request, "2022", "/format");
  const note = '<img src="invalid" onerror="window.rulingInjected=true">';
  await page.route(/\/format$/, (route) => route.fulfill({ json: { format: { ...format, exceptions: [{ kind: "endedEarly", gameCode: 313, note }] } } }));
  await page.goto("/2022/games/313");
  await expect(context(page)).toHaveText(note);
  expect(await page.evaluate(() => window.rulingInjected)).toBeUndefined();
  await expect(context(page).locator("img")).toHaveCount(0);
});

for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`ruling context fits every affected page at all widths in ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    for (const path of ["home", "standings", "teams/PAN", "games/313", "postseason"]) {
      await page.goto(`/2022/${path}`);
      if (path === "postseason") await page.getByRole("group", { name: "3 v 6", exact: true }).getByRole("button").first().click();
      await expect(context(page)).toBeVisible();
      for (const width of [1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await page.screenshot({ path: `test-results/34e-context-${path.replaceAll("/", "-")}-${theme}-320.png`, fullPage: true });
    }
  });
}

for (const season of ["2020", "2022"]) {
  test(`${season}: statistics scopes, qualification samples and Records preserve eligible performances`, async ({ request }) => {
    for (const scope of ["RS", "all", "PS"]) {
      const data = await get(request, season, `/advanced/standings?scope=${scope}`);
      expect(data.scope).toBe(scope);
      expect(data.standings).toHaveLength(scope === "PS" ? 8 : 18);
    }
    for (const phase of ["RS", "PO", "FF"]) {
      const data = await get(request, season, `/season-stats?phase=${phase}&mode=perGame&qualified=true&limit=100`);
      expect(data.players.length).toBeGreaterThan(0);
      expect(data.players.every((row) => row.qualified && row.minGames > 0 && Number(row.traditional.gamesPlayed) >= row.minGames)).toBe(true);
    }
    for (const phase of ["PI", "TS"]) {
      const response = await request.get(`${API}/seasons/${season}/games?phase=${phase}`);
      expect(response.status()).toBe(404);
      expect((await response.json()).error.code).toBe("PHASE_NOT_IN_SEASON");
    }
    for (const kind of ["player-seasons", "team-seasons", "single-games", "team-games"]) {
      const data = await get(request, season, `/records/${kind}?metric=pointsScored`);
      expect(data.records.length).toBeGreaterThan(0);
      expect(data.records.length).toBeLessThanOrEqual(50);
    }
    const data = await get(request, season, "/records/player-seasons?metric=per");
    expect(data.minGames).toBe(20);
    expect(data.records.every((row) => row.gamesPlayed >= row.minGames)).toBe(true);
    for (const row of data.records.filter((row) => row.seasonCode === `E${season}` || row.seasonCode === season)) expect(row.minGames).toBe(20);
  });
}
