import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, mockGameApi, openBoxScore } from "./support/game-fixtures";

// Column positions in the advanced table: Player is 0, then MIN, GmSc, PER, TS%, eFG%, USG%, AST%, TOV%, ORB%, DRB%,
// TRB%, STL%, BLK%, and the season group PER, USG%, WS.
const COLUMN = { min: 1, gmsc: 2, per: 3, ts: 4, efg: 5, usg: 6, seasonPer: 14, seasonUsg: 15, seasonWs: 16 };

async function openAdvanced(page, options = {}) {
  await mockGameApi(page, { advanced: ADVANCED, ...options });
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
}

function rowFor(page, name) {
  return page.locator("tbody tr", { hasText: name });
}

test("the Advanced view shows the pipeline's per-game measures and the season-to-date group", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openAdvanced(page);

  await expect(page.getByRole("tab", { name: "Advanced", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("This game").first()).toBeVisible();
  await expect(page.getByText("Season through round 2").first()).toBeVisible();

  const cells = rowFor(page, "STARTER SAM").first().locator("td");
  await expect(cells.nth(COLUMN.min)).toHaveText("15:00");
  await expect(cells.nth(COLUMN.gmsc)).toHaveText("21.4");
  await expect(cells.nth(COLUMN.per)).toHaveText("20.1");
  await expect(cells.nth(COLUMN.ts)).toHaveText("60.0%");
  await expect(cells.nth(COLUMN.efg)).toHaveText("65.0%");
  await expect(cells.nth(COLUMN.usg)).toHaveText("30.0%");
  await expect(cells.nth(COLUMN.seasonPer)).toHaveText("17.3");
  await expect(cells.nth(COLUMN.seasonUsg)).toHaveText("22.1%");
  await expect(cells.nth(COLUMN.seasonWs)).toHaveText("1.25");

  // Team totals come from the team row: shooting and rebounding shares only.
  const totals = page.locator("tfoot").first().locator("td");
  await expect(totals.nth(COLUMN.ts)).toHaveText("62.0%");
  await expect(totals.nth(COLUMN.usg)).toHaveText("—");
});

test("a missing measure is an em dash, and a missing season row is a dash too", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openAdvanced(page);

  const cells = rowFor(page, "RIVAL ROY").first().locator("td");
  await expect(cells.nth(COLUMN.usg)).toHaveText("—");
  await expect(cells.nth(COLUMN.seasonPer)).toHaveText("—");
  await expect(cells.nth(COLUMN.seasonPer).locator("span")).toHaveAttribute("title", "No season record through this round");
  await expect(cells.nth(COLUMN.per)).toHaveText("31.5");
});

test("a small season sample is hidden with its explanation", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openAdvanced(page);

  const cells = rowFor(page, "BENCH BO").first().locator("td");
  await expect(cells.nth(COLUMN.seasonPer)).toHaveText("—");
  await expect(cells.nth(COLUMN.seasonPer).locator("span")).toHaveAttribute(
    "title",
    "Sample too small: 10 minutes through this round, at least 20 needed",
  );
  await expect(cells.nth(COLUMN.seasonWs)).toHaveText("—");
  await expect(cells.nth(COLUMN.per)).toHaveText("24.0");
});

test("game PER is shown only from 10 minutes played", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  const advanced = {
    ...ADVANCED,
    players: ADVANCED.players.map((row) => (row.personKey === "B-BENCH" ? { ...row, secondsPlayed: 540, gamePer: 99 } : row)),
  };
  await openAdvanced(page, { advanced });

  const cell = rowFor(page, "RESERVE RAY").first().locator("td").nth(COLUMN.per);
  await expect(cell).toHaveText("—");
  await expect(cell.locator("span")).toHaveAttribute("title", "Game PER is shown from 10 minutes played");
});

test("the game-high Game Score and game PER are bold", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openAdvanced(page);

  await expect(rowFor(page, "RIVAL ROY").first().locator("td").nth(COLUMN.gmsc)).toHaveClass(/font-bold/);
  await expect(rowFor(page, "RIVAL ROY").first().locator("td").nth(COLUMN.per)).toHaveClass(/font-bold/);
  await expect(rowFor(page, "STARTER SAM").first().locator("td").nth(COLUMN.per)).not.toHaveClass(/font-bold/);
});

test("a game without advanced data says so, and Traditional still works", async ({ page }) => {
  await openAdvanced(page, { advanced: { available: false, scope: "all", round: 2, minSeasonMinutes: 20, teams: [], players: [] } });

  await expect(page.getByText("Advanced stats are not available for this game yet.")).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);

  await page.getByRole("tab", { name: "Traditional", exact: true }).click();
  await expect(page.locator("table")).toHaveCount(2);
});

test("a failed advanced request shows a retry and leaves the Traditional box score intact", async ({ page }) => {
  await mockGameApi(page, { advancedStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await openBoxScore(page);
  await expect(page.locator("table")).toHaveCount(2);

  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText("Could not load advanced stats.")).toBeVisible();
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();

  await page.getByRole("tab", { name: "Traditional", exact: true }).click();
  await expect(page.locator("table")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Team A", level: 3 })).toBeVisible();
});

test("the box score players are the same in both views", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openAdvanced(page);
  for (const player of BOX_SCORE.playerStats.filter((row) => row.timePlayed > 0)) {
    await expect(rowFor(page, player.personName.replace(",", "")).first()).toBeVisible();
  }
  await expect(page.locator("p", { hasText: "Did not play:" })).toContainText("SITTER SID");
});
