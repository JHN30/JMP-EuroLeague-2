import { test, expect } from "@playwright/test";
import { FAMILIES, allMetrics } from "../src/records/recordData.js";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Records page on a desktop screen, for each record type, on the live data: nothing outside its panel, the podium three across from
// 1024px and stacked below it, the Top 50 table inside its panel with its columns, and every link to a player, club or game in a season's
// address (the year, not "E2025"). The tablet and phone layouts are item 31m.
const WIDTHS = [1280, 1024, 1023];
const CASES = [
  { name: "player seasons", query: "", column: "Player", pictures: true },
  { name: "player seasons, a rating", query: "?metric=per", column: "Player", pictures: true },
  { name: "player games", query: "?type=game&metric=pir", column: "Player", game: true, pictures: true },
  { name: "team seasons", query: "?type=team&metric=totalRebounds", column: "Club", pictures: true },
  { name: "team games", query: "?type=teamgame&metric=netRating", column: "Club", game: true, pictures: true },
];
const ROUTES = { player: "player-seasons", game: "single-games", team: "team-seasons", teamgame: "team-games" };

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

for (const family of CASES) {
  test(`${family.name}: the panels fit, the podium is three across from 1024px and the links use the season's address`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    const slug = await seasonSlug(page);
    await page.goto(`/${slug}/records${family.query}`);
    await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("tbody tr")).not.toHaveCount(0);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      await expectNoSidewaysScroll(page);
      await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);

      // The podium: three cards in one row from 1024px, one under another below it.
      const cards = page.locator("ol").first().locator("> li");
      await expect(cards).toHaveCount(3);
      // The cards slide in for a moment, so the rows are read once they have settled.
      await expect
        .poll(async () => new Set(await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).size, { timeout: 10_000 })
        .toBe(width >= 1024 ? 1 : 3);

      // The table: its columns are in it, and it fits its panel.
      const headers = await page.locator("thead th").allInnerTexts();
      expect(headers.slice(0, 3)).toEqual(["Rank", family.column, "Season"]);
      if (family.game) expect(headers).toContain("Game");
      const table = await page.locator("table").evaluate((el) => ({ table: el.getBoundingClientRect().right, panel: el.closest(".panel").getBoundingClientRect().right }));
      expect(table.table).toBeLessThanOrEqual(table.panel + 1);
    }

    // The pictures the rows carry are on the page, and the strips (type, group, metric) sit inside the window.
    if (family.pictures) expect(await page.locator("main img").count()).toBeGreaterThan(0);
    for (const strip of await page.getByRole("tablist").all()) {
      const box = await strip.boundingBox();
      expect(box.x + box.width, await strip.getAttribute("aria-label")).toBeLessThanOrEqual(page.viewportSize().width + 1);
    }

    // A link to a player, a club or a game goes through the season's year, never the feed's code ("E2025").
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    const records = hrefs.filter((href) => /\/(players|teams|games)\//.test(href));
    expect(records.length).toBeGreaterThan(0);
    for (const href of records) expect(href, href).toMatch(/^\/\d{4}\//);
  });
}

test("every metric the page offers answers from the live API with records", async ({ request }) => {
  test.setTimeout(120_000);
  const API = "http://localhost:3000/api/seasons/2025/records";
  for (const family of FAMILIES) {
    for (const metric of allMetrics(family.key)) {
      const response = await request.get(`${API}/${ROUTES[family.key]}?metric=${metric.key}`);
      expect(response.status(), `${family.key} ${metric.key}`).toBe(200);
      const body = await response.json();
      expect(body.group, `${family.key} ${metric.key}`).toBe(metric.group);
      expect(body.records.length, `${family.key} ${metric.key}`).toBeGreaterThan(0);
    }
  }
});
