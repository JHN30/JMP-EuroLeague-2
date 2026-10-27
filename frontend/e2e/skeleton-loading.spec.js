import { test, expect } from "@playwright/test";

// Home's data requests (standings, games, leaders, team totals) held back until `release`, so the skeletons stay on screen.
const HOME_DATA = /\/api\/seasons\/[^/]+\/(phases\/[^/]+\/standings|games|season-stats|stats|teams|team-stats|league)/;

async function holdHomeData(page) {
  await page.route(HOME_DATA, () => {});
  // Removing the route lets the held requests through.
  return () => page.unroute(HOME_DATA);
}

const panel = (page, title) => page.locator("section", { has: page.getByRole("heading", { name: title, exact: true }) });

test("Home shows a skeleton in every panel while its data loads, then the content", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  const release = await holdHomeData(page);
  await page.goto("/2026/home");

  for (const title of ["Upcoming games", "League table", "Latest scores"]) {
    const busy = panel(page, title).locator('[aria-busy="true"]');
    await expect(busy).toHaveCount(1, { timeout: 30_000 });
    await expect(busy).toHaveAttribute("role", "status");
    await expect(busy.locator(".skeleton").first()).toBeVisible();
  }
  await expect(page.getByRole("status", { name: "Loading Leader in wins" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading the points per game leader" })).toBeVisible();
  await expect(page.locator("main .loading")).toHaveCount(0);

  await release();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("main .skeleton")).toHaveCount(0);
  await expect(panel(page, "Latest scores").locator("a.match-card").first()).toBeVisible();
});

// The names of the running animations on the skeletons.
const runningShimmers = (page) =>
  page
    .locator("main .skeleton")
    .evaluateAll((els) => els.flatMap((el) => el.getAnimations()).filter((animation) => animation.playState === "running").map((animation) => animation.animationName));

test("skeletons shimmer, and stay still under reduced motion", async ({ page }) => {
  await holdHomeData(page);
  await page.goto("/2026/home");
  await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => runningShimmers(page)).toContain("skeleton");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(300);
  expect(await runningShimmers(page)).toEqual([]);
});

test("a page whose code is still loading shows a page skeleton inside the shell", async ({ page }) => {
  await page.goto("/2026/home");
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible({ timeout: 30_000 });

  await page.route(/\/src\/records\/RecordsPage\.jsx/, () => {});
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Records", exact: true }).click();

  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("aria-busy", "true");
  await expect(fallback.locator(".skeleton").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();

  await page.unroute(/\/src\/records\/RecordsPage\.jsx/);
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});

test("Home's own page skeleton shows while Home's code loads", async ({ page }) => {
  const DASHBOARD = /\/src\/dashboard\/Dashboard\.jsx/;
  await page.route(DASHBOARD, () => {});
  await page.goto("/2026/home");
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible({ timeout: 30_000 });
  // Laid out as Home: the games row, the scores list, the four team cards and the leader cards with their silhouettes.
  await expect(fallback.locator(".games-row")).toHaveCount(1);
  await expect(fallback.locator(".games-list")).toHaveCount(1);
  await expect(fallback.locator(".kpi-strip-4 .kpi-chip")).toHaveCount(4);
  await expect(fallback.locator(".leaders-row .kpi-chip")).toHaveCount(4);
  await page.unroute(DASHBOARD);
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible({ timeout: 30_000 });
  await expect(fallback).toHaveCount(0);
});

