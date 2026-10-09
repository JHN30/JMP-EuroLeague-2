import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Statistics tab at every width. Each test loads the page once and resizes the window: the layout depends
// on the viewport only. The data is live; the phases are given extra, long-named ones, and the states are mocked.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
const PHASES = /\/api\/seasons\/[^/]+\/phases$/;
const STATS = /\/api\/seasons\/[^/]+\/season-stats\?(?=.*personKey)/;

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

async function openStatistics(page, href) {
  await page.goto(href);
  await page.getByRole("tab", { name: "Statistics" }).click();
  await expect(page.locator("#player-stats-panel section[aria-label=Traditional]")).toBeVisible({ timeout: 60_000 });
}

// The league ranks arrive on their own, a moment after the numbers.
const ranksLoaded = (page) => expect(page.locator("#player-stats-panel li span.text-xs", { hasText: " of " }).first()).toBeVisible({ timeout: 60_000 });

test("the strips, the chips and the stat rows fit at every width", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  // Two more phases, one with a long name, so the Phase strip has more tabs than a phone holds.
  await page.route(PHASES, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.phases.push({ ...json.phases[0], code: "ZZ1", name: "Qualification Round Extended" }, { ...json.phases[0], code: "ZZ2", name: "Final Four" });
    await route.fulfill({ response, json });
  });
  await openStatistics(page, href);
  await ranksLoaded(page);
  const phase = page.getByRole("tablist", { name: "Phase" });
  const mode = page.getByRole("tablist", { name: "Stats mode" });
  await expect(phase.getByRole("tab")).toHaveCount((await phase.getByRole("tab").count()) || 3);
  expect(await phase.getByRole("tab").count()).toBeGreaterThanOrEqual(3);

  await atWidths(page, WIDTHS, async (width) => {
    // Each strip is one row, with the selected tab on screen.
    for (const strip of [phase, mode]) {
      const state = await strip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const tabs = [...el.querySelectorAll("[role=tab]")];
        const selected = el.querySelector("[aria-selected=true]").getBoundingClientRect();
        return {
          oneRow: new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1,
          visible: selected.left >= box.left - 1 && selected.right <= box.right + 1,
          inWindow: box.right <= window.innerWidth + 1,
        };
      });
      expect(state).toEqual({ oneRow: true, visible: true, inWindow: true });
    }
    // The Phase strip scrolls on its own below 1024px when its tabs are wider than the screen.
    if (width <= 390) expect(await phase.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

    // The top-ranks chips take at most two lines on a phone.
    const chipRows = await page.locator("#player-stats-panel span.badge-success").evaluateAll((chips) => new Set(chips.map((chip) => Math.round(chip.getBoundingClientRect().top))).size);
    if (width < 640) expect(chipRows).toBeLessThanOrEqual(2);

    // Every stat row: the label whole, and the bar and rank on a second line below 640px, on the same line from 640px.
    const rows = page.locator("#player-stats-panel li");
    expect(await rows.count()).toBeGreaterThan(30);
    const cut = await rows.evaluateAll((items) => items.map((li) => li.querySelector("span.truncate")).filter((label) => label.scrollWidth > label.clientWidth + 1).map((label) => label.textContent));
    expect(cut).toEqual([]);
    const layout = await rows.evaluateAll((items) => {
      const ranked = items.find((li) => li.querySelector("span.text-xs")?.textContent.includes("of "));
      const label = ranked.querySelector("span.truncate").getBoundingClientRect();
      const rank = ranked.querySelector("span.text-xs").getBoundingClientRect();
      return rank.top >= label.bottom - 1 ? "second line" : "same line";
    });
    expect(layout).toBe(width < 640 ? "second line" : "same line");
    expect(await holdsContent(page.locator("#player-stats-panel section.panel, #player-stats-panel .panel"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });

  // Arrow keys move between the phase tabs.
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await phase.getByRole("tab").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(phase.getByRole("tab").nth(1)).toBeFocused();

  // A tip stays inside the window when a label with one is hovered.
  const tipped = page.locator("#player-stats-panel li [tabindex='0']").first();
  await tipped.scrollIntoViewIfNeeded();
  await tipped.hover();
  const bubble = page.getByRole("tooltip");
  await expect(bubble).toBeVisible();
  const box = await bubble.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
});

test("the not-ranked notice, the loading ranks, the empty state and the error fit a phone", async ({ page }) => {
  test.setTimeout(120_000);
  const { href } = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // A player under the league's minimum games: the notice, and "too few games" on the ranked rows.
  await page.route(STATS, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    for (const entry of json.players ?? []) {
      entry.qualified = false;
      entry.isCalculated = true;
      entry.minGames = 10;
    }
    await route.fulfill({ response, json });
  });
  await openStatistics(page, href);
  await expect(page.getByText("Not ranked per game:")).toBeVisible();
  expect(await holdsContent(page.locator("#player-stats-panel .panel"))).toBe(true);
  await expectNoSidewaysScroll(page);
  await page.unroute(STATS);

  // No statistics in the phase.
  await page.route(STATS, (route) => route.fulfill({ json: { players: [], pagination: { hasMore: false } } }));
  await openStatistics(page, href).catch(() => {});
  await expect(page.getByText(/No season statistics in this phase/)).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);
  await page.unroute(STATS);

  // A failing request.
  await page.route(STATS, (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.goto(href);
  await page.getByRole("tab", { name: "Statistics" }).click();
  await expect(page.getByText("Could not load season statistics.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
