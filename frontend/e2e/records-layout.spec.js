import { test, expect } from "@playwright/test";
import { FAMILIES, allMetrics } from "../src/records/recordData.js";
import { HEIGHT, seasonSlug, mockLayoutImages } from "./support/layout";

test.beforeEach(async ({ page }) => { await mockLayoutImages(page); });

// The Records page at every width, for each record type, on the live data: nothing outside its panel, the podium three compact rows (beside
// the timeline and as tall as it from 1280px, above it below), the Top 50 one-line rows from 640px (in two columns from 1280px) and two-line
// rows below it, opening on 25 rows, the record type and the metric on one row at 1280px, and every link to a player, club or game in a season's
// address (the year, not "E2025").
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];
const CASES = [
  { name: "player seasons", query: "?type=player&metric=pointsScored", column: "Player", pictures: true },
  { name: "player seasons, per game", query: "?per=game", column: "Player", pictures: true },
  { name: "player seasons, a rating", query: "?metric=per", column: "Player", pictures: true },
  { name: "player games", query: "?type=game&metric=pir", column: "Player", game: true, pictures: true },
  { name: "team seasons", query: "?type=team&metric=totalRebounds", column: "Club", club: true, pictures: true },
  { name: "team games", query: "?type=teamgame&metric=netRating", column: "Club", club: true, game: true, pictures: true },
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
  test(`${family.name}: the panels fit, the podium sits beside the timeline from 1280px, the Top 50 is short rows, two columns from 1280px, and the links use the season's address`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    const slug = await seasonSlug(page);
    await page.goto(`/${slug}/records${family.query}`);
    await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("#records-top > li")).not.toHaveCount(0);
    // Every season under the timeline's disclosure, open for every width so its rows are checked too.
    await page.getByText(/^Show every season/).click();

    for (const width of WIDTHS) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: HEIGHT });
        const phone = width < 640;
        await expectNoSidewaysScroll(page);
        await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);

        // The podium: three rows, one under another, in a panel beside the timeline from 1280px and above it below.
        const podiumRows = page.locator("ol").first().locator("> li");
        await expect(podiumRows).toHaveCount(3);
        // The rows slide in for a moment, so they are read once they have settled.
        await expect
          .poll(async () => new Set(await podiumRows.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).size, { timeout: 10_000 })
          .toBe(3);
        const tops = await page.evaluate(() =>
          ["records-podium", "records-timeline"].map((id) => Math.round(document.getElementById(id).closest(".panel").getBoundingClientRect().top)),
        );
        const heights = await page.evaluate(() =>
          ["records-podium", "records-timeline"].map((id) => Math.round(document.getElementById(id).closest(".panel").getBoundingClientRect().height)),
        );
        if (width >= 1280) {
          expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(1);
          expect(Math.abs(heights[0] - heights[1])).toBeLessThanOrEqual(1);
        } else expect(tops[1]).toBeGreaterThan(tops[0]);

        // The Top 50: two-line rows on a phone and one-line rows from 640px, both opening on 25 rows; from 1280px they run down two columns
        // (rank 14 starts the second). A game record's season carries a link to the game. Most rows are short (a long name can wrap): about 44px in the table and 60px in the list, where at 320px the
        // club's code often wraps under the name.
        const board = page.locator("section", { has: page.getByRole("heading", { name: /^Top 50/ }) });
        const rows = board.locator("#records-top > li");
        await expect(rows).toHaveCount(25);
        const rowHeights = (await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))).sort((a, b) => a - b);
        expect(rowHeights[12]).toBeLessThanOrEqual(width < 390 ? 80 : phone ? 62 : 47);
        const lefts = await rows.evaluateAll((els) => [els[0], els[13]].map((el) => Math.round(el.getBoundingClientRect().left)));
        if (width >= 1280) expect(lefts[1]).toBeGreaterThan(lefts[0] + 100);
        else expect(lefts[1]).toBe(lefts[0]);
        if (family.game) await expect(rows.first().getByRole("link", { name: "Game", exact: true })).toHaveAttribute("href", /\/games\//);
        // A club board shows the TV code below 640px and the name from it.
        if (family.club) {
          const first = board.locator("#records-top > li").first().getByRole("link").first();
          const shown = (await first.evaluate((el) => el.querySelector('[aria-hidden="true"]')?.textContent ?? el.textContent)).trim();
          if (phone) expect(shown).toMatch(/^[A-Z0-9]{2,4}$/);
          else expect(shown.length).toBeGreaterThan(4);
        }

        // From 1024px the record type strip and the metric choices share a row where they fit (from 1280px they always do), bottoms lined up.
        if (width >= 1280) {
          const strip = await page.getByRole("tablist", { name: "Record type" }).boundingBox();
          const metric = await page.getByRole("combobox", { name: "Metric" }).boundingBox();
          expect(Math.abs(strip.y + strip.height - (metric.y + metric.height))).toBeLessThanOrEqual(8);
        }

        // Under the record type, one row of choices at every width: the metric select and, where there is one, the totals or per game toggle.
        // No group or metric strip; the select and the toggle fit the window, and below 640px the toggle wraps under the select.
        const select = page.getByRole("combobox", { name: "Metric" });
        await expect(select).toHaveCount(1);
        await expect(page.getByRole("tablist", { name: "Metric group" })).toHaveCount(0);
        await expect(page.getByRole("tablist", { name: "Record metric" })).toHaveCount(0);
        const selectBox = await select.boundingBox();
        expect(selectBox.x + selectBox.width).toBeLessThanOrEqual(width + 1);
        const toggle = page.getByRole("group", { name: "Totals or per game" });
        if (await toggle.count()) {
          const toggleBox = await toggle.boundingBox();
          expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(width + 1);
          if (phone) expect(toggleBox.y).toBeGreaterThan(selectBox.y + selectBox.height - 1);
          else expect(Math.abs(toggleBox.y + toggleBox.height - (selectBox.y + selectBox.height))).toBeLessThanOrEqual(2);
          for (const button of await toggle.getByRole("button").all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(phone ? 43.5 : 0);
        }
        for (const strip of await page.getByRole("tablist").all()) {
          const box = await strip.boundingBox();
          expect(box.x + box.width, await strip.getAttribute("aria-label")).toBeLessThanOrEqual(width + 1);
        }
      });
    }

    // The pictures the rows carry are on the page.
    if (family.pictures) expect(await page.locator("main img").count()).toBeGreaterThan(0);

    // A link to a player, a club or a game goes through the season's year, never the feed's code ("E2025").
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    const records = hrefs.filter((href) => /\/(players|teams|games)\//.test(href));
    expect(records.length).toBeGreaterThan(0);
    for (const href of records) expect(href, href).toMatch(/^\/\d{4}\//);
  });
}

