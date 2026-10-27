import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The four tabs of an opened player comparison at every width. Each test loads its comparison once and resizes the window: the layout
// depends on the viewport only. The top of the comparison is compare-layout.spec.js and the team tabs are compare-team-layout.spec.js.
const API = "http://localhost:3000/api/seasons";
// Widest first, so a chart that was drawn wide has to shrink again.
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      // A short pause lets Chart.js see this resize before the next one, so a chart is never left at the previous width.
      await page.waitForTimeout(250);
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

// Two qualified players with the longest names, so a name that cannot fit shows up.
async function livePlayers(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { players } = await (await page.request.get(`${API}/${code}/season-stats?phase=RS&mode=perGame&limit=60&qualified=true`)).json();
  const [first, second] = [...players].sort((a, b) => b.playerName.length - a.playerName.length);
  return { slug, a: first, b: second };
}

async function openTab(page, slug, a, b, tab) {
  await page.goto(`/${slug}/compare?view=players&playerA=${a.personKey}&playerB=${b.personKey}`);
  await page.getByRole("tab", { name: tab, exact: true }).click({ timeout: 30_000 });
}

test("the Overview fits, with club and opponent codes below 640px and the radar named by last names", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Overview");
  await expect(page.getByRole("heading", { name: "Recent form" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
  const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    // The clubs in the two heads and the opponents in the form rows: codes below 640px, names from it.
    const slots = page.locator("main .panel .relative");
    const short = await shown(slots.locator("> span[aria-hidden=true]"));
    const full = await shown(slots.locator("> span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(short.length).toBeGreaterThan(0);
      expect(short.every((label) => label.length > 0 && label.length <= 9)).toBe(true);
      expect(full).toEqual([]);
    } else {
      expect(short).toEqual([]);
    }
    // The radar and its legend name the players by last name.
    const radar = (await page.locator('main canvas[role="img"]').first().getAttribute("aria-label")).toLowerCase();
    for (const name of lastNames) expect(radar).toContain(name);
    expect(await findBrokenWords(page.locator("main .panel h3:visible, main .panel a.font-bold:visible"))).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Statistics and Advanced rows fit, and the Statistics header reads First Last", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Statistics");
  await expect(page.locator("main .panel h3").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
  const header = await page.locator("main .panel .grid-cols-2").first().innerText();
  expect(header).not.toContain(",");
  await atWidths(page, WIDTHS, async () => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    await expectNoSidewaysScroll(page);
  });

  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText(/Running values after the latest round/)).toBeVisible({ timeout: 30_000 });
  await atWidths(page, WIDTHS, async () => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Trends charts fit, show every game, and sit side by side from 1280px", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Trends");
  const charts = page.locator("main canvas");
  await expect(charts.first()).toBeVisible({ timeout: 30_000 });
  const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());
  // The first chart's note says every game, not an average that starts later.
  await expect(page.getByText("Every game, in order. Hover or tap a point for the game.").first()).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    const label = (await charts.first().getAttribute("aria-label")).toLowerCase();
    for (const name of lastNames) expect(label).toContain(name);
    const points = page.getByRole("heading", { name: "Points", exact: true });
    const rebounds = page.getByRole("heading", { name: "Rebounds", exact: true });
    const [first, second] = await Promise.all([points.boundingBox(), rebounds.boundingBox()]);
    if (width >= 1280) expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    else expect(second.y).toBeGreaterThan(first.y + 50);
    await expectNoSidewaysScroll(page);
  });
});

test.describe("states and long names at 320px", () => {
  test.use({ viewport: { width: 320, height: HEIGHT } });

  test("two very long names with no headshot or crest wrap inside their panels in every tab", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });
    await page.route(/\/api\/seasons\/[^/]+\/season-stats\?/, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.players = body.players.map((player) =>
        [a.personKey, b.personKey].includes(player.personKey)
          ? { ...player, playerName: `${player.personKey === a.personKey ? "ABERCROMBIE FITZWILLIAM-SMYTHE" : "ZACHARIAS PAPADOPOULOS-KARAMANLIS"}, ALEXANDROS CONSTANTINOS`, playerImageUrl: null, clubImageUrl: null }
          : player,
      );
      await route.fulfill({ response, json: body });
    });
    for (const tab of ["Overview", "Statistics", "Advanced", "Trends"]) {
      await openTab(page, slug, a, b, tab);
      await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
      await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
      await expectNoSidewaysScroll(page);
    }
  });

  test("failing and empty responses say so inside the layout", async ({ page }) => {
    test.setTimeout(150_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });

    // The games fail: the Overview's form and the Trends tab each say so.
    await page.route(/\/players\/[^/]+\/games/, (route) => route.fulfill({ status: 500, json: {} }));
    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByText("Could not load the recent games.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Could not load the trends.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/players\/[^/]+\/games/);

    // No games at all.
    await page.route(/\/players\/[^/]+\/games/, (route) => route.fulfill({ json: { games: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } }));
    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByText("No games played yet.").first()).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Not enough games played to show a trend yet.")).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/players\/[^/]+\/games/);

    // The advanced numbers fail.
    await page.route(/\/players\/[^/]+\/advanced/, (route) => route.fulfill({ status: 500, json: {} }));
    await openTab(page, slug, a, b, "Advanced");
    await expect(page.getByText("Could not load the advanced numbers.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
  });
});

