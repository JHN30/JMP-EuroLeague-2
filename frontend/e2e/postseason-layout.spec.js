import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";

// The Postseason page at every width, on the live data of five seasons: 2025 (finished, with its champion), 2026 (in progress: a projected
// bracket and the race), 2024 (a third-place game), 2023 (a smaller league) and 2004 (older data, three-digit scores). Each test loads the
// page once and resizes the window, widest first: the layout depends on the viewport only. A season without Play-In uses three columns.
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];
const SEASONS = ["2025", "2026", "2024", "2023", "2004"];

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whatever sits outside the panel around it, leaving out what a scrolling box inside the panel clips.
const outsidePanels = (page) =>
  page.locator("main .panel").evaluateAll((panels) =>
    panels.flatMap((panel) => {
      const box = panel.getBoundingClientRect();
      return [...panel.querySelectorAll("*")]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) return false;
          for (let node = el.parentElement; node && node !== panel; node = node.parentElement) {
            if (getComputedStyle(node).overflowX !== "visible") return false;
          }
          return rect.left < box.left - 1 || rect.right > box.right + 1;
        })
        .map((el) => el.textContent.trim().slice(0, 30) || el.tagName);
    }),
  );

for (const season of SEASONS) {
  test(`${season}: the bracket uses its stage columns from 1024px, the rows are touch-sized on a phone, and the panels fit`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    await page.goto(`/${season}/postseason`);
    await expect(page.getByRole("heading", { name: "Playoffs", exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });

    // Open a matchup, so its detail is on the page too.
    await page.locator(".bk-grid [role=group] button").first().click();
    await expect(page.locator(".scroll-mt-28 .panel")).toBeVisible();

    for (const width of WIDTHS) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: HEIGHT });
        const phone = width < 640;
        await expectNoSidewaysScroll(page);
        await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);

        // Stacked below lg; only the columns for stages this season held from lg.
        const columns = await page.locator(".bk-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
        expect(columns).toBe(width >= 1024 ? (season === "2004" ? 3 : 4) : 1);

        // A club row of a matchup is a 44px target on a phone.
        if (phone) {
          const heights = await page.locator(".bk-grid [role=group] button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
          expect(Math.min(...heights)).toBeGreaterThanOrEqual(43.5);
        }

        // No club name is cut short with an ellipsis on a phone.
        if (phone) {
          const cut = await page
            .locator("main span, main p, main h2")
            .evaluateAll((els) => els.filter((el) => el.offsetWidth > 0 && getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.trim()));
          expect(cut).toEqual([]);
        }

        // The detail of the open matchup: inside its panel, and a Compare button (when the clubs are not done) a touch target on a phone.
        const compare = page.locator(".scroll-mt-28").getByRole("link", { name: /^Compare / });
        if (phone && (await compare.count())) expect((await compare.boundingBox()).height).toBeGreaterThanOrEqual(43.5);

        // The race's zone tables (a season in progress) have nothing to scroll sideways.
        const race = page.getByRole("heading", { name: "Race for the bracket" });
        if (await race.count()) {
          const overflows = await page.locator("main table").evaluateAll((tables) => tables.map((table) => table.parentElement.scrollWidth - table.parentElement.clientWidth));
          expect(overflows.length).toBeGreaterThan(0);
          expect(Math.max(...overflows)).toBeLessThanOrEqual(1);
        }
      });
    }
  });
}

// The states, at 320px, with mocked responses.
async function mockPostseason(page, { delay, fail = false } = {}) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2025", name: "2025-26" }] } });
    if (fail) return route.fulfill({ status: 500, json: {} });
    if (/\/format$/.test(pathname)) return route.fulfill({ json: { format: { status: "notStarted", stages: [{ code: "RS", type: "table", dataState: "upcoming", observed: { gamesPlayed: 0 }, qualification: [] }], issues: [] } } });
    if (/\/standings$/.test(pathname)) {
      if (delay) await delay;
      return route.fulfill({ json: { standings: [] } });
    }
    if (/\/teams$/.test(pathname)) return route.fulfill({ json: { teams: [] } });
    if (/\/postseason-series$/.test(pathname)) return route.fulfill({ json: { series: [] } });
    if (/\/games$/.test(pathname)) return route.fulfill({ json: { games: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } });
    if (/\/rounds$/.test(pathname)) return route.fulfill({ json: { rounds: [] } });
    return route.fulfill({ status: 404, json: {} });
  });
}

test("the loading, error and no-standings states fit at 320px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  let release;
  await mockPostseason(page, { delay: new Promise((resolve) => (release = resolve)) });
  await page.goto("/2025/postseason");
  await expect(page.getByRole("status", { name: "Loading the postseason" })).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  release();
  await expect(page.getByText("The standings are not available yet, so there is no bracket to show.")).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await mockPostseason(page, { fail: true });
  await page.goto("/2025/postseason");
  await expect(page.getByText("Could not load the postseason.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
