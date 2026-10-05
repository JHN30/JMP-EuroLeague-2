import { test, expect } from "@playwright/test";

const SEASON = "2025";

function playerRows(offset, limit) {
  return Array.from({ length: limit }, (_, index) => ({
    personKey: `player-${offset + index + 1}`,
    name: `Player ${offset + index + 1}`,
    countryCode: "RS",
  }));
}

function leaderboardRows(offset, limit) {
  return Array.from({ length: limit }, (_, index) => ({
    personKey: `leader-${offset + index + 1}`,
    playerName: `Leader ${offset + index + 1}`,
    traditional: { pointsScored: 20 - index },
  }));
}

test("loads a player game log once for the Overview form and the Games tab, and requests player pages in blocks of 36", async ({ page }) => {
  let gameLogRequests = 0;
  let roundRequests = 0;
  const playerPageRequests = [];
  const leaderboardRequests = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;

    if (pathname === "/api/seasons") {
      await route.fulfill({ json: { seasons: [{ seasonCode: SEASON, name: "2024-25" }] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/players/player-1`) {
      await route.fulfill({ json: { player: { personKey: "player-1", name: "Player One", countryCode: "RS" } } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/players/player-1/registrations`) {
      await route.fulfill({ json: { registrations: [] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/players/player-1/games`) {
      gameLogRequests += 1;
      await route.fulfill({ json: { games: [], pagination: { total: 0, hasMore: false } } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/phases`) {
      await route.fulfill({ json: { phases: [{ code: "RS", name: "Regular season" }] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/phases/RS/rounds`) {
      roundRequests += 1;
      await route.fulfill({
        json: {
          rounds: [
            { number: 1, name: "Round 1" },
            { number: 2, name: "Round 2" },
          ],
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/teams`) {
      await route.fulfill({
        json: {
          teams: [
            { clubCode: "A", name: "Team A" },
            { clubCode: "B", name: "Team B" },
          ],
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/phases/RS/standings`) {
      await route.fulfill({
        json: {
          standings: [
            { clubCode: "A", clubName: "Team A", basic: { position: 1, gamesWon: 1, gamesLost: 0 } },
            { clubCode: "B", clubName: "Team B", basic: { position: 2, gamesWon: 0, gamesLost: 1 } },
          ],
        },
      });
      return;
    }
    if (pathname.startsWith(`/api/seasons/${SEASON}/teams/`) && pathname.endsWith("/games")) {
      await route.fulfill({
        json: {
          games: [
            {
              gameCode: "game-1",
              phaseCode: "RS",
              roundNumber: 1,
              played: true,
              localTeam: { clubCode: "A" },
              roadTeam: { clubCode: "B" },
              localScore: 80,
              roadScore: 70,
            },
            {
              gameCode: "game-2",
              phaseCode: "RS",
              roundNumber: 2,
              played: true,
              localTeam: { clubCode: "B" },
              roadTeam: { clubCode: "A" },
              localScore: 70,
              roadScore: 85,
            },
          ],
          pagination: { total: 2, hasMore: false },
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/season-stats`) {
      if (searchParams.has("personKey")) {
        await route.fulfill({ json: { players: [] } });
        return;
      }
      const offset = Number(searchParams.get("offset") ?? "0");
      const limit = Number(searchParams.get("limit") ?? "0");
      leaderboardRequests.push({ offset, limit });
      await route.fulfill({
        json: {
          players: leaderboardRows(offset, Math.max(0, Math.min(limit, 50 - offset))),
          pagination: { total: 50, hasMore: offset + limit < 50 },
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/players`) {
      const offset = Number(searchParams.get("offset") ?? "0");
      const limit = Number(searchParams.get("limit") ?? "0");
      playerPageRequests.push({ offset, limit });
      await route.fulfill({
        json: {
          players: playerRows(offset, limit),
          pagination: { total: 72, hasMore: offset + limit < 72 },
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
  });

  await page.goto(`/${SEASON}/players/player-1`);
  await expect(page.getByRole("tab", { name: "Statistics", exact: true })).toBeVisible();
  // The Overview shows recent form, so the log is read once on arrival...
  await expect.poll(() => gameLogRequests).toBe(1);

  // ...and the Games tab reuses it instead of asking again.
  await page.getByRole("tab", { name: "Games", exact: true }).click();
  await expect(page.getByText("No game log available yet.")).toBeVisible();
  expect(gameLogRequests).toBe(1);

  await page.goto(`/${SEASON}/players`);
  await expect(page.getByText("Showing 1-36 of 72 players")).toBeVisible();
  expect(playerPageRequests.at(-1)).toEqual({ offset: 0, limit: 36 });

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Showing 37-72 of 72 players")).toBeVisible();
  expect(playerPageRequests.at(-1)).toEqual({ offset: 36, limit: 36 });

  // The player page's league comparison also reads the leaderboard; count only the Statistics page's requests.
  leaderboardRequests.length = 0;
  await page.goto(`/${SEASON}/leaders?phase=RS&metric=pointsScored`);
  await expect(page.getByText("Showing 1-25 of 50 players")).toBeVisible();
  expect(leaderboardRequests).toEqual([{ offset: 0, limit: 100 }]);

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Showing 26-50 of 50 players")).toBeVisible();
  expect(leaderboardRequests).toEqual([{ offset: 0, limit: 100 }]);

  await page.goto(`/${SEASON}/compare?phase=RS`);
  await page.getByLabel("Team A").selectOption("A");
  await page.getByLabel("Team B").selectOption("B");
  await expect(page.getByRole("tab", { name: "Trends", exact: true })).toBeVisible();
  expect(roundRequests).toBe(0);

  await page.getByRole("tab", { name: "Trends", exact: true }).click();
  // The clubs have played two games, too few to draw a trend, and the page never asks for the rounds.
  await expect(page.getByText("Not enough games played in this phase to show a trend yet.")).toBeVisible();
  expect(roundRequests).toBe(0);
});
