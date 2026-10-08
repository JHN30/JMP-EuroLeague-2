import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Teams directory at every width. Each test loads the page once and resizes the window: the layout depends on the viewport only.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
// Cards per row: two on a phone and a tablet, three from lg.
const perRowAt = (width) => (width >= 1024 ? 3 : 2);

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  return { slug, teams };
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const cards = (page) => page.locator("main ul > li > a");
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each card sits inside its box.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);
const shown = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));

test("the directory is two cards per row on a phone and a tablet and three from 1024px, with the abbreviated name below 640px", async ({ page }) => {
  const { slug, teams } = await liveSeason(page);
  await page.goto(`/${slug}/teams`);
  await expect(cards(page).first()).toBeVisible({ timeout: 30_000 });
  await expect(cards(page)).toHaveCount(teams.length);
  const abbreviated = new Set(teams.map((team) => team.abbreviatedName ?? team.name));
  const names = new Set(teams.map((team) => team.name));

  await atWidths(page, WIDTHS, async (width) => {
    expect(await columns(cards(page))).toBe(perRowAt(width));
    expect(await holdsContent(cards(page))).toBe(true);
    // The crest keeps its size.
    const crests = await page.locator("main ul img").evaluateAll((imgs) => imgs.map((img) => img.offsetWidth));
    expect(crests.length).toBeGreaterThan(10);
    for (const size of crests) expect(size).toBe(40);

    const label = width < 640 ? cards(page).locator("span[aria-hidden=true]") : cards(page).locator(".relative > span:not([aria-hidden=true])");
    const texts = await shown(label);
    expect(texts.length).toBe(teams.length);
    for (const text of texts) expect((width < 640 ? abbreviated : names).has(text), text).toBe(true);
    // On a phone the crest and the label are centred in their card.
    if (width < 640) {
      const centred = await cards(page).first().evaluate((card) => {
        const middle = (el) => el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2;
        return [card.querySelector("span.flex-none"), card.querySelector("p.font-semibold")].map((el) => Math.abs(middle(el) - middle(card)));
      });
      for (const offset of centred) expect(offset).toBeLessThan(3);
    }
    // The link is named by the full club name at every width.
    await expect(cards(page).first()).toHaveAccessibleName(new RegExp(teams[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expectNoSidewaysScroll(page);
  });
});

function mockTeams(page, teams) {
  return page.route("**/api/seasons/*/teams", (route) => route.fulfill({ json: { teams } }));
}

const team = (clubCode, overrides = {}) => ({ clubCode, name: `Club ${clubCode}`, abbreviatedName: `Club ${clubCode}`, tvCode: clubCode, countryCode: "GRE", crestUrl: null, ...overrides });

test("a club without a crest, with a failing crest or with a long name keeps its card tidy", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await mockTeams(page, [
    team("AAA", { crestUrl: "http://localhost:9/missing.png" }),
    team("BBB"),
    team("CCC", { name: "Kosner Baskonia Vitoria-Gasteiz", abbreviatedName: "Baskonia", tvCode: "KBA" }),
    team("DDD", { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", tvCode: "CZV" }),
  ]);
  await page.goto(`/${slug}/teams`);
  await expect(cards(page)).toHaveCount(4);

  await atWidths(page, [320, 390, 640, 768, 1024], async () => {
    // Every card has the same crest slot, drawn or not, so the names line up.
    const slots = await page.locator("main ul > li > a > div > span.flex-none").evaluateAll((els) => els.map((el) => [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)]));
    expect(slots).toEqual([[40, 40], [40, 40], [40, 40], [40, 40]]);
    expect(await holdsContent(cards(page))).toBe(true);
    {
      // A long name takes at most two lines inside its card (below 640px it is the abbreviated name).
      const lines = await cards(page).nth(3).locator("p.font-semibold").evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
      expect(lines).toBeLessThanOrEqual(2);
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the error and empty states fit a phone", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.route("**/api/seasons/*/teams", (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.goto(`/${slug}/teams`);
  await expect(page.getByText("Could not load teams.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute("**/api/seasons/*/teams");
  await mockTeams(page, []);
  await page.reload();
  await expect(page.getByText("No teams available for this season.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});
