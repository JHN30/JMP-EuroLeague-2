import { test, expect } from "@playwright/test";

const API = "http://localhost:3000/api";
const get = async (request, season, path) => {
  const response = await request.get(`${API}/seasons/E${season}${path}`);
  expect(response.ok(), `${season}${path}`).toBe(true);
  return response.json();
};

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

for (const season of ["2016", "2017", "2018"]) {
  test(`${season}: existing pages retain season data and available stages`, async ({ page, request }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const { teams } = await get(request, season, "/teams");
    const { players } = await get(request, season, "/season-stats?phase=PO&mode=perGame&qualified=true&limit=1");
    const { standings } = await get(request, season, "/phases/RS/standings");
    const [a, b] = standings.slice(0, 2).map((row) => teams.find((team) => team.clubCode === row.clubCode));
    const person = players[0];
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      const url = new URL(response.url());
      // Career and head-to-head probe other loaded seasons, where the person or club may not exist.
      const absentElsewhere = response.status() === 404 && !url.pathname.startsWith(`/api/seasons/${season}/`) && /^\/api\/seasons\/\d+\/(players\/[^/]+|teams\/[^/]+\/games)$/.test(url.pathname);
      if (url.pathname.startsWith("/api/") && response.status() >= 400 && !absentElsewhere) errors.push(`${response.status()} ${response.url()}`);
    });
    const visit = async (path) => {
      await page.goto(`/${season}/${path}`);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main .loading")).toHaveCount(0, { timeout: 30_000 });
      await expect(page.locator("main")).not.toContainText(/Could not load|Something went wrong/);
      await expect(page.getByRole("tab", { name: "Play-In", exact: true })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "Top 16", exact: true })).toHaveCount(0);
    };

    await test.step("completed Home and Overview", async () => {
      await visit("home");
      await expect(page.getByText("Season finished.", { exact: true })).toBeVisible();
      await visit("overview");
      const story = page.locator(".panel", { hasText: /Phase \d/, has: page.getByRole("heading", { name: "Regular Season", exact: true }) });
      await expect(story).toContainText("16 clubs");
      await expect(story).toContainText("30 games");
      await expect(story).toContainText("top 8 reach the Playoffs");
      await expect(page.getByRole("heading", { name: "Play-In", exact: true })).toHaveCount(0);
    });
    await test.step("standings table, race and advanced data", async () => {
      await visit("standings");
      await expect(page.locator("main table").first().locator("tbody tr")).toHaveCount(18);
      await expect(page.locator("main")).not.toContainText(/Play-in tournament/);
      for (const breakdown of ["streaks", "margins", "aheadBehind"]) {
        await page.getByRole("combobox", { name: "Breakdown", exact: true }).selectOption(breakdown);
        await expect(page.locator(".breakdown-vis")).toBeVisible();
        await expect(page.locator("main .loading")).toHaveCount(0, { timeout: 30_000 });
      }
      await page.getByRole("tab", { name: "Race", exact: true }).click();
      await expect(page.locator("main .loading")).toHaveCount(0, { timeout: 30_000 });
      const round = page.getByRole("slider", { name: "Round shown in the race" });
      await expect(round).toHaveAttribute("max", "30");
      await round.press("Home");
      await round.press("ArrowRight");
      await expect(round).toHaveValue("1");
      await round.press("End");
      await expect(round).toHaveValue("30");
      await expect(page.locator("main")).not.toContainText(/Play-In|Play-in/);
      await page.getByRole("tab", { name: "Advanced", exact: true }).click();
      await expect(page.locator("main table").first()).toBeVisible();
      await visit("standings?phase=PO");
      await expect(page.getByText(/This phase is a knockout/)).toBeVisible();
    });
    await test.step("fixtures and game detail", async () => {
      await visit("games?phase=PO");
      await expect(page.locator("main a[href*='/games/']").first()).toBeVisible();
      await visit("games/241");
      await expect(page.getByRole("tab", { name: "Box score", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Box score", exact: true }).click();
      await expect(page.locator("main table").first()).toBeVisible();
    });
    await test.step("team and player directories, statistics and career", async () => {
      await visit("teams");
      await expect(page.locator("main a[href*='/teams/']")).toHaveCount(16);
      await visit(`teams/${a.clubCode}?phase=PO`);
      await expect(page.getByRole("heading", { name: a.name, exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Statistics", exact: true }).click();
      await expect(page.getByRole("region", { name: "Traditional", exact: true })).toBeVisible();
      await visit("players");
      await expect(page.locator("main a[href*='/players/']").first()).toBeVisible();
      await visit(`players/${person.personKey}?phase=PO`);
      await expect(page.locator("main h1")).toContainText(person.playerName.split(",")[0]);
      await page.getByRole("tab", { name: "Season by season", exact: true }).click();
      await expect(page.locator("main table").first()).toBeVisible();
      await page.getByRole("tab", { name: "Statistics", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Season statistics", exact: true })).toBeVisible();
      await expect(page.getByText(/Ranked among the .* players with at least .* games in this phase/)).toBeVisible();
    });
    await test.step("Leaders, Compare, head-to-head and Records", async () => {
      await visit("leaders?scope=teams&phase=PO");
      await expect(page.getByRole("tab", { name: "Teams", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByText("cover the whole postseason together")).toBeVisible();
      await visit(`compare?teamA=${a.clubCode}&teamB=${b.clubCode}`);
      await expect(page.getByText("Where each club is stronger")).toBeVisible();
      await visit(`compare/head-to-head?teamA=${a.clubCode}&teamB=${b.clubCode}`);
      await expect(page.getByText(/completed meetings/)).toBeVisible();
      await visit("records");
      await expect(page.locator("main a[href*='/players/']").first()).toBeVisible();
    });
    expect(errors).toEqual([]);
  });
}

test("E2018 game 21 preserves its box score while event and shot data remain unavailable", async ({ page, request }) => {
  const coverage = await get(request, "2018", "/coverage?gameCode=21");
  for (const key of ["playByPlay", "shotLocations"]) {
    expect(coverage.items.find((item) => item.key === key)).toMatchObject({ status: "unavailable", availableCount: 0 });
  }
  await page.goto("/2018/games/21");
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  await page.getByRole("tab", { name: "Play-by-play", exact: true }).click();
  await expect(page.locator("main")).toContainText("Play-by-play isn't available for this game yet.");
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await expect(page.locator("main")).toContainText(/isn't available|not available|not loaded|no shot/i);
});
