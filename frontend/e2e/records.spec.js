import { test, expect } from "@playwright/test";

test("shows archive-to-date player-season records", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2026", name: "2025-26" }] } });
    if (path.endsWith("/records/player-seasons")) return route.fulfill({ json: { label: "Points", records: [{ seasonCode: "2026", personKey: "p1", playerName: "Player One", numericValue: 500 }] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/2026/records");
  await expect(page.getByRole("heading", { name: "Records" })).toBeVisible();
  await expect(page.getByText("Archive-to-date player-season records.")).toBeVisible();
  await expect(page.getByText("Best in each season")).toBeVisible();
  await expect(page.getByText("Player One").first()).toBeVisible();
});
