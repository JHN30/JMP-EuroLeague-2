import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Home Form chart (the league leader's point margin over the last games) and the leaders' names, read with the live data.
const API = "http://localhost:3000/api/seasons";

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  return { slug, codes: new Set(teams.map((team) => team.tvCode)) };
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const shown = (locator) =>
  locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));

const insideBox = (locator, box) =>
  locator.evaluateAll(
    (els, outer) => els.every((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left >= outer.left - 1 && rect.right <= outer.right + 1 && rect.top >= outer.top - 1 && rect.bottom <= outer.bottom + 1;
    }),
    box,
  );

test("the Form chart has a labelled scale, the opponent under each point and an average line that matches the headline", async ({ page }) => {
  const { slug, codes } = await liveSeason(page);
  await page.goto(`/${slug}/home`);
  const plot = page.getByTestId("leader-trend-plot");
  await expect(plot).toBeVisible({ timeout: 30_000 });
  const games = await plot.locator(".trend-xaxis span").count();
  expect(games).toBeGreaterThan(1);
  const headline = (await page.locator(".leader-trend-stat .value").textContent()).trim();

  await atWidths(page, [320, 390, 768, 1280], async (width) => {
    // The scale: its top and bottom, and the zero line between a win and a loss.
    const scale = await shown(plot.locator(".trend-yaxis span"));
    expect(scale.length).toBeGreaterThanOrEqual(2);
    expect(scale.every((text) => /^[+-]?\d+$/.test(text))).toBe(true);
    expect(scale).toContain("0");

    // One opponent TV code under each point, every other one on a phone.
    const opponents = await shown(plot.locator(".trend-xaxis span"));
    expect(opponents.length).toBe(width < 640 ? Math.ceil(games / 2) : games);
    for (const code of opponents) expect(codes.has(code), code).toBe(true);

    // The average label says what the headline says, and everything sits inside its box.
    await expect(plot.locator(".trend-average-label")).toHaveText(`Avg ${headline}`);
    const wellBox = await plot.locator(".chart-well").evaluate((el) => el.getBoundingClientRect().toJSON());
    expect(await insideBox(plot.locator(".trend-average-label"), wellBox)).toBe(true);
    const plotBox = await plot.evaluate((el) => el.getBoundingClientRect().toJSON());
    expect(await insideBox(plot.locator(".trend-yaxis span"), plotBox)).toBe(true);
    expect(await insideBox(plot.locator(".trend-xaxis span").locator("visible=true"), plotBox)).toBe(true);
    await expect(plot.locator("svg")).toHaveAttribute("aria-label", new RegExp(`averaging ${headline.replace("+", "\\+")}`));
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  await expect(page.locator(".leader-trend-caption")).toContainText("Above the solid line is a win, below it a loss");
});

test("the leader names on Home and on the Season overview have no comma", async ({ page }) => {
  const { slug } = await liveSeason(page);
  for (const path of ["home", "overview"]) {
    await page.goto(`/${slug}/${path}`);
    const names = page.locator(".kpi-chip-link .name");
    await expect(names.first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => names.count()).toBeGreaterThan(2);
    const texts = await names.allTextContents();
    for (const text of texts) expect(text, `${path}: ${text}`).not.toContain(",");
  }
});
