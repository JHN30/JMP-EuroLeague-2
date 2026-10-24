import { test, expect } from "@playwright/test";

// Mocked records: what the page does with the API's answers. The API itself is records-api.spec.js.
const ROWS = {
  player: [
    { seasonCode: "2026", personKey: "p3", playerName: "THREE, CAL", clubName: "Club C", clubTvCodes: "CCC", playerImageUrl: "/logo-header.png", clubImageUrl: "/favicon-32x32.png", numericValue: 820 },
    { seasonCode: "2025", personKey: "p2", playerName: "TWO, BEN", clubName: "Club B", clubTvCodes: "BBB", playerImageUrl: "/logo-header.png", clubImageUrl: "/favicon-32x32.png", numericValue: 780 },
    { seasonCode: "2024", personKey: "p1", playerName: "ONE, AL", clubName: "Club A", clubTvCodes: "AAA", playerImageUrl: null, clubImageUrl: null, numericValue: 700 },
    { seasonCode: "2025", personKey: "p4", playerName: "FOUR, DEE", clubName: "Club D", clubTvCodes: "DDD", playerImageUrl: null, clubImageUrl: null, numericValue: 650 },
  ],
  game: [{ seasonCode: "2025", gameCode: 42, personKey: "p2", playerName: "Game Player", clubName: "Club", playerImageUrl: null, clubImageUrl: null, numericValue: 35, scheduledAt: "2025-01-15T19:00:00.000Z" }],
  team: [{ seasonCode: "2025", clubCode: "OLY", clubName: "Olympiacos", clubTvCode: "OLY", clubImageUrl: "/logo-header.png", numericValue: 2400 }],
  teamgame: [
    {
      seasonCode: "2025",
      gameCode: 77,
      clubCode: "MAD",
      clubName: "Real Madrid",
      clubTvCode: "RMB",
      clubImageUrl: "/logo-header.png",
      opponentClubCode: "BAR",
      opponentName: "FC Barcelona",
      opponentTvCode: "BAR",
      scheduledAt: "2025-03-02T19:00:00.000Z",
      numericValue: 134,
    },
  ],
};
// The best of each season and the progression the API sends with the rows. The player lists open with a 2005 season that is not among the rows,
// as an early season that never reaches the best 50 does; the other families send their rows as both.
const OLD = { seasonCode: "2005", personKey: "p0", playerName: "ZERO, OLD", clubName: "Club Z", clubTvCodes: "ZZZ", playerImageUrl: null, clubImageUrl: null, numericValue: 400 };
const PLAYER_LISTS = [OLD, ROWS.player[2], ROWS.player[1], ROWS.player[0]];
const LISTS = { player: { bySeason: PLAYER_LISTS, progression: PLAYER_LISTS } };
const ROUTES = { "player-seasons": "player", "single-games": "game", "team-seasons": "team", "team-games": "teamgame" };
const ADVANCED = ["per", "winShares", "gameScore", "offensiveRating", "netRating"];
const MIN_GAMES = { "player-seasons": ["per"], "team-seasons": ["offensiveRating", "netRating"] };

// Mocks the seasons and the four record routes. `rows` replaces a family's rows; `delay` holds back the answer for a metric for that many
// milliseconds; `fail` makes the record routes answer 500. An answer says its group, and its minimum number of games for the ratings that have one.
async function mockApi(page, { rows = {}, delay = {}, fail = false } = {}) {
  const data = { ...ROWS, ...rows };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const match = /\/records\/([a-z-]+)$/.exec(url.pathname);
    if (url.pathname === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2026", name: "2025-26" }] } });
    if (!match || !ROUTES[match[1]]) return route.fulfill({ status: 404, json: {} });
    if (fail) return route.fulfill({ status: 500, json: {} });
    const metric = url.searchParams.get("metric");
    const wait = delay[metric];
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    const family = ROUTES[match[1]];
    const lists = family in rows || !LISTS[family] ? { bySeason: data[family], progression: data[family] } : LISTS[family];
    // Per game: the same rows over 30 games, so the values have decimals; a club needs 20 games of a 34-game season.
    if (url.searchParams.get("per") === "game") {
      const perGame = (list) => list.map((row) => ({ ...row, numericValue: row.numericValue / 30 }));
      const json = { label: "Points per game", metric, group: "traditional", per: "game", minGames: 20 };
      return route.fulfill({ json: { ...json, records: perGame(data[family]), bySeason: perGame(lists.bySeason), progression: perGame(lists.progression) } });
    }
    const minGames = MIN_GAMES[match[1]]?.includes(metric) ? 20 : null;
    return route.fulfill({ json: { label: "Points", metric, group: ADVANCED.includes(metric) ? "advanced" : "traditional", per: "total", minGames, records: data[family], ...lists } });
  });
}

