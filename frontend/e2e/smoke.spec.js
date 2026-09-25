import { test, expect } from "@playwright/test";

test("loads the app and browses to the teams directory with live data", async ({ page }) => {
  await page.goto("/");
  const sections = page.getByRole("navigation", { name: "Sections" });
  await expect(sections).toBeVisible();

  await sections.getByRole("link", { name: "Teams", exact: true }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

  const teamLinks = page.locator('a[href*="/teams/"]');
  await expect(teamLinks.first()).toBeVisible({ timeout: 15_000 });
});
