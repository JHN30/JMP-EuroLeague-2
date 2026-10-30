import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, mockGameApi, shot } from "./support/game-fixtures";

const DEFENSE = "Defense (what each team held its opponent to)";

async function openComparison(page, options = {}) {
  await mockGameApi(page, { advanced: ADVANCED, ...options });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveAttribute("aria-selected", "true");
}

// A mirrored row, found by its label inside one block of the Four Factors panel.
// The label carries its tip as screen-reader text, so it is matched by its start.
function factorRow(page, block, label) {
  const start = new RegExp(`^${label}`);
  return page
    .getByRole("region", { name: block })
    .locator("div.border-b", { has: page.locator(".header-tip-label").filter({ hasText: start }) });
}

function boxScoreRow(page, label) {
  return page.locator("div.border-b", { has: page.getByText(label, { exact: true }) });
}

// A Head to head row whose label carries a tip (screen-reader text inside the label), found by the label's start.
function tippedRow(page, label) {
  return page.locator("div.border-b", { has: page.locator(".header-tip-label").filter({ hasText: new RegExp(`^${label}`) }) });
}


const SHOOTING = "Shooting and passing";

test("the Four Factors panel shows offense, defense and pace and ratings for both teams", async ({ page }) => {
  await openComparison(page);

  await expect(page.getByRole("region", { name: "Offense" })).toBeVisible();
  await expect(page.getByRole("region", { name: DEFENSE })).toBeVisible();
  await expect(page.getByRole("region", { name: "Pace and ratings" })).toBeVisible();

  const efg = factorRow(page, "Offense", "eFG%");
  await expect(efg).toContainText("59.0%");
  await expect(efg).toContainText("50.0%");
  await expect(factorRow(page, "Offense", "FT rate")).toContainText("20.0%");
  await expect(factorRow(page, DEFENSE, "Opp eFG%")).toContainText("50.0%");
  await expect(factorRow(page, DEFENSE, "DRB%")).toContainText("70.0%");
  await expect(factorRow(page, "Pace and ratings", "Pace")).toContainText("70.0");
  await expect(factorRow(page, "Pace and ratings", "Offensive rating")).toContainText("114.0");
  await expect(factorRow(page, "Pace and ratings", "Net rating")).toContainText("+14.0");
  await expect(factorRow(page, "Pace and ratings", "Net rating")).toContainText("-14.0");
});

test("directions decide the highlighted side and the lower-is-better notes", async ({ page }) => {
  await openComparison(page);

  // Higher eFG% is better, so Team A (59.0%) is highlighted; a lower turnover percentage is better, so Team A (12.0%) again.
  await expect(factorRow(page, "Offense", "eFG%").locator(".text-primary")).toContainText("59.0%");
  const tov = factorRow(page, "Offense", "TOV%");
  await expect(tov).toContainText("Lower is better");
  await expect(tov.locator(".text-primary")).toContainText("12.0%");
  // Pace is neutral: neither side is highlighted and there is no note.
  const pace = factorRow(page, "Pace and ratings", "Pace");
  await expect(pace.locator(".text-primary")).toHaveCount(0);
  await expect(pace).not.toContainText("Lower is better");
  await expect(factorRow(page, "Pace and ratings", "Defensive rating")).toContainText("Lower is better");
});

test("a team's season average is printed and marked, and a team with too few games has none", async ({ page }) => {
  await openComparison(page);

  const efg = factorRow(page, "Offense", "eFG%");
  await expect(efg.getByText("Season avg 55.0%")).toBeVisible();
  await expect(efg.locator("span[title='Season avg 55.0%']")).toHaveCount(1);
  await expect(efg.getByText(/Season avg/)).toHaveCount(1);
  await expect(factorRow(page, "Pace and ratings", "Net rating").getByText("Season avg +5.0")).toBeVisible();
  await expect(
    page.getByText("Season averages need at least 3 games, so they are hidden for a team that has played fewer."),
  ).toBeVisible();
});

test("with both averages available the panel explains the tick instead", async ({ page }) => {
  const advanced = {
    ...ADVANCED,
    teams: [ADVANCED.teams[0], { ...ADVANCED.teams[1], season: { ...ADVANCED.teams[0].season, efgPct: 0.51 } }],
  };
  await openComparison(page, { advanced });

  await expect(page.getByText("The tick on each bar marks the team's season average through round 2.")).toBeVisible();
  await expect(factorRow(page, "Offense", "eFG%").getByText(/Season avg/)).toHaveCount(2);
  await expect(page.getByText("Season averages need at least 3 games")).toHaveCount(0);
});

test("the box-score rows are mirrored rows (no bars) with the old values", async ({ page }) => {
  await openComparison(page);

  await expect(page.locator("table")).toHaveCount(0);
  const points = boxScoreRow(page, "Points");
  await expect(points).toContainText("80");
  await expect(points).toContainText("70");
  await expect(points.locator(".text-primary")).toContainText("80");
  await expect(page.getByText("20-30 (66.7%)")).toBeVisible();
  const turnovers = boxScoreRow(page, "Turnovers");
  await expect(turnovers).toContainText("Lower is better");
  await expect(turnovers.locator(".text-primary")).toContainText("10");

  // Basic counts carry no tip; a row built from other numbers explains itself.
  await expect(points.locator(".header-tip-label")).toHaveCount(0);
  await expect(turnovers.locator(".header-tip-label")).toHaveCount(0);
  await expect(tippedRow(page, "Starters' points")).toHaveCount(1);
});

