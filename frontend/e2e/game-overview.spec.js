import { test, expect } from "@playwright/test";
import { BOX_SCORE, SEASON, mockGameApi, player } from "./support/game-fixtures";

test("the game page opens on the Overview tab with a line score and totals", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);

  const tabs = page.getByRole("tablist", { name: "Game detail" }).getByRole("tab");
  await expect(tabs.first()).toHaveText("Overview");
  await expect(tabs.nth(1)).toHaveText("Box score");
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  const header = page.locator("table thead tr").first();
  await expect(header).toContainText("Q1");
  await expect(header).toContainText("Q4");
  await expect(header).toContainText("Total");

  const teamA = page.locator("table tbody tr", { hasText: "Team A" });
  const teamB = page.locator("table tbody tr", { hasText: "Team B" });
  await expect(teamA.locator("td")).toHaveText(["Team A", "20", "25", "15", "20", "80"]);
  await expect(teamB.locator("td")).toHaveText(["Team B", "18", "15", "22", "15", "70"]);
  await expect(page.locator("table tbody tr", { hasText: "Margin" }).locator("td")).toHaveText(["Margin", "+2", "+10", "-7", "+5", "+10"]);
});

test("an unplayed game's Overview says it is not available yet", async ({ page }) => {
  await mockGameApi(page, { played: false });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Overview isn't available until this game is played.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("each team's best player and game leaders come from the box score, linked to their pages", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);

  const teamABest = page.getByRole("article", { name: "Team A best player" });
  await expect(teamABest.getByRole("link", { name: "STARTER, SAM" })).toHaveAttribute("href", `/${SEASON}/players/A-STARTER`);
  await expect(teamABest).toContainText("30 PTS · 4 REB · 7 AST");
  await expect(teamABest).toContainText("PIR 25");
  const teamBBest = page.getByRole("article", { name: "Team B best player" });
  await expect(teamBBest.getByRole("link", { name: "RIVAL, ROY" })).toBeVisible();
  await expect(teamBBest).toContainText("PIR 22");

  const teamALeaders = page.getByRole("group", { name: "Team A game leaders" });
  await expect(teamALeaders.locator("li", { hasText: "Points" })).toContainText("STARTER, SAM30");
  await expect(teamALeaders.locator("li", { hasText: "Rebounds" })).toContainText("BENCH, BO9");
  await expect(teamALeaders.locator("li", { hasText: "Assists" })).toContainText("STARTER, SAM7");
  // The player who did not play is never a leader or a standout.
  await expect(page.getByRole("link", { name: "SITTER, SID" })).toHaveCount(0);
});

// Team A: a short-minutes player with the best PIR is skipped; three players tie on PIR 20 (points, then name
// decide). Team B: nobody has 10 minutes, so no best player, but the leaders ignore the 10-minute rule.
const RULES_BOX_SCORE = {
  periodScores: BOX_SCORE.periodScores,
  teamStats: BOX_SCORE.teamStats,
  playerStats: [
    player("local", "A-SHORT", "SHORT, SAM", { timePlayed: 599, valuation: 40, points: 5 }),
    player("local", "A-EDGE", "EDGE, ED", { timePlayed: 600, valuation: 18, points: 10 }),
    player("local", "A-BETA", "BETA, BEN", { timePlayed: 1000, valuation: 20, points: 12, totalRebounds: 6 }),
    player("local", "A-ALPHA", "ALPHA, AL", { timePlayed: 1000, valuation: 20, points: 12, totalRebounds: 6 }),
    player("local", "A-GAMMA", "GAMMA, GUS", { timePlayed: 1200, valuation: 20, points: 11 }),
    player("road", "B-ONE", "ONE, OLI", { timePlayed: 500, valuation: 30, points: 20, totalRebounds: 2, assistances: 4 }),
    player("road", "B-NULL", "NULL, NIA", { timePlayed: null, valuation: 25 }),
  ],
};

