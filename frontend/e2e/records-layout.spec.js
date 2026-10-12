import { test, expect } from "@playwright/test";
import { FAMILIES, allMetrics } from "../src/records/recordData.js";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Records page at every width, for each record type, on the live data: nothing outside its panel, the podium three across from 1024px
// and stacked below it, the Top 50 a table from 640px (inside its panel) and a list of rows below it, the metric a select below 640px and a
// strip from it, and every link to a player, club or game in a season's address (the year, not "E2025").
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];
const CASES = [
  { name: "player seasons", query: "", column: "Player", pictures: true },
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
  test(`${family.name}: the panels fit, the podium is three across from 1024px, the Top 50 is a table from 640px and the links use the season's address`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    const slug = await seasonSlug(page);
    await page.goto(`/${slug}/records${family.query}`);
    await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("tbody tr")).not.toHaveCount(0);

    for (const width of WIDTHS) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: HEIGHT });
        const phone = width < 640;
        await expectNoSidewaysScroll(page);
        await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);

        // The podium: three cards in one row from 1024px, one under another below it.
        const cards = page.locator("ol").first().locator("> li");
        await expect(cards).toHaveCount(3);
        // The cards slide in for a moment, so the rows are read once they have settled.
        await expect
          .poll(async () => new Set(await cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))).size, { timeout: 10_000 })
          .toBe(width >= 1024 ? 1 : 3);

        // The Top 50: a list of 50 rows on a phone, a table that fits its panel from 640px.
        const board = page.locator("section", { has: page.getByRole("heading", { name: "Top 50" }) });
        if (phone) {
          await expect(page.locator("table")).toHaveCount(0);
          await expect(board.locator("ol > li")).toHaveCount(50);
        } else {
          const headers = await page.locator("thead th").allInnerTexts();
          expect(headers.slice(0, 3)).toEqual(["Rank", family.column, "Season"]);
          if (family.game) expect(headers).toContain("Game");
          const table = await page.locator("table").evaluate((el) => ({ table: el.getBoundingClientRect().right, panel: el.closest(".panel").getBoundingClientRect().right }));
          expect(table.table).toBeLessThanOrEqual(table.panel + 1);
          // The box that scrolls has nothing to scroll.
          expect(await page.locator("table").evaluate((el) => el.parentElement.scrollWidth - el.parentElement.clientWidth)).toBeLessThanOrEqual(1);
        }

        // A club board shows the TV code below 640px and the name from it.
        if (family.club) {
          const first = board.locator(phone ? "ol > li" : "tbody tr").first().getByRole("link").first();
          const shown = (await first.evaluate((el) => el.querySelector('[aria-hidden="true"]')?.textContent ?? el.textContent)).trim();
          if (phone) expect(shown).toMatch(/^[A-Z0-9]{2,4}$/);
          else expect(shown.length).toBeGreaterThan(4);
        }

        // The metric: a select on a phone, the strip from 640px. The group strip's tabs are touch-sized on a phone, and no strip is wider than the window.
        await expect(page.getByRole("combobox", { name: "Metric" })).toHaveCount(phone ? 1 : 0);
        await expect(page.getByRole("tablist", { name: "Record metric" })).toHaveCount(phone ? 0 : 1);
        for (const strip of await page.getByRole("tablist").all()) {
          const box = await strip.boundingBox();
          expect(box.x + box.width, await strip.getAttribute("aria-label")).toBeLessThanOrEqual(width + 1);
          if (phone) expect((await strip.getByRole("tab").first().boundingBox()).height, await strip.getAttribute("aria-label")).toBeGreaterThanOrEqual(43.5);
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

test("the metric select on a phone lists the group's metrics and a choice loads that metric and changes the address", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/records`);
  const select = page.getByRole("combobox", { name: "Metric" });
  await expect(select).toBeVisible({ timeout: 45_000 });
  await expect(select.locator("option")).toHaveCount(11);
  await select.selectOption({ label: "Rebounds" });
  await expect(page).toHaveURL(/metric=totalRebounds/);
  await expect(page.getByText("Ranked by Rebounds")).toBeVisible({ timeout: 45_000 });
  // The group strip changes the options and keeps a valid metric.
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(select.locator("option")).toHaveText(["PER", "Win Shares"]);
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

async function mockRecords(page, { rows, delay, fail = false }) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2025", name: "2025-26" }] } });
    if (!/\/records\//.test(pathname)) return route.fulfill({ status: 404, json: {} });
    if (delay) await delay;
    if (fail) return route.fulfill({ status: 500, json: {} });
    return route.fulfill({ json: { label: "Points", metric: "pointsScored", group: "traditional", minGames: 20, records: rows } });
  });
}

test("very long names wrap inside their panels at 320px, and the loading, error and empty states fit", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await mockRecords(page, { rows: longRows(50) });
  await page.goto("/2025/records");
  await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Counts players with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.")).toBeVisible();
  await expectNoSidewaysScroll(page);
  await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Loading: the answer is held back.
  let release;
  await mockRecords(page, { rows: longRows(5), delay: new Promise((resolve) => (release = resolve)) });
  await page.goto("/2025/records");
  await expect(page.getByRole("status", { name: "Loading archive records" })).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  release();
  await expect(page.getByRole("heading", { name: "Top 50" })).toBeVisible({ timeout: 45_000 });
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Empty.
  await mockRecords(page, { rows: [] });
  await page.goto("/2025/records");
  await expect(page.getByText("No records are available for this metric.")).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Error.
  await mockRecords(page, { rows: [], fail: true });
  await page.goto("/2025/records");
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
