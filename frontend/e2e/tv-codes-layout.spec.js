import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi, shot } from "./support/game-fixtures";
import { HEIGHT, seasonSlug } from "./support/layout";

// Feature 32b: on a phone the finished pages name a club by its TV code where the full name does not fit, and from 640px they
// show the label they always had. The pages are read with the live data; the expected codes come from the API (feature 32a).
const API = "http://localhost:3000/api/seasons";

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  return {
    slug,
    codes: new Set(teams.map((team) => team.tvCode)),
    abbreviated: new Set(teams.map((team) => team.abbreviatedName ?? team.name)),
    teams,
  };
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const texts = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));

// A hidden label never widens the page: the document is not wider than the window.
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

test("the Games list names clubs by TV code below 640px and by abbreviated name from 640px", async ({ page }) => {
  const { slug, codes, abbreviated } = await liveSeason(page);
  await page.goto(`/${slug}/games`);
  const names = page.locator(".fixture-team-name");
  await expect(names.first()).toBeVisible({ timeout: 30_000 });

  await atWidths(page, [320, 390, 639], async () => {
    const shown = await texts(names.locator("span[aria-hidden=true]"));
    expect(shown.length).toBeGreaterThan(4);
    for (const text of shown) expect(codes.has(text), text).toBe(true);
    // The abbreviated name stays in the page for screen readers.
    const hidden = await names.first().locator(".relative > span:not([aria-hidden=true])").textContent();
    expect(abbreviated.has(hidden.trim()), hidden).toBe(true);
    await expectNoSidewaysScroll(page);
  });
  await atWidths(page, [640, 1024], async () => {
    const shown = await texts(names.locator(".relative > span:not([aria-hidden=true])"));
    expect(shown.length).toBeGreaterThan(4);
    for (const text of shown) expect(abbreviated.has(text), text).toBe(true);
  });
});

test("Home names clubs by TV code below 640px in the match cards and the league table", async ({ page }) => {
  const { slug, codes, abbreviated } = await liveSeason(page);
  await page.goto(`/${slug}/home`);
  const cards = page.locator(".match-card .game-team > span.flex-1");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  const table = page.locator("section", { has: page.getByRole("heading", { name: "League table" }) }).getByRole("listitem");
  await expect(table.first()).toBeVisible();

  await atWidths(page, [320, 390, 639], async () => {
    for (const text of await texts(cards.locator("span[aria-hidden=true]"))) expect(codes.has(text), text).toBe(true);
    const rows = await texts(table.locator("span[aria-hidden=true]"));
    expect(rows.length).toBeGreaterThan(10);
    for (const text of rows) expect(codes.has(text), text).toBe(true);
    await expectNoSidewaysScroll(page);
  });
  await atWidths(page, [640, 1024], async () => {
    for (const text of await texts(cards.locator(".relative > span:not([aria-hidden=true])"))) expect(abbreviated.has(text), text).toBe(true);
    await expect(table.locator("span[aria-hidden=true]").first()).toBeHidden();
  });
});

test("Standings names clubs by TV code below 640px, with the full name as the link's name", async ({ page }) => {
  const { slug, codes, teams } = await liveSeason(page);
  await page.goto(`/${slug}/standings`);
  const links = page.locator("table tbody a[href*='/teams/']");
  await expect(links.first()).toBeVisible({ timeout: 30_000 });

  await atWidths(page, [320, 390, 639], async () => {
    const shown = await texts(links.locator("span.sm\\:hidden"));
    expect(shown.length).toBeGreaterThan(10);
    for (const text of shown) expect(codes.has(text), text).toBe(true);
    await expectNoSidewaysScroll(page);
  });
  const names = new Set(teams.map((team) => team.name));
  expect(names.has(await links.first().getAttribute("aria-label"))).toBe(true);
  await atWidths(page, [768, 1024], async () => {
    for (const text of await texts(links.locator("span.hidden"))) expect(names.has(text) || text === "", text).toBe(true);
  });
});

test("a Season overview defining game shows each club's TV code beside its crest below 1024px", async ({ page }) => {
  const { slug, codes, abbreviated: abbreviatedNames } = await liveSeason(page);
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await page.goto(`/${slug}/overview`);
  const cards = page.locator("a.card", { has: page.getByText(/game$/i) });
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });

  await atWidths(page, [320, 390], async () => {
    const shown = await texts(cards.locator("span[aria-hidden=true].lg\\:hidden"));
    expect(shown.length).toBeGreaterThan(1);
    for (const text of shown) expect(codes.has(text), text).toBe(true);
    // The crest stays beside the code, at 24px, and everything sits inside its card.
    expect(await cards.first().locator("img").first().evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(24);
    expect(
      await cards.evaluateAll((all) =>
        all.every((card) => {
          const box = card.getBoundingClientRect();
          return [...card.querySelectorAll("*")].every((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
          });
        }),
      ),
    ).toBe(true);
    await expectNoSidewaysScroll(page);
  });
  await atWidths(page, [1024], async () => {
    for (const text of await texts(cards.locator("span[aria-hidden=true].hidden"))) expect(abbreviatedNames.has(text), text).toBe(true);
  });
});

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", tvCode: "PAO", crestUrl: crest };
const CZV = { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", tvCode: "CZV", crestUrl: crest };

async function openComparison(page, { localTeam, roadTeam }) {
  const rows = [shot(1, "A", "2FGM", 0, 50), shot(2, "B", "2FGA", 0, 50)];
  await mockGameApi(page, { shots: rows });
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({ json: { game: { gameCode: 1, played: true, phaseName: "Regular season", roundNumber: 1, scheduledAt: "2025-01-01T18:00:00Z", localTeam, roadTeam, localScore: 80, roadScore: 70 } } }),
  );
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await page.getByRole("tab", { name: "Shooting comparison", exact: true }).click();
  return page.locator(".panel .panel").filter({ has: page.getByText("eFG%", { exact: true }) });
}

test("Game detail names a club by its TV code below 640px and in full from 640px, and falls back without one", async ({ page }) => {
  const panels = await openComparison(page, { localTeam: PAN, roadTeam: CZV });
  await expect(panels).toHaveCount(2);
  await atWidths(page, [320, 390, 639], async () => {
    await expect(panels.nth(0).locator("span[aria-hidden=true]")).toHaveText("PAO");
    await expect(panels.nth(1).locator("span[aria-hidden=true]")).toHaveText("CZV");
    await expect(panels.nth(1).locator(".relative > span:not([aria-hidden=true])")).toHaveText(CZV.name);
    await expectNoSidewaysScroll(page);
  });
  await atWidths(page, [640, 1024], async () => {
    await expect(panels.nth(1).getByText(CZV.name, { exact: true })).toBeVisible();
    await expect(panels.nth(1).locator("span[aria-hidden=true]")).toBeHidden();
  });

  // A club with no TV code shows its abbreviated name, then its club code.
  const bare = await openComparison(page, { localTeam: { ...PAN, tvCode: undefined }, roadTeam: { ...CZV, tvCode: undefined, abbreviatedName: undefined } });
  await atWidths(page, [390], async () => {
    await expect(bare.nth(0).locator("span[aria-hidden=true]")).toHaveText("Panathinaikos");
  });
});