test("best player and leader rules: 10-minute minimum, tie-breaks, and teams with no eligible player", async ({ page }) => {
  await mockGameApi(page, { boxScore: RULES_BOX_SCORE });
  await page.goto(`/${SEASON}/games/1`);

  // PIR 40 in 599 seconds is skipped; the tie on PIR 20 goes to points (12 beats 11), then to name (ALPHA before BETA).
  const teamABest = page.getByRole("article", { name: "Team A best player" });
  await expect(teamABest.getByRole("link", { name: "ALPHA, AL" })).toBeVisible();
  await expect(teamABest).not.toContainText("SHORT, SAM");
  await expect(teamABest).toContainText("PIR 20");

  // Team B has nobody with 10 minutes.
  await expect(page.getByRole("article", { name: "Team B best player" })).toContainText("Not enough minutes data to pick a best player.");

  // Leaders: points tie at 12 goes to the earlier name; rebounds tie at 6 likewise; nobody has an assist.
  const teamALeaders = page.getByRole("group", { name: "Team A game leaders" });
  await expect(teamALeaders.locator("li", { hasText: "Points" })).toContainText("ALPHA, AL12");
  await expect(teamALeaders.locator("li", { hasText: "Rebounds" })).toContainText("ALPHA, AL6");
  await expect(teamALeaders.locator("li", { hasText: "Assists" })).toHaveText(/Assists\s*—/);

  // Leaders ignore the 10-minute minimum, and a player with no minutes data is not considered.
  const teamBLeaders = page.getByRole("group", { name: "Team B game leaders" });
  await expect(teamBLeaders.locator("li", { hasText: "Points" })).toContainText("ONE, OLI20");
  await expect(teamBLeaders.locator("li", { hasText: "Assists" })).toContainText("ONE, OLI4");
  await expect(page.getByRole("link", { name: "NULL, NIA" })).toHaveCount(0);
});

// Scoring plays for the compact flow chart: Team A leads, Team B ties it, Team A pulls ahead.
const PLAY_BY_PLAY = {
  events: [
    { playType: "2FGM", clubCode: "A", periodNumber: 1, markerTime: "09:00", pointsA: 2, pointsB: 0 },
    { playType: "3FGM", clubCode: "B", periodNumber: 1, markerTime: "08:00", pointsA: 2, pointsB: 3 },
    { playType: "2FGM", clubCode: "A", periodNumber: 2, markerTime: "09:00", pointsA: 4, pointsB: 3 },
  ],
};

test("key stats are mirrored bars with the lower-is-better stat marked", async ({ page }) => {
  await mockGameApi(page, { playByPlay: PLAY_BY_PLAY });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("heading", { name: "How the teams compared" })).toBeVisible();
  const section = page.locator("section", { has: page.getByRole("heading", { name: "How the teams compared" }) });
  for (const label of ["Field goals", "3-pointers", "Free throws", "Rebounds", "Assists", "Steals", "Turnovers"]) {
    await expect(section.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(section).toContainText("30-55 (54.5%)");
  await expect(section).toContainText("24-48 (50.0%)");
  await expect(section).toContainText("9-9 (100.0%)");
  await expect(section).toContainText("6-8 (75.0%)");
  // Only turnovers are marked "Lower is better".
  await expect(section.getByText("Lower is better")).toHaveCount(1);
  await expect(section.getByText("Lower is better")).toBeVisible();
});

test("the compact score flow draws from play-by-play", async ({ page }) => {
  await mockGameApi(page, { playByPlay: PLAY_BY_PLAY });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("heading", { name: "Score flow" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();
});

test("a play-by-play failure shows a retry in the flow section and leaves the rest of the Overview intact", async ({ page }) => {
  await mockGameApi(page, { playByPlayStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);

  // The query retries a few times before it reports the error.
  const flowAlert = page.getByRole("alert").filter({ hasText: "Could not load the score flow." });
  await expect(flowAlert).toBeVisible({ timeout: 20_000 });
  await expect(flowAlert.getByRole("button", { name: "Retry" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Team A best player" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Team A game leaders" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How the teams compared" })).toBeVisible();
});

test("without play-by-play events the flow section says there is not enough yet", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByText("Not enough play-by-play yet to chart game flow.")).toBeVisible();
});
