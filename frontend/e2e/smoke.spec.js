import { test, expect } from "@playwright/test";

test("loads the app and browses to the teams directory with live data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();

  await page.getByRole("tab", { name: "Teams", exact: true }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

  const teamLinks = page.locator('a[href*="/teams/"]');
  await expect(teamLinks.first()).toBeVisible({ timeout: 15_000 });
});
