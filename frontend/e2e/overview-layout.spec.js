import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug, mockLayoutImages } from "./support/layout";

test.beforeEach(async ({ page }) => { await mockLayoutImages(page); });

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
    await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 15_000 });
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
    test(`${season ?? "live season"}: crest and TV code below 1024px, short names from it, nothing cut`, async ({ page }) => {
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
          if (width < 1024) expect(card.names.length === 2 && card.names.every((name) => name.length > 0 && name.length <= 5)).toBe(true);
          else expect(card.names.every((name) => name.length > 0 && name.length <= 20)).toBe(true);
        }
        expect(new Set(shape.map((card) => card.left)).size).toBe(width < 640 ? 1 : 2);

        // The link still names both clubs for a screen reader, though only the TV code is drawn below 1024px.
        const [first, second] = shape[0].fullNames;
        await expect(cards.first()).toHaveAccessibleName(new RegExp(`${escapeRegExp(first)}.*${escapeRegExp(second)}`));
      });
    });
  }

  // 2004-05 has games with three-digit scores, which make the score badge wide: the club codes must stay on one line inside the card.
  test("2004: a three-digit score does not wrap or push out a club code on a phone", async ({ page }) => {
    await openOverview(page, "2004");
    const cards = panel(page, "Defining games").getByRole("link");
    await expect(cards).toHaveCount(4);

    await atWidths(page, [320, 390], async () => {
      const shape = await cards.evaluateAll((els) =>
        els.map((card) => {
          const right = card.getBoundingClientRect().right;
          const codes = [...card.querySelectorAll('span[aria-hidden="true"]')].filter((el) => el.offsetParent !== null);
          return {
            wrapped: codes.filter((el) => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.5).map((el) => el.textContent),
            outside: [...card.querySelectorAll("*")].filter((el) => el.offsetWidth > 0 && el.getBoundingClientRect().right > right + 1).length,
          };
        }),
      );
      for (const card of shape) {
        expect(card.wrapped).toEqual([]);
        expect(card.outside).toBe(0);
      }
    });
  });

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
    test(`${season ?? "live season"}: two by two below 640px, with nothing to scroll sideways`, async ({ page }) => {
      await openOverview(page, season, { summary: false });
      const rows = page.getByRole("group", { name: /leaders$/ });
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      await atWidths(page, [320, 390], async () => {
        for (let index = 0; index < count; index += 1) {
          const row = rows.nth(index);
          await expect(row).not.toHaveAttribute("tabindex", /.*/);
          const layout = await row.evaluate((el) => ({
            overflow: el.scrollWidth - el.clientWidth,
            lefts: new Set([...el.children].map((card) => Math.round(card.getBoundingClientRect().left))).size,
            tops: new Set([...el.children].map((card) => Math.round(card.getBoundingClientRect().top))).size,
          }));
          expect(layout.overflow).toBeLessThanOrEqual(0);
          expect(layout.lefts).toBe(2);
          expect(layout.tops).toBe(3);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      });
    });

    test(`${season ?? "live season"}: two columns, three from 1024px and six from 1536px, with no snapping and no tab stop`, async ({ page }) => {
      await openOverview(page, season, { summary: false });
      const row = page.getByRole("group", { name: /leaders$/ }).first();

      await atWidths(page, [640, 768, 1023, 1024, 1280, 1535, 1536], async (width) => {
        await expect(row).toHaveCSS("scroll-snap-type", "none");
        await expect(row).not.toHaveAttribute("tabindex", /.*/);
        const lefts = await row.evaluate((el) => [...el.children].map((card) => Math.round(card.getBoundingClientRect().left)));
        expect(new Set(lefts).size).toBe(width >= 1536 ? 6 : width >= 1024 ? 3 : 2);
      });
    });
  }

  test("names are not cut mid-word", async ({ page }) => {
    await openOverview(page, FINISHED, { summary: false });
    const names = page.getByRole("group", { name: /leaders$/ }).locator(".name, .club");

    await atWidths(page, [320, 390, 639, 640, 768, 1024, 1280, 1536, 1920], async () => {
      expect(await findBrokenWords(names)).toEqual([]);
    });
  });
});

test("the road to the title sits in one row from 1024px and one step per line below it", async ({ page }) => {
  await openOverview(page, FINISHED);
  const steps = panel(page, "Road to the title").locator("p.font-medium");
  await expect(steps).toHaveCount(3);

  await atWidths(page, [390, 1024, 1280], async (width) => {
    const tops = await steps.evaluateAll((els) => new Set(els.map((el) => Math.round(el.parentElement.parentElement.getBoundingClientRect().top))).size);
    expect(tops).toBe(width >= 1024 ? 1 : 3);
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

// An older season has no player photos: a leader card shows a silhouette in the photo's place, so it keeps its shape.
test("2004: a leaders card without a photo shows a silhouette in its place", async ({ page }) => {
  await openOverview(page, "2004", { summary: false });
  const row = page.getByRole("group", { name: /leaders$/ }).first();
  await expect(row.locator("img.kpi-chip-image, [data-testid=leader-photo-placeholder]")).toHaveCount(6);
  await expect(row.locator("[data-testid=leader-photo-placeholder]").first()).toBeVisible();
});

test("the leader card opens the leader's page and the scoring card the club with the most points per game", async ({ page }) => {
  // The page's own league team totals, so the test ranks the same phase the card does.
  const teamStats = page.waitForResponse((response) => /\/seasons\/[^/]+\/team-stats\?/.test(response.url()) && response.ok());
  await openOverview(page);
  const hero = page.getByTestId("season-hero-kpis");
  test.skip((await hero.count()) === 0, "the default season is finished, so there are no hero cards");
  const chips = hero.locator(".kpi-chip");
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(1).locator(".label")).toHaveText("Most points per game");

  let top = null;
  for (const team of (await (await teamStats).json()).teams) {
    const pointsPerGame = Number(team.own?.points) / Number(team.gamesPlayed);
    if (Number(team.gamesPlayed) && Number.isFinite(pointsPerGame) && (top === null || pointsPerGame > top.pointsPerGame)) top = { team, pointsPerGame };
  }
  expect(top).not.toBeNull();

  const hrefs = await chips.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(hrefs[0]).toMatch(/\/teams\/[^/]+$/);
  expect(hrefs[1]).toMatch(new RegExp(`/teams/${escapeRegExp(top.team.clubCode)}$`));
  await expect(chips.nth(1).locator(".value")).toHaveText(top.pointsPerGame.toFixed(1));
});
