import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The Leaders page at every width: the category cards and one full board in each scope. Each test loads its view once and
// resizes the window: the layout depends on the viewport only.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024, 1280];
// Category cards per row: one below 1024px, two from lg, three from xl.
const cardsPerRowAt = (width) => (width >= 1280 ? 3 : width >= 1024 ? 2 : 1);

const VIEWS = [
  { name: "Players", cards: "leaders", board: "leaders?metric=pointsScored", extras: ["GP", "MIN"] },
  { name: "Teams", cards: "leaders?scope=teams", board: "leaders?scope=teams&metric=points", extras: ["GP", "Record"] },
  { name: "Advanced", cards: "leaders?scope=advanced", board: "leaders?scope=advanced&metric=per", extras: ["GP", "MIN"] },
];

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const openCard = (page) => page.getByRole("button", { name: "See the full leaderboard" });
const rows = (page) => page.locator("#leaders-panel .board-row-link");
// A card's "See the full leaderboard" button sits in the card itself, so its parent's left edge is the card's column.
const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.parentElement.getBoundingClientRect().left))).size);
const shown = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each row sits inside its box. Text that a `truncate` element cuts with an ellipsis is clipped, so it is left out.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

// The names on cards, form lists and board rows: at most two lines below 640px.
const names = (page) => page.locator("#leaders-panel p.font-semibold, #leaders-panel .board-row-link span.font-semibold");
const namesFitTwoLines = (page) =>
  names(page).evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().width > 1).every((el) => el.getBoundingClientRect().height <= 2 * parseFloat(getComputedStyle(el).lineHeight) + 1),
  );

// Below 1024px each strip on the page is one row that scrolls; from 1024px it is as before.
const stripsScroll = (page) =>
  page.locator('main [role="tablist"]').evaluateAll((els) =>
    els.every((el) => getComputedStyle(el).flexWrap === "nowrap" && getComputedStyle(el).overflowX === "auto"),
  );

// Every select, search field and page button inside the window.
const controlsInWindow = (page, width) =>
  page.locator("#leaders-panel select, #leaders-panel input, #leaders-panel button").evaluateAll(
    (els, right) => els.filter((el) => !el.closest(".tabs-scroll") && el.getBoundingClientRect().width > 1).every((el) => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= right + 1),
    width,
  );

