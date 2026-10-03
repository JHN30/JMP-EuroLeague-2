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

  // The Statistics tab groups its rows in labelled regions. Assists are missing (null), so they show a dash; 160 points in
  // two games is a real 80.0; 0 threes made of 4 is a real 0.0%, while twos with no makes recorded are missing.
  const traditional = page.getByRole("region", { name: "Traditional" });
  await expect(traditional.getByText("80.0", { exact: true }).first()).toBeVisible();
  await expect(traditional.getByText("—", { exact: true }).first()).toBeVisible();

  const shooting = page.getByRole("region", { name: "Shooting" });
  await expect(shooting.getByText("0.0%", { exact: true }).first()).toBeVisible();
  await expect(shooting.getByText("—", { exact: true }).first()).toBeVisible();

  // The Shooting tab maps real shots from played games; this club has no games, so it says so.
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await expect(page.getByText("No played games yet this phase to map shot locations from.")).toBeVisible();
});
