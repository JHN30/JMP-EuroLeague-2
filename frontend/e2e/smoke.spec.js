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

test("shows an error with Retry, not invisible content, when the animation features fail to load", async ({ page }) => {
  let blocked = true;
  await page.route(/\/src\/lib\/motionFeatures\.js/, (route) => (blocked ? route.abort() : route.continue()));

  await page.goto("/2025/standings");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Could not finish loading the page", { timeout: 15_000 });
  await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.locator('[style*="opacity: 0"]')).toHaveCount(0);

  blocked = false;
  await alert.getByRole("button", { name: "Retry" }).click();
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await expect(firstRow).toHaveCSS("opacity", "1");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
