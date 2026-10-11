import { test, expect } from "@playwright/test";

const ROWS = {
  player: [
    { seasonCode: "2026", personKey: "p3", playerName: "THREE, CAL", clubName: "Club C", clubTvCodes: "CCC", numericValue: 820 },
    { seasonCode: "2025", personKey: "p2", playerName: "TWO, BEN", clubName: "Club B", clubTvCodes: "BBB", numericValue: 780 },
    { seasonCode: "2024", personKey: "p1", playerName: "ONE, AL", clubName: "Club A", clubTvCodes: "AAA", numericValue: 700 },
    { seasonCode: "2025", personKey: "p4", playerName: "FOUR, DEE", clubName: "Club D", clubTvCodes: "DDD", numericValue: 650 },
  ],
  game: [{ seasonCode: "2025", gameCode: 42, personKey: "p2", playerName: "Game Player", clubName: "Club", numericValue: 35, scheduledAt: "2025-01-15T19:00:00.000Z" }],
  team: [{ seasonCode: "2025", clubCode: "OLY", clubName: "Olympiacos", numericValue: 2400 }],
};

// Mocks the seasons, the three record routes and the season's teams. `rows` replaces a family's rows; `delay` holds back the answer for a
// metric (by the route's own metric name) for that many milliseconds; `fail` makes the three record routes answer 500.
async function mockApi(page, { rows = {}, delay = {}, fail = false } = {}) {
  const data = { ...ROWS, ...rows };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2026", name: "2025-26" }] } });
    if (path.endsWith("/teams")) return route.fulfill({ json: { teams: [{ clubCode: "OLY", name: "Olympiacos", crestUrl: "/logo-header.png" }] } });
    const family = path.endsWith("/records/player-seasons") ? "player" : path.endsWith("/records/single-games") ? "game" : path.endsWith("/records/team-seasons") ? "team" : null;
    if (!family) return route.fulfill({ status: 404, json: {} });
    if (fail) return route.fulfill({ status: 500, json: {} });
    const wait = delay[url.searchParams.get("metric")];
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    return route.fulfill({ json: { label: "Points", metric: url.searchParams.get("metric"), records: data[family] } });
  });
}

const tab = (page, name) => page.getByRole("tab", { name, exact: true });

test("shows archive-to-date player-season records", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await expect(page.getByRole("heading", { name: "Records", exact: true })).toBeVisible();
  await expect(page.getByText("The highest season totals by one player.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best in each season" })).toBeVisible();
  await expect(page.getByText("Cal Three").first()).toBeVisible();
});

test("shows linked single-game archive records", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await tab(page, "Single-game").click();
  await expect(page.getByText("The best single games by one player.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Game Player" }).first()).toHaveAttribute("href", "/2025/players/p2");
  await expect(page.getByRole("link", { name: "Game", exact: true }).first()).toHaveAttribute("href", "/2025/games/42");
});

test("shows linked team-season archive records, with the club's crest from the season's teams", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await tab(page, "Team-season").click();
  await expect(page.getByText("The highest season totals by one club.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Olympiacos" }).first()).toHaveAttribute("href", "/2025/teams/OLY");
  await expect(page.locator("main img[src='/logo-header.png']").first()).toBeVisible();
});

