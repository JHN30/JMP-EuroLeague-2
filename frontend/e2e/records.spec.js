import { test, expect } from "@playwright/test";

test("shows archive-to-date player-season records", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2026", name: "2025-26" }] } });
    if (path.endsWith("/records/player-seasons")) return route.fulfill({ json: { label: "Points", records: [{ seasonCode: "2026", personKey: "p1", playerName: "Player One", numericValue: 500 }] } });
    if (path.endsWith("/records/single-games")) return route.fulfill({ json: { label: "Points", records: [{ seasonCode: "2025", gameCode: 42, personKey: "p2", playerName: "Game Player", clubName: "Club", numericValue: 35, scheduledAt: "2025-01-15T19:00:00.000Z" }] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/2026/records");
  await expect(page.getByRole("heading", { name: "Records" })).toBeVisible();
  await expect(page.getByText("Archive-to-date player-season records.")).toBeVisible();
  await expect(page.getByText("Best in each season")).toBeVisible();
  await expect(page.getByText("Player One").first()).toBeVisible();
});

test("shows linked single-game archive records", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2026", name: "2025-26" }] } });
    if (path.endsWith("/records/player-seasons")) return route.fulfill({ json: { label: "Points", records: [] } });
    if (path.endsWith("/records/single-games")) return route.fulfill({ json: { label: "Points", records: [{ seasonCode: "2025", gameCode: 42, personKey: "p2", playerName: "Game Player", clubName: "Club", numericValue: 35, scheduledAt: "2025-01-15T19:00:00.000Z" }] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/2026/records");
  await page.getByRole("button", { name: "Single-game" }).click();
  await expect(page.getByText("Archive-to-date single-game records.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Game Player" }).first()).toHaveAttribute("href", "/2025/players/p2");
  await expect(page.getByRole("link", { name: "Game", exact: true }).first()).toHaveAttribute("href", "/2025/games/42");
});
