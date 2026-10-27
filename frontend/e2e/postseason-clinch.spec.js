import { test, expect } from "@playwright/test";

// A series leader has not won the series: only a club that reaches the stage's win target (3 in the Playoffs) moves on. The 2025
// series are served with the Final Four removed and the 1 v 8 series cut back, as if the Playoffs were still being played.
const API = "http://localhost:3000/api/seasons";
const SEASON = "2025";

async function serveLivePlayoffs(page, cut) {
  const { series } = await (await page.request.get(`${API}/${SEASON}/postseason-series`)).json();
  const { standings } = await (await page.request.get(`${API}/${SEASON}/phases/RS/standings`)).json();
  const { teams } = await (await page.request.get(`${API}/${SEASON}/teams`)).json();
  const bySeed = new Map(standings.map((entry) => [entry.basic.position, entry.clubCode]));
  const name = (code) => teams.find((team) => team.clubCode === code)?.name ?? code;
  const top = bySeed.get(1);
  const fourth = bySeed.get(4);
  const live = series
    .filter((entry) => entry.phaseCode !== "FF")
    .map((entry) => {
      const isTopSeries = entry.phaseCode === "PO" && [entry.clubA.clubCode, entry.clubB.clubCode].includes(top);
      return isTopSeries ? cut(entry, top) : entry;
    });
  await page.route(/\/api\/seasons\/[^/]+\/postseason-series$/, (route) => route.fulfill({ json: { series: live } }));
  return { topName: name(top), fourthName: name(fourth) };
}

// The series as it stood after `games` games, with the top seed winning `topWins` of them.
function cutSeries(games, topWins) {
  return (entry, top) => {
    const kept = entry.games.slice(0, games);
    const topIsA = entry.clubA.clubCode === top;
    const otherWins = games - topWins;
    return {
      ...entry,
      games: kept,
      gamesPlayed: kept.length,
      clubAWins: topIsA ? topWins : otherWins,
      clubBWins: topIsA ? otherWins : topWins,
      winnerClubCode: topWins > otherWins ? top : topWins < otherWins ? (topIsA ? entry.clubB.clubCode : entry.clubA.clubCode) : null,
    };
  };
}

test.use({ viewport: { width: 1280, height: 900 } });

test("a club leading a best-of-five 2-0 has not reached the Final Four", async ({ page }) => {
  const { topName, fourthName } = await serveLivePlayoffs(page, cutSeries(2, 2));
  await page.goto(`/${SEASON}/postseason`);
  await expect(page.getByRole("button", { name: `${topName}, 1 v 8` })).toBeVisible({ timeout: 30_000 });
  // The leader is not placed in the semifinal; the slot still waits for the winner of 1 v 8.
  await expect(page.getByRole("button", { name: `${topName}, Semifinal` })).toHaveCount(0);
  await expect(page.getByText("Winner of 1 v 8").first()).toBeVisible();
  // The 4 v 5 series was won 3-1, so its winner is already in the semifinal.
  await expect(page.getByRole("button", { name: `${fourthName}, Semifinal` })).toBeVisible();
  // The matchup reads as in progress, not as won.
  await page.getByRole("button", { name: `${topName}, 1 v 8` }).click();
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByText(/are the champions/)).toHaveCount(0);
});

test("reaching three wins puts the club in the Final Four", async ({ page }) => {
  const { topName } = await serveLivePlayoffs(page, cutSeries(3, 3));
  await page.goto(`/${SEASON}/postseason`);
  await expect(page.getByRole("button", { name: `${topName}, Semifinal` })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: `${topName}, 1 v 8` }).click();
  await expect(page.getByText(`${topName} won the series 3-0`)).toBeVisible();
});

test("in a series panel a played game opens its page and a game still to come opens Compare", async ({ page }) => {
  // The top seed's series after two games, with game 3 scheduled but not played.
  const upcoming = (entry, top) => {
    const played = cutSeries(2, 2)(entry, top);
    const third = entry.games[2];
    return { ...played, games: [...played.games, { ...third, localScore: null, roadScore: null }] };
  };
  let third = null;
  const { topName } = await serveLivePlayoffs(page, (entry, top) => {
    third = entry.games[2];
    return upcoming(entry, top);
  });
  await page.goto(`/${SEASON}/postseason`);
  await page.getByRole("button", { name: `${topName}, 1 v 8` }).click({ timeout: 30_000 });

  const rows = page.getByRole("listitem").getByRole("link").filter({ hasText: /^Game \d/ });
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute("href", new RegExp(`^/${SEASON}/games/\\d+$`));
  await expect(rows.nth(2)).toHaveAttribute(
    "href",
    `/${SEASON}/compare?view=teams&teamA=${encodeURIComponent(third.localClubCode)}&teamB=${encodeURIComponent(third.roadClubCode)}&game=${third.gameCode}`,
  );
  await rows.nth(2).click();
  await expect(page).toHaveURL(new RegExp(`/${SEASON}/compare\\?`));
});

