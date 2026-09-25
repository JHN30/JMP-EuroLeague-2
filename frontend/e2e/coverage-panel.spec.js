import { test, expect } from "@playwright/test";

const SEASON = "2025";

test("shows truthful compact coverage for a game", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/seasons") {
      await route.fulfill({ json: { seasons: [{ seasonCode: SEASON, name: "2024-25" }] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1`) {
      await route.fulfill({ json: { game: { gameCode: 1, played: true, phaseName: "Regular season", scheduledAt: "2025-01-01T18:00:00Z", localTeam: { name: "Team A" }, roadTeam: { name: "Team B" }, localScore: 80, roadScore: 70 } } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/box-score`) {
      await route.fulfill({ json: { periodScores: [], teamStats: [], playerStats: [] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/coverage`) {
      await route.fulfill({ json: { scope: { seasonCode: SEASON, gameCode: 1 }, items: [{ key: "boxScores", label: "Box scores", status: "available", availableCount: 1, applicableCount: 1 }, { key: "playByPlay", label: "Play-by-play", status: "unavailable", availableCount: 0, applicableCount: 1 }] } });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
  });

  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "This game's data coverage" })).toBeVisible();
  await expect(page.getByText("Box scores")).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Play-by-play", level: 3 })).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
});
