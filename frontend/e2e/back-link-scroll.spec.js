import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The back link on a team, player or game page goes back one step when the page before is its list, so the list is as it was left
// (the browser restores the scroll on Back); from a direct address it stays an ordinary link.
const SECTIONS = [
  { name: "a team", list: "teams", link: "main ul > li > a", detail: /\/teams\/[^/]+$/, back: "Teams" },
  { name: "a player", list: "players", link: 'main a[href*="/players/"]', detail: /\/players\/[^/]+$/, back: "Players" },
  { name: "a game", list: "games", link: '.fixture-card[href*="/games/"]', detail: /\/games\/[^/]+$/, back: "Games" },
];

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
const backLink = (page, section) => page.getByRole("link", { name: `Back to ${section.back}`, exact: true });

// Scrolls the list down and opens its last item, without the click itself moving the page. Returns where the list was left.
async function openLastFromScrolledList(page, section) {
  const links = page.locator(section.link);
  await expect(links.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const count = await links.count();
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, 400));
      return scrollY(page);
    })
    .toBeGreaterThan(20);
  const left = await scrollY(page);
  const href = await links.nth(count - 1).getAttribute("href");
  await links.nth(count - 1).evaluate((el) => el.click());
  await expect(page).toHaveURL(section.detail);
  return { left, href };
}

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    for (const section of SECTIONS) {
      test(`the back link of ${section.name} returns to the list where it was left, and Forward returns to the page`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        const slug = await seasonSlug(page);
        await page.goto(`/${slug}/${section.list}`);

        const { left } = await openLastFromScrolledList(page, section);
        const detailUrl = page.url();
        const link = backLink(page, section);
        await expect(link).toBeVisible({ timeout: 30_000 });
        // At 390px the link is the sticky bar's, from 640px the one above the page header.
        expect(await link.evaluate((el) => Boolean(el.closest(".app-nav")))).toBe(width < 640);
        await link.click();
        await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${section.list}`));
        await expect.poll(() => scrollY(page)).toBeGreaterThan(left - 6);
        expect(await scrollY(page)).toBeLessThan(left + 6);

        // It was a step back, not a new entry: Forward leads to the page again.
        await page.goForward();
        await expect(page).toHaveURL(detailUrl);
      });
    }
  });
}

test("from a direct address the back link opens the list as a link, and Back returns to the page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/teams`);
  const href = await page.locator(SECTIONS[0].link).first().getAttribute("href");

  await page.goto(href);
  const link = backLink(page, SECTIONS[0]);
  await expect(link).toBeVisible({ timeout: 30_000 });
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/teams$`));
  // A new entry was opened (it starts at the top), so Back leads to the page.
  await expect.poll(() => scrollY(page)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(href);
});

test("a click that asks for a new tab is left to the browser", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/teams`);
  await openLastFromScrolledList(page, SECTIONS[0]);
  const link = backLink(page, SECTIONS[0]);
  await expect(link).toBeVisible({ timeout: 30_000 });
  const url = page.url();
  // A ctrl-click is not taken over (the link's own handling is not cancelled), so the page stays where it is.
  const cancelled = await link.evaluate((el) => !el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true, button: 0 })));
  expect(cancelled).toBe(false);
  expect(page.url()).toBe(url);
});
