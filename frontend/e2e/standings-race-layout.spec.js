import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// The finished season has the longest race (the whole regular season); the live season is the one in progress.
const FINISHED = "2025";

// Each test loads the Race tab once and resizes the window through its widths: the layout depends on the viewport only.
async function openRace(page, season) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Race" }).click();
  await expect(page.getByRole("slider", { name: "Round shown in the race" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main svg[role=img]").first()).toBeVisible({ timeout: 30_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const snapshotTable = (page) => page.locator("main table").filter({ hasText: "W-L" }).first();
const chartBox = (page) => page.getByRole("region", { name: /^Standings race chart/ });

// The name a club link shows right now, and its full name.
const shownNames = (links) =>
  links.evaluateAll((els) =>
    els.map((a) => ({
      shown: [...a.querySelectorAll("span")].find((el) => el.getBoundingClientRect().width > 0)?.textContent.trim(),
      full: a.getAttribute("aria-label") ?? a.textContent.trim(),
    })),
  );

// Words of a shown name that the browser had to cut across two lines (a multi-word name may wrap at its spaces).
const splitWords = (links) =>
  links.evaluateAll((els) => {
    const split = [];
    for (const a of els) {
      const span = [...a.querySelectorAll("span")].find((el) => el.getBoundingClientRect().width > 0);
      const node = span?.firstChild;
      if (!node) continue;
      let index = 0;
      for (const word of node.textContent.split(/(\s+)/)) {
        if (word.trim()) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + word.length);
          if (range.getClientRects().length > 1) split.push(word);
        }
        index += word.length;
      }
    }
    return split;
  });

for (const season of [undefined, FINISHED]) {
  test(`${season ? "finished" : "live"} season: the snapshot table fits its box, with short names where the box is narrow`, async ({ page }) => {
    await openRace(page, season);
    const links = snapshotTable(page).locator("tbody tr td:nth-child(2) a");

    await atWidths(page, [320, 390, 1024], async () => {
      await page.waitForTimeout(300);
      const box = await snapshotTable(page).evaluate((table) => ({ table: table.getBoundingClientRect().width, room: table.parentElement.clientWidth }));
      expect(box.table).toBeLessThanOrEqual(box.room + 1);
      expect(await splitWords(links)).toEqual([]);
      // The teams list arrives after the table: short names then differ from the full names.
      await expect.poll(async () => (await shownNames(links)).filter((entry) => entry.shown !== entry.full).length).toBeGreaterThan(0);
      for (const entry of await shownNames(links)) expect(entry.shown.length).toBeLessThanOrEqual(entry.full.length);
    });

    // From sm up to lg, and from xl, the box is wide and the full names show.
    await atWidths(page, [768, 1280], async () => {
      for (const entry of await shownNames(links)) expect(entry.shown).toBe(entry.full);
    });
  });
}

test("the race chart scrolls inside its own box on a phone, keeps the round shown in view, and is as wide as its box from 640px", async ({ page }) => {
  await openRace(page, FINISHED);
  const slider = page.getByRole("slider", { name: "Round shown in the race" });
  const hint = page.getByText("Turn your phone sideways for a wider chart.");
  const metrics = () =>
    chartBox(page).evaluate((box) => {
      const svg = box.querySelector("svg");
      return { client: box.clientWidth, scroll: box.scrollWidth, left: Math.round(box.scrollLeft), height: Math.round(svg.getBoundingClientRect().height) };
    });

  await atWidths(page, [320, 390], async () => {
    await expect(chartBox(page)).toBeVisible();
    const rest = await metrics();
    expect(rest.scroll).toBeGreaterThan(rest.client);
    expect(rest.height).toBeLessThan(700);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    await expect(hint).toBeVisible();

    // The first round is at the left and the last at the right: the box follows the slider.
    await slider.fill("1");
    await expect.poll(async () => (await metrics()).left).toBe(0);
    await slider.fill(await slider.getAttribute("max"));
    await expect.poll(async () => (await metrics()).left).toBeGreaterThan(rest.scroll - rest.client - 40);

    // A club can still be focused from the select.
    await page.getByRole("combobox", { name: "Team focus" }).selectOption({ index: 1 });
    await page.getByRole("combobox", { name: "Team focus" }).selectOption({ index: 0 });
  });

  // Held sideways the phone is still below 640px: the chart still scrolls, but the hint goes.
  await page.setViewportSize({ width: 600, height: 320 });
  await expect(chartBox(page)).toBeVisible();
  await expect(hint).toBeHidden();

  await atWidths(page, [768, 1024, 1280], async () => {
    await expect(chartBox(page)).toHaveCount(0);
    await expect(hint).toBeHidden();
    const sizes = await page
      .locator("main svg[role=img]")
      .first()
      .evaluate((svg) => ({ svg: svg.getBoundingClientRect().width, box: svg.parentElement.clientWidth, height: svg.getBoundingClientRect().height }));
    expect(sizes.svg).toBeLessThanOrEqual(sizes.box + 1);
    expect(sizes.height).toBeGreaterThan(900);
  });
});

test("the cards, legend and playback controls stay inside the screen on a phone", async ({ page }) => {
  await openRace(page, FINISHED);
  await atWidths(page, [320, 390], async (width) => {
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    for (const locator of [
      page.getByRole("slider", { name: "Round shown in the race" }),
      page.getByRole("combobox", { name: "Team focus" }),
      page.getByText("Direct to playoffs (1-6)"),
    ]) {
      const box = await locator.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  });
});

test("the race table still shows full names, and no error, when the teams list cannot load", async ({ page }) => {
  await page.route(/\/api\/seasons\/[^/]+\/teams(\?.*)?$/, (route) => route.abort());
  await openRace(page);
  await atWidths(page, [320], async () => {
    const names = await snapshotTable(page)
      .locator("tbody tr td:nth-child(2) a")
      .evaluateAll((els) => els.slice(0, 3).map((a) => a.textContent.trim()));
    for (const name of names) expect(name.length).toBeGreaterThan(8);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test("each insight card shows its club's crest, on a phone and on a desktop", async ({ page }) => {
  await openRace(page, FINISHED);
  await atWidths(page, [390, 1280], async () => {
    const cards = page.locator("main .grid.grid-cols-2").first().locator("> a");
    await expect(cards).toHaveCount(4);
    for (let index = 0; index < 4; index++) {
      const crest = cards.nth(index).locator("img");
      await expect(crest).toBeVisible();
      expect(await crest.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
  });
});
