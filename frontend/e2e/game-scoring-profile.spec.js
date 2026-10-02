import { test, expect } from "@playwright/test";
import { SEASON, TEAM_FLOW, mockGameApi } from "./support/game-fixtures";

async function openComparison(page, options = {}) {
  await mockGameApi(page, { teamFlow: TEAM_FLOW, ...options });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveAttribute("aria-selected", "true");
}

// A mirrored row of the Scoring profile, found by the start of its label (the tip is screen-reader text in the label).
function profileRow(page, label) {
  return page
    .getByTestId("scoring-profile-grid")
    .locator("div.border-b", { has: page.locator(".header-tip-label").filter({ hasText: new RegExp(`^${label}`) }) });
}

function withFlow(teams) {
  return { ...TEAM_FLOW, teams };
}

test("the Scoring profile shows how each team scored and how the game was led", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await openComparison(page);

  await expect(page.getByText("How each team scored and how the game was led")).toBeVisible();
  // Time in front prints as m:ss with its share of the game; the larger side is highlighted.
  const inFront = profileRow(page, "Time in front");
  await expect(inFront).toContainText("32:11 (80%)");
  await expect(inFront).toContainText("4:18 (11%)");
  await expect(inFront.locator(".text-primary")).toContainText("32:11");
  await expect(profileRow(page, "Biggest lead")).toContainText("20");
  await expect(profileRow(page, "Biggest lead")).toContainText("6");
  await expect(profileRow(page, "Longest run").locator(".text-primary")).toContainText("12");
  await expect(profileRow(page, "Runs of 6\\+")).toContainText("5");

  // Splits: the road team wins second-chance points and points off turnovers.
  await expect(profileRow(page, "Fast-break points").locator(".text-primary")).toContainText("12");
  await expect(profileRow(page, "Second-chance points").locator(".text-primary")).toContainText("17");
  await expect(profileRow(page, "Points off turnovers").locator(".text-primary")).toContainText("15");
  const assisted = profileRow(page, "Assisted baskets");
  await expect(assisted).toContainText("19 of 30 (63.3%)");
  await expect(assisted).toContainText("15 of 35 (42.9%)");

  // Possessions.
  await expect(profileRow(page, "Possessions counted")).toContainText("73");
  await expect(profileRow(page, "Possessions counted")).toContainText("72");
  await expect(profileRow(page, "Average possession")).toContainText("17.1 s");
  await expect(profileRow(page, "Average possession")).toContainText("16.0 s");
});

test("neutral rows highlight neither side, and clutch is a real result when there was clutch time", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await openComparison(page);

  for (const label of ["Lead changes", "Ties", "Possessions counted", "Average possession"]) {
    await expect(profileRow(page, label).locator(".text-primary")).toHaveCount(0);
    await expect(profileRow(page, label)).not.toContainText("Lower is better");
  }
  const clutch = profileRow(page, "Clutch points");
  await expect(clutch).toContainText("6");
  await expect(clutch).toContainText("4");
  await expect(clutch.locator(".text-primary")).toContainText("6");
});

test("a game with no clutch time shows an em dash, not zero", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1200 });
  const teams = TEAM_FLOW.teams.map((team) => ({ ...team, flow: { ...team.flow, clutchSeconds: 0, clutchPointsFor: 0, clutchPointsAgainst: 0 } }));
  await openComparison(page, { teamFlow: withFlow(teams) });

  const clutch = profileRow(page, "Clutch points");
  await expect(clutch).toContainText("—");
  await expect(clutch).not.toContainText(/\b0\b/);
});

test("a missing block is an em dash on that side only", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1200 });
  const teams = [TEAM_FLOW.teams[0], { ...TEAM_FLOW.teams[1], splits: null }];
  await openComparison(page, { teamFlow: withFlow(teams) });

  const fastBreak = profileRow(page, "Fast-break points");
  await expect(fastBreak).toContainText("12");
  await expect(fastBreak).toContainText("—");
  await expect(profileRow(page, "Assisted baskets")).toContainText("19 of 30 (63.3%)");
  await expect(profileRow(page, "Biggest lead")).toContainText("6");
});

test("the rows sit in two columns on a wide screen and one on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1200 });
  await openComparison(page);

  const first = await profileRow(page, "Time in front").boundingBox();
  const second = await profileRow(page, "Biggest lead").boundingBox();
  expect(second.x).toBeGreaterThan(first.x + first.width - 1);
  expect(Math.abs(second.y - first.y)).toBeLessThan(2);

  await page.setViewportSize({ width: 600, height: 1200 });
  const stackedFirst = await profileRow(page, "Time in front").boundingBox();
  const stackedSecond = await profileRow(page, "Biggest lead").boundingBox();
  expect(stackedSecond.y).toBeGreaterThan(stackedFirst.y);
  expect(Math.abs(stackedSecond.x - stackedFirst.x)).toBeLessThan(2);
});

test("a game without these tables says so and the rest of the tab stays", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("The scoring profile isn't available for this game yet.")).toBeVisible();
  await expect(page.getByText("Head to head")).toBeVisible();
  await expect(page.getByText("Four Factors aren't available for this game yet.")).toBeVisible();
});

test("a failed request shows a retry in the section and keeps the other two", async ({ page }) => {
  await mockGameApi(page, { teamFlowStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Could not load the scoring profile.")).toBeVisible();
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expect(page.getByText("Head to head")).toBeVisible();
  await expect(page.locator("div.border-b", { has: page.getByText("Points", { exact: true }) })).toContainText("80");
});

test("the Overview key stats gain four rows, and keep their own rows when the request fails", async ({ page }) => {
  await mockGameApi(page, { teamFlow: TEAM_FLOW });
  await page.goto(`/${SEASON}/games/1`);

  const keyStats = page.locator("section", { hasText: "How the teams compared" });
  await expect(keyStats.getByText("Time in front")).toBeVisible();
  await expect(keyStats.getByText("Biggest lead")).toBeVisible();
  await expect(keyStats.getByText("Fast-break points")).toBeVisible();
  await expect(keyStats.getByText("Second-chance points")).toBeVisible();
  await expect(keyStats.getByText("Longest run")).toHaveCount(0);
  await expect(keyStats).toContainText("32:11 (80%)");
  await expect(keyStats.getByText("Field goals")).toBeVisible();
});

test("a failed team-flow request leaves the Overview key stats as they were", async ({ page }) => {
  await mockGameApi(page, { teamFlowStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);

  const keyStats = page.locator("section", { hasText: "How the teams compared" });
  await expect(keyStats.getByText("Field goals")).toBeVisible();
  await expect(keyStats.getByText("Time in front")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
