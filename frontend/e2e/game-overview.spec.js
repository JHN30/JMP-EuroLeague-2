import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, mockGameApi, player } from "./support/game-fixtures";

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

const OFFICIALS = [
  { number: 1, code: "O1", name: "JAVOR, DAMIR", countryCode: "SLO", countryName: "Slovenia" },
  { number: 2, code: "O2", name: "ALIAGA, JORDI", countryCode: "ESP", countryName: "Spain" },
  { number: 3, code: "O3", name: "GIOVANNETTI, GUIDO", countryCode: "ITA", countryName: "Italy" },
];
// The officials' entry in the game header's match information.
const officialsInHeader = (page) => page.locator("dl > div", { has: page.locator("dt", { hasText: /^Officials$/ }) }).locator("dd");

test("the game reply lists its officials in the feed's order, and an empty list for a game without them", async ({ request }) => {
  const health = await (await request.get("http://localhost:3000/api/health")).json();
  expect(health.target).toBe("local");
  const { game, officials } = await (await request.get("http://localhost:3000/api/seasons/2025/games/1")).json();
  expect(game.gameCode).toBe(1);
  expect(officials.map((official) => official.number)).toEqual([1, 2, 3]);
  for (const official of officials) {
    expect(Object.keys(official).sort()).toEqual(["code", "countryCode", "countryName", "name", "number"]);
    expect(official.name).toMatch(/^[^,]+, .+$/);
  }
  expect(officials[0]).toMatchObject({ name: "JAVOR, DAMIR", countryName: "Slovenia" });
  // The furthest-off game still to come in the season in progress: officials are assigned only shortly before a game.
  const { games } = await (await request.get("http://localhost:3000/api/seasons/2026/games?limit=100")).json();
  const unplayed = games.filter((entry) => !entry.played).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))[0];
  const later = await (await request.get(`http://localhost:3000/api/seasons/2026/games/${unplayed.gameCode}`)).json();
  expect(later.game.gameCode).toBe(unplayed.gameCode);
  expect(later.officials).toEqual([]);
});

test("a played game names its officials in the header, as players are named, on every tab", async ({ page }) => {
  await page.goto("/2025/games/1");
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible({ timeout: 30_000 });
  await expect(officialsInHeader(page)).toHaveText("Damir Javor, Jordi Aliaga, Guido Giovannetti");
  // In the header, not in an Overview section of their own.
  await expect(page.getByRole("heading", { name: "Game officials" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(officialsInHeader(page)).toHaveText("Damir Javor, Jordi Aliaga, Guido Giovannetti");
});

// An entry in the game header's match information, by its label.
const headerEntry = (page, label) => page.locator("dl > div", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");

test("the game reply carries the arena and the crowd, with a missing figure as null", async ({ request }) => {
  const health = await (await request.get("http://localhost:3000/api/health")).json();
  expect(health.target).toBe("local");
  const { venue } = await (await request.get("http://localhost:3000/api/seasons/2025/games/1")).json();
  expect(venue).toEqual({ name: "MORACA", capacity: 5262, attendance: 2110, neutral: false });
  // The feed reported 0 for this Final Four's crowd: the arena is there, the attendance is not.
  const finalFour = await (await request.get("http://localhost:3000/api/seasons/2025/games/404")).json();
  expect(finalFour.venue).toEqual({ name: "TELEKOM CENTER ATHENS", capacity: 18500, attendance: null, neutral: false });
  // The E2024 Final Four semi-finals in Abu Dhabi are the games the feed flags as at a neutral venue.
  const abuDhabi = await (await request.get("http://localhost:3000/api/seasons/2024/games/327")).json();
  expect(abuDhabi.venue).toEqual({ name: "ETIHAD ARENA", capacity: 12000, attendance: 10218, neutral: true });
});

test("a played game shows its arena and attendance in the header, on every tab, without the capacity the crowd figure replaces", async ({ page }) => {
  await page.goto("/2025/games/1");
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible({ timeout: 30_000 });
  await expect(headerEntry(page, "Arena")).toHaveText("Moraca");
  await expect(headerEntry(page, "Attendance")).toHaveText("2,110");
  await expect(page.locator("main dl > div > dt")).toHaveText(["Arena", "Attendance", "Officials"]);
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(headerEntry(page, "Attendance")).toHaveText("2,110");
});

test("an unplayed game shows its arena and no attendance; a neutral venue without a capacity says so", async ({ page }) => {
  await mockGameApi(page, { played: false, venue: { name: "BELGRADE ARENA", capacity: 21000, attendance: 15000, neutral: false } });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "This game hasn't been played yet" })).toBeVisible();
  await expect(headerEntry(page, "Arena")).toHaveText("Belgrade ArenaCapacity 21,000");
  await expect(page.locator("dt", { hasText: /^Attendance$/ })).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockGameApi(page, { venue: { name: "WiZink Center", capacity: null, attendance: null, neutral: true } });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  await expect(headerEntry(page, "Arena")).toHaveText("WiZink CenterNeutral venue");
  await expect(page.locator("dt", { hasText: /^Attendance$/ })).toHaveCount(0);
});

test("a game without officials has no match information, and an unplayed game with them names them in the header", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  await expect(page.locator("dt", { hasText: /^Officials$/ })).toHaveCount(0);
  await expect(page.locator("main dl")).toHaveCount(0);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockGameApi(page, { played: false, officials: OFFICIALS });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "This game hasn't been played yet" })).toBeVisible();
  await expect(officialsInHeader(page)).toHaveText("Damir Javor, Jordi Aliaga, Guido Giovannetti");
});