const tab = (page, name) => page.getByRole("tab", { name, exact: true });
const metricTabs = (page) => page.getByRole("tablist", { name: "Record metric" }).getByRole("tab");

test("shows archive-to-date player-season records", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await expect(page.getByRole("heading", { name: "Records", exact: true })).toBeVisible();
  await expect(page.getByText("The highest season totals by one player.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best of each season" })).toBeVisible();
  await expect(page.getByText("Cal Three").first()).toBeVisible();
});

test("shows linked player-game records", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await tab(page, "Player games").click();
  await expect(page.getByText("The best single games by one player.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Game Player" }).first()).toHaveAttribute("href", "/2025/players/p2");
  await expect(page.getByRole("link", { name: "Game", exact: true }).first()).toHaveAttribute("href", "/2025/games/42");
});

test("shows linked team-season records, with the club's crest from the row", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await tab(page, "Team seasons").click();
  await expect(page.getByText("The highest season totals by one club.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Olympiacos" }).first()).toHaveAttribute("href", "/2025/teams/OLY");
  await expect(page.locator("main img[src='/logo-header.png']").first()).toBeVisible();
});

test("shows team-game records: the club, its opponent, the date and the game", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records?type=teamgame");
  await expect(page.getByText("The best single games by one club.")).toBeVisible();
  const podium = page.locator("ol").first().locator("> li");
  await expect(podium.first()).toContainText("Real Madrid");
  await expect(podium.first()).toContainText("vs FC Barcelona");
  await expect(podium.first()).toContainText("2025-26");
  await expect(podium.first().getByRole("link", { name: "Real Madrid" })).toHaveAttribute("href", "/2025/teams/MAD");
  await expect(podium.first().getByRole("link", { name: "Game", exact: true })).toHaveAttribute("href", "/2025/games/77");
  await expect(podium.first().locator("img[src='/logo-header.png']")).toBeVisible();
  // The table has a Game column and the same club, opponent and link.
  const row = page.locator("tbody tr").first();
  await expect(row).toContainText("vs FC Barcelona");
  await expect(row.getByRole("link", { name: "Game", exact: true })).toHaveAttribute("href", "/2025/games/77");
});

