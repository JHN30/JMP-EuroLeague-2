import { test, expect } from "@playwright/test";
import { LINEUPS, SEASON, mockGameApi, rosterBox } from "./support/game-fixtures";

async function openLineups(page) {
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Five-man units" })).toBeVisible();
}

function lineupsBlock(page, teamName) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Five-man units" }) })
    .locator("div.panel", { hasText: teamName });
}

test("each team lists the units that played at least two minutes together, most minutes first", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox(), lineups: LINEUPS });
  await page.goto(`/${SEASON}/games/1`);
  await openLineups(page);

  await expect(page.getByLabel("Minimum minutes")).toHaveValue("2");

  const teamA = lineupsBlock(page, "Team A").locator("tbody tr");
  // The 30-second unit is below the default minimum.
  await expect(teamA).toHaveCount(2);
  await expect(teamA.nth(0)).toContainText("ONE, AL");
  await expect(teamA.nth(0)).toContainText("FIVE, ABBY");
  await expect(teamA.nth(0).locator("td").nth(1)).toHaveText("25:00");
  await expect(teamA.nth(0).locator("td").nth(2)).toHaveText("60");
  await expect(teamA.nth(0).locator("td").nth(3)).toHaveText("50");
  await expect(teamA.nth(0).locator("td").nth(4)).toHaveText("40");
  await expect(teamA.nth(0).locator("td").nth(5)).toHaveText("+10");
  await expect(teamA.nth(0).locator("td").nth(6)).toHaveText("+14.4");
  await expect(teamA.nth(1)).toContainText("SIX, ABEL");
  await expect(teamA.nth(1).locator("td").nth(5)).toHaveText("-3");
  await expect(teamA.nth(1).locator("td").nth(6)).toHaveText("-21.4");

  await expect(lineupsBlock(page, "Team B").locator("tbody tr")).toHaveCount(2);
  // Players link to their pages, with names from the box score.
  await expect(teamA.nth(0).getByRole("link", { name: "ONE, AL" })).toHaveAttribute("href", `/${SEASON}/players/A1`);
});

test("the minimum-minutes filter changes the rows", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox(), lineups: LINEUPS });
  await page.goto(`/${SEASON}/games/1`);
  await openLineups(page);

  const teamA = lineupsBlock(page, "Team A").locator("tbody tr");
  await page.getByLabel("Minimum minutes").selectOption({ label: "4+ minutes" });
  await expect(teamA).toHaveCount(1);
  await expect(teamA.first().locator("td").nth(1)).toHaveText("25:00");

  // With every stint, a unit without possessions shows dashes instead of zero ratings.
  await page.getByLabel("Minimum minutes").selectOption({ label: "All stints" });
  await expect(teamA).toHaveCount(3);
  const shortest = teamA.nth(2);
  await expect(shortest.locator("td").nth(1)).toHaveText("0:30");
  await expect(shortest.locator("td").nth(6)).toHaveText("—");
});

test("a team with no unit over the minimum says so", async ({ page }) => {
  const lineups = { ...LINEUPS, units: LINEUPS.units.filter((unit) => unit.side === "local") };
  await mockGameApi(page, { boxScore: rosterBox(), lineups });
  await page.goto(`/${SEASON}/games/1`);
  await openLineups(page);

  await expect(lineupsBlock(page, "Team B")).toContainText("No five-man unit played 2+ minutes together.");
  await page.getByLabel("Minimum minutes").selectOption({ label: "All stints" });
  await expect(lineupsBlock(page, "Team B")).toContainText("No five-man units are available for this team.");
});

test("the section carries a small-sample note", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox(), lineups: LINEUPS });
  await page.goto(`/${SEASON}/games/1`);
  await openLineups(page);

  await expect(page.getByText("Small samples swing a lot", { exact: false })).toBeVisible();
});

test("a game without lineups says they are not available", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox() });
  await page.goto(`/${SEASON}/games/1`);
  await openLineups(page);

  await expect(page.getByText("Lineups aren't available for this game yet.")).toBeVisible();
});

test("a lineups failure shows a retry that loads the units", async ({ page }) => {
  let failing = true;
  await mockGameApi(page, { boxScore: rosterBox(), lineups: LINEUPS });
  // Registered after the shared mock, so it answers first.
  await page.route(`**/api/seasons/${SEASON}/games/1/lineups`, async (route) => {
    if (failing) await route.fulfill({ status: 500, json: { error: "Mocked failure" } });
    else await route.fallback();
  });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Could not load lineups." });
  await expect(alert).toBeVisible();
  failing = false;
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(lineupsBlock(page, "Team A").locator("tbody tr")).toHaveCount(2);
});

test("a box score failure leaves the lineups with person keys for names", async ({ page }) => {
  await mockGameApi(page, { boxScoreStatus: 500, lineups: LINEUPS });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();

  // The box score query retries a few times before it gives up; the units then appear with keys.
  await expect(lineupsBlock(page, "Team A").locator("tbody tr")).toHaveCount(2, { timeout: 20_000 });
  await expect(lineupsBlock(page, "Team A").locator("tbody tr").first().getByRole("link", { name: "A1" })).toBeVisible();
});
