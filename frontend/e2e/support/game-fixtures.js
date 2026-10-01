import { expect } from "@playwright/test";

export const SEASON = "2025";

export function player(side, personKey, personName, overrides) {
  return {
    side,
    personKey,
    clubCode: side === "local" ? "A" : "B",
    personName,
    positionName: "Guard",
    dorsal: "1",
    headshotUrl: null,
    started: false,
    startedAlt: false,
    points: 0,
    timePlayed: 0,
    valuation: 0,
    fieldGoalsMade2: 0,
    fieldGoalsAttempted2: 0,
    fieldGoalsMade3: 0,
    fieldGoalsAttempted3: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    totalRebounds: 0,
    defensiveRebounds: 0,
    offensiveRebounds: 0,
    assistances: 0,
    steals: 0,
    turnovers: 0,
    blocksFavour: 0,
    blocksAgainst: 0,
    foulsCommited: 0,
    foulsReceived: 0,
    plusMinus: 0,
    ...overrides,
  };
}

export function teamTotal(side, overrides) {
  return {
    side,
    statsKind: "total",
    coachName: side === "local" ? "COACH, ALPHA" : "COACH, BRAVO",
    points: 0,
    timePlayed: 2400,
    valuation: 0,
    fieldGoalsMade2: 0,
    fieldGoalsAttempted2: 0,
    fieldGoalsMade3: 0,
    fieldGoalsAttempted3: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    fieldGoalsMadeTotal: 0,
    fieldGoalsAttemptedTotal: 0,
    totalRebounds: 0,
    defensiveRebounds: 0,
    offensiveRebounds: 0,
    assistances: 0,
    steals: 0,
    turnovers: 0,
    blocksFavour: 0,
    blocksAgainst: 0,
    foulsCommited: 0,
    foulsReceived: 0,
    plusMinus: 0,
    ...overrides,
  };
}

const LOCAL_PERIODS = [20, 25, 15, 20];
const ROAD_PERIODS = [18, 15, 22, 15];

// Team A won 80-70. Team A: a starter with few minutes, a bench player with more minutes, and a player who
// did not play. Team B: a starter who ties Team A's best scorer, and a bench player.
export const BOX_SCORE = {
  periodScores: [
    ...LOCAL_PERIODS.map((score, index) => ({ side: "local", periodNumber: index + 1, score })),
    ...ROAD_PERIODS.map((score, index) => ({ side: "road", periodNumber: index + 1, score })),
  ],
  teamStats: [
    teamTotal("local", {
      points: 80, fieldGoalsMade2: 20, fieldGoalsAttempted2: 30, fieldGoalsMade3: 10, fieldGoalsAttempted3: 25,
      freeThrowsMade: 9, freeThrowsAttempted: 9, fieldGoalsMadeTotal: 30, fieldGoalsAttemptedTotal: 55,
      totalRebounds: 40, assistances: 18, steals: 7, turnovers: 10,
    }),
    teamTotal("road", {
      points: 70, fieldGoalsMade2: 18, fieldGoalsAttempted2: 28, fieldGoalsMade3: 6, fieldGoalsAttempted3: 20,
      freeThrowsMade: 6, freeThrowsAttempted: 8, fieldGoalsMadeTotal: 24, fieldGoalsAttemptedTotal: 48,
      totalRebounds: 35, assistances: 12, steals: 9, turnovers: 14,
    }),
  ],
  playerStats: [
    player("local", "A-STARTER", "STARTER, SAM", {
      started: true, timePlayed: 900, points: 30, fieldGoalsMade2: 10, fieldGoalsAttempted2: 12, freeThrowsMade: 9, freeThrowsAttempted: 9,
      totalRebounds: 4, assistances: 7, valuation: 25, plusMinus: 6,
    }),
    player("local", "A-BENCH", "BENCH, BO", {
      timePlayed: 1500, points: 12, fieldGoalsMade2: 6, fieldGoalsAttempted2: 9, totalRebounds: 9, assistances: 2, valuation: 14, plusMinus: -3,
    }),
    player("local", "A-DNP", "SITTER, SID", {}),
    player("road", "B-STARTER", "RIVAL, ROY", {
      started: true, timePlayed: 1700, points: 30, fieldGoalsMade2: 11, fieldGoalsAttempted2: 14, freeThrowsMade: 6, freeThrowsAttempted: 8,
      totalRebounds: 5, assistances: 3, valuation: 22, plusMinus: -4,
    }),
    player("road", "B-BENCH", "RESERVE, RAY", {
      timePlayed: 600, points: 8, fieldGoalsMade2: 3, fieldGoalsAttempted2: 6, totalRebounds: 2, assistances: 1, valuation: 5, plusMinus: 2,
    }),
  ],
};

const UNPLAYED_BOX_SCORE = { periodScores: [], teamStats: [], playerStats: [] };

// Mocks every API request the game page makes. Options: `requests` (collects requested paths), `played`,
// `boxScore`, `playByPlay` (response body), and `playByPlayStatus` (use 500 to simulate a failure).
export async function mockGameApi(page, options = {}) {
  const { requests = [], played = true, boxScore = BOX_SCORE, playByPlay = { events: [] }, playByPlayStatus = 200 } = options;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname === "/api/seasons") {
      await route.fulfill({ json: { seasons: [{ seasonCode: SEASON, name: "2024-25" }] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1`) {
      await route.fulfill({
        json: {
          game: {
            gameCode: 1,
            played,
            phaseName: "Regular season",
            scheduledAt: "2025-01-01T18:00:00Z",
            localTeam: { name: "Team A", clubCode: "A" },
            roadTeam: { name: "Team B", clubCode: "B" },
            localScore: played ? 80 : null,
            roadScore: played ? 70 : null,
          },
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/box-score`) {
      await route.fulfill({ json: played ? boxScore : UNPLAYED_BOX_SCORE });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/play-by-play`) {
      await route.fulfill({ status: playByPlayStatus, json: playByPlayStatus === 200 ? playByPlay : { error: "Mocked failure" } });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
  });
}

// The game page opens on the Overview tab; box score assertions start from here.
export async function openBoxScore(page) {
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Box score", exact: true })).toHaveAttribute("aria-selected", "true");
}
