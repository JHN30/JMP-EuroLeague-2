import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The phone menu (below 640px): its list, its animation, its footer, and the logo link to Home.
const SECTIONS = ["Home", "Overview", "Standings", "Games", "Teams", "Players", "Leaders", "Compare", "Postseason"];

const menuButton = (page) => page.getByRole("button", { name: "Menu" });
const panel = (page) => page.locator("#site-menu");
const logo = (page) => page.locator("header a[aria-label='Home']");
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// The panel's opacity on every animation frame for a while after the click, to see it fade in.
async function opacityWhileOpening(page) {
  await page.evaluate(() => {
    window.__samples = [];
    const start = performance.now();
    const tick = () => {
      const el = document.getElementById("site-menu");
      if (el) window.__samples.push(Number(getComputedStyle(el).opacity));
      if (performance.now() - start < 700) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await menuButton(page).click();
  await page.waitForTimeout(750);
  return page.evaluate(() => window.__samples);
}

for (const width of [320, 390, 639]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test("the menu is a one-column list that fades and slides in, with a labelled footer", async ({ page }) => {
      await seasonSlug(page);
      const samples = await opacityWhileOpening(page);
      // It faded in: some frame was part-way, and it ended fully visible.
      expect(Math.min(...samples)).toBeLessThan(1);
      expect(samples.at(-1)).toBe(1);

      // Settled right under the 48px bar (its own border takes the last pixel).
      await expect.poll(() => panel(page).evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeGreaterThanOrEqual(47);
      expect(await panel(page).evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThanOrEqual(48);
      const links = page.getByRole("navigation", { name: "Sections" }).getByRole("link");
      await expect(links).toHaveText(SECTIONS);

      // One column: every row is as wide as the panel's list, one under the other, all settled in place.
      const geometry = await links.evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: Math.round(rect.left), width: Math.round(rect.width), top: rect.top, opacity: getComputedStyle(el.parentElement).opacity };
        }),
      );
      expect(new Set(geometry.map((row) => row.left)).size).toBe(1);
      expect(new Set(geometry.map((row) => row.width)).size).toBe(1);
      expect(geometry.every((row) => row.opacity === "1")).toBe(true);
      for (let i = 1; i < geometry.length; i++) expect(geometry[i].top).toBeGreaterThan(geometry[i - 1].top);

      // The current page is marked, by more than colour.
      const current = links.filter({ hasText: "Home" });
      await expect(current).toHaveAttribute("aria-current", "page");
      expect(await current.evaluate((el) => getComputedStyle(el, "::before").backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
      await expect(links.filter({ hasText: "Teams" })).not.toHaveAttribute("aria-current", "page");

      // The footer is labelled and holds the season picker and the theme switch.
      await expect(panel(page).getByText("Season", { exact: true })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Selected season" })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Switch to/ })).toBeVisible();
      await expectNoSidewaysScroll(page);
    });

    test("the icon becomes an X while open and the panel leaves with Escape or a tap outside", async ({ page }) => {
      await seasonSlug(page);
      const bars = menuButton(page).locator("line");
      const rotated = () => bars.first().evaluate((el) => getComputedStyle(el).transform !== "none");

      expect(await rotated()).toBe(false);
      await menuButton(page).click();
      await expect.poll(rotated).toBe(true);
      await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press("Escape");
      await expect(panel(page)).toHaveCount(0);
      await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
      await expect.poll(rotated).toBe(false);

      await menuButton(page).click();
      await expect(panel(page)).toBeVisible();
      await page.mouse.click(width / 2, HEIGHT - 20);
      await expect(panel(page)).toHaveCount(0);
    });

    test("the logo is a link to Home that also closes an open menu", async ({ page }) => {
      const season = await seasonSlug(page);
      await expect(logo(page)).toHaveAttribute("href", `/${season}/home`);

      await page.goto(`/${season}/teams`);
      await expect(page.getByTestId("page-name")).toHaveText("Teams");
      await logo(page).click();
      await expect(page).toHaveURL(new RegExp(`/${season}/home$`));
      await expect(page.getByTestId("page-name")).toHaveText("Home");

      // On Home already, the logo still closes the menu.
      await menuButton(page).click();
      await expect(panel(page)).toBeVisible();
      await logo(page).click();
      await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
      await expect(panel(page)).toHaveCount(0);
    });

    test("with reduced motion the menu appears at once", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await seasonSlug(page);
      const samples = await opacityWhileOpening(page);
      // No frame was part-way: it is either not there yet or fully visible.
      expect(samples.filter((value) => value > 0 && value < 1)).toEqual([]);
      expect(samples.at(-1)).toBe(1);
      const links = page.getByRole("navigation", { name: "Sections" }).getByRole("link");
      expect(await links.last().evaluate((el) => getComputedStyle(el.parentElement).transform)).toBe("none");
    });
  });
}

test("from 640px the logo and the wordmark are one link to Home", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: HEIGHT });
  const season = await seasonSlug(page);
  await page.goto(`/${season}/standings`);
  await expect(logo(page)).toContainText("EuroLeague");
  await logo(page).click();
  await expect(page).toHaveURL(new RegExp(`/${season}/home$`));
});
