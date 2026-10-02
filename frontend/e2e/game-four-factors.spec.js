import { test, expect } from "@playwright/test";
import { ADVANCED, SEASON, mockGameApi } from "./support/game-fixtures";

const DEFENSE = "Defense (what each team held its opponent to)";

async function openComparison(page, options = {}) {
  await mockGameApi(page, { advanced: ADVANCED, ...options });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveAttribute("aria-selected", "true");
}

// A mirrored row, found by its label inside one block of the Four Factors panel.
// The label carries its tip as screen-reader text, so it is matched by its start.
function factorRow(page, block, label) {
  const start = new RegExp(`^${label}`);
  return page
    .getByRole("region", { name: block })
    .locator("div.border-b", { has: page.locator(".header-tip-label").filter({ hasText: start }) });
}

function boxScoreRow(page, label) {
  return page.locator("div.border-b", { has: page.getByText(label, { exact: true }) });
}

test("the Four Factors panel shows offense, defense and pace and ratings for both teams", async ({ page }) => {
  await openComparison(page);

  await expect(page.getByRole("region", { name: "Offense" })).toBeVisible();
  await expect(page.getByRole("region", { name: DEFENSE })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pace and ratings" })).toBeVisible();

  const efg = factorRow(page, "Offense", "eFG%");
  await expect(efg).toContainText("59.0%");
  await expect(efg).toContainText("50.0%");
  await expect(factorRow(page, "Offense", "FT rate")).toContainText("20.0%");
  await expect(factorRow(page, DEFENSE, "Opp eFG%")).toContainText("50.0%");
  await expect(factorRow(page, DEFENSE, "DRB%")).toContainText("70.0%");
  await expect(factorRow(page, "Pace and ratings", "Pace")).toContainText("70.0");
  await expect(factorRow(page, "Pace and ratings", "Offensive rating")).toContainText("114.0");
  await expect(factorRow(page, "Pace and ratings", "Net rating")).toContainText("+14.0");
  await expect(factorRow(page, "Pace and ratings", "Net rating")).toContainText("-14.0");
});

test("directions decide the highlighted side and the lower-is-better notes", async ({ page }) => {
  await openComparison(page);

  // Higher eFG% is better, so Team A (59.0%) is highlighted; a lower turnover percentage is better, so Team A (12.0%) again.
  await expect(factorRow(page, "Offense", "eFG%").locator(".text-primary")).toContainText("59.0%");
  const tov = factorRow(page, "Offense", "TOV%");
  await expect(tov).toContainText("Lower is better");
  await expect(tov.locator(".text-primary")).toContainText("12.0%");
  // Pace is neutral: neither side is highlighted and there is no note.
  const pace = factorRow(page, "Pace and ratings", "Pace");
  await expect(pace.locator(".text-primary")).toHaveCount(0);
  await expect(pace).not.toContainText("Lower is better");
  await expect(factorRow(page, "Pace and ratings", "Defensive rating")).toContainText("Lower is better");
});

test("a team's season average is printed and marked, and a team with too few games has none", async ({ page }) => {
  await openComparison(page);

  const efg = factorRow(page, "Offense", "eFG%");
  await expect(efg.getByText("Season avg 55.0%")).toBeVisible();
  await expect(efg.locator("span[title='Season avg 55.0%']")).toHaveCount(1);
  await expect(efg.getByText(/Season avg/)).toHaveCount(1);
  await expect(factorRow(page, "Pace and ratings", "Net rating").getByText("Season avg +5.0")).toBeVisible();
  await expect(
    page.getByText("Season averages need at least 3 games, so they are hidden for a team that has played fewer."),
  ).toBeVisible();
});

test("with both averages available the panel explains the tick instead", async ({ page }) => {
  const advanced = {
    ...ADVANCED,
    teams: [ADVANCED.teams[0], { ...ADVANCED.teams[1], season: { ...ADVANCED.teams[0].season, efgPct: 0.51 } }],
  };
  await openComparison(page, { advanced });

  await expect(page.getByText("The tick on each bar marks the team's season average through round 2.")).toBeVisible();
  await expect(factorRow(page, "Offense", "eFG%").getByText(/Season avg/)).toHaveCount(2);
  await expect(page.getByText("Season averages need at least 3 games")).toHaveCount(0);
});

test("the box-score rows are mirrored bars with the old values and the same tooltips", async ({ page }) => {
  await openComparison(page);

  await expect(page.locator("table")).toHaveCount(0);
  const points = boxScoreRow(page, "Points");
  await expect(points).toContainText("80");
  await expect(points).toContainText("70");
  await expect(points.locator(".text-primary")).toContainText("80");
  await expect(page.getByText("20-30 (66.7%)")).toBeVisible();
  const turnovers = boxScoreRow(page, "Turnovers");
  await expect(turnovers).toContainText("Lower is better");
  await expect(turnovers.locator(".text-primary")).toContainText("10");

  await page.locator(".header-tip-label", { hasText: "2PT" }).hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Two-pointers: made-attempted" })).toBeVisible();
});

test("the standard rows sit on the left and the Four Factors on the right on a wide screen, stacked on a narrow one", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await openComparison(page);

  const left = await boxScoreRow(page, "Points").boundingBox();
  const right = await factorRow(page, "Offense", "eFG%").boundingBox();
  expect(right.x).toBeGreaterThan(left.x + left.width - 1);
  expect(Math.abs(left.y - right.y)).toBeLessThan(400);

  // The two panels are equally tall, the shorter one spreading its rows out.
  const leftPanel = await page.locator(".panel", { has: boxScoreRow(page, "Points") }).boundingBox();
  const rightPanel = await page.locator(".panel", { has: page.getByRole("region", { name: "Offense" }) }).boundingBox();
  expect(Math.abs(leftPanel.height - rightPanel.height)).toBeLessThan(2);

  await page.setViewportSize({ width: 600, height: 1000 });
  const stackedLeft = await boxScoreRow(page, "Points").boundingBox();
  const stackedRight = await factorRow(page, "Offense", "eFG%").boundingBox();
  expect(stackedRight.y).toBeGreaterThan(stackedLeft.y);
  expect(Math.abs(stackedRight.x - stackedLeft.x)).toBeLessThan(2);
});

test("a game without advanced data says so and the box-score rows stay", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Four Factors aren't available for this game yet.")).toBeVisible();
  await expect(boxScoreRow(page, "Points")).toContainText("80");
});

test("a failed advanced request shows a retry in the panel and keeps the box-score rows", async ({ page }) => {
  await mockGameApi(page, { advancedStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Could not load the Four Factors.")).toBeVisible();
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expect(boxScoreRow(page, "Points")).toContainText("80");
});

test("a failed box score shows a retry for the rows and keeps the Four Factors", async ({ page }) => {
  await mockGameApi(page, { advanced: ADVANCED, boxScoreStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Could not load team comparison.")).toBeVisible({ timeout: 20_000 });
  await expect(factorRow(page, "Offense", "eFG%")).toContainText("59.0%");
});

test("an unplayed game has no comparison and does not request advanced stats", async ({ page }) => {
  const requests = [];
  await mockGameApi(page, { played: false, requests });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Team comparison isn't available until this game is played.")).toBeVisible();
  await expect(page.getByText("Four Factors")).toHaveCount(0);
  expect(requests.some((pathname) => pathname.endsWith("/advanced"))).toBe(false);
});
