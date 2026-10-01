import { test, expect } from "@playwright/test";
import { BOX_SCORE, SEASON, mockGameApi, player } from "./support/game-fixtures";

async function openRotations(page) {
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Rotations", exact: true })).toHaveAttribute("aria-selected", "true");
}

test("the Rotations tab comes after Game flow and does not scroll the page", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("tab", { name: "Rotations", exact: true })).toBeVisible();
  const labels = await page.getByRole("tablist", { name: "Game detail" }).getByRole("tab").allTextContents();
  expect(labels.indexOf("Rotations")).toBe(labels.indexOf("Game flow") + 1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await openRotations(page);
  await expect(page.getByRole("heading", { name: "Minutes on the court" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("an unplayed game's Rotations tab says it is not available yet", async ({ page }) => {
  await mockGameApi(page, { played: false });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);

  await expect(page.getByText("Rotations aren't available until this game is played.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a play-by-play failure shows a retry on the Rotations tab", async ({ page }) => {
  await mockGameApi(page, { playByPlayStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);

  // The query retries a few times before it reports the error.
  const alert = page.getByRole("alert").filter({ hasText: "Could not load rotations." });
  await expect(alert).toBeVisible({ timeout: 20_000 });
  await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible();
});

const NAMES = { A1: "ONE, AL", A2: "TWO, ABE", A3: "THREE, ART", A4: "FOUR, ARI", A5: "FIVE, ABBY", B1: "UNO, BO", B2: "DOS, BEN" };

function event(periodNumber, markerTime, playType, clubCode, personCode) {
  return { periodNumber, markerTime, playType, clubCode, personCode, playerName: NAMES[personCode] ?? personCode };
}

function rosterBox(overrides = {}) {
  const starter = (side, key, name, timePlayed) => player(side, key, name, { started: true, timePlayed });
  return {
    periodScores: BOX_SCORE.periodScores,
    teamStats: BOX_SCORE.teamStats,
    playerStats: [
      starter("local", "A1", "ONE, AL", overrides.A1 ?? 2340),
      starter("local", "A2", "TWO, ABE", 2700),
      starter("local", "A3", "THREE, ART", 2700),
      starter("local", "A4", "FOUR, ARI", 2700),
      starter("local", "A5", "FIVE, ABBY", 2700),
      player("local", "A6", "SIX, ABEL", { timePlayed: overrides.A6 ?? 360 }),
      player("local", "A7", "SEVEN, AMY", { timePlayed: 0 }),
      starter("road", "B1", "UNO, BO", 1500),
      starter("road", "B2", "DOS, BEN", 2700),
      starter("road", "B3", "TRES, BAZ", 2700),
      starter("road", "B4", "CUATRO, BEA", 2700),
      starter("road", "B5", "CINCO, BIA", 2700),
      player("road", "B6", "SEIS, BRI", { timePlayed: 1200 }),
    ],
  };
}

// Q1 06:00 A1 out, A6 in; A6 out and A1 back in at the start of Q2; B1 out and B6 in at Q3 05:00; a basket in
// overtime so the game has five periods (2,700 seconds).
const ROTATION_EVENTS = [
  event(1, "06:00", "OUT", "A", "A1"),
  event(1, "06:00", "IN", "A", "A6"),
  event(2, "10:00", "OUT", "A", "A6"),
  event(2, "10:00", "IN", "A", "A1"),
  event(3, "05:00", "OUT", "B", "B1"),
  event(3, "05:00", "IN", "B", "B6"),
  event(5, "03:00", "2FGM", "A", "A2"),
];

async function openTimeline(page) {
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minutes on the court" })).toBeVisible();
}

function teamBlock(page, firstName) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Minutes on the court" }) })
    .locator("div.panel", { hasText: firstName });
}

test("the timeline places stints from the substitution times, one bar across period boundaries", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox(), playByPlay: { events: ROTATION_EVENTS } });
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  const teamA = teamBlock(page, "ONE, AL");
  // Starters by minutes then name, then the bench; the player who did not play has no row.
  const rows = teamA.locator("li");
  await expect(rows).toHaveCount(6);
  await expect(rows.first()).toContainText("FIVE, ABBY");
  await expect(rows.nth(4)).toContainText("ONE, AL");
  await expect(rows.nth(5)).toContainText("SIX, ABEL");
  await expect(teamA).not.toContainText("SEVEN, AMY");

  // A starter who never leaves is one bar from the opening tip to the end of overtime.
  const two = teamA.locator("li", { hasText: "TWO, ABE" }).locator("span[title]");
  await expect(two).toHaveCount(1);
  await expect(two).toHaveAttribute("title", "Q1 10:00 to OT1 00:00");
  // A swap in the middle of a period, and one at a period start.
  const one = teamA.locator("li", { hasText: "ONE, AL" }).locator("span[title]");
  await expect(one).toHaveCount(2);
  await expect(one.nth(0)).toHaveAttribute("title", "Q1 10:00 to Q1 06:00");
  await expect(one.nth(1)).toHaveAttribute("title", "Q2 10:00 to OT1 00:00");
  await expect(teamA.locator("li", { hasText: "SIX, ABEL" }).locator("span[title]")).toHaveAttribute("title", "Q1 06:00 to Q2 10:00");
  // Reconstructed minutes: 2,340 s and 360 s.
  await expect(rows.nth(4)).toContainText("39:00");
  await expect(rows.nth(5)).toContainText("6:00");
  // Screen readers get the stints as text.
  await expect(teamA.locator("li", { hasText: "ONE, AL" }).locator(".sr-only")).toHaveText(
    "On court: Q1 10:00 to Q1 06:00, Q2 10:00 to OT1 00:00",
  );

  const teamB = teamBlock(page, "UNO, BO");
  await expect(teamB.locator("li", { hasText: "SEIS, BRI" }).locator("span[title]")).toHaveAttribute("title", "Q3 05:00 to OT1 00:00");
  // The overtime period is marked on the axis.
  await expect(teamA.getByText("OT1", { exact: true })).toBeVisible();
});

test("the badge says Matches when the minutes agree", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox(), playByPlay: { events: ROTATION_EVENTS } });
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  await expect(page.getByText("Matches the box score")).toHaveCount(2);
});