// What was asked for after the first try on a phone: the players named over their values, readable statistic names with tips, a tip on every
// advanced row, and a tip that a second tap closes.
test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("every tab has the two players at its top, and the Statistics rows read in full", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());
    // The header at the top of a tab: both names, and a headshot circle for each.
    const expectHeader = async (group) => {
      await expect(group).toBeVisible({ timeout: 30_000 });
      const text = (await group.innerText()).toLowerCase();
      for (const name of lastNames) expect(text).toContain(name);
      await expect(group.locator(".rounded-full")).toHaveCount(2);
    };
    const header = page.getByRole("group", { name: "Players compared" });

    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByRole("heading", { name: "Season line" })).toBeVisible({ timeout: 30_000 });
    await expectHeader(header);
    await expect(header).toHaveCount(1);

    await page.getByRole("tab", { name: "Statistics", exact: true }).tap();
    await expectHeader(header);
    // The Statistics tab carries no note about the tips: the rows are named in full.
    await expect(page.getByText("Hover or tap a name for what it means.")).toHaveCount(0);
    await expect(page.getByText(/^Team wins when playing/).first()).toBeAttached();
    for (const label of ["Double-doubles", "Triple-doubles", "Possessions"]) {
      await expect(page.locator(".header-tip-label", { hasText: label }).first()).toBeAttached();
    }
    await expect(page.getByText(/^(DD|TD)$/)).toHaveCount(0);

    await page.getByRole("tab", { name: "Advanced", exact: true }).tap();
    await expect(page.getByText(/Hover or tap a name for what it means./)).toBeVisible({ timeout: 30_000 });
    await expectHeader(header);
    // Every advanced row has a tip on its name.
    const withoutTip = await page.evaluate(() =>
      [...document.querySelectorAll("main .panel .flex-col.justify-center")].filter((row) => !row.querySelector(".header-tip-label")).map((row) => row.textContent.slice(0, 30)),
    );
    expect(withoutTip).toEqual([]);

    await page.getByRole("tab", { name: "Trends", exact: true }).tap();
    await expectHeader(header);
  });

  test("a second tap on a tip's name closes it", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openTab(page, slug, a, b, "Statistics");
    const label = page.locator(".header-tip-label", { hasText: "Double-doubles" });
    await expect(label).toBeAttached({ timeout: 30_000 });
    // The pointer rests in a corner, so scrolling never brings another label under it (which would open that label's tip).
    await page.mouse.move(0, 0);
    await label.scrollIntoViewIfNeeded();
    const tip = page.locator("[role=tooltip]");
    // A pause between taps keeps the browser from reading two quick taps as a double-tap.
    await label.tap();
    await expect(tip).toHaveCount(1);
    await page.waitForTimeout(500);
    await label.tap();
    await expect(tip).toHaveCount(0);
    // And it opens again.
    await page.waitForTimeout(500);
    await label.tap();
    await expect(tip).toHaveCount(1);
  });
});

test("every statistic row of the player comparison has a hover tip", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  const rowNames = page.locator("main span.text-xs.font-bold.tracking-wide.uppercase");
  for (const tab of ["Overview", "Statistics", "Advanced"]) {
    await openTab(page, slug, a, b, tab);
    await expect(rowNames.first()).toBeVisible({ timeout: 30_000 });
    expect(await rowNames.count()).toBeGreaterThan(1);
    await expect(page.locator("main span.text-xs.font-bold.tracking-wide.uppercase:not(:has(.header-tip-label))")).toHaveCount(0);
  }
});