for (const view of VIEWS) {
  test(`the ${view.name} cards are one, two or three per row, with names on two lines and TV codes below 640px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    const slug = await seasonSlug(page);
    await page.goto(`/${slug}/${view.cards}`);
    await expect(openCard(page).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#leaders-panel .loading")).toHaveCount(0, { timeout: 30_000 });

    await atWidths(page, WIDTHS, async (width) => {
      expect(await columns(openCard(page))).toBe(cardsPerRowAt(width));
      if (width < 640) expect(await namesFitTwoLines(page)).toBe(true);
      expect(await findBrokenWords(names(page))).toEqual([]);
      if (view.name !== "Teams") {
        // The club label is the short TV code below 640px and the full name from 640px.
        const short = await shown(page.locator("#leaders-panel .relative > span[aria-hidden=true]"));
        const full = await shown(page.locator("#leaders-panel .relative > span:not([aria-hidden=true])"));
        if (width < 640) {
          expect(short.length).toBeGreaterThan(5);
          for (const code of short) expect(code, code).toMatch(/^[A-Z0-9]{2,4}(\/[A-Z0-9]{2,4})*$/);
          expect(full).toEqual([]);
        } else {
          expect(short).toEqual([]);
          expect(full.length).toBeGreaterThan(5);
        }
      }
      if (width < 1024) expect(await stripsScroll(page)).toBe(true);
      await expectNoSidewaysScroll(page);
    });
  });

  test(`the ${view.name} board shows ${view.extras.join(" and ")} from 640px, keeps rows tidy and fits its controls`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    const slug = await seasonSlug(page);
    await page.goto(`/${slug}/${view.board}`);
    await expect(rows(page).first()).toBeVisible({ timeout: 30_000 });

    await atWidths(page, WIDTHS, async (width) => {
      const header = await shown(page.locator('#leaders-panel .board-row[aria-hidden="true"] > span'));
      for (const extra of view.extras) expect(header.includes(extra), `${extra} at ${width}px`).toBe(width >= 640);
      const bars = await shown(rows(page).locator('span[aria-hidden="true"].rounded-full'));
      expect(bars.length > 0).toBe(width >= 640);
      expect(await holdsContent(rows(page))).toBe(true);
      if (width < 640) expect(await namesFitTwoLines(page)).toBe(true);
      expect(await findBrokenWords(rows(page).locator("span.font-semibold"))).toEqual([]);
      expect(await controlsInWindow(page, width)).toBe(true);
      await expectNoSidewaysScroll(page);
    });
  });
}

const STATS = /\/api\/seasons\/[^/]+\/season-stats/;
const leader = (personKey, points, overrides = {}) => ({
  personKey,
  playerName: `PLAYER, ${personKey}`,
  clubCode: "AAA",
  clubName: "Club AAA",
  clubTvCodes: "AAA",
  clubImageUrl: null,
  playerImageUrl: null,
  positionName: "Guard",
  qualified: true,
  minGames: 20,
  traditional: { gamesPlayed: "30", minutesPlayed: "25.0", pointsScored: String(points) },
  ...overrides,
});
const statsResponse = (players) => ({ phase: "RS", mode: "perGame", players, pagination: { limit: 100, offset: 0, total: players.length, hasMore: false } });

test("a very long name, a traded player and a player without a club or portrait keep the board rows tidy at 320px", async ({ page }) => {
  const players = [
    leader("P1", 25.4, { playerName: "LARENTZAKIS-PAPADOPOULOS, KONSTANTINOS", clubName: "Panathinaikos AKTOR Athens", clubTvCodes: "PAO" }),
    leader("P2", 21.2, { clubName: "Olympiacos Piraeus;Partizan Mozzart Bet Belgrade", clubTvCodes: "OLY;PAR", clubCode: "OLY;PAR" }),
    leader("P3", 18.0, { clubCode: null, clubName: null, clubTvCodes: null, positionName: null }),
    leader("P4", 12.5, { clubTvCodes: null }),
  ];
  await page.route(STATS, (route) => route.fulfill({ json: statsResponse(players) }));
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/leaders?metric=pointsScored`);
  await expect(rows(page)).toHaveCount(4, { timeout: 30_000 });

  expect(await holdsContent(rows(page))).toBe(true);
  expect(await namesFitTwoLines(page)).toBe(true);
  // The traded player's codes read as one label; a missing TV code falls back to the club code.
  const short = await shown(rows(page).locator(".relative > span[aria-hidden=true]"));
  expect(short).toEqual(["PAO", "OLY/PAR", "AAA"]);
  await expectNoSidewaysScroll(page);
});

test("the board's error and empty states fit at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const slug = await seasonSlug(page);

  await page.route(STATS, (route) => route.fulfill({ status: 500, json: {} }));
  await page.goto(`/${slug}/leaders?metric=pointsScored`);
  await expect(page.getByText("Could not load the player leaderboard.")).toBeVisible({ timeout: 30_000 });
  expect(await controlsInWindow(page, 320)).toBe(true);
  await expectNoSidewaysScroll(page);

  await page.unroute(STATS);
  await page.route(STATS, (route) => route.fulfill({ json: statsResponse([]) }));
  await page.reload();
  await expect(page.getByText("No players match these filters.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});

test("on a phone a board picks its statistic from one select and keeps its filters behind a button", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/leaders?metric=pointsScored`);
  await expect(rows(page).first()).toBeVisible({ timeout: 30_000 });

  const statistic = page.getByLabel("Statistic", { exact: true });
  const filters = page.getByRole("button", { name: /^Filters/ });
  await expect(statistic).toBeVisible();
  await expect(page.getByRole("group", { name: "Metric category" })).toBeHidden();
  await expect(page.getByLabel("Team", { exact: true })).toBeHidden();
  // The first row of the board is on the first screen.
  expect((await rows(page).first().boundingBox()).y).toBeLessThan(HEIGHT);

  await statistic.selectOption("assists");
  await expect(page).toHaveURL(/metric=assists/);
  await filters.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("searchbox", { name: "Search players by name" }).fill("a");
  await expect(filters).toHaveText(/1 active/);
  await filters.click();
  await expect(page.getByRole("searchbox", { name: "Search players by name" })).toBeHidden();

  // From 640px the tabs, chips and filters are back and the select and button are gone.
  await page.setViewportSize({ width: 640, height: HEIGHT });
  await expect(statistic).toBeHidden();
  await expect(filters).toBeHidden();
  await expect(page.getByRole("group", { name: "Metric category" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search players by name" })).toBeVisible();
});