test("a gap over 30 seconds against the box score is called out", async ({ page }) => {
  await mockGameApi(page, { boxScore: rosterBox({ A6: 460 }), playByPlay: { events: ROTATION_EVENTS } });
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  await expect(teamBlock(page, "ONE, AL").getByText("Approximate · up to 100 s off the box score")).toBeVisible();
  await expect(teamBlock(page, "UNO, BO").getByText("Matches the box score")).toBeVisible();
});

test("a substitution that cannot be placed makes the result approximate", async ({ page }) => {
  // A2 is already on the court, so an IN for A2 cannot be placed.
  const events = [...ROTATION_EVENTS, event(1, "05:00", "IN", "A", "A2")];
  await mockGameApi(page, { boxScore: rosterBox(), playByPlay: { events } });
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  await expect(teamBlock(page, "ONE, AL").getByText("Approximate · some substitutions couldn't be placed")).toBeVisible();
});

test("a team without exactly five starters has no timeline", async ({ page }) => {
  // The default fixture has one starter per team.
  const events = [event(1, "06:00", "OUT", "A", "A-STARTER"), event(1, "06:00", "IN", "A", "A-BENCH")];
  await mockGameApi(page, { playByPlay: { events } });
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  await expect(page.getByText("Starting lineup isn't available for this game.")).toHaveCount(2);
});

test("without substitution events the tab says there is not enough play-by-play yet", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await openTimeline(page);

  await expect(page.getByText("Not enough play-by-play yet to build rotations.")).toBeVisible();
});

function connectionsBlock(page, teamName) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Assist connections" }) })
    .locator("div.panel", { hasText: teamName });
}

const made = (playType, clubCode, personCode) => event(1, "05:00", playType, clubCode, personCode);
const assist = (clubCode, personCode) => event(1, "05:00", "AS", clubCode, personCode);

