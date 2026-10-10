import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The four tabs of an opened team comparison at every width. Each test loads its comparison once and resizes the window: the layout
// depends on the viewport only. The top of the comparison is compare-layout.spec.js; the player tabs are item 31l-iii.
const API = "http://localhost:3000/api/seasons";
// Widest first, so a chart that was drawn wide has to shrink again.
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];

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

// A text cut with an ellipsis, or clamped below its full height.
const cutTexts = (page) =>
  page.locator("main .truncate, main .line-clamp-2").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().width > 1 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map((el) => el.textContent.trim()),
  );

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

const shown = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  return { slug, code, teams };
}

async function openTab(page, slug, teams, tab) {
  await page.goto(`/${slug}/compare?teamA=${teams[0].clubCode}&teamB=${teams[1].clubCode}`);
  await page.getByRole("tab", { name: tab, exact: true }).click({ timeout: 30_000 });
}

test("the Overview fits, with TV codes for the opponents below 640px and the clubs side by side from 640px", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, code, teams } = await liveSeason(page);
  const codes = new Set();
  const names = new Set();
  for (const team of teams.slice(0, 2)) {
    const { games } = await (await page.request.get(`${API}/${code}/teams/${team.clubCode}/games?limit=100&order=asc`)).json();
    for (const side of games.flatMap((game) => [game.localTeam, game.roadTeam])) {
      codes.add(side?.tvCode ?? side?.abbreviatedName ?? side?.clubCode ?? "TBD");
      names.add(side?.abbreviatedName ?? side?.name ?? "TBD");
    }
  }
  await openTab(page, slug, teams, "Overview");
  await expect(page.getByRole("heading", { name: "Recent results and venue" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    expect(await outsidePanels(page)).toEqual([]);
    // Opponents in the form lists, and the clubs of a meeting.
    const slots = page.locator("main a[href*='/games/'] .relative");
    const short = await shown(slots.locator("> span[aria-hidden=true]"));
    const full = await shown(slots.locator("> span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(short.length).toBeGreaterThan(0);
      for (const label of short) expect(codes.has(label), label).toBe(true);
      expect(full).toEqual([]);
    } else {
      expect(short).toEqual([]);
      for (const label of full) expect(names.has(label), label).toBe(true);
    }
    const columns = await page
      .getByRole("heading", { name: "Where each club is stronger" })
      .evaluate((heading) => getComputedStyle(heading.closest(".panel").querySelector(".grid")).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width < 640 ? 1 : 2);
    // The compare link wraps its text inside its button.
    const link = page.getByRole("link", { name: /^Compare .* and / });
    if (await link.count()) expect(await link.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await findBrokenWords(page.locator("main .panel h3, main .panel .font-semibold"))).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Statistics rows fit with no cut text", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug, teams } = await liveSeason(page);
  await openTab(page, slug, teams, "Statistics");
  await expect(page.getByText(/Per game, overtime counted/)).toBeVisible({ timeout: 30_000 });

  await atWidths(page, WIDTHS, async () => {
    expect(await cutTexts(page)).toEqual([]);
    expect(await outsidePanels(page)).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Rosters tables swipe inside their box with the player column pinned", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug, teams } = await liveSeason(page);
  await openTab(page, slug, teams, "Rosters");
  await expect(page.getByRole("heading", { name: "Most impactful players" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main table")).toHaveCount(4, { timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    expect(await outsidePanels(page)).toEqual([]);
    await expectNoSidewaysScroll(page);
    if (width >= 640) return;
    // Below 640px each table's numbers swipe behind the player: its first cell stays on the box's left edge.
    const pinned = await page.locator("main table").evaluateAll((tables) =>
      tables.map((table) => {
        const box = table.parentElement;
        box.scrollLeft = box.scrollWidth;
        const cell = table.querySelector("tbody td:first-child");
        return { scrolls: box.scrollWidth > box.clientWidth, left: Math.round(cell.getBoundingClientRect().left - box.getBoundingClientRect().left), name: cell.querySelector("[aria-hidden=true]")?.textContent.trim() };
      }),
    );
    for (const table of pinned) {
      expect(table.scrolls).toBe(true);
      expect(table.left).toBe(0);
      // A last name only, the full name stays for screen readers.
      expect(table.name).toBeTruthy();
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the Trends form cards and charts fit, and the chart pairs sit side by side from 1280px", async ({ page }) => {
  test.setTimeout(90_000);
  const { slug, teams } = await liveSeason(page);
  await openTab(page, slug, teams, "Trends");
  const charts = page.locator("main canvas");
  test.skip((await charts.count()) === 0 && (await page.getByText("Not enough games played").count()) > 0, "too few games for a trend yet");
  await expect(charts).toHaveCount(5, { timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    expect(await outsidePanels(page)).toEqual([]);
    // Every canvas fits the panel it is drawn in.
    const canvasFits = await charts.evaluateAll((els) => els.every((el) => el.getBoundingClientRect().right <= el.closest(".panel").getBoundingClientRect().right + 1));
    expect(canvasFits).toBe(true);
    const margins = page.getByRole("heading", { name: "Margin in every game" });
    const [first, second] = await Promise.all([margins.nth(0).boundingBox(), margins.nth(1).boundingBox()]);
    if (width >= 1280) expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    else expect(second.y).toBeGreaterThan(first.y + 50);
    await expectNoSidewaysScroll(page);
  });
});

test.describe("states and long names at 320px", () => {
  test.use({ viewport: { width: 320, height: HEIGHT } });

  test("a 60-letter club name with no crest or TV code wraps in every tab", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, teams } = await liveSeason(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });
    await page.route(/\/api\/seasons\/[^/]+\/teams$/, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.teams = body.teams.map((team, index) => ({ ...team, name: `Extraordinarily Long Club Name Number ${index} Of The Whole League`, abbreviatedName: `Extraordinarily Long Short Name ${index}`, crestUrl: null, tvCode: null }));
      await route.fulfill({ response, json: body });
    });
    for (const tab of ["Overview", "Statistics", "Rosters", "Trends"]) {
      await openTab(page, slug, teams, tab);
      await expect(page.locator(".loading")).toHaveCount(0, { timeout: 30_000 });
      expect(await cutTexts(page)).toEqual([]);
      expect(await outsidePanels(page)).toEqual([]);
      await expectNoSidewaysScroll(page);
    }
  });

  test("failing and empty responses say so inside the layout", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, teams } = await liveSeason(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });

    // The team games fail: the Overview form panel and the Trends tab each say so.
    await page.route(/\/teams\/[^/]+\/games/, (route) => route.fulfill({ status: 500, json: {} }));
    await openTab(page, slug, teams, "Overview");
    await expect(page.getByText("Could not load recent form.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Could not load the trends.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/teams\/[^/]+\/games/);

    // No games at all: no form, no meetings and too few games for a trend.
    await page.route(/\/teams\/[^/]+\/games/, (route) => route.fulfill({ json: { games: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } }));
    await openTab(page, slug, teams, "Overview");
    await expect(page.getByText("No games played yet.").first()).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Not enough games played in this phase to show a trend yet.")).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/teams\/[^/]+\/games/);

    // No roster registered.
    await page.route(/\/teams\/[^/]+\/roster/, (route) => route.fulfill({ json: { registrations: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } }));
    await openTab(page, slug, teams, "Rosters");
    await expect(page.getByText("No roster is registered for these clubs yet.")).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
  });
});
