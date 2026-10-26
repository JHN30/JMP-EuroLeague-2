import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, mockGameApi, openBoxScore, teamTotal } from "./support/game-fixtures";

const mockApi = mockGameApi;

test("the game page has no data-coverage panel and does not request coverage", async ({ page }) => {
  const requests = [];
  await mockApi(page, { requests });

  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);
  await expect(page.getByRole("heading", { name: "Team A", level: 3 })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Box score" })).toBeVisible();

  await expect(page.getByText("This game's data coverage")).toHaveCount(0);
  expect(requests.some((pathname) => pathname.endsWith("/coverage"))).toBe(false);
});

test("the box score tables are stacked, show whole numbers, and list players who did not play apart", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await mockApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);

  const tables = page.locator("table");
  await expect(tables).toHaveCount(2);
  const first = await tables.nth(0).boundingBox();
  const second = await tables.nth(1).boundingBox();
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
  expect(Math.abs(second.x - first.x)).toBeLessThan(2);
  expect(Math.abs(second.width - first.width)).toBeLessThan(2);

  // No fractional ".0" anywhere in either table.
  for (const text of await tables.allInnerTexts()) expect(text).not.toMatch(/\d\.0/);

  // Starters first even with fewer minutes, then the bench; the player with no minutes is not a row.
  const teamA = tables.nth(0).locator("tbody tr");
  await expect(teamA).toHaveCount(2);
  await expect(teamA.nth(0)).toContainText("STARTER SAM");
  await expect(teamA.nth(1)).toContainText("BENCH BO");
  await expect(teamA.nth(0)).toContainText("10-12");
  await expect(teamA.nth(0)).toContainText("9-9");
  await expect(page.getByText("Did not play:")).toBeVisible();
  await expect(page.getByRole("link", { name: "SITTER SID" })).toBeVisible();

  // The Team comparison tab reads the same numbers.
  await page.getByRole("tab", { name: "Team comparison" }).click();
  await expect(page.getByText("20-30 (66.7%)")).toBeVisible();
  // Percentages keep their decimal ("100.0%"); counts and made-attempted lines must not.
  await expect(page.locator("#game-detail-panel")).not.toContainText(/\d\.0(?![\d%])/);
});

test("player names link to their pages and only the game-high is bold", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);

  await expect(page.getByRole("link", { name: "STARTER SAM" })).toHaveAttribute("href", `/${SEASON}/players/A-STARTER`);
  await expect(page.getByRole("link", { name: "SITTER SID" })).toHaveAttribute("href", `/${SEASON}/players/A-DNP`);

  const bold = async (rowName, cellIndex) => {
    const cell = page.locator("tbody tr", { hasText: rowName }).locator("td").nth(cellIndex);
    return (await cell.getAttribute("class")).includes("font-bold");
  };
  const POINTS = 2;
  const STEALS = 10;
  const PLUS_MINUS = 16;
  // Both 30-point scorers are bold (a tie); the 12- and 8-point players are not.
  expect(await bold("STARTER SAM", POINTS)).toBe(true);
  expect(await bold("RIVAL ROY", POINTS)).toBe(true);
  expect(await bold("BENCH BO", POINTS)).toBe(false);
  expect(await bold("RESERVE RAY", POINTS)).toBe(false);
  // A column where everyone has zero has no game-high.
  expect(await bold("STARTER SAM", STEALS)).toBe(false);
  // The best plus/minus (+6) is bold.
  expect(await bold("STARTER SAM", PLUS_MINUS)).toBe(true);
  expect(await bold("BENCH BO", PLUS_MINUS)).toBe(false);

  // Names are reachable by keyboard.
  await page.getByRole("link", { name: "STARTER SAM" }).focus();
  await expect(page.getByRole("link", { name: "STARTER SAM" })).toBeFocused();
});

test("box score stats and the starter marker have hover tips", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);

  await page.locator(".header-tip-label", { hasText: "PTS" }).first().hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Points: total points scored" })).toBeVisible();

  await page.locator(".header-tip-label", { hasText: "PIR" }).first().focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Performance Index Rating" })).toBeVisible();

  await page.locator(".header-tip-label", { hasText: "S" }).filter({ has: page.locator(".badge") }).first().hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Starter: in the starting five" })).toBeVisible();

  // The abbreviated labels on the Team comparison tab have them too.
  await page.getByRole("tab", { name: "Team comparison" }).click();
  await page.locator(".header-tip-label", { hasText: "2PT" }).hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Two-pointers: made-attempted" })).toBeVisible();
});