// Four linked assists for Team A (ONE to TWO twice, ONE to THREE, TWO to FOUR) and three that cannot be linked: one
// after a free throw, one by the scorer himself, and one after the other team's basket.
const CONNECTION_EVENTS = [
  made("2FGM", "A", "A2"), assist("A", "A1"),
  made("3FGM", "A", "A2"), assist("A", "A1"),
  made("2FGM", "A", "A3"), assist("A", "A1"),
  made("2FGM", "A", "A4"), assist("A", "A2"),
  made("FTM", "A", "A5"), assist("A", "A3"),
  made("2FGM", "A", "A5"), assist("A", "A5"),
  made("2FGM", "B", "B1"), assist("A", "A1"),
];

test("connections link an assist only to the made field goal right before it", async ({ page }) => {
  await mockGameApi(page, { playByPlay: { events: CONNECTION_EVENTS } });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);
  await expect(page.getByRole("heading", { name: "Assist connections" })).toBeVisible();

  const teamA = connectionsBlock(page, "Team A");
  const pairs = teamA.locator("li");
  // Most baskets first; the tie on one basket and two points goes to the passer's name (ONE before TWO).
  await expect(pairs).toHaveCount(3);
  await expect(pairs.nth(0)).toContainText("ONE, AL");
  await expect(pairs.nth(0)).toContainText("TWO, ABE");
  await expect(pairs.nth(0)).toContainText("2 baskets · 5 pts");
  await expect(pairs.nth(1)).toContainText("ONE, AL");
  await expect(pairs.nth(1)).toContainText("THREE, ART");
  await expect(pairs.nth(1)).toContainText("1 basket · 2 pts");
  await expect(pairs.nth(2)).toContainText("TWO, ABE");
  await expect(pairs.nth(2)).toContainText("FOUR, ARI");

  // The three assists that cannot be linked count in the note but in no pair.
  await expect(teamA).toContainText("Assisted baskets: 4 of 5");
  await expect(teamA).toContainText("4 of 7 recorded assists were linked to a basket.");
  await expect(teamA.getByRole("link", { name: "ONE, AL" }).first()).toHaveAttribute("href", `/${SEASON}/players/A1`);

  await expect(connectionsBlock(page, "Team B")).toContainText("No assists recorded.");
});

test("only the five most frequent pairs are shown", async ({ page }) => {
  const pairs = [["A1", "A2"], ["A1", "A3"], ["A1", "A4"], ["A1", "A5"], ["A2", "A3"], ["A2", "A4"]];
  const events = pairs.flatMap(([passer, scorer]) => [made("2FGM", "A", scorer), assist("A", passer)]);
  await mockGameApi(page, { playByPlay: { events } });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);

  await expect(connectionsBlock(page, "Team A").locator("li")).toHaveCount(5);
  await expect(connectionsBlock(page, "Team A")).toContainText("6 of 6 recorded assists were linked to a basket.");
});

test("assists that cannot be linked leave an honest empty state", async ({ page }) => {
  const events = [made("FTM", "A", "A5"), assist("A", "A3")];
  await mockGameApi(page, { playByPlay: { events } });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);

  const teamA = connectionsBlock(page, "Team A");
  await expect(teamA).toContainText("No assist could be linked to a basket.");
  await expect(teamA).toContainText("0 of 1 recorded assists were linked to a basket.");
  await expect(teamA.locator("li")).toHaveCount(0);
});

test("a box score failure leaves the connections in place", async ({ page }) => {
  await mockGameApi(page, { boxScoreStatus: 500, playByPlay: { events: CONNECTION_EVENTS } });
  await page.goto(`/${SEASON}/games/1`);
  await openRotations(page);

  await expect(connectionsBlock(page, "Team A")).toContainText("2 baskets · 5 pts");
  // The timeline reports its own error once the box score query gives up retrying.
  await expect(page.getByRole("alert").filter({ hasText: "Could not load the box score for rotations." })).toBeVisible({ timeout: 20_000 });
  await expect(connectionsBlock(page, "Team A")).toContainText("2 baskets · 5 pts");
});
