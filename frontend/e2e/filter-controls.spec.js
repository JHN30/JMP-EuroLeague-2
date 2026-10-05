import { test, expect } from "@playwright/test";

test("uses compact native selects for statistics and comparison filters", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text() !== "Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  const sections = page.getByRole("navigation", { name: "Sections" });
  await expect(sections).toBeVisible();

  await sections.getByRole("link", { name: "Leaders", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Leaders" })).toBeVisible();

  const statisticsPhase = page.getByRole("tablist", { name: "Statistics phase" });
  await statisticsPhase.getByRole("tab").first().click();
  const playersScope = page.getByRole("tablist", { name: "Leaderboard scope" }).getByRole("tab", { name: "Players", exact: true });
  await playersScope.click();
  await expect(playersScope).toHaveAttribute("aria-selected", "true");

  // The landing shows category cards; the filters live on a full leaderboard.
  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  const playerMode = page.getByLabel("Player statistics mode");
  await expect(playerMode).toHaveJSProperty("tagName", "SELECT");
  await playerMode.selectOption("accumulated");
  await expect(playerMode).toHaveValue("accumulated");

  const playerDirection = page.getByLabel("Player sort direction");
  await playerDirection.selectOption("asc");
  await expect(playerDirection).toHaveValue("asc");

  await sections.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compare", exact: true })).toBeVisible();

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
