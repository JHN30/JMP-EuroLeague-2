import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

test("the cards ask the feed's CDN for small WebP photos and crests, loaded near the screen", async ({ page }) => {
  // Every CDN request is recorded and answered with a local picture, so the test needs no network.
  const requested = [];
  await page.route(/^https:\/\/media-cdn\.(cortextech\.io|incrowdsports\.com)\//, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ path: fileURLToPath(new URL("../public/logo-header.png", import.meta.url)) });
  });
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });

  const photos = page.locator("main img[src*='width=192&format=webp']");
  await expect(photos.first()).toBeVisible();
  await expect(photos.first()).toHaveAttribute("loading", "lazy");
  await expect(page.locator("main img[src*='width=128&format=webp']").first()).toBeVisible();
  // No picture is asked for at its full size.
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((url) => !url.includes("format=webp"))).toEqual([]);
});

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

  await page.getByRole("link", { name: "Back to Categories" }).click();
  await expect(page.getByRole("heading", { name: "Rebounds", exact: true })).toBeVisible();
  // The cards have no way back to themselves.
  await expect(page.getByRole("link", { name: "Back to Categories" })).toHaveCount(0);

  // Teams and Advanced have their own cards.
  await page.getByRole("tab", { name: "Teams", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Net rating", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByRole("heading", { name: "PER", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("one row of choices under the scope tabs: the stage, a board's statistic and per game or totals, all in the address", async ({ page }) => {
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });
  // No strips under the scope tabs any more.
  for (const name of ["Statistics phase", "Player statistics mode", "Statistic family", "Advanced leaders scope"]) {
    await expect(page.getByRole("tablist", { name })).toHaveCount(0);
  }
  const stage = page.getByLabel("Stage", { exact: true });
  const mode = page.getByRole("group", { name: "Player statistics mode" });
  await expect(mode.getByRole("button", { name: "Per game" })).toHaveAttribute("aria-pressed", "true");
  // The stage and the mode share one row.
  const stageBox = await stage.boundingBox();
  const modeBox = await mode.boundingBox();
  expect(Math.abs(stageBox.y + stageBox.height - (modeBox.y + modeBox.height))).toBeLessThanOrEqual(2);

  // Totals on the cards is in the address, and so is a stage.
  await mode.getByRole("button", { name: "Totals" }).click();
  await expect(page).toHaveURL(/[?&]mode=accumulated/);
  await expect(mode.getByRole("button", { name: "Totals" })).toHaveAttribute("aria-pressed", "true");
  await stage.selectOption({ label: "Playoffs" });
  await expect(page).toHaveURL(/[?&]phase=PO/);
  await expect(page).toHaveURL(/[?&]mode=accumulated/);

  // A board adds its statistic to the row; another statistic opens its board.
  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  const statistic = page.getByLabel("Statistic", { exact: true });
  await expect(statistic).toBeVisible();
  await statistic.selectOption("assists");
  await expect(page).toHaveURL(/metric=assists/);
  await expect(page).toHaveURL(/[?&]phase=PO/);

  // A season with one stage has nothing to choose, so no Stage select.
  await page.goto("/2026/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Stage", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Player statistics mode" })).toBeVisible();
});
