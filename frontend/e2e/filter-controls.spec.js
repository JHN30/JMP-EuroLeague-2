import { test, expect } from "@playwright/test";

test("uses compact native selects for statistics and comparison filters", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text() !== "Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();

  await page.getByRole("tab", { name: "Statistics leaderboards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Statistics leaderboards" })).toBeVisible();

  const leaderboardType = page.getByLabel("Leaderboard type");
  await expect(leaderboardType).toHaveJSProperty("tagName", "SELECT");
  const statisticsPhase = page.getByLabel("Statistics phase");
  await expect(statisticsPhase).toHaveJSProperty("tagName", "SELECT");
  await statisticsPhase.selectOption({ index: 0 });
  await leaderboardType.selectOption("players");
  await expect(leaderboardType).toHaveValue("players");

  const playerMode = page.getByLabel("Player statistics mode");
  await expect(playerMode).toHaveJSProperty("tagName", "SELECT");
  await playerMode.selectOption("accumulated");
  await expect(playerMode).toHaveValue("accumulated");

  const playerDirection = page.getByLabel("Player sort direction");
  await playerDirection.selectOption("asc");
  await expect(playerDirection).toHaveValue("asc");

  await page.getByRole("tab", { name: "Comparisons and trends", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comparisons and trends" })).toBeVisible();

  const comparisonType = page.getByLabel("Comparison type");
  await expect(comparisonType).toHaveJSProperty("tagName", "SELECT");
  const comparisonPhase = page.getByLabel("Comparison phase");
  await expect(comparisonPhase).toHaveJSProperty("tagName", "SELECT");
  await comparisonPhase.selectOption({ index: 0 });
  await comparisonType.selectOption("players");
  await expect(comparisonType).toHaveValue("players");
  await expect(page.getByLabel("Player A")).toBeVisible();

  const comparisonMode = page.getByLabel("Player comparison mode");
  await comparisonMode.selectOption("accumulated");
  await expect(comparisonMode).toHaveValue("accumulated");

  expect(consoleErrors).toEqual([]);
});
