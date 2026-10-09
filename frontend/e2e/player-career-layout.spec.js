import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Season by season tab at every width. Each test loads the page once and resizes the window: the layout
// depends on the viewport only. The data is live (a player of the current season who also played earlier); the states are mocked.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];

async function openCareer(page, href) {
  await page.goto(href);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByRole("region", { name: "Regular seasons, per game" })).toBeVisible({ timeout: 60_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each panel sits inside it. Text that a `truncate` element cuts with an ellipsis, a box that scrolls on its
// own and a chart canvas that is still redrawing after a resize are left to their own checks.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate, [role=region], canvas")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);

test("the summary, the season table and the trends fit, and the table scrolls on its own with the season pinned", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await openCareer(page, href);
  const summary = page.locator('section[aria-label="Career summary"]');
  const tableRegion = page.getByRole("region", { name: "Regular seasons, per game" });
  const trends = page.locator('section[aria-label="Trends"]');
  await expect(trends.locator(".panel")).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    await expectNoSidewaysScroll(page);
    // Summary cards: two to a row below 640px, four from 640px.
    expect(await columns(summary.locator("div.grid > div"))).toBe(width < 640 ? 2 : 4);
    expect(await holdsContent(summary.locator("div.grid > div"))).toBe(true);

    // The season table scrolls inside its own panel (a keyboard can reach it) and the page does not.
    await expect(tableRegion).toHaveAttribute("tabindex", "0");
    const scrolls = await tableRegion.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 390) expect(scrolls).toBe(true);

    // The season column is pinned: it keeps its place when the table is scrolled, and it is narrow on a phone.
    const pinned = await tableRegion.evaluate((el) => {
      el.scrollLeft = 0;
      const cell = el.querySelector("tbody td:first-child");
      const before = cell.getBoundingClientRect();
      el.scrollLeft = 80;
      const after = cell.getBoundingClientRect();
      el.scrollLeft = 0;
      return { moved: Math.abs(after.left - before.left), width: before.width, panel: el.getBoundingClientRect().width };
    });
    if (scrolls) expect(pinned.moved).toBeLessThan(1);
    if (width < 640) expect(pinned.width).toBeLessThan(pinned.panel / 2);

    // Scrolled cells never show beside the pinned column: the point just inside the panel's left edge belongs to the season cell.
    if (scrolls) {
      const leak = await tableRegion.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
        el.scrollLeft = 120;
        const box = el.getBoundingClientRect();
        const row = el.querySelector("tbody tr").getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + 2, row.top + row.height / 2);
        const inSeasonCell = Boolean(hit?.closest("td:first-child, th:first-child"));
        el.scrollLeft = 0;
        return !inSeasonCell;
      });
      expect(leak).toBe(false);
    }

    // A season badge sits under the season below 640px and beside it from 640px.
    const badge = tableRegion.locator("tbody td:first-child .badge").first();
    if ((await badge.count()) > 0) {
      const placement = await badge.evaluate((el) => {
        const link = el.closest("td").querySelector("a").getBoundingClientRect();
        return el.getBoundingClientRect().top >= link.bottom - 1 ? "under" : "beside";
      });
      expect(placement).toBe(width < 640 ? "under" : "beside");
    }

    // Trends: two cards to a row below 640px, three from 640px.
    expect(await columns(trends.locator("div.grid > div"))).toBe(width < 640 ? 2 : 3);
    // Twelve trends, so the last row is full at two and at three to a row.
    await expect(trends.locator("div.grid > div")).toHaveCount(12);
    expect(await holdsContent(trends.locator(".panel"))).toBe(true);
    // The labels are whole words ("Valuation (PIR)" and "True shooting %" wrap, they are not cut).
    const cutLabels = await trends.locator("div.grid > div span.uppercase").evaluateAll((labels) => labels.filter((label) => label.scrollWidth > label.clientWidth + 1).map((label) => label.textContent));
    expect(cutLabels).toEqual([]);
  });
});

