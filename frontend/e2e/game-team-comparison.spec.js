import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, TEAM_FLOW, mockGameApi, shot, teamTotal } from "./support/game-fixtures";

// In page order on a narrow screen: the traditional column, then the advanced one.
const GROUPS = ["Shooting", "Rebounds", "Ball and defense", "Where the points came from", "Efficiency", "Four factors", "Rates and style", "Game flow"];

async function openComparison(page, options = {}) {
  await mockGameApi(page, { advanced: ADVANCED, teamFlow: TEAM_FLOW, ...options });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveAttribute("aria-selected", "true");
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A mirrored row inside one group, by its label. A tip follows the label as " (tip)" screen-reader text and a
// lower-is-better row adds its note, so the label is matched up to either, never as the start of a longer label.
function row(page, group, label) {
  const name = new RegExp(`^${escape(label)}(?: \\(|Lower|$)`);
  return page
    .getByRole("region", { name: group, exact: true })
    .locator("div.border-b")
    .filter({ has: page.locator("div.text-center").filter({ hasText: name }) });
}

test("the tab groups the rows by question and leaves out the swapped and shared rows", async ({ page }) => {
  await openComparison(page, { shots: [shot(1, "A", "2FGM", 0, 50)] });

  for (const group of GROUPS) await expect(page.getByRole("region", { name: group, exact: true })).toBeVisible();
  const tab = page.locator("#game-detail-panel");
  for (const removed of ["Blocks against", "Fouls drawn", "Defensive rating", "Net rating", "Own possessions", "Possessions counted", "Time of possession", "Opp eFG%", "Opp TOV%", "DRB%", "Opp FT rate", "Assist ratio", "Starters' points", "Team turnovers"]) {
    await expect(tab.locator("div.text-center").filter({ hasText: new RegExp(`^${escape(removed)}(?: \\(|Lower|$)`) })).toHaveCount(0);
  }
  // The final score is the header's: no Points row.
  await expect(tab.locator("div.border-b div.text-center").filter({ hasText: /^Points(?: \(|$)/ })).toHaveCount(0);
  await expect(page.getByText("Coach: Alpha Coach")).toBeVisible();
  await expect(page.getByText("Coach: Bravo Coach")).toBeVisible();
});

test("the values both teams share are chips in the summary strip", async ({ page }) => {
  await openComparison(page);

  const strip = page.locator("dl[aria-label='The game in numbers']");
  await expect(strip).toBeVisible();
  for (const [label, value] of [["Pace", "70.0"], ["Possessions", "70.0"], ["Lead changes", "5"], ["Ties", "5"], ["Time tied", "3:31 (9%)"], ["Clutch time", "1:30"]]) {
    await expect(strip.locator("div", { has: page.locator("dt").filter({ hasText: new RegExp(`^${escape(label)}`) }) }).locator("dd")).toHaveText(value);
  }
});

test("rows keep their values, highlights and lower-is-better notes", async ({ page }) => {
  await openComparison(page);

  await expect(row(page, "Shooting", "Field goals")).toContainText("30-55 (54.5%)");
  await expect(row(page, "Shooting", "2PT")).toContainText("20-30 (66.7%)");
  const turnovers = row(page, "Ball and defense", "Turnovers");
  await expect(turnovers).toContainText("Lower is better");
  await expect(turnovers.locator(".text-primary")).toContainText("10");
  await expect(row(page, "Efficiency", "Points per 100 possessions").locator(".text-primary")).toContainText("114.0");
  await expect(row(page, "Four factors", "eFG%").locator(".text-primary")).toContainText("59.0%");
  await expect(row(page, "Four factors", "TOV%").locator(".text-primary")).toContainText("12.0%");
  // Steals per opponent possession: 7 / 70 and 9 / 70.
  await expect(row(page, "Rates and style", "Steal %")).toContainText("10.0%");
  await expect(row(page, "Rates and style", "Steal %")).toContainText("12.9%");
  await expect(row(page, "Where the points came from", "Bench points")).toContainText("12");
  await expect(row(page, "Rates and style", "Assisted baskets")).toContainText("19 of 30 (63.3%)");
  await expect(row(page, "Game flow", "Time in front")).toContainText("32:11 (80%)");
  await expect(row(page, "Rates and style", "Average possession")).toContainText("17.1 s");
});

test("the new figures: 3PT attempt rate, assist to turnover and quarters won", async ({ page }) => {
  await openComparison(page);

  // 25 of 55 and 20 of 48 field goal attempts were threes: style, so neither side is highlighted.
  const threeRate = row(page, "Rates and style", "3PT attempt rate");
  await expect(threeRate).toContainText("45.5%");
  await expect(threeRate).toContainText("41.7%");
  await expect(threeRate.locator(".text-primary")).toHaveCount(0);
  // 18 assists to 10 turnovers, 12 to 14.
  const astTo = row(page, "Rates and style", "Assist to turnover");
  await expect(astTo).toContainText("1.80");
  await expect(astTo).toContainText("0.86");
  // Periods 20-18, 25-15, 15-22, 20-15.
  const quarters = row(page, "Game flow", "Quarters won");
  await expect(quarters).toContainText("3 of 4");
  await expect(quarters).toContainText("1 of 4");
  await expect(quarters.locator(".text-primary")).toContainText("3 of 4");
});

test("the points mix splits each team's points into twos, threes and free throws", async ({ page }) => {
  await openComparison(page);

  const mix = page.getByTestId("points-mix");
  // Team A: 20 twos, 10 threes, 9 free throws. Team B: 18 twos, 6 threes, 6 free throws.
  for (const part of ["2s 40 (51%)", "3s 30 (38%)", "FT 9 (11%)", "2s 36 (60%)", "3s 18 (30%)", "FT 6 (10%)"]) {
    await expect(mix.getByText(part)).toBeVisible();
  }
});

test("extra chances is one line for the game", async ({ page }) => {
  await openComparison(page);
  // (0 offensive rebounds + 14 turnovers forced) - (10 turnovers + 0 offensive rebounds allowed) for Team A.
  await expect(page.getByTestId("extra-chances")).toContainText("A +4 extra chances");
});

test("extra chances read even when both teams earned the same", async ({ page }) => {
  const boxScore = {
    ...BOX_SCORE,
    teamStats: BOX_SCORE.teamStats.map((total) => ({ ...total, turnovers: 12, offensiveRebounds: 8 })),
  };
  await openComparison(page, { boxScore });
  await expect(page.getByTestId("extra-chances")).toContainText("Even on extra chances");
});

test("team turnovers fold into the turnovers row", async ({ page }) => {
  const boxScore = { ...BOX_SCORE, teamStats: [...BOX_SCORE.teamStats, teamTotal("local", { statsKind: "team", turnovers: 2 })] };
  await openComparison(page, { boxScore });

  await expect(row(page, "Ball and defense", "Turnovers")).toContainText("10 (2 team)");
  await expect(row(page, "Ball and defense", "Turnovers")).toContainText("14");
});

test("a season average is a tick and a line, and the opponent's usual defense a second line", async ({ page }) => {
  await openComparison(page);

  // Team A has a season block; Team B has played too few games. So Team A's row has its average and no opponent
  // line, and Team B's row has no average but what Team A usually allows.
  const efg = row(page, "Four factors", "eFG%");
  await expect(efg.getByText("Season avg 55.0%")).toBeVisible();
  await expect(efg.locator("span[title='Season avg 55.0%']")).toHaveCount(1);
  await expect(efg.getByText(/Season avg/)).toHaveCount(1);
  await expect(efg.getByText("Opp allows 52.0%")).toBeVisible();
  await expect(efg.getByText(/Opp allows/)).toHaveCount(1);
  await expect(row(page, "Efficiency", "Points per 100 possessions").getByText("Opp allows 105.0")).toBeVisible();
  // ORB% allowed is 1 - the opponent's DRB%.
  await expect(row(page, "Four factors", "ORB%").getByText("Opp allows 30.0%")).toBeVisible();
  await expect(page.getByText("Season averages need at least 3 games, so they are hidden for a team that has played fewer.")).toBeVisible();
  // Rows without a season average have no bars.
  await expect(row(page, "Shooting", "2PT").locator('[class~="h-1.5"]')).toHaveCount(0);
});

test("with both averages available the tab explains the tick and the opponent line", async ({ page }) => {
  const advanced = { ...ADVANCED, teams: [ADVANCED.teams[0], { ...ADVANCED.teams[1], season: { ...ADVANCED.teams[0].season, efgPct: 0.51, oppEfgPct: 0.5 } }] };
  await openComparison(page, { advanced });

  await expect(page.getByText(/The tick on each bar marks the team's season average through round 2\./)).toBeVisible();
  const efg = row(page, "Four factors", "eFG%");
  await expect(efg.getByText(/Season avg/)).toHaveCount(2);
  await expect(efg.getByText("Opp allows 50.0%")).toBeVisible();
  await expect(efg.getByText("Opp allows 52.0%")).toBeVisible();
});

test("a game without advanced stats, play-by-play figures or shots leaves those rows and groups out", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByRole("region", { name: "Shooting", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Efficiency", exact: true })).toHaveCount(0);
  await expect(row(page, "Four factors", "TOV%")).toHaveCount(0);
  await expect(row(page, "Rates and style", "Steal %")).toHaveCount(0);
  await expect(row(page, "Where the points came from", "Points in the paint")).toHaveCount(0);
  await expect(row(page, "Where the points came from", "Fast-break points")).toHaveCount(0);
  await expect(row(page, "Game flow", "Time in front")).toHaveCount(0);
  await expect(row(page, "Game flow", "Quarters won")).toContainText("3 of 4");
  await expect(page.locator("dl[aria-label='The game in numbers']")).toHaveCount(0);
  await expect(page.getByText(/Season averages|The tick on each bar/)).toHaveCount(0);
  await expect(page.locator("#game-detail-panel").getByText("—")).toHaveCount(0);
});

test("a value missing on one side is a dash, and no clutch time leaves clutch points out", async ({ page }) => {
  const teams = [
    { ...TEAM_FLOW.teams[0], flow: { ...TEAM_FLOW.teams[0].flow, clutchSeconds: 0, clutchPointsFor: 0 } },
    { ...TEAM_FLOW.teams[1], splits: null, flow: { ...TEAM_FLOW.teams[1].flow, clutchSeconds: 0, clutchPointsFor: 0 } },
  ];
  await openComparison(page, { teamFlow: { ...TEAM_FLOW, teams } });

  const fastBreak = row(page, "Where the points came from", "Fast-break points");
  await expect(fastBreak).toContainText("12");
  await expect(fastBreak).toContainText("—");
  await expect(fastBreak.locator(".text-primary")).toHaveCount(0);
  await expect(row(page, "Game flow", "Clutch points")).toHaveCount(0);
});

test("a failed source marks its rows with dashes and offers one retry", async ({ page }) => {
  await openComparison(page, { advancedStatus: 500, shotsStatus: 500 });

  const note = page.locator("p", { hasText: "The advanced stats and shots couldn't be loaded." });
  await expect(note).toBeVisible({ timeout: 20_000 });
  await expect(note.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(row(page, "Four factors", "eFG%").getByText("—")).toHaveCount(2);
  await expect(row(page, "Where the points came from", "Points in the paint").getByText("—")).toHaveCount(2);
  await expect(row(page, "Shooting", "2PT")).toContainText("20-30 (66.7%)");
  await expect(row(page, "Game flow", "Biggest lead")).toContainText("20");
});

test("rows of a source still loading show a loading mark", async ({ page }) => {
  await mockGameApi(page, { advanced: ADVANCED, teamFlow: TEAM_FLOW });
  let release;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/seasons/*/games/*/advanced", async (route) => {
    await released;
    await route.fallback();
  });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(row(page, "Four factors", "eFG%").getByText("Loading")).toHaveCount(2);
  await expect(row(page, "Shooting", "2PT")).toContainText("20-30 (66.7%)");
  release();
  await expect(row(page, "Four factors", "eFG%")).toContainText("59.0%");
});

test("a failed box score shows a retry for the whole tab", async ({ page }) => {
  await openComparison(page, { boxScoreStatus: 500 });

  await expect(page.getByText("Could not load team comparison.")).toBeVisible({ timeout: 20_000 });
});

test("traditional stats sit on the left and advanced stats on the right, and stack traditional first", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await openComparison(page);

  const box = (group) => page.getByRole("region", { name: group, exact: true }).boundingBox();
  const heading = (name) => page.getByRole("heading", { name, exact: true }).boundingBox();
  const [traditional, advanced, shooting, efficiency, rebounds] = await Promise.all([
    heading("Traditional stats"),
    heading("Advanced stats"),
    box("Shooting"),
    box("Efficiency"),
    box("Rebounds"),
  ]);
  expect(Math.abs(traditional.x - shooting.x)).toBeLessThan(2);
  expect(Math.abs(advanced.x - efficiency.x)).toBeLessThan(2);
  expect(efficiency.x).toBeGreaterThan(shooting.x + shooting.width - 1);
  expect(Math.abs(efficiency.y - shooting.y)).toBeLessThan(2);
  expect(rebounds.y).toBeGreaterThan(shooting.y);
  // Both columns end on one line.
  const [points, flow] = await Promise.all([box("Where the points came from"), box("Game flow")]);
  expect(Math.abs(points.y + points.height - (flow.y + flow.height))).toBeLessThan(2);

  await page.setViewportSize({ width: 600, height: 1000 });
  const tops = [];
  for (const group of GROUPS) {
    const rect = await box(group);
    tops.push(rect.y);
    expect(Math.abs(rect.x - (await box("Shooting")).x)).toBeLessThan(2);
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect((await heading("Advanced stats")).y).toBeGreaterThan((await box("Where the points came from")).y);
});

test("an unplayed game has no comparison tab and does not request advanced stats", async ({ page }) => {
  const requests = [];
  await mockGameApi(page, { played: false, requests });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveCount(0);
  expect(requests.some((pathname) => pathname.endsWith("/advanced"))).toBe(false);
  expect(requests.some((pathname) => pathname.endsWith("/shots"))).toBe(false);
});

test("the Overview key stats gain four rows, and keep their own rows when the request fails", async ({ page }) => {
  await mockGameApi(page, { teamFlow: TEAM_FLOW });
  await page.goto(`/${SEASON}/games/1`);

  const keyStats = page.getByRole("region", { name: "How the teams compared" });
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

  const keyStats = page.getByRole("region", { name: "How the teams compared" });
  await expect(keyStats.getByText("Field goals")).toBeVisible();
  await expect(keyStats.getByText("Time in front")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
