import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords } from "./support/layout";

// Overview's Season highs, Most valuable and Home and away, read against the API for a finished season.
const API = "http://localhost:3000/api/seasons";
const SEASON = "2025";
const CODE = "E2025";

const get = async (page, path) => (await page.request.get(`${API}/${CODE}/${path}`)).json();

async function openOverview(page, width = 1280) {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.goto(`/${SEASON}/overview`);
  await expect(page.getByRole("heading", { name: "Defining games" })).toBeVisible({ timeout: 30_000 });
}

test("Season highs show the season-best single game in each of the six leader categories and open it", async ({ page }) => {
  const { cards } = await get(page, "season-highs");
  expect(cards.map((card) => card.metric)).toEqual(["pointsScored", "totalRebounds", "assists", "steals", "blocks", "pir"]);
  await openOverview(page);
  const links = page.getByRole("group", { name: "Season highs" }).getByRole("link");
  await expect(links).toHaveCount(6);
  for (const [index, card] of cards.entries()) {
    const link = links.nth(index);
    await expect(link).toHaveAttribute("href", `/${SEASON}/games/${card.record.gameCode}`);
    await expect(link.locator(".value")).toHaveText(String(Number(card.record.value)));
    await expect(link).toContainText(`vs ${card.record.opponentTvCode}`);
  }

  // The highs are this season's own: no game of the season beats the points card.
  const book = await (await page.request.get(`${API}/${CODE}/records/single-games?metric=points`)).json();
  const seasonBest = book.bySeason.find((row) => row.seasonCode === CODE);
  expect(Number(seasonBest.value)).toBe(Number(cards[0].record.value));
});

test("Most valuable lists the top five by win shares, each opening the player", async ({ page }) => {
  const { entries } = await (await page.request.get(`${API}/${CODE}/advanced/leaders?metric=winShares&scope=all&limit=5`)).json();
  await openOverview(page);
  const rows = page.getByRole("list", { name: "Top five by win shares" }).getByRole("link");
  await expect(rows).toHaveCount(entries.length);
  for (const [index, entry] of entries.entries()) {
    await expect(rows.nth(index)).toHaveAttribute("href", `/${SEASON}/players/${entry.personKey}`);
    await expect(rows.nth(index)).toContainText(Number(entry.value).toFixed(1));
  }
});

test("Home and away counts the home wins of the season's played games", async ({ page }) => {
  const games = [];
  for (let offset = 0; ; offset += 100) {
    const pageData = await get(page, `games?status=played&limit=100&offset=${offset}&order=asc`);
    games.push(...pageData.games);
    if (!pageData.pagination.hasMore) break;
  }
  const counted = games.filter(
    (game) => game.phaseCode !== "FF" && game.localScore != null && game.roadScore != null && game.localScore !== game.roadScore && game.gameStatus !== "Walkover",
  );
  const homeWins = counted.filter((game) => game.localScore > game.roadScore).length;

  await openOverview(page);
  const line = page.getByText(/^\d+ of \d+ games won at home$/);
  const [, wins, total] = (await line.textContent()).match(/(\d+) of (\d+) games/);
  expect(Number(total)).toBe(counted.length);
  expect(Number(wins)).toBe(homeWins);
});

for (const width of [320, 390, 768, 1024, 1280]) {
  test(`the new sections fit at ${width}px with nothing scrolling sideways and no names cut`, async ({ page }) => {
    await openOverview(page, width);
    const highs = page.getByRole("group", { name: "Season highs" });
    await expect(highs.getByRole("link")).toHaveCount(6);
    // The Statistical leaders' grid: two columns, three from 1024px.
    const lefts = await highs.getByRole("link").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(width >= 1024 ? 3 : 2);
    expect(await findBrokenWords(highs.locator(".name"))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

test("from 1024px Most valuable and Home and away share a row at the same height, under the full-width season highs", async ({ page }) => {
  await openOverview(page, 1024);
  const panel = (title) => page.locator(".panel", { has: page.getByRole("heading", { name: title, exact: true }) }).first();
  await expect(panel("Most valuable").getByRole("link", { name: /WS/ })).toHaveCount(5);
  const box = (title) => panel(title).boundingBox();
  const [highs, mvp, venues] = [await box("Best single games"), await box("Most valuable"), await box("Home and away")];
  expect(mvp.y).toBeGreaterThanOrEqual(highs.y + highs.height - 1);
  expect(Math.abs(mvp.y - venues.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(mvp.height - venues.height)).toBeLessThanOrEqual(1);
  expect(venues.x).toBeGreaterThan(mvp.x + mvp.width - 1);

  await page.setViewportSize({ width: 1023, height: HEIGHT });
  await expect.poll(async () => (await box("Home and away")).y > (await box("Most valuable")).y + (await box("Most valuable")).height - 1).toBe(true);
});
