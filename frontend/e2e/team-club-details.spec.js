import { test, expect } from "@playwright/test";

// The club's city, home arena, website and EuroLeague history under the codes in the team page's header (feature 37c).
const API = "http://localhost:3000/api";
const header = (page) => page.locator("main section").first();
const facts = (page) => header(page).locator("p.muted").nth(1);

// The live team reply with its club details replaced, to reach the cases the local data does not have.
async function withClub(page, club) {
  await page.route("**/api/seasons/2025/teams/PAN", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), club } });
  });
}

test("the team reply carries the club's city, website, home arena and history", async ({ request }) => {
  const health = await (await request.get(`${API}/health`)).json();
  expect(health.target).toBe("local");
  const { team, club } = await (await request.get(`${API}/seasons/2025/teams/PAN`)).json();
  expect(team.clubCode).toBe("PAN");
  expect(club).toEqual({
    city: "ATHENS",
    website: "http://www.paobc.gr",
    arena: "TELEKOM CENTER ATHENS",
    firstSeasonCode: "E2001",
    lastSeasonCode: "E2026",
    seasonsPlayed: 26,
  });
  // A newcomer: its history starts with the season it joined.
  const dubai = await (await request.get(`${API}/seasons/2025/teams/DUB`)).json();
  expect(dubai.club).toMatchObject({ firstSeasonCode: "E2025", seasonsPlayed: 2 });
});

test("the header names the city, arena, website and history under the codes, on every tab", async ({ page }) => {
  await page.goto("/2025/teams/PAN");
  await expect(facts(page)).toHaveText("Athens · Telekom Center Athens · paobc.gr · 26 EuroLeague seasons since 2001-02", { timeout: 30_000 });
  const link = facts(page).getByRole("link", { name: "paobc.gr" });
  await expect(link).toHaveAttribute("href", "http://www.paobc.gr");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("tab", { name: "Roster", exact: true }).click();
  await expect(facts(page)).toHaveText("Athens · Telekom Center Athens · paobc.gr · 26 EuroLeague seasons since 2001-02");
});

test("a club without details has no second line; a one-season club and an address that is not a web page read as text", async ({ page }) => {
  const empty = { city: null, website: null, arena: null, firstSeasonCode: null, lastSeasonCode: null, seasonsPlayed: null };
  await withClub(page, empty);
  await page.goto("/2025/teams/PAN");
  await expect(header(page).locator("p.muted").first()).toBeVisible({ timeout: 30_000 });
  await expect(header(page).locator("p.muted")).toHaveCount(1);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await withClub(page, { ...empty, city: "Madrid", website: "javascript:alert(1)", firstSeasonCode: "E2025", lastSeasonCode: "E2025", seasonsPlayed: 1 });
  await page.goto("/2025/teams/PAN");
  await expect(facts(page)).toHaveText("Madrid · 1 EuroLeague season (2025-26)", { timeout: 30_000 });
  await expect(facts(page).getByRole("link")).toHaveCount(0);
});

test("at 320px the club details wrap inside the header without the page scrolling sideways", async ({ page }) => {
  await withClub(page, {
    city: "SAN SEBASTIAN DE LOS REYES",
    website: "https://www.a-very-long-club-website-address-for-basketball.example.com/en/home",
    arena: "PABELLON MUNICIPAL DE DEPORTES FUENTE DE SAN LUIS VALENCIA",
    firstSeasonCode: "E2001",
    lastSeasonCode: "E2026",
    seasonsPlayed: 26,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/2025/teams/PAN");
  await expect(facts(page)).toContainText("26 EuroLeague seasons since 2001-02", { timeout: 30_000 });
  const [line, panel] = await Promise.all([facts(page).boundingBox(), header(page).boundingBox()]);
  expect(line.x).toBeGreaterThanOrEqual(panel.x - 1);
  expect(line.x + line.width).toBeLessThanOrEqual(panel.x + panel.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