test("the Head to head adds field goals, starters' points, team turnovers and the coaches", async ({ page }) => {
  await openComparison(page);

  await expect(tippedRow(page, "Field goals")).toContainText("30-55 (54.5%)");
  // Starters' and bench points add up to the total.
  const starters = Number((await tippedRow(page, "Starters' points").locator("span.tabular-nums").first().textContent()).trim());
  const bench = Number((await boxScoreRow(page, "Bench points").locator("span.tabular-nums").first().textContent()).trim());
  expect(starters + bench).toBe(80);
  // No team line in this box score: a dash, not a zero.
  await expect(tippedRow(page, "Team turnovers")).toContainText("—");
  // Left out on purpose: points by shot type, possible points, team rebounds, rebound share and PIR.
  for (const label of ["Points from 2s", "Possible points scored", "Team rebounds", "Rebound share", "PIR"]) {
    await expect(page.getByRole("region", { name: "Scoring" }).locator("xpath=..").getByText(label, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByText("Coach: Alpha Coach")).toBeVisible();
  await expect(page.getByText("Coach: Bravo Coach")).toBeVisible();
});

test("the Four Factors add the possessions and the steal and block rates", async ({ page }) => {
  const advanced = { ...ADVANCED, teams: ADVANCED.teams.map((team) => ({ ...team, possessions: 70, ownPossessionsEstimate: team.side === "local" ? 71 : 69 })) };
  await openComparison(page, { advanced });

  await expect(factorRow(page, "Pace and ratings", "Possessions")).toContainText("70.0");
  await expect(factorRow(page, "Pace and ratings", "Own possessions")).toContainText("71.0");
  await expect(factorRow(page, "Pace and ratings", "Own possessions")).toContainText("69.0");
  // Steals per opponent possession: 7 / 70 and 9 / 70.
  await expect(factorRow(page, DEFENSE, "Steal %")).toContainText("10.0%");
  await expect(factorRow(page, DEFENSE, "Steal %")).toContainText("12.9%");
  await expect(factorRow(page, DEFENSE, "Block %")).toBeVisible();
});

test("the Head to head rows are grouped, one line per stat", async ({ page }) => {
  await openComparison(page);

  for (const group of ["Scoring", "Shooting", "Rebounds", "Ball and defense", "Fouls"]) {
    await expect(page.getByRole("region", { name: group, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Scoring" }).locator("div.border-b")).toHaveCount(4);
  // The label sits between the two values, on their line.
  const points = boxScoreRow(page, "Points");
  const label = await points.getByText("Points", { exact: true }).boundingBox();
  const value = await points.getByText("80", { exact: true }).boundingBox();
  expect(Math.abs(label.y + label.height / 2 - (value.y + value.height / 2))).toBeLessThan(6);
  expect(value.x).toBeLessThan(label.x);
});

test("the standard rows and the scoring profile sit on the left and the Four Factors on the right on a wide screen, stacked on a narrow one", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await openComparison(page);

  const left = await boxScoreRow(page, "Points").boundingBox();
  const right = await factorRow(page, "Offense", "eFG%").boundingBox();
  expect(right.x).toBeGreaterThan(left.x + left.width - 1);
  expect(Math.abs(left.y - right.y)).toBeLessThan(400);

  // Neither panel is stretched: the Scoring profile sits right under the Head to head rows, in the same column.
  const leftPanel = await page.locator(".panel", { has: boxScoreRow(page, "Points") }).boundingBox();
  const profilePanel = await page.locator("section", { has: page.getByRole("heading", { name: "How each team scored and how the game was led" }) }).boundingBox();
  expect(Math.abs(profilePanel.x - leftPanel.x)).toBeLessThan(2);
  expect(profilePanel.y).toBeGreaterThan(leftPanel.y + leftPanel.height);
  expect(profilePanel.y - (leftPanel.y + leftPanel.height)).toBeLessThan(60);

  await page.setViewportSize({ width: 600, height: 1000 });
  const stackedLeft = await boxScoreRow(page, "Points").boundingBox();
  const stackedRight = await factorRow(page, "Offense", "eFG%").boundingBox();
  expect(stackedRight.y).toBeGreaterThan(stackedLeft.y);
  expect(Math.abs(stackedRight.x - stackedLeft.x)).toBeLessThan(2);
});

test("a game without advanced data says so and the box-score rows stay", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Four Factors aren't available for this game yet.")).toBeVisible();
  await expect(boxScoreRow(page, "Points")).toContainText("80");
});

test("a failed advanced request shows a retry in the panel and keeps the box-score rows", async ({ page }) => {
  await mockGameApi(page, { advancedStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Could not load the Four Factors.")).toBeVisible();
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expect(boxScoreRow(page, "Points")).toContainText("80");
});

test("a failed box score shows a retry for the rows and keeps the Four Factors", async ({ page }) => {
  await mockGameApi(page, { advanced: ADVANCED, boxScoreStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();

  await expect(page.getByText("Could not load team comparison.")).toBeVisible({ timeout: 20_000 });
  await expect(factorRow(page, "Offense", "eFG%")).toContainText("59.0%");
});

test("an unplayed game has no comparison tab and does not request advanced stats", async ({ page }) => {
  const requests = [];
  await mockGameApi(page, { played: false, requests });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("tab", { name: "Team comparison", exact: true })).toHaveCount(0);
  await expect(page.getByText("Four Factors")).toHaveCount(0);
  expect(requests.some((pathname) => pathname.endsWith("/advanced"))).toBe(false);
  expect(requests.some((pathname) => pathname.endsWith("/shots"))).toBe(false);
});

test("true shooting and assist ratio sit in their own block with the season average", async ({ page }) => {
  await openComparison(page);

  const ts = factorRow(page, SHOOTING, "TS%");
  await expect(ts).toContainText("62.0%");
  await expect(ts).toContainText("55.0%");
  await expect(ts.locator(".text-primary")).toContainText("62.0%");
  await expect(ts.getByText("Season avg 58.0%")).toBeVisible();
  await expect(ts.locator("span[title='Season avg 58.0%']")).toHaveCount(1);
  const assists = factorRow(page, SHOOTING, "Assist ratio");
  await expect(assists).toContainText("50.0%");
  await expect(assists.getByText("Season avg 55.0%")).toBeVisible();
  // Team B's season block is hidden, so it has no average on either row.
  await expect(assists.getByText(/Season avg/)).toHaveCount(1);
});

test("a game value the pipeline left empty prints a dash, not 0", async ({ page }) => {
  const advanced = { ...ADVANCED, teams: [{ ...ADVANCED.teams[0], trueShootingPct: null, assistRatio: null }, ADVANCED.teams[1]] };
  await openComparison(page, { advanced });

  const ts = factorRow(page, SHOOTING, "TS%");
  await expect(ts).toContainText("—");
  await expect(ts).not.toContainText("0.0%");
  // A dash is not a 0 to beat: neither side is highlighted.
  await expect(ts.locator(".text-primary")).toHaveCount(0);
  await expect(factorRow(page, SHOOTING, "Assist ratio")).toContainText("—");
});

test("bench points add up the players who did not start, right after Points", async ({ page }) => {
  await openComparison(page);

  const bench = boxScoreRow(page, "Bench points");
  await expect(bench).toContainText("12");
  await expect(bench).toContainText("8");
  await expect(bench.locator(".text-primary")).toContainText("12");
  const points = await boxScoreRow(page, "Points").boundingBox();
  const benchBox = await bench.boundingBox();
  const twoPoint = await boxScoreRow(page, "2PT").boundingBox();
  expect(benchBox.y).toBeGreaterThan(points.y);
  expect(benchBox.y).toBeLessThan(twoPoint.y);
});

test("bench points are a dash when the feed marks no starter", async ({ page }) => {
  const boxScore = { ...BOX_SCORE, playerStats: BOX_SCORE.playerStats.map((row) => ({ ...row, started: null, startedAlt: null })) };
  await openComparison(page, { boxScore });

  const bench = boxScoreRow(page, "Bench points");
  await expect(bench).toContainText("—");
  await expect(bench).not.toContainText("0");
});

test("points in the paint count made restricted-area and paint shots with a location", async ({ page }) => {
  const shots = [
    shot(1, "A", "2FGM", 0, 50),
    shot(2, "A", "2FGM", 0, 290),
    shot(3, "A", "2FGA", 0, 290),
    shot(4, "A", "3FGM", 700, -100),
    shot(5, "A", "2FGM", -1, -1),
    shot(6, "B", "2FGA", 0, 50),
  ];
  await openComparison(page, { shots });

  const paint = boxScoreRow(page, "Points in the paint");
  await expect(paint.locator(".text-primary")).toContainText("4");
  // Team B took a located shot and made none in the paint: a real 0.
  await expect(paint).toContainText("0");
  await expect(paint).not.toContainText("—");
});

test("a game without shots shows dashes for points in the paint", async ({ page }) => {
  await openComparison(page, { shots: [] });

  const paint = boxScoreRow(page, "Points in the paint");
  await expect(paint.getByText("—")).toHaveCount(2);
  await expect(page.getByText("Points in the paint couldn't be loaded.")).toHaveCount(0);
});

test("a failed shots request shows dashes and a retry, and keeps the other rows", async ({ page }) => {
  await openComparison(page, { shotsStatus: 500 });

  await expect(page.getByText("Points in the paint couldn't be loaded.")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("p", { hasText: "Points in the paint couldn't be loaded." }).getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(boxScoreRow(page, "Points in the paint").getByText("—")).toHaveCount(2);
  await expect(boxScoreRow(page, "Points")).toContainText("80");
  await expect(boxScoreRow(page, "Bench points")).toContainText("12");
  await expect(factorRow(page, "Offense", "eFG%")).toContainText("59.0%");
});