test("the highs, the opened profile, the role table and the clubs fit", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await openCareer(page, href);
  const highsAndProfile = page.locator('section[aria-label="Highs and profile"]');
  await highsAndProfile.getByRole("button", { name: "Compare the profile by season" }).click();
  await expect(highsAndProfile.locator("canvas")).toBeVisible({ timeout: 60_000 });
  const role = page.getByRole("region", { name: "How the role changed, by season" });
  const clubs = page.getByRole("region", { name: "Clubs by season" });

  await atWidths(page, WIDTHS, async (width) => {
    // The radar stays inside its panel and does not stretch the page.
    await expectNoSidewaysScroll(page);
    await expect.poll(() => holdsContent(highsAndProfile.locator(".panel"))).toBe(true);
    const radar = await highsAndProfile.locator("canvas").evaluate((canvas) => {
      const panel = canvas.closest(".panel").getBoundingClientRect();
      const box = canvas.getBoundingClientRect();
      return box.left >= panel.left - 1 && box.right <= panel.right + 1;
    });
    expect(radar).toBe(true);

    // The career highs: two to a row below 1024px, four from 1024px.
    expect(await columns(highsAndProfile.locator('a[href*="/games/"]'))).toBe(width < 1024 ? 2 : 4);
    // Eight highs, so the last row is full at two and at four to a row (a player without a game for one stat shows seven or fewer).
    expect(await highsAndProfile.locator('a[href*="/games/"]').count()).toBeLessThanOrEqual(8);

    // The role table scrolls in its own region with the season pinned; the clubs row scrolls in its own region.
    await expect(role).toHaveAttribute("tabindex", "0");
    await expect(clubs).toHaveAttribute("tabindex", "0");
    const rolePinned = await role.evaluate((el) => {
      el.scrollLeft = 0;
      const cell = el.querySelector("tbody td:first-child");
      const before = cell.getBoundingClientRect().left;
      el.scrollLeft = 60;
      const after = cell.getBoundingClientRect().left;
      el.scrollLeft = 0;
      return { scrolls: el.scrollWidth > el.clientWidth, moved: Math.abs(after - before) };
    });
    if (rolePinned.scrolls) expect(rolePinned.moved).toBeLessThan(1);
    expect(await holdsContent(page.locator('section[aria-label="Role"] .panel, section[aria-label="Teams"] .panel'))).toBe(true);
  });
});

// Answers the career requests: the first request for the player's own page is live, later ones follow `answer`.
async function shapeCareer(page, answer) {
  let first = null;
  await page.route(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/, async (route) => {
    const code = new URL(route.request().url()).pathname.split("/")[3];
    first ??= code;
    const verdict = answer(code === first);
    if (verdict === "live") return route.continue();
    return route.fulfill({ status: verdict, json: { error: "Mocked" } });
  });
}

test("a player with one season, no seasons, or a failing history keeps the tab tidy", async ({ page }) => {
  test.setTimeout(120_000);
  const { href } = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // One season: only the current one answers, so the table has no Career row and the radar one outline.
  await shapeCareer(page, (isCurrent) => (isCurrent ? "live" : 404));
  await openCareer(page, href);
  await expect(page.getByRole("region", { name: "Regular seasons, per game" }).locator("tfoot")).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  expect(await holdsContent(page.locator('#player-detail-panel section[aria-label="Career summary"] div.grid > div, #player-detail-panel section[aria-label="Trends"] .panel'))).toBe(true);
  await page.unroute(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/);

  // No seasons at all after the page itself has loaded.
  await page.goto(href);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
  await shapeCareer(page, () => 404);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByText("No archived seasons found for this player.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);
  await page.unroute(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/);

  // A failing history.
  await page.goto(href);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
  await shapeCareer(page, () => 500);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByText("Could not load season history.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
