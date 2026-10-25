import { test, expect } from "@playwright/test";

// Each stage reads its own advanced statistics scope: the regular season "RS", the Top 16 "TS", and every knockout stage (Play-In,
// Playoffs, Final Four) the postseason "PS". 2025-26 has no Top 16; 2012-13 has one.
const API = "http://localhost:3000/api";

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeAll(async ({ request }) => {
  const health = await (await request.get(`${API}/health`)).json();
  expect(health.target).toBe("local");
});

// The scope of the first advanced-standings request the page makes.
function advancedStandingsScope(page) {
  return page
    .waitForRequest((request) => /\/api\/seasons\/[^/]+\/advanced\/standings/.test(request.url()), { timeout: 30_000 })
    .then((request) => new URL(request.url()).searchParams.get("scope"));
}

for (const [season, phase, scope] of [["2025", "RS", "RS"], ["2025", "PO", "PS"], ["2025", "FF", "PS"], ["2012", "TS", "TS"]]) {
  test(`the ${season} team leaders read the ${scope} ratings for ${phase}`, async ({ page }) => {
    const requested = advancedStandingsScope(page);
    await page.goto(`/${season}/leaders?scope=teams&phase=${phase}`);
    expect(await requested).toBe(scope);
    // The note about postseason ratings shows only for a knockout stage.
    const note = page.getByText("cover the whole postseason together");
    await expect(page.getByRole("tab", { name: "Teams", exact: true })).toHaveAttribute("aria-selected", "true");
    if (scope === "PS") await expect(note).toBeVisible({ timeout: 30_000 });
    else await expect(note).toHaveCount(0);
  });
}

test("the 2012 team page reads the Top 16 ratings on its Top 16 tab", async ({ page, request }) => {
  const { teams } = await (await request.get(`${API}/seasons/E2012/teams`)).json();
  const requested = advancedStandingsScope(page);
  await page.goto(`/2012/teams/${teams[0].clubCode}?phase=TS`);
  expect(await requested).toBe("TS");
});

test("the 2012 advanced leaders have a Top 16 stage, and 2025 has none", async ({ page }) => {
  await page.goto("/2012/leaders?scope=advanced");
  const stage = page.getByLabel("Stage", { exact: true });
  await expect(stage.locator("option", { hasText: "Top 16" })).toHaveCount(1, { timeout: 30_000 });
  const requested = page.waitForRequest((request) => /\/advanced\/leaders/.test(request.url()) && new URL(request.url()).searchParams.get("scope") === "TS");
  await stage.selectOption({ label: "Top 16" });
  await requested;
  await expect(page).toHaveURL(/ascope=TS/);

  await page.goto("/2025/leaders?scope=advanced");
  await expect(stage.locator("option", { hasText: "Regular season" })).toHaveCount(1, { timeout: 30_000 });
  await expect(stage.locator("option", { hasText: "Top 16" })).toHaveCount(0);
  // No scope strip: the stages are only in the select.
  await expect(page.getByRole("tablist", { name: "Advanced leaders scope" })).toHaveCount(0);
});
