import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// Home's live-data sections (the Form board, Game of the round and the player names), read against the API.
const API = "http://localhost:3000/api/seasons";

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  return { slug, code };
}

const get = async (page, path) => (await page.request.get(`${API}/${path}`)).json();

test("the Form board lists every club by wins in its last five games, each with its own results", async ({ page }) => {
  const { slug, code } = await liveSeason(page);
  const { standings } = await get(page, `${code}/phases/RS/standings`);
  const { results } = await get(page, `${code}/phases/RS/results`);
  const lastFive = new Map(results.map((club) => [club.clubCode, club.games.slice(-5)]));

  await page.goto(`/${slug}/home`);
  const list = page.getByRole("list", { name: /^Clubs by wins in their last 5 games$/ });
  await expect(list.getByRole("listitem").first()).toBeVisible({ timeout: 30_000 });
  const rows = await list.getByRole("listitem").evaluateAll((els) =>
    els.map((el) => ({ code: el.querySelector("a").getAttribute("href").split("/").at(-1), record: el.lastElementChild.textContent.trim(), dots: el.querySelectorAll(".ribbon-dot").length })),
  );
  expect(rows.length).toBe(standings.filter((entry) => (lastFive.get(entry.clubCode) ?? []).length > 0).length);

  let previousWins = Infinity;
  for (const row of rows) {
    const games = lastFive.get(row.code) ?? [];
    const wins = games.filter((game) => game.pointsFor > game.pointsAgainst).length;
    expect(row.record, row.code).toBe(`${wins}-${games.length - wins}`);
    expect(row.dots, row.code).toBe(games.length);
    expect(wins).toBeLessThanOrEqual(previousWins);
    previousWins = wins;
  }
});

test("Game of the round is the next round's game with the most combined wins, highlighted as the first card", async ({ page }) => {
  const { slug, code } = await liveSeason(page);
  const { games } = await get(page, `${code}/games?status=scheduled&order=asc&limit=10`);
  test.skip(games.length === 0 || games[0].phaseCode !== "RS", "No regular-season round is scheduled");
  const { standings } = await get(page, `${code}/phases/RS/standings`);
  const wins = new Map(standings.map((entry) => [entry.clubCode, entry.basic]));
  const round = games.filter((game) => game.phaseCode === "RS" && game.roundNumber === games[0].roundNumber);
  const played = round.filter((game) => wins.get(game.localTeam.clubCode)?.gamesPlayed && wins.get(game.roadTeam.clubCode)?.gamesPlayed);
  test.skip(played.length === 0, "No club has played yet");
  const combined = (game) => wins.get(game.localTeam.clubCode).gamesWon + wins.get(game.roadTeam.clubCode).gamesWon;
  const most = Math.max(...played.map(combined));

  await page.goto(`/${slug}/home`);
  const grid = page.getByRole("group", { name: /^Upcoming games$/ });
  const featured = grid.getByTestId("game-of-the-round");
  await expect(featured).toBeVisible({ timeout: 30_000 });
  await expect(featured).toContainText("Game of the round");
  await expect(featured).toContainText(/\d+(st|nd|rd|th) vs \d+(st|nd|rd|th) · \d+-\d+ vs \d+-\d+/);
  const href = await featured.getAttribute("href");
  const gameCode = Number(href.split("/").at(-1));
  const pick = round.find((game) => game.gameCode === gameCode);
  expect(pick).toBeTruthy();
  expect(combined(pick)).toBe(most);
  // The first card, and in the grid only once.
  await expect(grid.getByRole("link").first()).toHaveAttribute("href", href);
  await expect(grid.locator(`a[href="${href}"]`)).toHaveCount(1);
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
