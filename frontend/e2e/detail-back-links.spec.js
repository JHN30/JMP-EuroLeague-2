import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The back link at the top of the game, team and player pages, read with the live data.
const API = "http://localhost:3000/api/seasons";

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  return { slug, code };
}

const back = (page, section) => page.getByRole("link", { name: `Back to ${section}`, exact: true });
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

test("a game's back link returns to the Games list on that game's round", async ({ page }) => {
  const { slug, code } = await liveSeason(page);
  const { games } = await (await page.request.get(`${API}/${code}/games?limit=100`)).json();
  const game = games.find((entry) => entry.played && entry.roundNumber && entry.phaseCode) ?? games[0];
  const listPath = `/${slug}/games?phase=${game.phaseCode}&round=${game.roundNumber}`;

  await page.goto(`/${slug}/games/${game.gameCode}`);
  const link = back(page, "Games");
  await expect(link).toBeVisible({ timeout: 30_000 });
  await expect(link).toHaveAttribute("href", listPath);
  await expect(link).toContainText("Games");

  // From 640px the link is the first thing in the page, above the matchup header, and costs one short line.
  for (const width of [640, 1280]) {
    await page.setViewportSize({ width, height: HEIGHT });
    const linkBox = await link.boundingBox();
    const headerBox = await page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section[1]").boundingBox();
    expect(linkBox.y + linkBox.height).toBeLessThanOrEqual(headerBox.y + 1);
    expect(linkBox.height).toBeLessThan(40);
    await expectNoSidewaysScroll(page);
  }
  await link.click();
  await expect(page).toHaveURL((url) => url.pathname + url.search === listPath);
  await expect(page.locator(`.fixture-card[href$="/games/${game.gameCode}"]`)).toBeVisible({ timeout: 30_000 });
});

test("on a phone the sticky bar is the way back, even far down a long page", async ({ page }) => {
  const { slug, code } = await liveSeason(page);
  const { games } = await (await page.request.get(`${API}/${code}/games?limit=100`)).json();
  const game = games.find((entry) => entry.played && entry.roundNumber && entry.phaseCode) ?? games[0];
  const listPath = `/${slug}/games?phase=${game.phaseCode}&round=${game.roundNumber}`;

  for (const width of [320, 390, 639]) {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.goto(`/${slug}/games/${game.gameCode}`);
    const link = back(page, "Games");
    await expect(link).toBeVisible({ timeout: 30_000 });
    // It lives in the sticky bar, and the page-top link is not drawn.
    expect(await link.evaluate((el) => Boolean(el.closest(".app-nav")))).toBe(true);
    await expect(page.getByTestId("page-name")).toHaveText("Games");
    await expect(link).toHaveAttribute("href", listPath);
    await expectNoSidewaysScroll(page);

    // Scrolled far down, it is still on screen and still works.
    await expect(page.getByRole("tablist", { name: "Game detail" })).toBeVisible();
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return page.evaluate(() => window.scrollY);
      })
      .toBeGreaterThan(200);
    const box = await link.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(64);
  }
  await back(page, "Games").click();
  await expect(page).toHaveURL((url) => url.pathname + url.search === listPath);
  // On the list itself the bar is a plain name again.
  await expect(page.getByRole("link", { name: /^Back to/ })).toHaveCount(0);
  await expect(page.getByTestId("page-name")).toHaveText("Games");
});

test("a team's back link returns to Teams and a player's to Players", async ({ page }) => {
  const { slug } = await liveSeason(page);

  await page.goto(`/${slug}/teams`);
  await page.locator("main ul > li > a").first().click();
  await expect(page).toHaveURL(/\/teams\/[^/]+$/);
  const teamBack = back(page, "Teams");
  await expect(teamBack).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await expectNoSidewaysScroll(page);
  await teamBack.click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/teams$`));

  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${slug}/players`);
  await page.locator('main a[href*="/players/"]').first().click();
  await expect(page).toHaveURL(/\/players\/[^/]+$/);
  const playerBack = back(page, "Players");
  await expect(playerBack).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await expectNoSidewaysScroll(page);
  await playerBack.click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/players$`));
});

test("the not-found states keep the back link", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.route("**/api/seasons/*/games/999999", (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));
  await page.route("**/api/seasons/*/teams/ZZZZ", (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));
  await page.route("**/api/seasons/*/players/zzzz", (route) => route.fulfill({ status: 404, json: { error: "Not found" } }));

  for (const [path, message, section] of [
    ["games/999999", "Game not found.", "Games"],
    ["teams/ZZZZ", "Team not found.", "Teams"],
    ["players/zzzz", "Player not found.", "Players"],
  ]) {
    await page.goto(`/${slug}/${path}`);
    await expect(page.getByText(message)).toBeVisible({ timeout: 30_000 });
    await expect(back(page, section)).toBeVisible();
    await expect(back(page, section)).toHaveAttribute("href", `/${slug}/${section.toLowerCase()}`);
  }
});
