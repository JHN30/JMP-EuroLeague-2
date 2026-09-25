import { test, expect } from "@playwright/test";

const SEASON = "2025";
const CLUB = "TMA";

const measures = {
  points: 160,
  fieldGoalsMade2: null,
  fieldGoalsAttempted2: null,
  fieldGoalsMade3: 0,
  fieldGoalsAttempted3: 4,
  freeThrowsMade: 20,
  freeThrowsAttempted: 25,
  fieldGoalsMadeTotal: null,
  fieldGoalsAttemptedTotal: null,
  totalRebounds: 60,
  defensiveRebounds: 40,
  offensiveRebounds: 20,
  assistances: null,
  steals: 12,
  turnovers: 0,
  blocksFavour: 4,
  blocksAgainst: 2,
  foulsCommited: 30,
  foulsReceived: 28,
  valuation: 180,
};

test("keeps missing team-stat measures distinct from valid zeroes", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/seasons") {
      return route.fulfill({ json: { seasons: [{ seasonCode: SEASON, name: "2025-26" }] } });
    }
    if (path === `/api/seasons/${SEASON}/teams/${CLUB}`) {
      return route.fulfill({ json: { team: { clubCode: CLUB, name: "Team A", abbreviatedName: "TMA" } } });
    }
    if (path === `/api/seasons/${SEASON}/phases`) {
      return route.fulfill({ json: { phases: [{ code: "RS", name: "Regular season" }] } });
    }
    if (path === `/api/seasons/${SEASON}/phases/RS/standings`) {
      return route.fulfill({ json: { round: 1, standings: [] } });
    }
    if (path === `/api/seasons/${SEASON}/teams/${CLUB}/roster`) {
      return route.fulfill({ json: { registrations: [], pagination: { hasMore: false } } });
    }
    if (path === `/api/seasons/${SEASON}/teams/${CLUB}/games`) {
      return route.fulfill({ json: { games: [], pagination: { hasMore: false } } });
    }
    if (path === `/api/seasons/${SEASON}/teams/${CLUB}/team-stats`) {
      return route.fulfill({
        json: {
          phaseCode: "RS",
          gamesPlayed: 2,
          own: measures,
          opponent: { ...measures, points: 150 },
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
  });

  await page.goto(`/${SEASON}/teams/${CLUB}?phase=RS`);
  await page.getByRole("tab", { name: "Statistics", exact: true }).click();

  const traditional = page.getByRole("heading", { name: "Traditional" }).locator("..");
  await expect(traditional.getByText("80.0", { exact: true })).toBeVisible();
  await expect(traditional.getByText("0.0%", { exact: true })).toBeVisible();
  await expect(traditional.getByText("—", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  const teamRow = page.getByRole("row", { name: /This team/ });
  await expect(teamRow.getByText("—", { exact: true })).toBeVisible();
  await expect(teamRow.getByText("0-4 (0.0%)", { exact: true })).toBeVisible();
});
