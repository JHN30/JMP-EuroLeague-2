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

test("Game of the round is the current round's biggest game, picked once for the whole round and shown in tip-off order", async ({ page }) => {
  const { slug, code } = await liveSeason(page);
  const { games } = await get(page, `${code}/games?status=scheduled&order=asc&limit=10`);
  test.skip(games.length === 0 || games[0].phaseCode !== "RS", "No regular-season round is under way");
  const round = games[0].roundNumber;
  const { games: roundGames } = await get(page, `${code}/games?phase=RS&round=${round}&limit=50`);
  const { standings } = await get(page, `${code}/phases/RS/standings`);
  // Records before the round: the table's, minus each club's result in the round when it is played.
  const before = new Map(standings.map((entry) => [entry.clubCode, { won: entry.basic.gamesWon, played: entry.basic.gamesPlayed }]));
  for (const game of roundGames.filter((entry) => entry.played)) {
    for (const [club, won] of [[game.localTeam.clubCode, game.localScore > game.roadScore], [game.roadTeam.clubCode, game.roadScore > game.localScore]]) {
      const record = before.get(club);
      before.set(club, { won: record.won - (won ? 1 : 0), played: record.played - 1 });
    }
  }
  const eligible = roundGames.filter((game) => before.get(game.localTeam.clubCode)?.played && before.get(game.roadTeam.clubCode)?.played);
  test.skip(eligible.length === 0, "No club had played before this round");
  const combined = (game) => before.get(game.localTeam.clubCode).won + before.get(game.roadTeam.clubCode).won;
  const most = Math.max(...eligible.map(combined));

  await page.goto(`/${slug}/home`);
  const grid = page.getByRole("group", { name: /^Upcoming games$/ });
  await expect(grid.getByRole("link").first()).toBeVisible({ timeout: 30_000 });
  const featured = grid.getByTestId("game-of-the-round");
  const upcomingTop = eligible.filter((game) => !game.played && combined(game) === most);
  const playedTop = eligible.filter((game) => game.played && combined(game) === most);
  if (upcomingTop.length === 0) {
    // The round's pick is already played: no upcoming card is highlighted, not even a later round's.
    await expect(featured).toHaveCount(0);
  } else {
    await expect(featured).toHaveCount(1);
    // The badge and the reason are two lines; screen readers hear "Game of the round: 1st vs 4th · 8-2 vs 7-3".
    await expect(featured).toContainText(/Game of the round: \d+(st|nd|rd|th) vs \d+(st|nd|rd|th) · \d+-\d+ vs \d+-\d+/);
    await expect(featured.locator(".match-card-head")).toContainText(`Round ${round}`);
    const gameCode = Number((await featured.getAttribute("href")).split("/").at(-1));
    const pick = roundGames.find((game) => game.gameCode === gameCode);
    expect(pick).toBeTruthy();
    expect(combined(pick)).toBe(most);
    // A played game with the same combined wins can win the tie-breaks only on the gap or an earlier tip-off.
    expect(playedTop.length === 0 || playedTop.every((game) => Math.abs(before.get(game.localTeam.clubCode).won - before.get(game.roadTeam.clubCode).won) >= Math.abs(before.get(pick.localTeam.clubCode).won - before.get(pick.roadTeam.clubCode).won))).toBe(true);
  }

  // The cards stay in tip-off order, as the API lists them.
  const hrefs = await grid.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs.map((href) => Number(href.split("/").at(-1)))).toEqual(games.map((game) => game.gameCode));
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
