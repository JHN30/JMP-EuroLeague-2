import { test, expect } from "@playwright/test";
import { competitionNotes, tableTiers } from "../src/lib/seasonFormat.js";

const API = "http://localhost:3000/api";
const get = async (request, path) => {
  const response = await request.get(`${API}/seasons/2019${path}`);
  expect(response.ok(), path).toBe(true);
  return response.json();
};
const context = (page) => page.getByRole("complementary", { name: "Competition context" });
const noOutcome = async (page) => {
  await expect(page.getByRole("heading", { name: "Season cancelled", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("No postseason was played and no champion was named.");
  await expect(page.locator(".bk-grid")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/bracket is a projection|NEXT UP|are the champions|Select a matchup|qualification race|Out of playoff contention/);
  await expect(page.getByRole("list", { name: "Stages of the season" })).toHaveCount(0);
};

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("the cancelled archive separates planned games, suspension standings and played performances", async ({ request }) => {
  const { format } = await get(request, "/format");
  expect(format).toMatchObject({ status: "cancelled", plannedClubs: 18, issues: [] });
  expect(format.stages.map((stage) => stage.code)).toEqual(["RS"]);
  expect(format.stages[0]).toMatchObject({ gamesPerClub: 34, qualification: [], dataState: "partial", observed: { gamesPlayed: 252, gamesTotal: 306 } });
  expect(format.exceptions[0]).toMatchObject({ kind: "cancelled", suspendedOn: "2020-03-12", cancelledOn: "2020-05-25" });
  expect(tableTiers({ ...format, stages: [{ ...format.stages[0], qualification: [{ positions: [1, 8], within: "table", kind: "direct" }] }] }, "RS")).toBeNull();
  expect(competitionNotes(format, "2020", { gameCode: 253 })).toEqual([]);
  const games = [];
  for (let offset = 0; ; offset += 100) {
    const data = await get(request, `/games?limit=100&offset=${offset}&order=asc`);
    games.push(...data.games);
    if (!data.pagination.hasMore) break;
  }
  expect(games).toHaveLength(306);
  expect(games.filter((game) => game.played)).toHaveLength(252);
  expect(games.filter((game) => !game.played)).toHaveLength(54);
  expect(games.filter((game) => !game.played).every((game) => game.roundNumber >= 29 && game.localScore === null && game.roadScore === null)).toBe(true);
  const { standings, round } = await get(request, "/phases/RS/standings");
  expect(round).toBe(28);
  expect(standings).toHaveLength(18);
  expect(standings.slice(0, 4).map((row) => [row.clubCode, row.basic.gamesWon, row.basic.gamesLost])).toEqual([["IST", 24, 4], ["MAD", 22, 6], ["BAR", 22, 6], ["CSK", 19, 9]]);
  for (const row of standings) {
    const played = games.filter((game) => game.played && [game.localTeam.clubCode, game.roadTeam.clubCode].includes(row.clubCode));
    expect(played).toHaveLength(28);
    expect(row.basic.gamesPlayed).toBe(28);
    const won = played.filter((game) => game.localTeam.clubCode === row.clubCode ? game.localScore > game.roadScore : game.roadScore > game.localScore).length;
    expect(row.basic.gamesWon).toBe(won);
    expect((await get(request, `/teams/${row.clubCode}/games?status=scheduled&limit=100`)).games).toEqual([]);
  }
  expect((await get(request, "/games?status=scheduled&limit=100")).games).toEqual([]);
  expect((await get(request, "/postseason-series")).series).toEqual([]);
  for (const snapshot of [1, 14]) expect((await get(request, `/phases/RS/standings?round=${snapshot}`)).standings).toHaveLength(18);
  for (const scope of ["RS", "all"]) expect((await get(request, `/advanced/standings?scope=${scope}`)).standings).toHaveLength(18);
  for (const phase of ["PO", "PI", "FF", "TS"]) {
    const response = await request.get(`${API}/seasons/2019/games?phase=${phase}`);
    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe("PHASE_NOT_IN_SEASON");
  }
  const { players } = await get(request, "/season-stats?phase=RS&mode=perGame&qualified=true&limit=100");
  expect(players.length).toBeGreaterThan(0);
  expect(players.every((row) => row.qualified && row.minGames === 15 && Number(row.traditional.gamesPlayed) >= 15)).toBe(true);
  const per = await get(request, "/records/player-seasons?metric=per");
  expect(per.minGames).toBe(20);
  expect(per.records).toEqual(expect.arrayContaining([expect.objectContaining({ seasonCode: "E2019", personKey: "007200", gamesPlayed: 25 })]));
  for (const kind of ["player-seasons", "team-seasons", "single-games", "team-games"]) expect((await get(request, `/records/${kind}?metric=pointsScored`)).records.length).toBeGreaterThan(0);
  const scoring = await get(request, "/records/single-games?metric=pointsScored");
  expect(scoring.records).toEqual(expect.arrayContaining([expect.objectContaining({ seasonCode: "E2019", gameCode: 97, numericValue: 49 })]));
});

test("Postseason cancellation needs no standings or series and survives contradictory format rules", async ({ page, request }) => {
  const { format } = await get(request, "/format");
  const calls = [];
  await page.route(/\/api\/seasons\/2019\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/format")) return route.fulfill({ json: { format: { ...format, stages: [{ ...format.stages[0], dataState: "loaded", qualification: [{ positions: [1, 8], within: "table", kind: "direct", to: "PO" }] }] } } });
    calls.push(path);
    return route.fulfill({ status: 500, json: { error: "Bracket inputs unavailable" } });
  });
  await page.goto("/2019/postseason");
  await noOutcome(page);
  expect(calls).toEqual([]);
});

test("cancellation overrides recorded champion data and stays scoped when switching seasons", async ({ page, request }) => {
  const { format } = await get(request, "/format");
  let cancelled = false;
  await page.route(/\/api\/seasons\/2022\/format$/, (route) => cancelled ? route.fulfill({ json: { format: { ...format, seasonCode: "E2022" } } }) : route.continue());
  await page.goto("/2022/postseason");
  await expect(page.getByText("Real Madrid are the champions", { exact: true })).toBeVisible();
  cancelled = true;
  await page.goto("/2022/postseason");
  await noOutcome(page);
  await page.goto("/2020/postseason");
  await expect(page.getByText("Anadolu Efes Istanbul are the champions", { exact: true })).toBeVisible();
});

test("format loading, failure, retry and absent metadata never project a cancelled bracket", async ({ page }) => {
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  let fail = true;
  await page.route(/\/format$/, async (route) => {
    await delayed;
    return fail ? route.fulfill({ status: 500, json: { error: "Unavailable" } }) : route.continue();
  });
  await page.goto("/2019/postseason");
  await expect(page.getByRole("status", { name: "Loading the postseason", exact: true })).toBeVisible();
  await expect(page.locator(".bk-grid")).toHaveCount(0);
  release();
  await expect(page.getByText("Could not load the postseason.")).toBeVisible({ timeout: 30_000 });
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await noOutcome(page);
  await page.route(/\/format$/, (route) => route.fulfill({ json: { format: null } }));
  await page.goto("/2019/postseason");
  await expect(page.getByText("The season format is unavailable, so there is no bracket to show.")).toBeVisible();
  await expect(page.locator(".bk-grid")).toHaveCount(0);
});

test("standings show suspension positions with no qualification badges or live contention", async ({ page }) => {
  await page.goto("/2019/standings");
  await expect(context(page)).toContainText("positions at suspension");
  await expect(page.locator("main table").first().locator("tbody tr")).toHaveCount(18);
  await expect(page.locator('[title="Qualified"]')).toHaveCount(0);
  await expect(page.getByText("= qualified for the next stage.")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Direct to playoffs|Playoff cutoff|Out of playoff contention/);
  for (const breakdown of ["streaks", "margins", "aheadBehind"]) {
    await page.getByRole("combobox", { name: "Breakdown", exact: true }).selectOption(breakdown);
    await expect(page.locator("main table").first()).toBeVisible();
    await expect(page.locator("main .loading")).toHaveCount(0);
    await expect(page.locator('[title="Qualified"]')).toHaveCount(0);
  }
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Round shown in the race" });
  await expect(slider).toHaveAttribute("max", "28");
  await expect(slider).toHaveValue("28");
  await slider.press("Home");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await expect(page.locator("main")).not.toContainText("Most time in contention");
  await slider.press("End");
  await expect(slider).toHaveValue("28");
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(context(page)).toContainText("positions at suspension");
  await expect(page.locator("main table").first()).toBeVisible();
});

test("unavailable format context keeps recorded data usable without declaring completion", async ({ page }) => {
  await page.route(/\/format$/, (route) => route.fulfill({ status: 500, json: { error: "Unavailable" } }));
  await page.goto("/2019/home");
  await expect(page.getByText("Season status is unavailable.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).not.toContainText(/Season finished|season has finished|are the champions/);
  await expect(page.getByRole("listitem").filter({ hasText: "Anadolu Efes Istanbul" }).first()).toContainText("24-4");
  await page.goto("/2019/games/1");
  await expect(page.getByText("Additional competition context is unavailable.")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  await page.route(/\/format$/, (route) => route.continue());
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(context(page)).toContainText("Played performances remain");
  await page.goto("/2019/standings");
  await page.route(/\/phases\/RS\/standings(?:\?.*)?$/, (route) => route.fulfill({ json: { round: null, standings: [] } }));
  await page.reload();
  await expect(page.getByText("Standings not available yet for this phase.")).toBeVisible();
  await expect(page.locator("main table")).toHaveCount(0);
});

test("abandoned fixtures remain archived without tipoff previews or fabricated box scores", async ({ page, request }) => {
  const { game } = await get(request, "/games/253");
  expect(game).toMatchObject({ played: false, gameStatus: "Confirmed", localScore: null, roadScore: null, roundNumber: 29 });
  expect((await get(request, "/games/253/box-score")).playerStats).toEqual([]);
  await page.goto("/2019/games?round=29");
  await expect(context(page)).toContainText("Season cancelled");
  await expect(page.locator(".fixture-card")).toHaveCount(9);
  await expect(page.locator(".fixture-card").first()).toContainText("Not played");
  await expect(page.locator(".fixture-card .fixture-time")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Preview|final regular-season record/);
  await page.goto("/2019/games/253");
  await expect(page.getByText("Not played", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("Originally scheduled:");
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main")).toContainText("No result or performance statistics were recorded.");
  await expect(page.locator("main")).not.toContainText("until this game is played");
  await page.getByRole("tab", { name: "Game flow", exact: true }).click();
  await expect(page.locator("main")).toContainText("No result or performance statistics were recorded.");
  await expect(page.locator("main table")).toHaveCount(0);
  await page.goto("/2019/games/1");
  await expect(context(page)).toContainText("Played performances remain");
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
});

test("all existing archive pages keep real data, RS scopes and loaded-season history", async ({ page, request }) => {
  test.setTimeout(120_000);
  const { players } = await get(request, "/season-stats?phase=RS&mode=perGame&qualified=true&limit=1");
  const person = players[0];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const visit = async (path) => {
    await page.goto(`/2019/${path}`);
    await expect(page.locator("main .loading")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator("main")).not.toContainText(/Could not load|Something went wrong/);
    await expect(page.getByRole("tab", { name: /^(Play-In|Playoffs|Final Four|Top 16)$/ })).toHaveCount(0);
  };
  await visit("home");
  await expect(context(page)).toContainText("positions at suspension");
  await expect(page.getByText("Season cancelled.", { exact: true })).toBeVisible();
  await visit("overview");
  await expect(page.getByText("Season cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText(/planned format was 18 clubs/)).toContainText("34 games per club");
  await expect(page.locator(".panel", { hasText: "Phase 1", has: page.getByRole("heading", { name: "Regular Season", exact: true }) })).toContainText("Mar 6, 2020");
  await visit("teams");
  await expect(page.locator("main a[href*='/teams/']")).toHaveCount(18);
  await visit("teams/IST");
  await expect(context(page)).toContainText("positions at suspension");
  await page.getByRole("tab", { name: "Statistics", exact: true }).click();
  await expect(page.getByRole("region", { name: "Traditional", exact: true })).toBeVisible();
  await visit("players");
  await expect(page.locator("main a[href*='/players/']").first()).toBeVisible();
  await visit(`players/${person.personKey}`);
  await page.getByRole("tab", { name: "Season by season", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  await page.getByRole("tab", { name: "Statistics", exact: true }).click();
  await expect(page.getByText(/Ranked among the .* players with at least 15 games/)).toBeVisible();
  await visit("leaders?scope=players&phase=RS");
  await expect(page.getByText("Shane Larkin", { exact: true }).first()).toBeVisible();
  await visit("compare?teamA=IST&teamB=MAD");
  await expect(page.getByText("Where each club is stronger")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Next meeting|Upcoming game/);
  await visit("compare/head-to-head?teamA=IST&teamB=MAD");
  await expect(page.getByText(/completed meetings/)).toBeVisible();
  await visit("records");
  await expect(page.locator("main a[href*='/players/']").first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`cancellation archive fits all changed contexts in ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    for (const path of ["postseason", "home", "standings", "games?round=29", "games/253", "teams/IST"]) {
      await page.goto(`/2019/${path}`);
      if (path === "postseason") await noOutcome(page);
      else await expect(context(page)).toBeVisible();
      for (const width of [1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
      await page.screenshot({ path: `test-results/34f-${path.replaceAll(/[/?=]/g, "-")}-${theme}-320.png`, fullPage: true });
    }
  });
}
