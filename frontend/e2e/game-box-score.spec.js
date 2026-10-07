import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi, openBoxScore } from "./support/game-fixtures";

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
