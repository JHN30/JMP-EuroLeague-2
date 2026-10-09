import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The player page's hero, its tab strip and the Overview tab at every width. Each test loads the page once and resizes the
// window: the layout depends on the viewport only. The player's name and a few fields are patched into the live responses
// (a very long surname, a traded player, no photo) and the rest is the live data.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
const LONG_NAME = "LARENTZAKIS-PAPADOPOULOS, KONSTANTINOS";

const PLAYER = /\/api\/seasons\/[^/]+\/players\/[^/]+$/;
const REGISTRATIONS = /\/api\/seasons\/[^/]+\/players\/[^/]+\/registrations$/;
const GAMES = /\/api\/seasons\/[^/]+\/players\/[^/]+\/games(\?|$)/;

// Answers a request with the live response after `patch` has changed its JSON.
async function patched(page, pattern, patch) {
  await page.route(pattern, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    patch(json);
    await route.fulfill({ response, json });
  });
}

// The first player of the Players list, and the way to that player's page.
async function firstPlayer(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/players`);
  const link = page.locator('main a[href*="/players/"]').first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  return { slug, href: await link.getAttribute("href") };
}

// The hero fills in as two more requests land: the player's registrations replace the club the page first shows from the player's
// own record (a different chip), and the season totals add the facts. Measuring before they have landed can hit a chip that is
// about to be replaced, so wait for both.
async function openPlayer(page, href) {
  const registrations = page.waitForResponse((response) => REGISTRATIONS.test(response.url()), { timeout: 30_000 });
  await page.goto(href);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
  await registrations;
  await expect(page.locator("section.panel", { has: page.locator("h1") }).first().getByText("Games", { exact: true })).toBeVisible({ timeout: 30_000 });
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

const hero = (page) => page.locator("main section.panel").first();

// Whether everything inside each box sits inside it. Text that a `truncate` element cuts with an ellipsis is clipped, so it is left out.
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

// Whether the tabs of a strip share one row, and whether the selected one lies inside the visible part of the strip.
const oneRow = (locator) => locator.evaluate((el) => new Set([...el.querySelectorAll("[role=tab]")].map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1);
const selectedVisible = (locator) =>
  locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const tab = el.querySelector("[aria-selected=true]").getBoundingClientRect();
    return tab.left >= box.left - 1 && tab.right <= box.right + 1;
  });

test("the hero keeps a long surname whole, with the number under it and the club as its TV code below 640px", async ({ page }) => {
  const { href } = await firstPlayer(page);
  await patched(page, PLAYER, (json) => {
    json.player.name = LONG_NAME;
    json.player.dorsal = "12";
  });
  await openPlayer(page, href);
  const chips = hero(page).locator("div.gap-x-5 > *");
  await expect(chips.first()).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    const panel = hero(page);
    expect(await holdsContent(panel)).toBe(true);
    // No word of the name is cut in the middle.
    expect(await findBrokenWords(panel.locator("h1 span"))).toEqual([]);

    // The number is under the name below 640px and beside it from 640px.
    const placement = await panel.evaluate((el) => {
      const name = el.querySelector("h1").getBoundingClientRect();
      const number = [...el.querySelectorAll("p")].find((p) => p.textContent.trim().startsWith("#")).getBoundingClientRect();
      return number.top >= name.bottom - 1 ? "under" : number.left >= name.left ? "beside" : "other";
    });
    expect(placement).toBe(width < 640 ? "under" : "beside");

    // The club is its TV code below 640px (the full name stays for screen readers) and the full name from 640px.
    const visible = await chips.first().evaluate((chip) => {
      const shown = [...chip.querySelectorAll("span")].filter((span) => span.getBoundingClientRect().width > 1 && span.children.length === 0);
      return shown.map((span) => span.textContent.trim());
    });
    expect(visible.length).toBeGreaterThan(0);
    const clubName = (await chips.first().textContent()).trim();
    if (width < 640) expect(visible.some((text) => text.length <= 4 && clubName.includes(text))).toBe(true);

    // The Compare button is a full-width row on a phone and its own size from 640px.
    const widths = await panel.evaluate((el) => ({
      panel: el.getBoundingClientRect().width,
      button: el.querySelector("a.btn").getBoundingClientRect().width,
    }));
    if (width < 640) expect(widths.button / widths.panel).toBeGreaterThan(0.85);
    else expect(widths.button / widths.panel).toBeLessThan(0.5);

    // Below 640px the portrait, the name and the facts are centred in the panel, and the facts are at most three to a row.
    if (width < 640) {
      const offsets = await panel.evaluate((el) => {
        const middle = (box) => box.left + box.width / 2;
        const centre = middle(el.getBoundingClientRect());
        const portrait = el.querySelector(".relative.flex-none").getBoundingClientRect();
        const name = el.querySelector("h1 span:last-child");
        const range = document.createRange();
        range.selectNodeContents(name);
        return [Math.abs(middle(portrait) - centre), Math.abs(middle(range.getBoundingClientRect()) - centre)];
      });
      for (const offset of offsets) expect(offset).toBeLessThan(3);
      const perRow = await panel.locator("div.gap-y-3 > div").evaluateAll((facts) => {
        const rows = {};
        for (const fact of facts) rows[Math.round(fact.getBoundingClientRect().top)] = (rows[Math.round(fact.getBoundingClientRect().top)] ?? 0) + 1;
        return Math.max(...Object.values(rows));
      });
      expect(perRow).toBeLessThanOrEqual(3);
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the six tabs are one row that scrolls on its own below 1024px and the arrow keys still move between them", async ({ page }) => {
  const { href } = await firstPlayer(page);
  await openPlayer(page, href);
  const strip = page.getByRole("tablist", { name: "Player detail section" });
  await expect(strip.getByRole("tab")).toHaveCount(6);

  await atWidths(page, WIDTHS, async (width) => {
    expect(await oneRow(strip)).toBe(true);
    expect(await selectedVisible(strip)).toBe(true);
    // Below 1024px the strip is as wide as its tabs and scrolls inside its own box; the page does not.
    const scrolls = await strip.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 320) expect(scrolls).toBe(true);
    await expectNoSidewaysScroll(page);
  });

  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Season by season" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Games" })).toBeFocused();
});

test("a player without a photo, a number, a club or a height, and a traded player, keep the hero tidy", async ({ page }) => {
  const { href } = await firstPlayer(page);
  await patched(page, PLAYER, (json) => {
    Object.assign(json.player, { imageUrl: null, dorsal: null, heightCm: null, clubCode: null, clubName: null, clubTvCode: null, crestUrl: null });
  });
  await patched(page, REGISTRATIONS, (json) => {
    json.registrations = [];
  });
  await openPlayer(page, href);
  await atWidths(page, [320, 390, 640, 1024], async (width) => {
    expect(await holdsContent(hero(page))).toBe(true);
    // The silhouette has the same portrait box as a photo: 144px wide below 640px, 176px from 640px.
    const portrait = await hero(page).locator("> div").nth(1).evaluate((el) => Math.round(el.getBoundingClientRect().width));
    expect(portrait).toBe(width < 640 ? 144 : 176);
    await expect(hero(page)).not.toContainText("#");
    await expectNoSidewaysScroll(page);
  });

  await page.unroute(REGISTRATIONS);
  const club = (code, name, tvCode, active) => ({ registrationKey: code, clubCode: code, active, team: { clubCode: code, name, abbreviatedName: name, tvCode, crestUrl: null } });
  await page.route(REGISTRATIONS, (route) =>
    route.fulfill({
      json: { registrations: [club("AAA", "Panathinaikos AKTOR Athens", "PAO", true), club("BBB", "Kosner Baskonia Vitoria-Gasteiz", "BKN", false)] },
    }),
  );
  await page.reload();
  await expect(hero(page).getByText("Former")).toBeVisible({ timeout: 30_000 });
  await atWidths(page, [320, 390, 640, 1024], async (width) => {
    expect(await holdsContent(hero(page))).toBe(true);
    const shown = await hero(page).evaluate((el) =>
      [...el.querySelectorAll("span[aria-hidden=true]")].filter((span) => span.getBoundingClientRect().width > 1).map((span) => span.textContent.trim()),
    );
    expect(shown).toEqual(width < 640 ? ["PAO", "BKN"] : []);
    await expectNoSidewaysScroll(page);
  });
});

test("every Overview panel holds its content, the radar its labels and the form bars their own place", async ({ page }) => {
  const { href } = await firstPlayer(page);
  await openPlayer(page, href);
  const panels = page.locator("#player-detail-panel .panel");
  await expect(panels.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Recent form")).toBeVisible();
  await expect(page.locator("#player-detail-panel canvas")).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    // The radar redraws a moment after the window changes size, so the check waits for it.
    await expect.poll(() => holdsContent(panels), { timeout: 15_000 }).toBe(true);
    // The ranked cards: two to a row below 640px.
    const cardsPerRow = await page.locator('section[aria-label="Season line"] > div > div').evaluateAll((cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size);
    expect(cardsPerRow).toBe(width < 640 ? 2 : 4);
    // The radar canvas stays inside its panel.
    const radar = await page.locator("#player-detail-panel canvas").evaluate((canvas) => {
      const panel = canvas.closest(".panel").getBoundingClientRect();
      const box = canvas.getBoundingClientRect();
      return box.left >= panel.left - 1 && box.right <= panel.right + 1;
    });
    expect(radar).toBe(true);
    // The form bars do not overlap.
    const bars = await page.locator("ol > li").evaluateAll((items) => {
      const boxes = items.map((item) => item.getBoundingClientRect());
      return boxes.every((box, i) => i === 0 || box.left >= boxes[i - 1].right - 1);
    });
    expect(bars).toBe(true);
    // The points mix keeps its three cells whole words.
    expect(await findBrokenWords(page.locator("#player-detail-panel li > span.flex"))).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the not-found, error and empty states fit a phone", async ({ page }) => {
  // Four page loads, and a failing request is retried (1s, 2s, 4s) before its message shows.
  test.setTimeout(120_000);
  const { href } = await firstPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await page.route(PLAYER, (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));
  await page.goto(href);
  await expect(page.getByText("Player not found.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  await page.unroute(PLAYER);
  await page.route(PLAYER, (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.reload();
  await expect(page.getByText("Could not load this player.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(PLAYER);
  await page.route(GAMES, (route) => route.fulfill({ json: { games: [], pagination: { hasMore: false } } }));
  await page.reload();
  await expect(page.getByText("No games played yet.")).toBeVisible({ timeout: 30_000 });
  expect(await holdsContent(page.locator("#player-detail-panel .panel"))).toBe(true);
  await expectNoSidewaysScroll(page);

  await page.unroute(GAMES);
  await page.route(/\/api\/seasons\/[^/]+\/season-stats/, (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.reload();
  await expect(page.getByText("Could not load league rankings.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