test("the podium, the timeline and the Top 50 read from the rows, with the pictures the rows carry", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");

  // The podium: the top three, the names written "First Last", the value, the season, a link to the player in that season's address, and the
  // headshot and the club's crest where the row has them.
  const podium = page.locator("ol").first().locator("> li");
  await expect(podium).toHaveCount(3);
  await expect(podium.nth(0)).toContainText("Cal Three");
  await expect(podium.nth(0)).toContainText("820");
  await expect(podium.nth(0)).toContainText("2026-27");
  await expect(podium.nth(1)).toContainText("Ben Two");
  await expect(podium.nth(2)).toContainText("Al One");
  await expect(page.getByRole("link", { name: "Cal Three" }).first()).toHaveAttribute("href", "/2026/players/p3");
  await expect(podium.nth(0).locator("img[src='/logo-header.png']")).toBeVisible();
  await expect(podium.nth(0).locator("img[src='/favicon-32x32.png']")).toBeVisible();
  // A row without pictures shows none, and nothing breaks.
  await expect(podium.nth(2).locator("img")).toHaveCount(0);

  // The timeline: one panel in place of the progression and best-in-each-season panels. It reads the API's lists, so it opens with the 2005
  // season that is not among the best 50; the summary and the chart's name give the record that stands.
  await expect(page.getByRole("heading", { name: "Record progression" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Best in each season" })).toHaveCount(0);
  const timeline = page.locator("section", { has: page.getByRole("heading", { name: "Best of each season" }) });
  await expect(timeline.getByText("Record: 820, Cal Three, 2026-27. Set 4 times since 2005-06.")).toBeVisible();
  await expect(timeline.getByRole("img", { name: "Points: the best of each season from 2005-06 to 2026-27. Record 820 by Cal Three, 2026-27." })).toBeVisible();

  // Every season under the disclosure, closed at first: oldest first, each record-setting season with its gain, the overall record marked once.
  const best = timeline.locator("details li");
  await expect(best.first()).toBeHidden();
  await timeline.getByText("Show every season (4)").click();
  await expect(best).toHaveCount(4);
  await expect(best.nth(0)).toContainText("2005-06");
  await expect(best.nth(0)).toContainText("Old Zero");
  await expect(best.nth(0)).toContainText("First record");
  await expect(best.nth(1)).toContainText("Al One");
  await expect(best.nth(1)).toContainText("New record +300");
  await expect(best.nth(2)).toContainText("Ben Two");
  await expect(best.nth(2)).toContainText("New record +80");
  await expect(best.nth(3)).toContainText("New record +40");
  await expect(best.nth(3)).toContainText("Record");
  await expect(best.getByText("Record", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Old Zero" })).toHaveAttribute("href", "/2005/players/p0");

  // The Top 50: the four rows, in rank order, with the pictures on the rows that have them; the 2005 season is not among them.
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(page.locator("tbody")).not.toContainText("Old Zero");
  await expect(rows.nth(3)).toContainText("Dee Four");
  await expect(rows.nth(0).locator("img")).toHaveCount(2);
  await expect(rows.nth(3).locator("img")).toHaveCount(0);
});

test("the groups and metrics of each record type, and what a choice keeps", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  // Player seasons: eleven traditional metrics, two advanced ones.
  await expect(tab(page, "Traditional")).toHaveAttribute("aria-selected", "true");
  await expect(metricTabs(page)).toHaveCount(11);
  await expect(metricTabs(page).first()).toHaveText("Points");
  await expect(metricTabs(page).last()).toHaveText("PIR");
  await tab(page, "Advanced").click();
  await expect(metricTabs(page)).toHaveText(["PER", "Win Shares"]);
  await expect(tab(page, "PER")).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/metric=per/);
  // Back to the traditional group opens its first metric, which is the default and so leaves the address.
  await tab(page, "Traditional").click();
  await expect(tab(page, "Points")).toHaveAttribute("aria-selected", "true");
  expect(new URL(page.url()).search).toBe("");

  // Player games has Game Score; the clubs have the two ratings.
  await tab(page, "Player games").click();
  await tab(page, "Advanced").click();
  await expect(metricTabs(page)).toHaveText(["Game Score"]);
  await tab(page, "Team seasons").click();
  await tab(page, "Advanced").click();
  await expect(metricTabs(page)).toHaveText(["Offensive rating", "Net rating"]);
  await tab(page, "Net rating").click();
  // Changing the type keeps a metric the new type has, and opens the default when it has not.
  await tab(page, "Team games").click();
  await expect(tab(page, "Net rating")).toHaveAttribute("aria-selected", "true");
  await tab(page, "Player seasons").click();
  await expect(tab(page, "Advanced")).toHaveAttribute("aria-selected", "false");
  await expect(tab(page, "Points")).toHaveAttribute("aria-selected", "true");
  await tab(page, "PIR").click();
  await tab(page, "Team seasons").click();
  await expect(tab(page, "PIR")).toHaveAttribute("aria-selected", "true");
});

test("the record type and the metric are in the address, the defaults are not, and Back steps through the choices", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records");
  await expect(tab(page, "Player seasons")).toHaveAttribute("aria-selected", "true");
  expect(new URL(page.url()).search).toBe("");

  await tab(page, "Team games").click();
  await expect(page).toHaveURL(/[?&]type=teamgame(&|$)/);
  await tab(page, "Advanced").click();
  await expect(page).toHaveURL(/metric=offensiveRating/);
  await tab(page, "Player seasons").click();
  await expect(page).not.toHaveURL(/type=/);
  await expect(page).not.toHaveURL(/metric=/);

  await page.goBack();
  await expect(page).toHaveURL(/type=teamgame/);
  await expect(tab(page, "Offensive rating")).toHaveAttribute("aria-selected", "true");

  // A link opens straight on its choice; an unknown value falls back to the default, and so does a metric the type does not have.
  await page.goto("/2026/records?type=teamgame&metric=netRating");
  await expect(tab(page, "Team games")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Net rating")).toHaveAttribute("aria-selected", "true");
  await page.goto("/2026/records?type=game&metric=totalRebounds");
  await expect(tab(page, "Player games")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Rebounds")).toHaveAttribute("aria-selected", "true");
  await page.goto("/2026/records?type=nonsense&metric=nonsense");
  await expect(tab(page, "Player seasons")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Points")).toHaveAttribute("aria-selected", "true");
  await page.goto("/2026/records?type=team&metric=per");
  await expect(tab(page, "Points")).toHaveAttribute("aria-selected", "true");
});

test("totals or per game: offered for the season records of the traditional metrics, kept in the address and asked of the API", async ({ page }) => {
  const asked = [];
  page.on("request", (request) => {
    if (request.url().includes("/records/")) asked.push(new URL(request.url()).searchParams.get("per"));
  });
  await mockApi(page);
  await page.goto("/2026/records");
  const choice = page.getByRole("tablist", { name: "Totals or per game" });
  await expect(choice.getByRole("tab", { name: "Totals" })).toHaveAttribute("aria-selected", "true");
  expect(asked.at(-1)).toBeNull();

  // Per game: in the address and the request, with the per-game label, one decimal and the minimum-games note.
  await choice.getByRole("tab", { name: "Per game" }).click();
  await expect(page).toHaveURL(/[?&]per=game\b/);
  await expect.poll(() => asked.at(-1)).toBe("game");
  await expect(page.locator("thead")).toContainText("Points per game");
  await expect(page.locator("ol").first().locator("> li").first()).toContainText("27.3");
  await expect(page.getByText("Counts players with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.")).toBeVisible();

  // Team seasons keep it, with the clubs' minimum; Player games has no per-game view, so the choice goes and so does `per`.
  await tab(page, "Team seasons").click();
  await expect(page).toHaveURL(/[?&]per=game\b/);
  await expect(page.getByText("Counts clubs with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.")).toBeVisible();
  await tab(page, "Player games").click();
  await expect(page).not.toHaveURL(/per=/);
  await expect(choice).toHaveCount(0);

  // The Advanced group has none either.
  await page.goto("/2026/records?per=game");
  await tab(page, "Advanced").click();
  await expect(page).not.toHaveURL(/per=/);
  await expect(page.getByRole("tablist", { name: "Totals or per game" })).toHaveCount(0);

  // A value the page does not know reads as totals and is not sent.
  asked.length = 0;
  await page.goto("/2026/records?per=bogus");
  await expect(page.getByRole("tablist", { name: "Totals or per game" }).getByRole("tab", { name: "Totals" })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => asked.length).toBeGreaterThan(0);
  expect(asked.every((value) => value === null)).toBe(true);
});

test("the records with a minimum number of games say so", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records?metric=per");
  await expect(page.getByText("Counts players with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.")).toBeVisible();
  await page.goto("/2026/records?type=team&metric=netRating");
  await expect(page.getByText("Counts clubs with at least 20 games of a 34-game regular season, or the same share of a shorter or longer one.")).toBeVisible();
  // Win Shares and the game records have no minimum, so there is nothing to say.
  await page.goto("/2026/records?metric=winShares");
  await expect(page.getByRole("heading", { name: "Podium" })).toBeVisible();
  await expect(page.getByText(/Counts (players|clubs)/)).toHaveCount(0);
  await page.goto("/2026/records?type=teamgame&metric=netRating");
  await expect(page.getByRole("heading", { name: "Podium" })).toBeVisible();
  await expect(page.getByText(/Counts (players|clubs)/)).toHaveCount(0);
});

test("a change of metric keeps the header, the strips and the rows on screen while the next ones load", async ({ page }) => {
  await mockApi(page, { delay: { totalRebounds: 1200 } });
  await page.goto("/2026/records");
  await expect(page.getByText("Cal Three").first()).toBeVisible();
  await tab(page, "Rebounds").click();
  // Held back: the page is still there, marked busy, with no loading spinner replacing it.
  await expect(page.locator("#records-panel")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("heading", { name: "Records", exact: true })).toBeVisible();
  await expect(tab(page, "Rebounds")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Cal Three").first()).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("#records-panel")).toHaveAttribute("aria-busy", "false");
});

test("the PIR column header carries the PIR tip", async ({ page }) => {
  await mockApi(page);
  await page.goto("/2026/records?metric=pir");
  await page.locator("thead .header-tip-label").hover();
  await expect(page.getByRole("tooltip")).toContainText("Performance index rating");
});

test("an error shows Retry, and a metric without records says so", async ({ page }) => {
  await mockApi(page, { fail: true });
  await page.goto("/2026/records");
  await expect(page.getByText("Could not load archive records.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockApi(page, { rows: { player: [] } });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("No records are available for this metric.")).toBeVisible();
  await expect(tab(page, "Player seasons")).toBeVisible();
});

test("with reduced motion the cards and rows do not slide in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/2026/records");
  const cards = page.locator("ol").first().locator("> li");
  await expect(cards).toHaveCount(3);
  // Read straight away: a slide would still have a transform on its first frames.
  const transforms = await page.locator("ol > li, tbody tr").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(new Set(transforms)).toEqual(new Set(["none"]));
});
