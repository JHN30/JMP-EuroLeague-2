import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi } from "./support/game-fixtures";

// A 1x1 image, so the team crest cell is filled for the teams' own events.
const CREST = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const base = { fastbreak: false, secondChance: false, pointsOffTurnover: false };
const EVENTS = [
  { ...base, eventOrdinal: 1, periodNumber: 4, markerTime: "07:35", playType: "2FGM", clubCode: "A", playerName: "ONE, AL", playInfo: "Two Pointer (1/2 - 3 pt)", pointsA: 63, pointsB: 59 },
  { ...base, eventOrdinal: 2, periodNumber: 4, markerTime: "07:17", playType: "TOUT_TV", clubCode: null, playerName: null, teamName: null, playInfo: "TV Time Out (4)" },
  { ...base, eventOrdinal: 3, periodNumber: 4, markerTime: "07:17", playType: "TOUT", clubCode: "B", playerName: null, teamName: "Team B", playInfo: "Time Out (1)" },
];

async function openPlayByPlay(page) {
  await mockGameApi(page, { playByPlay: { events: EVENTS } });
  // The same game, with crests on both teams.
  await page.route(`**/api/seasons/${SEASON}/games/1`, async (route) => {
    await route.fulfill({
      json: {
        game: {
          gameCode: 1,
          played: true,
          phaseName: "Regular season",
          scheduledAt: "2025-01-01T18:00:00Z",
          localTeam: { name: "Team A", clubCode: "A", crestUrl: CREST },
          roadTeam: { name: "Team B", clubCode: "B", crestUrl: CREST },
          localScore: 80,
          roadScore: 70,
        },
      },
    });
  });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Play-by-play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Play-by-play" })).toBeVisible();
}

test("every play-by-play row lines its score up on the right, with room before the edge", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openPlayByPlay(page);

  const rows = page.locator(".divide-y > div");
  await expect(rows).toHaveCount(3);

  const edges = [];
  for (let index = 0; index < 3; index += 1) {
    const row = await rows.nth(index).boundingBox();
    const score = await rows.nth(index).locator("> div").last().boundingBox();
    edges.push(score.x + score.width);
    // The tinted scoring row must not pull its text against the edge of the row.
    expect(row.x + row.width - (score.x + score.width)).toBeGreaterThanOrEqual(8);
  }
  // A timeout without a crest or player ends where a scoring row does.
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(1);
});
