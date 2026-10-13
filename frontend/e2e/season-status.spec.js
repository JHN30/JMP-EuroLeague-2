import { test, expect } from "@playwright/test";
import { HEIGHT, WIDTHS, findPageOverflow, findBrokenWords } from "./support/layout";

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
  const warning = (page) => page.getByRole("complementary", { name: "2021-22 season: data caveat" });

  test("the data caveat follows page navigation and season selection", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    await page.goto("/E2021/home");
    await expect(page).toHaveURL(/\/2021\/home$/);
    await expect(warning(page)).toHaveCount(1);
    await expect(warning(page)).toContainText("CSKA Moscow, UNICS Kazan and Zenit St Petersburg");
    await expect(warning(page)).toContainText("statistics and records may count games differently");
    await expect(warning(page)).toContainText("18 clubs and a planned 34-game regular season");
    await expect(warning(page)).toContainText("15 eligible clubs with 28 counted games each");
    const table = page.locator("section", { has: page.getByRole("heading", { name: "League table", exact: true }) });
    await expect(table).toBeVisible();
    await expect(table.getByRole("complementary")).toHaveCount(0);
    expect(await warning(page).evaluate((notice) => Boolean(notice.compareDocumentPosition(document.querySelector("main h1")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await page.locator(".app-nav").getByRole("link", { name: "Standings", exact: true }).click();
    await expect(page).toHaveURL(/\/2021\/standings$/);
    await expect(warning(page)).toHaveCount(0);
    await page.getByLabel("Selected season").first().selectOption("2022");
    await expect(page).toHaveURL(/\/2022\/standings$/);
    await expect(warning(page)).toHaveCount(0);
    await page.getByLabel("Selected season").first().selectOption("2021");
    await expect(page).toHaveURL(/\/2021\/standings$/);
    await expect(warning(page)).toHaveCount(0);
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Home", exact: true }).click();
    await expect(warning(page)).toBeVisible();
  });

  test("the general caveat appears only on Home", async ({ page }) => {
    await page.goto("/2021/home");
    await expect(warning(page)).toBeVisible();
    for (const path of ["overview", "standings", "games", "teams", "players", "leaders", "compare", "records", "postseason"]) {
      await page.goto(`/2021/${path}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(warning(page)).toHaveCount(0);
    }
  });

  for (const theme of ["light-euroleague", "dark-euroleague"]) {
    test(`the data caveat wraps at supported widths in ${theme}`, async ({ page }) => {
      await page.goto("/2021/home");
      await expect(warning(page)).toBeVisible();
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await expect(warning(page)).toBeVisible();
        const bounds = await warning(page).boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(await findBrokenWords(warning(page).locator("h2, p"))).toEqual([]);
        const overflow = await findPageOverflow(page);
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      }
    });
  }

  test("Home shows no cancelled game as upcoming", async ({ page }) => {
    await page.goto("/2021/home");
    const upcoming = page.locator("section", { has: page.getByRole("heading", { name: "Upcoming games" }) });
    await expect(upcoming).toContainText("Season finished.", { timeout: 30_000 });
    await expect(upcoming.getByRole("group", { name: "Upcoming games" })).toHaveCount(0);
  });
});
