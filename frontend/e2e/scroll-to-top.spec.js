import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// Opening a team, a player or a game from a list you have scrolled down starts at the top of the new page, on a first visit and on
// a repeat visit whose data is already cached (the case that used to keep the list's position).
const SECTIONS = [
  { name: "a team", list: "teams", link: "main ul > li > a", detail: /\/teams\/[^/]+$/, back: "Teams" },
  { name: "a player", list: "players", link: 'main a[href*="/players/"]', detail: /\/players\/[^/]+$/, back: "Players" },
  { name: "a game", list: "games", link: '.fixture-card[href*="/games/"]', detail: /\/games\/[^/]+$/, back: "Games" },
];

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));

// Records the window's scroll on every frame, and whether the new page is showing (a heading that is not the list's). From the frame the
// new page shows, it must be at the top: the position the list had must not survive on it, even for a moment.
function recordScroll(page) {
  return page.evaluate(() => {
    const listHeading = document.querySelector("h1")?.textContent;
    window.__frames = [];
    const tick = () => {
      const heading = document.querySelector("h1")?.textContent;
      window.__frames.push({ drawn: Boolean(heading) && heading !== listHeading, y: Math.round(window.scrollY) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const scrollsOfNewPage = (page) => page.evaluate(() => window.__frames.filter((frame) => frame.drawn).map((frame) => frame.y));

// Scrolls the list down as far as is sensible and clicks its last link (clicking scrolls it into view, so the list is well down).
async function scrollListAndOpenLast(page, section) {
  const links = page.locator(section.link);
  await expect(links.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const count = await links.count();
  expect(count).toBeGreaterThan(3);
  // (Asked again until it holds: the list may still be settling into its full height.)
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, 400));
      return scrollY(page);
    })
    .toBeGreaterThan(20);
  await recordScroll(page);
  await links.nth(count - 1).click();
  await expect(page).toHaveURL(section.detail);
}

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    for (const section of SECTIONS) {
      test(`opening ${section.name} from a scrolled list starts at the top, first visit and cached repeat visit`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        const slug = await seasonSlug(page);
        await page.goto(`/${slug}/${section.list}`);

        for (const visit of ["first", "repeat"]) {
          await scrollListAndOpenLast(page, section);
          const back = page.getByRole("link", { name: `Back to ${section.back}`, exact: true });
          await expect(back, `${visit} visit`).toBeVisible({ timeout: 30_000 });
          await page.waitForTimeout(500);
          const heights = await scrollsOfNewPage(page);
          expect(heights.length, `${visit} visit: the new page was drawn`).toBeGreaterThan(0);
          expect(Math.max(...heights), `${visit} visit: highest scroll of the new page`).toBe(0);
          await back.click();
          await expect(page).toHaveURL((url) => url.pathname.endsWith(`/${section.list}`));
        }
      });
    }
  });
}

test("a change of the query string alone keeps the page where it is", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/games`);
  await expect(page.locator(".fixture-card").first()).toBeVisible({ timeout: 30_000 });
  const tabs = page.locator(".round-strip .tab");
  const selected = page.locator(".round-strip .tab[aria-selected=true]");
  const original = await selected.textContent();

  // Visit another round first, so that going back to the first one is answered from the cache and the list never blanks (a
  // blank list is shorter, and the browser would then clamp the scroll position by itself).
  const other = page.locator(".round-strip .tab[aria-selected=false]").first();
  const otherName = await other.textContent();
  await other.evaluate((el) => el.click());
  await expect(selected).toHaveText(otherName);
  await expect(page.locator(".fixture-card").first()).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => scrollY(page)).toBe(300);
  const url = page.url();
  // Clicked from script, so that the click itself does not scroll the page.
  await tabs.filter({ hasText: original }).first().evaluate((el) => el.click());
  await expect(selected).toHaveText(original);
  expect(page.url()).not.toBe(url);
  await expect.poll(() => scrollY(page)).toBe(300);
});

test("Back after opening a team does not throw the list to the top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const slug = await seasonSlug(page);
  await page.goto(`/${slug}/teams`);
  await scrollListAndOpenLast(page, SECTIONS[0]);
  await expect.poll(() => scrollY(page)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/${slug}/teams$`));
  await expect(page.locator(SECTIONS[0].link).first()).toBeVisible();
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
});
