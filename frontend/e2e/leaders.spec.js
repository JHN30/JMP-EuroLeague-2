import { test, expect } from "@playwright/test";

test("Leaders opens on category cards, opens a full leaderboard and goes back", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });

  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rebounds", exact: true })).toBeVisible();

  // A card opens its full leaderboard, with the team and position filters.
  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  await expect(page).toHaveURL(/metric=pointsScored/);
  await expect(page.getByText(/Showing 1-25 of \d+ players/)).toBeVisible();
  await expect(page.getByLabel("Team", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Position", { exact: true })).toBeVisible();
  await page.getByLabel("Position", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByText(/Showing 1-\d+ of \d+ players/)).toBeVisible();

  await page.getByRole("button", { name: "← All categories" }).click();
  await expect(page.getByRole("heading", { name: "Rebounds", exact: true })).toBeVisible();

  // Teams and Advanced have their own cards.
  await page.getByRole("tab", { name: "Teams", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Net rating", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByRole("heading", { name: "PER", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});