// The feed's team rows: credited to the team, not a player. Team A has team rebounds; Team B a team turnover and steal.
// The feed's total +/- is the players' sum (five times the margin), which the Total row must not show.
const WITH_TEAM_ROWS = {
  ...BOX_SCORE,
  teamStats: [
    ...BOX_SCORE.teamStats.map((row) => ({ ...row, plusMinus: row.side === "local" ? 50 : -50 })),
    teamTotal("local", { statsKind: "team", timePlayed: 0, totalRebounds: 3, offensiveRebounds: 2, defensiveRebounds: 1, valuation: 3 }),
    teamTotal("road", { statsKind: "team", timePlayed: 0, turnovers: 2, steals: 1, valuation: -1 }),
  ],
};

// Column positions in the traditional table: Player is 0, then MIN, PTS, 2PT, 3PT, FT, REB, OREB, DREB, AST, STL, TO,
// BLK, BLKA, FC, FD, +/-, PIR.
const TRADITIONAL = { min: 1, pts: 2, reb: 6, oreb: 7, dreb: 8, ast: 9, stl: 10, to: 11, plusMinus: 16, pir: 17 };

test("the Total row shows the score margin and a Team line carries the team's own stats", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await mockApi(page, { boxScore: WITH_TEAM_ROWS, advanced: ADVANCED });
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);

  const footers = page.locator("tfoot");
  const teamA = footers.nth(0).locator("tr");
  const teamB = footers.nth(1).locator("tr");
  await expect(teamA).toHaveCount(2);
  await expect(teamB).toHaveCount(2);

  // Team A won 80-70: +10 and -10, not the feed's +50 and -50.
  await expect(teamA.nth(1).locator("td").nth(TRADITIONAL.plusMinus)).toHaveText("+10");
  await expect(teamB.nth(1).locator("td").nth(TRADITIONAL.plusMinus)).toHaveText("-10");

  // The Team line sits above Total, with values only where the team row has them.
  const lineA = teamA.nth(0).locator("td");
  await expect(lineA.nth(0).locator(".box-score-fade")).toHaveText("Team");
  await expect(lineA.nth(TRADITIONAL.reb)).toHaveText("3");
  await expect(lineA.nth(TRADITIONAL.oreb)).toHaveText("2");
  await expect(lineA.nth(TRADITIONAL.dreb)).toHaveText("1");
  await expect(lineA.nth(TRADITIONAL.pir)).toHaveText("3");
  for (const column of [TRADITIONAL.min, TRADITIONAL.pts, TRADITIONAL.ast, TRADITIONAL.to, TRADITIONAL.plusMinus]) {
    await expect(lineA.nth(column)).toHaveText("");
  }
  const lineB = teamB.nth(0).locator("td");
  await expect(lineB.nth(TRADITIONAL.to)).toHaveText("2");
  await expect(lineB.nth(TRADITIONAL.stl)).toHaveText("1");
  await expect(lineB.nth(TRADITIONAL.pir)).toHaveText("-1");
  await expect(lineB.nth(TRADITIONAL.reb)).toHaveText("");

  await lineA.nth(0).locator(".header-tip-label").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "credited to the team rather than a player" })).toBeVisible();

  // None of the Advanced view's columns come from the team row, so it has no Team line.
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(footers.nth(0).locator("tr")).toHaveCount(1);
  await expect(page.locator("tfoot .box-score-fade", { hasText: /^Team$/ })).toHaveCount(0);
});

test("a side whose team row has nothing to show gets no Team line", async ({ page }) => {
  const emptyTeamRow = { ...BOX_SCORE, teamStats: [...BOX_SCORE.teamStats, teamTotal("local", { statsKind: "team", timePlayed: 0 })] };
  await mockApi(page, { boxScore: emptyTeamRow });
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);

  await expect(page.locator("tfoot").nth(0).locator("tr")).toHaveCount(1);
  await expect(page.locator("tfoot").nth(1).locator("tr")).toHaveCount(1);
});
