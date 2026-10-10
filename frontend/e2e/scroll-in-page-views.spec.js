import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// Pages that swap one view for another on one path (Leaders' cards and boards, Postseason's matchup detail) bring the new view into
// sight themselves: the app's ScrollToTop only runs when the path changes.
const WIDTHS = [390, 1280];
const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
const categoryButtons = (page) => page.locator("main button.btn-ghost.justify-between");

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    for (const [name, query] of [
      ["players", ""],
      ["teams", "?scope=teams"],
      ["advanced", "?scope=advanced"],
    ]) {
      test(`Leaders ${name}: opening a category and going back start at the top`, async ({ page }) => {
        test.setTimeout(90_000);
        const slug = await seasonSlug(page);
        await page.goto(`/${slug}/leaders${query}`);
        const buttons = categoryButtons(page);
        await expect(buttons.first()).toBeVisible({ timeout: 30_000 });
        // Twice: the second time the board is cached and as tall as the landing, so the browser would not move the page by itself.
        for (let round = 0; round < 2; round += 1) {
          const last = buttons.nth((await buttons.count()) - 1);
          await last.scrollIntoViewIfNeeded();
          expect(await scrollY(page)).toBeGreaterThan(0);
          await last.click();
          await expect.poll(() => scrollY(page)).toBe(0);
          await page.evaluate(() => window.scrollTo(0, 500));
          await page.getByRole("button", { name: /All categories/ }).click();
          await expect.poll(() => scrollY(page)).toBe(0);
        }
      });
    }

    for (const [name, query] of [
      ["players", ""],
      ["advanced", "?scope=advanced"],
    ]) {
      test(`Leaders ${name} board: Next and Previous page bring the top of the list into view`, async ({ page }) => {
        test.setTimeout(90_000);
        const slug = await seasonSlug(page);
        await page.goto(`/${slug}/leaders${query}`);
        const buttons = categoryButtons(page);
        await expect(buttons.first()).toBeVisible({ timeout: 30_000 });
        await buttons.last().click();
        const list = page.locator("main .scroll-mt-28").first();
        await expect(list).toBeVisible({ timeout: 30_000 });
        for (const label of ["Next page", "Previous page"]) {
          const button = page.getByRole("button", { name: label });
          await button.scrollIntoViewIfNeeded();
          await button.click();
          // The list's top is under the sticky bar, not scrolled past it and not left below the fold.
          await expect
            .poll(async () => {
              const top = await list.evaluate((el) => Math.round(el.getBoundingClientRect().top));
              return top >= 0 && top < HEIGHT / 2;
            })
            .toBe(true);
        }
      });
    }

    test("Postseason: picking a matchup leaves its detail inside the window", async ({ page }) => {
      test.setTimeout(90_000);
      // A finished season has every matchup.
      await page.goto("/2025/postseason");
      const slots = page.locator("main button[aria-label*=' v ']");
      await expect(slots.first()).toBeVisible({ timeout: 30_000 });
      const count = await slots.count();
      for (const index of [0, Math.floor(count / 2), count - 1]) {
        await slots.nth(index).scrollIntoViewIfNeeded();
        await slots.nth(index).click();
        const detail = page.locator("main .scroll-mt-28").first();
        await expect
          .poll(async () => {
            const box = await detail.boundingBox();
            const top = await detail.evaluate((el) => el.getBoundingClientRect().top);
            const bottom = await detail.evaluate((el) => el.getBoundingClientRect().bottom);
            return box !== null && top >= 0 && (bottom <= HEIGHT + 1 || top <= 1);
          })
          .toBe(true);
      }
    });
  });
}
