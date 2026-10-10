import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Compare landing and the top of an opened comparison at every width. Each test loads its view once and resizes the
// window: the layout depends on the viewport only. The comparison tabs themselves are items 31l-ii and 31l-iii.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024, 1280];

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const gameRows = (page) => page.locator('main button[aria-label^="Compare "]');
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

// A text cut with an ellipsis, or clamped below its full height.
const cutTexts = (page) =>
  page.locator("main .truncate, main .line-clamp-2").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().width > 1 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map((el) => el.textContent.trim()),
  );

const insideWindow = (locator, width) =>
  locator.evaluateAll((els, right) => els.filter((el) => el.getBoundingClientRect().width > 1).every((el) => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= right + 1), width);

const stripScrolls = (strip) => strip.evaluate((el) => getComputedStyle(el).flexWrap === "nowrap" && getComputedStyle(el).overflowX === "auto");

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  return { slug, code: seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug)) };
}

test("the games panel shows TV codes below 640px and the clubs' short names from 640px", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug, code } = await liveSeason(page);
  const { games: next } = await (await page.request.get(`${API}/${code}/games?status=scheduled&order=asc&limit=1`)).json();
  test.skip(next.length === 0, "the season is over, so there is no games panel");
  const { games } = await (await page.request.get(`${API}/${code}/games?phase=${next[0].phaseCode}&round=${next[0].roundNumber}&limit=100&order=asc`)).json();
  const codes = new Set(games.flatMap((game) => [game.localTeam, game.roadTeam]).map((team) => team?.tvCode ?? team?.abbreviatedName ?? team?.clubCode ?? "TBD"));
  const names = new Set(games.flatMap((game) => [game.localTeam, game.roadTeam]).map((team) => team?.abbreviatedName ?? team?.name ?? "TBD"));

  await page.goto(`/${slug}/compare`);
  await expect(gameRows(page).first()).toBeVisible({ timeout: 30_000 });
  await atWidths(page, WIDTHS, async (width) => {
    const short = await shown(gameRows(page).locator(".relative > span[aria-hidden=true]"));
    const full = await shown(gameRows(page).locator(".relative > span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(short.length).toBe(games.length * 2);
      for (const label of short) expect(codes.has(label), label).toBe(true);
      expect(full).toEqual([]);
    } else {
      expect(short).toEqual([]);
      for (const label of full) expect(names.has(label), label).toBe(true);
    }
    if (width < 640) expect(await cutTexts(page)).toEqual([]);
    expect(await holdsContent(gameRows(page))).toBe(true);
    if (width < 1024) expect(await stripScrolls(page.getByRole("tablist", { name: "Comparison type" }))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the player pickers and their list fit, with names on two lines and clubs under them below 1024px", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug } = await liveSeason(page);
  await page.goto(`/${slug}/compare?view=players`);
  const box = page.getByLabel("Player A", { exact: true });
  await box.focus();
  const list = page.getByRole("listbox", { name: "Top scorers" });
  await expect(list.getByRole("option").first()).toBeVisible({ timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    await box.focus();
    await expect(list).toBeVisible();
    // The panel around the listbox is what must stay inside the window.
    expect(await insideWindow(list.locator(".."), width)).toBe(true);
    expect(await cutTexts(page)).toEqual([]);
    // Below 1024px a row puts the club under the name; from 1024px beside it.
    const stacked = await list.getByRole("option").first().evaluate((row) => {
      const [name, club] = row.querySelector(".flex-col").children;
      return club ? club.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 1 : null;
    });
    if (stacked !== null) expect(stacked).toBe(width < 1024);
    expect(await insideWindow(page.getByRole("button", { name: "Swap players" }), width)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("an opened comparison keeps its top tidy: a short Copy link, a scrolling section strip and the phase under it", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug, code } = await liveSeason(page);
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  await page.goto(`/${slug}/compare?teamA=${teams[0].clubCode}&teamB=${teams[1].clubCode}`);
  const strip = page.getByRole("tablist", { name: "Comparison section" });
  await expect(strip).toBeVisible({ timeout: 30_000 });
  const phase = page.getByLabel("Comparison phase");
  const copy = page.getByRole("button", { name: /Copy/ });

  await atWidths(page, WIDTHS, async (width) => {
    // Both labels are in the page and one is hidden, so the shown one is the button's accessible name.
    await expect(copy).toHaveAccessibleName(width < 640 ? "Copy link" : "Copy comparison link");
    // The kicker stays on one line beside the button.
    const kickerOnOneLine = await page.locator("main section .eyebrow").first().evaluate((el) => el.getBoundingClientRect().height < 2 * parseFloat(getComputedStyle(el).fontSize));
    expect(kickerOnOneLine).toBe(true);
    if (width < 1024) expect(await stripScrolls(strip)).toBe(true);
    const stripBox = await strip.boundingBox();
    const phaseBox = await phase.boundingBox();
    // Below 640px the phase sits under the strip, half the width; from 640px it is beside the strip when it fits.
    if (width < 640) {
      expect(phaseBox.y).toBeGreaterThanOrEqual(stripBox.y + stripBox.height - 1);
      expect(phaseBox.width).toBeGreaterThan(width * 0.4);
    }
    // The header, the line above the sections and the selects; the sections' own content is 31l-ii.
    expect(await insideWindow(page.locator("main section").first().locator("button"), width)).toBe(true);
    expect(await insideWindow(page.getByRole("button", { name: "← Games" }), width)).toBe(true);
    expect(await insideWindow(page.getByRole("link", { name: /head-to-head|Game (preview|overview)/ }), width)).toBe(true);
    expect(await insideWindow(phase, width)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("a finished season has no games panel, and a failing games list says so, at 320px", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await page.route(/\/api\/seasons\/[^/]+\/games\?/, (route) => route.fulfill({ json: { games: [], pagination: { limit: 1, offset: 0, total: 0, hasMore: false } } }));
  await page.goto(`/${slug}/compare`);
  await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible({ timeout: 30_000 });
  await expect(gameRows(page)).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  await page.unroute(/\/api\/seasons\/[^/]+\/games\?/);
  await page.route(/\/api\/seasons\/[^/]+\/games\?/, (route) => route.fulfill({ status: 500, json: {} }));
  await page.reload();
  await expect(page.getByText("Could not load games.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});
