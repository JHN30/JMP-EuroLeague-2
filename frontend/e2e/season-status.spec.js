import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";

// Home and the Overview read the season's format (GET /seasons/:season/format): its stages, their descriptions and the season's status.
// These use the real local data: 2025 is finished (20 clubs, no third-place game), 2026 is under way, 2019 was cancelled after round
// 28 and 2021 had 28 cancelled games that must not show as upcoming.

const homeStatus = (page) => page.locator("main h1").locator("xpath=following-sibling::p");
// A Phase story card ("Phase 2", then the stage's name); the leaders panel has stage headings too, but no phase number.
const stagePanel = (page, name) =>
  page.locator(".panel", { hasText: /Phase \d/, has: page.getByRole("heading", { level: 3, name, exact: true }) });

async function openOverview(page, season) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${season}/overview`);
  await expect(page.getByRole("heading", { name: "Phase story" })).toBeVisible({ timeout: 45_000 });
}

test.describe("a finished season (2025)", () => {
  test("Home says the season has finished", async ({ page }) => {
    await page.goto("/2025/home");
    await expect(homeStatus(page)).toHaveText("The season has finished.", { timeout: 30_000 });
    await expect(page.getByText("Season finished.")).toBeVisible();
  });

  test("the Overview tells its four stages from its format", async ({ page }) => {
    await openOverview(page, "2025");
    for (const name of ["Regular Season", "Play-In", "Playoffs", "Final Four"]) {
      await expect(stagePanel(page, name)).toBeVisible();
    }
    await expect(stagePanel(page, "Regular Season")).toContainText("Each of the 20 clubs plays every other club home and away (38 games).");
    await expect(stagePanel(page, "Regular Season")).toContainText("The top 6 reach the Playoffs; 7th-10th go to the Play-In.");
    await expect(stagePanel(page, "Final Four")).toContainText("no third-place game");
    await expect(page.getByText("Season finished", { exact: true })).toBeVisible();
  });
});

test.describe("a season under way (2026)", () => {
  test("the Overview shows the stages still to come as not played yet", async ({ page }) => {
    await openOverview(page, "2026");
    for (const name of ["Play-In", "Playoffs", "Final Four"]) {
      await expect(stagePanel(page, name)).toContainText("Not played yet");
    }
    await expect(stagePanel(page, "Regular Season")).toContainText("Current");
  });
});

test.describe("a cancelled season (2019)", () => {
  test("Home says it was cancelled and lists no upcoming games", async ({ page }) => {
    await page.goto("/2019/home");
    await expect(homeStatus(page)).toHaveText(/^Season cancelled\. Suspended after round 28/, { timeout: 30_000 });
    await expect(page.getByText("Season cancelled.", { exact: true })).toBeVisible();
  });

  test("the Overview shows only the regular season and the cancellation", async ({ page }) => {
    await openOverview(page, "2019");
    await expect(page.getByText("Season cancelled", { exact: true })).toBeVisible();
    await expect(stagePanel(page, "Regular Season")).toBeVisible();
    for (const name of ["Play-In", "Playoffs", "Final Four"]) {
      await expect(stagePanel(page, name)).toHaveCount(0);
    }
  });
});

test.describe("a season with cancelled games (2021)", () => {
  test("Home shows no cancelled game as upcoming", async ({ page }) => {
    await page.goto("/2021/home");
    const upcoming = page.locator("section", { has: page.getByRole("heading", { name: "Upcoming games" }) });
    await expect(upcoming).toContainText("Season finished.", { timeout: 30_000 });
    await expect(upcoming.getByRole("group", { name: "Upcoming games" })).toHaveCount(0);
  });
});