test("an unplayed game shows only the Overview tab and does not request the box score", async ({ page }) => {
  const requests = [];
  await mockGameApi(page, { played: false, requests });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "This game hasn't been played yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Compare / })).toHaveAttribute("href", /\/compare\?teamA=.+&teamB=.+&game=1$/);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requests.some((pathname) => pathname.endsWith("/box-score"))).toBe(false);
});

test("Compare, opened from an unplayed game, goes back to that game", async ({ page }) => {
  await mockGameApi(page, { played: false });
  await page.route(`**/api/seasons/${SEASON}/phases`, (route) => route.fulfill({ json: { phases: [{ code: "RS", name: "Regular season" }] } }));
  await page.route(`**/api/seasons/${SEASON}/teams`, (route) =>
    route.fulfill({ json: { teams: [{ clubCode: "A", name: "Team A" }, { clubCode: "B", name: "Team B" }] } }),
  );
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("link", { name: /^Compare / }).click();

  const back = page.getByRole("link", { name: "Back to Game" });
  await expect(back).toHaveAttribute("href", `/${SEASON}/games/1`);
  await back.click();
  await expect(page).toHaveURL(new RegExp(`/${SEASON}/games/1$`));
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
  await expect(teamALeaders.locator("li", { hasText: /^Points/ })).toContainText("STARTER, SAM30");
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

test("the best player is chosen by game PER when the game has advanced stats", async ({ page }) => {
  await mockGameApi(page, { advanced: ADVANCED });
  await page.goto(`/${SEASON}/games/1`);

  // PIR would pick STARTER, SAM (25); game PER picks BENCH, BO (24.0 against 20.1).
  const teamABest = page.getByRole("article", { name: "Team A best player" });
  await expect(teamABest.getByRole("link", { name: "BENCH, BO" })).toBeVisible();
  await expect(teamABest).toContainText("PER 24.0");
  await expect(teamABest).not.toContainText("PIR");
  await expect(page.getByRole("article", { name: "Team B best player" })).toContainText("PER 31.5");
});

test("a failed advanced request leaves the PIR best player in place", async ({ page }) => {
  await mockGameApi(page, { advancedStatus: 500 });
  await page.goto(`/${SEASON}/games/1`);

  await expect(page.getByRole("article", { name: "Team A best player" })).toContainText("PIR 25");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

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
  await expect(teamALeaders.locator("li", { hasText: /^Points/ })).toContainText("ALPHA, AL12");
  await expect(teamALeaders.locator("li", { hasText: "Rebounds" })).toContainText("ALPHA, AL6");
  await expect(teamALeaders.locator("li", { hasText: "Assists" })).toHaveText(/Assists\s*—/);

  // Leaders ignore the 10-minute minimum, and a player with no minutes data is not considered.
  const teamBLeaders = page.getByRole("group", { name: "Team B game leaders" });
  await expect(teamBLeaders.locator("li", { hasText: /^Points/ })).toContainText("ONE, OLI20");
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
  const section = page.getByRole("region", { name: "How the teams compared" });
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

test("from 1024px the line score and the score flow share the top row, and the key stats sit between the two team cards", async ({ page }) => {
  await mockGameApi(page, { playByPlay: PLAY_BY_PLAY });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();

  const box = (locator) => locator.boundingBox();
  const sectionBox = (name) => box(page.locator("section", { has: page.getByRole("heading", { name }) }));
  // The sections slide in: compare them once they have settled.
  await expect.poll(async () => Math.abs((await sectionBox("Score by period")).y - (await sectionBox("Score flow")).y)).toBeLessThan(2);
  const [lineScore, flow] = await Promise.all([sectionBox("Score by period"), sectionBox("Score flow")]);
  expect(flow.x).toBeGreaterThan(lineScore.x + lineScore.width - 1);

  const card = (name) => box(page.locator(".panel", { has: page.getByRole("group", { name: `${name} game leaders` }) }));
  const [home, road, keyStats] = await Promise.all([card("Team A"), card("Team B"), box(page.getByRole("region", { name: "How the teams compared" }))]);
  expect(keyStats.x).toBeGreaterThan(home.x + home.width - 1);
  expect(road.x).toBeGreaterThan(keyStats.x + keyStats.width - 1);
  expect(Math.abs(home.y - keyStats.y)).toBeLessThan(2);
  expect(keyStats.y).toBeGreaterThan(flow.y);

  // Below 1024px the cards are side by side over the key stats, and the score flow comes last.
  await page.setViewportSize({ width: 768, height: 900 });
  const [narrowHome, narrowRoad, narrowStats] = await Promise.all([card("Team A"), card("Team B"), box(page.getByRole("region", { name: "How the teams compared" }))]);
  expect(Math.abs(narrowHome.y - narrowRoad.y)).toBeLessThan(2);
  expect(narrowStats.y).toBeGreaterThan(narrowHome.y + narrowHome.height - 1);
  const narrowFlow = await box(page.locator("section", { has: page.getByRole("heading", { name: "Score flow" }) }));
  expect(narrowFlow.y).toBeGreaterThan(narrowStats.y + narrowStats.height - 1);
});

test("the team cards list five leaders below 1024px and eight from it, and the line score stands as tall as the score flow", async ({ page }) => {
  await mockGameApi(page, { playByPlay: PLAY_BY_PLAY });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/${SEASON}/games/1`);
  const leaders = page.getByRole("group", { name: "Team A game leaders" });
  await expect(leaders).toBeVisible();
  const shownLabels = () =>
    leaders.locator("li").evaluateAll((items) =>
      items
        .filter((item) => item.getBoundingClientRect().height > 0)
        .map((item) => {
          // The label without a tip's screen-reader text.
          const label = item.firstElementChild.cloneNode(true);
          label.querySelectorAll(".sr-only").forEach((el) => el.remove());
          return label.textContent;
        }),
    );
  await expect.poll(shownLabels).toEqual(["Points", "Rebounds", "Assists", "Steals", "Blocks"]);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(shownLabels).toEqual(["Points", "Rebounds", "Assists", "Steals", "Blocks", "+/-", "PIR", "TS%"]);
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();
  const panelHeight = (name) =>
    page.locator("section", { has: page.getByRole("heading", { name }) }).locator(".panel").first().evaluate((el) => Math.round(el.getBoundingClientRect().height));
  await expect.poll(async () => Math.abs((await panelHeight("Score by period")) - (await panelHeight("Score flow")))).toBeLessThan(2);
});

test("below 640px the arena and the crowd share a row over the officials, and an arena without a crowd figure takes the row", async ({ page }) => {
  await mockGameApi(page, { officials: OFFICIALS, venue: { name: "BELGRADE ARENA", capacity: 21000, attendance: 15000, neutral: false } });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  const top = async (label) => Math.round((await page.locator("main dl > div", { has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).boundingBox()).y);
  expect(await top("Arena")).toBe(await top("Attendance"));
  expect(await top("Officials")).toBeGreaterThan(await top("Arena"));

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockGameApi(page, { played: false, officials: OFFICIALS, venue: { name: "BELGRADE ARENA", capacity: 21000, attendance: 15000, neutral: false } });
  await page.goto(`/${SEASON}/games/1`);
  await expect(headerEntry(page, "Arena")).toHaveText("Belgrade ArenaCapacity 21,000");
  const [arena, list] = await Promise.all([
    page.locator("main dl > div", { has: page.locator("dt", { hasText: /^Arena$/ }) }).boundingBox(),
    page.locator("main dl").boundingBox(),
  ]);
  expect(arena.width).toBeGreaterThan(list.width - 2);
});

test("a team whose players all have a negative +/- still names its best one", async ({ page }) => {
  const boxScore = {
    ...BOX_SCORE,
    playerStats: BOX_SCORE.playerStats.map((row) => (row.side === "road" ? { ...row, plusMinus: -Math.abs(row.plusMinus) - 1 } : row)),
  };
  const best = Math.max(...boxScore.playerStats.filter((row) => row.side === "road" && row.timePlayed > 0).map((row) => row.plusMinus));
  await mockGameApi(page, { boxScore });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${SEASON}/games/1`);
  const plusMinus = page.getByRole("group", { name: "Team B game leaders" }).locator("li", { hasText: "+/-" });
  await expect(plusMinus).toBeVisible();
  await expect(plusMinus.locator("a")).toHaveCount(1);
  await expect(plusMinus).toContainText(String(best));
});

test("the line score bolds the side that won each period and the winner's total, and a tied period neither", async ({ page }) => {
  await mockGameApi(page);
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  const lines = await page
    .locator("table")
    .first()
    .locator("tbody tr")
    .evaluateAll((rows) => rows.slice(0, 2).map((row) => [...row.querySelectorAll("td")].slice(1).map((cell) => ({ value: Number(cell.textContent), bold: Number(getComputedStyle(cell).fontWeight) >= 700 }))));
  const [home, road] = lines;
  home.forEach((cell, index) => {
    expect(cell.bold).toBe(cell.value > road[index].value);
    expect(road[index].bold).toBe(road[index].value > cell.value);
  });
});

test("the TS% leader needs five field goal attempts and its label explains it on hover", async ({ page }) => {
  // Team A: a 2-of-2 shooter (100%) is skipped for too few attempts; the 5-of-8 shooter with 2 free throw attempts leads.
  const boxScore = {
    ...BOX_SCORE,
    playerStats: BOX_SCORE.playerStats.map((row, index) => {
      if (row.side !== "local") return row;
      const base = { ...row, fieldGoalsAttempted2: 0, fieldGoalsAttempted3: 0, freeThrowsAttempted: 0, points: 0 };
      if (index === 0) return { ...base, points: 4, fieldGoalsAttempted2: 2 };
      if (index === 1) return { ...base, points: 12, fieldGoalsAttempted2: 8, freeThrowsAttempted: 2 };
      return base;
    }),
  };
  const shooter = boxScore.playerStats[1];
  await mockGameApi(page, { boxScore });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${SEASON}/games/1`);
  const row = page.getByRole("group", { name: "Team A game leaders" }).locator("li", { hasText: "TS%" });
  await expect(row.locator("a")).toHaveText(shooter.personName);
  // 12 / (2 × (8 + 0.44 × 2)) = 67.6%
  await expect(row).toContainText("67.6%");
  await row.locator(".header-tip-label").hover();
  await expect(page.getByRole("tooltip")).toContainText("True shooting percentage");
});
