import { test, expect } from "@playwright/test";
import { HEIGHT, expectSwipeRowAtRest, expectSwipeRowSettles, findBrokenWords, seasonSlug } from "./support/layout";

// The live season shows the hero cards; a finished season (2025) shows the Road to the title and a second leaders group.
const FINISHED = "2025";

// The overview is the heaviest page in the app, so each test loads it once and resizes the window through the widths it
// checks: the layout depends on the viewport only, and a resize re-runs the media queries without a reload.
async function openOverview(page, season, { summary = true } = {}) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/overview`);
  // The summary panels wait for every played game to be paged in, which is slow under parallel workers; the leaders panel
  // loads on its own, so the tests that only look at it do not wait for the summary.
  if (summary) {
    await expect(page.getByRole("heading", { name: "Defining games" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".loading")).toHaveCount(0, { timeout: 15_000 });
  } else {
    await expect(page.getByRole("group", { name: /leaders$/ }).first().getByRole("link")).toHaveCount(6, { timeout: 15_000 });
  }
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const panel = (page, title) => page.locator(".panel", { has: page.getByRole("heading", { name: title }) });
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("hero cards sit side by side, compact below 640px", async ({ page }) => {
  await openOverview(page);
  const hero = page.getByTestId("season-hero-kpis");
  test.skip((await hero.count()) === 0, "the default season is finished, so there are no hero cards");

  await atWidths(page, [320, 390, 639, 640, 768, 1280], async (width) => {
    const boxes = await hero.locator(".kpi-chip").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(new Set(boxes.map((box) => Math.round(box.left))).size).toBe(2);
    expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
    expect(await findBrokenWords(hero.locator(".name"))).toEqual([]);

    const crestHeight = () => hero.locator(".kpi-chip-image").first().evaluate((el) => el.getBoundingClientRect().height);
    if (width < 640) expect(await crestHeight()).toBeLessThan(60);
    else expect(await crestHeight()).toBeGreaterThan(100);
  });
});

test.describe("defining games", () => {
  for (const season of [undefined, FINISHED]) {
    test(`${season ?? "live season"}: crests below 1024px and short names from it, nothing cut`, async ({ page }) => {
      await openOverview(page, season);
      const cards = panel(page, "Defining games").getByRole("link");
      await expect(cards).toHaveCount(4);

      await atWidths(page, [320, 390, 639, 640, 768, 1023, 1024, 1280], async (width) => {
        const shape = await cards.evaluateAll((els) =>
          els.map((card) => {
            const visible = (el) => el.offsetParent !== null;
            return {
              crests: [...card.querySelectorAll("img")].filter(visible).length,
              names: [...card.querySelectorAll('span[aria-hidden="true"]')].filter(visible).map((el) => el.textContent.trim()),
              fullNames: [...card.querySelectorAll(".sr-only")].map((el) => el.textContent.trim()),
              cut: [...card.querySelectorAll("span:not(.sr-only)")].filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 1).length,
              left: Math.round(card.getBoundingClientRect().left),
            };
          }),
        );
        for (const card of shape) {
          expect(card.crests).toBe(2);
          expect(card.cut).toBe(0);
          if (width < 1024) expect(card.names).toEqual([]);
          else expect(card.names.every((name) => name.length > 0 && name.length <= 20)).toBe(true);
        }
        expect(new Set(shape.map((card) => card.left)).size).toBe(width < 640 ? 1 : 2);

        // The link still names both clubs for a screen reader, though no name is drawn below 1024px.
        const [first, second] = shape[0].fullNames;
        await expect(cards.first()).toHaveAccessibleName(new RegExp(`${escapeRegExp(first)}.*${escapeRegExp(second)}`));
      });
    });
  }

  test("show a short name where a crest cannot load, once", async ({ page }) => {
    await page.route("**/*", (route) => (route.request().resourceType() === "image" ? route.abort() : route.continue()));
    await openOverview(page);
    const cards = panel(page, "Defining games").getByRole("link");

    await atWidths(page, [320, 1280], async () => {
      const names = await cards.evaluateAll((els) =>
        els.map((card) => [...card.querySelectorAll('span[aria-hidden="true"]')].filter((el) => el.offsetParent !== null).map((el) => el.textContent.trim())),
      );
      for (const card of names) {
        expect(card).toHaveLength(2);
        expect(card.every((name) => name.length > 0)).toBe(true);
      }
    });
  });
});

test.describe("statistical leaders", () => {
  for (const season of [undefined, FINISHED]) {
    test(`${season ?? "live season"}: swipe rows below 640px`, async ({ page }) => {
      await openOverview(page, season, { summary: false });
      const rows = page.getByRole("group", { name: /leaders$/ });
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      await atWidths(page, [320, 390], async () => {
        for (let index = 0; index < count; index += 1) {
          await rows.nth(index).scrollIntoViewIfNeeded();
          await expectSwipeRowAtRest(rows.nth(index));
          await expectSwipeRowSettles(page, rows.nth(index));
        }
      });
    });

    test(`${season ?? "live season"}: two columns, then three from 1280px, with no snapping and no tab stop`, async ({ page }) => {
      await openOverview(page, season, { summary: false });
      const row = page.getByRole("group", { name: /leaders$/ }).first();

      await atWidths(page, [640, 768, 1024, 1280], async (width) => {
        await expect(row).toHaveCSS("scroll-snap-type", "none");
        await expect(row).not.toHaveAttribute("tabindex", /.*/);
        const lefts = await row.evaluate((el) => [...el.children].map((card) => Math.round(card.getBoundingClientRect().left)));
        expect(new Set(lefts).size).toBe(width >= 1280 ? 3 : 2);
      });
    });
  }

  test("names are not cut mid-word", async ({ page }) => {
    await openOverview(page, FINISHED, { summary: false });
    const names = page.getByRole("group", { name: /leaders$/ }).locator(".name, .club");

    await atWidths(page, [320, 390, 639, 640, 768, 1024, 1280], async () => {
      expect(await findBrokenWords(names)).toEqual([]);
    });
  });
});

test("the road to the title shows every opponent in full", async ({ page }) => {
  await openOverview(page, FINISHED);
  const lines = panel(page, "Road to the title").locator("p.font-medium");
  await expect(lines).toHaveCount(3);

  await atWidths(page, [320, 390, 1280], async () => {
    const cut = await lines.evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    expect(cut).toBe(0);
  });
});

for (const season of [undefined, FINISHED]) {
  test(`${season ?? "live season"}: the scoring chart is summed up by its highest, lowest and latest round`, async ({ page }) => {
    await openOverview(page, season);
    const items = panel(page, "Scoring through the season").locator("dl > div");
    await expect(items).toHaveCount(3);

    await atWidths(page, [320, 390, 1280], async () => {
      const figures = await items.evaluateAll((els) =>
        els.map((el) => ({
          label: el.querySelector("dt").textContent.trim(),
          value: Number(el.querySelector("dd").textContent),
          round: el.querySelectorAll("dd")[1].textContent.trim(),
          cut: [...el.querySelectorAll("dt, dd")].filter((node) => node.scrollWidth > node.clientWidth + 1).length,
        })),
      );
      expect(figures.map((figure) => figure.label)).toEqual(["Highest", "Lowest", "Latest"]);
      for (const figure of figures) {
        expect(figure.round).toMatch(/^(Round \d+|(Regular Season|Play-In|Playoffs|Final Four)( · round \d+)?)$/);
        expect(figure.cut).toBe(0);
      }
      if (season === FINISHED) {
        // Rounds are numbered on into the postseason; the chart names those points by phase, never "Round 45".
        expect(figures[2].round).toMatch(/^Final Four/);
        for (const figure of figures) expect(figure.round).not.toMatch(/^Round (3[5-9]|[4-9]\d)$/);
      }
      const [highest, lowest, latest] = figures.map((figure) => figure.value);
      expect(highest).toBeGreaterThanOrEqual(latest);
      expect(latest).toBeGreaterThanOrEqual(lowest);
    });
  });
}