test("the metric select on a phone lists every metric in two sections and a choice loads that metric and changes the address", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/records?type=player&metric=pointsScored`);
  const select = page.getByRole("combobox", { name: "Metric" });
  await expect(select).toBeVisible({ timeout: 45_000 });
  await expect(select.locator('optgroup[label="Traditional"] > option')).toHaveCount(11);
  await expect(select.locator('optgroup[label="Advanced"] > option')).toHaveCount(14);
  await select.selectOption({ label: "Rebounds" });
  await expect(page).toHaveURL(/metric=totalRebounds/);
  await expect(page.getByText("Ranked by Rebounds")).toBeVisible({ timeout: 45_000 });
  // An advanced metric is in the same select.
  await select.selectOption({ label: "PER" });
  await expect(select).toHaveValue("per");
  await expect(page).toHaveURL(/metric=per/);
  await expectNoSidewaysScroll(page);
});

// Very long names, and the loading, error and empty answers, at 320px, with mocked responses.
const LONG = {
  seasonCode: "2025",
  personKey: "p1",
  playerName: "WOLFESCHLEGELSTEINHAUSENBERGERDORFF, HUBERTMAXIMILIANALEXANDER",
  clubName: "Very Long Club Name Of The Anadolu Efes Istanbul Basketball Association",
  clubTvCodes: "VLC",
  playerImageUrl: null,
  clubImageUrl: null,
  numericValue: 900,
};
const longRows = (count) => Array.from({ length: count }, (_, index) => ({ ...LONG, personKey: `p${index}`, seasonCode: String(2025 - (index % 3)), numericValue: 900 - index }));

// A best of each season and a progression as long as the archive's: 27 seasons, each value higher than the last.
const longSeasons = Array.from({ length: 27 }, (_, index) => ({ ...LONG, personKey: `s${index}`, seasonCode: String(2000 + index), numericValue: 500 + index }));

async function mockRecords(page, { rows, delay, fail = false }) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2025", name: "2025-26" }] } });
    if (!/\/records\//.test(pathname)) return route.fulfill({ status: 404, json: {} });
    if (delay) await delay;
    if (fail) return route.fulfill({ status: 500, json: {} });
    return route.fulfill({ json: { label: "Points", metric: "pointsScored", group: "traditional", minGames: 23, format: "count", lowerIsBetter: false, volume: null, records: rows, bySeason: rows.length ? longSeasons : [], progression: rows.length ? longSeasons : [] } });
  });
}

test("the record book fits at every width: one column of record-type panels below 1024px, two from 1024px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/records`);
  await expect(page.locator("main ol > li")).toHaveCount(24, { timeout: 45_000 });
  const panels = page.locator("main section[aria-labelledby^=book-]");
  for (const width of WIDTHS) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await expectNoSidewaysScroll(page);
      await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
      const columns = width >= 1024 ? 2 : 1;
      // The first row of panels: the panels that share the first panel's top.
      await expect
        .poll(() => panels.evaluateAll((items) => items.filter((item) => Math.abs(item.getBoundingClientRect().top - items[0].getBoundingClientRect().top) < 2).length))
        .toBe(columns);
    });
  }
});

test("very long names wrap inside their panels at 320px, and the loading, error and empty states fit", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await mockRecords(page, { rows: longRows(50) });
  await page.goto("/2025/records?type=player&metric=pointsScored");
  await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Counts players with at least 67% of their season's regular-season games.")).toBeVisible();
  await page.getByText("Show every season (27)").click();
  await expect(page.locator("details li")).toHaveCount(27);
  await expectNoSidewaysScroll(page);
  await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Loading: the answer is held back.
  let release;
  await mockRecords(page, { rows: longRows(5), delay: new Promise((resolve) => (release = resolve)) });
  await page.goto("/2025/records?type=player&metric=pointsScored");
  await expect(page.getByRole("status", { name: "Loading archive records" })).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  release();
  await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Empty.
  await mockRecords(page, { rows: [] });
  await page.goto("/2025/records?type=player&metric=pointsScored");
  await expect(page.getByText("No records are available for this metric.")).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Error.
  await mockRecords(page, { rows: [], fail: true });
  await page.goto("/2025/records?type=player&metric=pointsScored");
  await expect(page.getByText("Could not load archive records.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

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