test("the podium, the progression, the best of each season and the Top 50 read from the rows", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");

  // The podium: the top three, the names written "First Last", the value, the season and a link to the player in that season's address.
  const podium = page.locator("ol").first().locator("> li");
  await expect(podium).toHaveCount(3);
  await expect(podium.nth(0)).toContainText("Cal Three");
  await expect(podium.nth(0)).toContainText("820");
  await expect(podium.nth(0)).toContainText("2026-27");
  await expect(podium.nth(1)).toContainText("Ben Two");
  await expect(podium.nth(2)).toContainText("Al One");
  await expect(page.getByRole("link", { name: "Cal Three" }).first()).toHaveAttribute("href", "/2026/players/p3");

  // The progression: each record that beat the one before, with its gain, the last one marked as the one that stands.
  const progression = page.locator("section", { has: page.getByRole("heading", { name: "Record progression" }) }).locator("li");
  await expect(progression).toHaveCount(3);
  await expect(progression.nth(0)).toContainText("700");
  await expect(progression.nth(1)).toContainText("780");
  await expect(progression.nth(1)).toContainText("+80");
  await expect(progression.nth(2)).toContainText("+40");
  await expect(progression.nth(2)).toContainText("Current record");

  // The best of each season: one entry per season, the overall record marked.
  const best = page.locator("section", { has: page.getByRole("heading", { name: "Best in each season" }) }).locator("li");
  await expect(best).toHaveCount(3);
  await expect(best.nth(0)).toContainText("Al One");
  await expect(best.nth(1)).toContainText("Ben Two");
  await expect(best.nth(2)).toContainText("Record");

  // The Top 50: all four rows, in rank order.
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText("Dee Four");
});

test("the record type and the metric are in the address, the defaults are not, and Back steps through the choices", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await expect(tab(page, "Player seasons")).toHaveAttribute("aria-selected", "true");
  expect(new URL(page.url()).search).toBe("");

  await tab(page, "Team-season").click();
  await expect(page).toHaveURL(/[?&]type=team(&|$)/);
  await tab(page, "PIR").click();
  await expect(page).toHaveURL(/type=team/);
  await expect(page).toHaveURL(/metric=pir/);
  await tab(page, "Player seasons").click();
  await expect(page).not.toHaveURL(/type=/);
  await expect(page).toHaveURL(/metric=pir/);
  await tab(page, "Points").click();
  expect(new URL(page.url()).search).toBe("");

  await page.goBack();
  await expect(page).toHaveURL(/metric=pir/);
  await expect(tab(page, "PIR")).toHaveAttribute("aria-selected", "true");

  // A link opens straight on its choice; an unknown value falls back to the default.
  await page.goto("/2026/records?type=game&metric=totalRebounds");
  await expect(tab(page, "Single-game")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Rebounds")).toHaveAttribute("aria-selected", "true");
  await page.goto("/2026/records?type=nonsense&metric=nonsense");
  await expect(tab(page, "Player seasons")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Points")).toHaveAttribute("aria-selected", "true");
});

test("a change of metric keeps the header, the strips and the rows on screen while the next ones load", async ({ page }) => {
  await mockApi(page, { delay: { totalRebounds: 1200 } });
  await page.goto("/2026/records");
  await expect(page.getByText("Cal Three").first()).toBeVisible();
  await tab(page, "Rebounds").click();
  // Held back: the page is still there, marked busy, with no loading spinner replacing it.
  await expect(page.locator("#records-panel")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("heading", { name: "Records", exact: true })).toBeVisible();
  await expect(tab(page, "Rebounds")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Cal Three").first()).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("#records-panel")).toHaveAttribute("aria-busy", "false");
});

test("the PIR column header carries the PIR tip", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records?metric=pir");
  await page.locator("thead .header-tip-label").hover();
  await expect(page.getByRole("tooltip")).toContainText("Performance index rating");
});

test("an error shows Retry, and a metric without records says so", async ({ page }) => {
  await mockApi(page, { fail: true });
  await page.goto("/2026/records");
  await expect(page.getByText("Could not load archive records.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockApi(page, { rows: { player: [] } });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("No records are available for this metric.")).toBeVisible();
  await expect(tab(page, "Player seasons")).toBeVisible();
});

test("with reduced motion the cards and rows do not slide in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/2026/records");
  const cards = page.locator("ol").first().locator("> li");
  await expect(cards).toHaveCount(3);
  // Read straight away: a slide would still have a transform on its first frames.
  const transforms = await page.locator("ol > li, tbody tr").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(new Set(transforms)).toEqual(new Set(["none"]));
});
