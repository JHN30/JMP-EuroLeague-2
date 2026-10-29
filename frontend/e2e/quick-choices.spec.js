import { test, expect } from "@playwright/test";

// Two choices made back to back keep each other. With the CPU 4x slower (about a mid-range phone) React re-renders well after the address
// changes, which is when a second choice used to be built from the old address and undo the first. Reads the local database.

async function slowPage(page, path, ready) {
  test.slow();
  await page.goto(path);
  await ready.waitFor({ timeout: 60_000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

test("Fixtures: a round, then a group", async ({ page }) => {
  await slowPage(page, "/2014/games?phase=RS", page.getByLabel("Group"));
  const group = await page.getByLabel("Group").locator("option").nth(1).getAttribute("value");
  await page.getByRole("tab", { name: "Round 3", exact: true }).click();
  await page.getByLabel("Group").selectOption(group);
  await expect(page).toHaveURL(/[?&]group=/);
  await expect(page).toHaveURL(/[?&]round=3(&|$)/);
});

test("Fixtures: Next round twice moves two rounds", async ({ page }) => {
  await slowPage(page, "/2025/games?phase=RS&round=10", page.getByRole("button", { name: "Next round" }));
  // Both clicks in one go, before the page can re-render between them (Playwright's own clicks wait for the button's tap animation).
  await page.getByRole("button", { name: "Next round" }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page).toHaveURL(/[?&]round=12(&|$)/);
});

test("Records: per game, then another metric", async ({ page }) => {
  await slowPage(page, "/2026/records?type=player&metric=pointsScored", page.getByLabel("Metric"));
  await page.getByRole("button", { name: "Per game" }).click();
  await page.getByLabel("Metric").selectOption("assists");
  await expect(page).toHaveURL(/[?&]metric=assists/);
  await expect(page).toHaveURL(/[?&]per=game/);
});

test("Standings: a phase, then a group", async ({ page }) => {
  await slowPage(page, "/2014/standings?phase=RS", page.getByLabel("Group").first());
  await page.getByRole("tab", { name: /Top 16/ }).first().click();
  // The first group the select lists, whichever phase it is still showing; that group may not be one of the new phase's, so only the
  // phase is certain to stay.
  await page.getByLabel("Group").first().selectOption({ index: 1 });
  await expect(page).toHaveURL(/[?&]phase=TS/);
  await page.waitForTimeout(1_500);
  await expect(page).toHaveURL(/[?&]phase=TS/);
});

test("Head-to-head: Team A, then Team B", async ({ page }) => {
  await slowPage(page, "/2025/compare/head-to-head", page.getByLabel("Team B"));
  const teamB = await page.getByLabel("Team B").locator("option").nth(2).getAttribute("value");
  const teamA = await page.getByLabel("Team A").locator("option").nth(1).getAttribute("value");
  await page.getByLabel("Team A").selectOption(teamA);
  await page.getByLabel("Team B").selectOption(teamB);
  await expect(page).toHaveURL(new RegExp(`[?&]teamB=${teamB}`));
  await expect(page).toHaveURL(new RegExp(`[?&]teamA=${teamA}`));
});
