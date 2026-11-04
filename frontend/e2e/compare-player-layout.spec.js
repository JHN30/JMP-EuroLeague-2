import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The four tabs of an opened player comparison at every width. Each test loads its comparison once and resizes the window: the layout
// depends on the viewport only. The top of the comparison is compare-layout.spec.js and the team tabs are compare-team-layout.spec.js.
const API = "http://localhost:3000/api/seasons";
// Widest first, so a chart that was drawn wide has to shrink again.
const WIDTHS = [1280, 1024, 1023, 768, 640, 639, 390, 320];

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      // A short pause lets Chart.js see this resize before the next one, so a chart is never left at the previous width.
      await page.waitForTimeout(250);
      await check(width);
    });
  }
}

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// A text cut with an ellipsis, or clamped below its full height.
const cutTexts = (page) =>
  page.locator("main .truncate, main .line-clamp-2").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().width > 1 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map((el) => el.textContent.trim()),
  );

// Whatever sits outside the panel around it, leaving out what a scrolling box inside the panel clips.
const outsidePanels = (page) =>
  page.locator("main .panel").evaluateAll((panels) =>
    panels.flatMap((panel) => {
      const box = panel.getBoundingClientRect();
      return [...panel.querySelectorAll("*")]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) return false;
          for (let node = el.parentElement; node && node !== panel; node = node.parentElement) {
            if (getComputedStyle(node).overflowX !== "visible") return false;
          }
          return rect.left < box.left - 1 || rect.right > box.right + 1;
        })
        .map((el) => el.textContent.trim().slice(0, 30) || el.tagName);
    }),
  );

const shown = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));

// Two qualified players with the longest names, so a name that cannot fit shows up.
async function livePlayers(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { players } = await (await page.request.get(`${API}/${code}/season-stats?phase=RS&mode=perGame&limit=60&qualified=true`)).json();
  const [first, second] = [...players].sort((a, b) => b.playerName.length - a.playerName.length);
  return { slug, a: first, b: second };
}

async function openTab(page, slug, a, b, tab) {
  await page.goto(`/${slug}/compare?view=players&playerA=${a.personKey}&playerB=${b.personKey}`);
  await page.getByRole("tab", { name: tab, exact: true }).click({ timeout: 30_000 });
}

test("the Overview fits, with club and opponent codes below 640px and the radar named by last names", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Overview");
  await expect(page.getByRole("heading", { name: "Recent form" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
  const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    // The clubs in the two heads and the opponents in the form rows: codes below 640px, names from it.
    const slots = page.locator("main .panel .relative");
    const short = await shown(slots.locator("> span[aria-hidden=true]"));
    const full = await shown(slots.locator("> span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(short.length).toBeGreaterThan(0);
      expect(short.every((label) => label.length > 0 && label.length <= 9)).toBe(true);
      expect(full).toEqual([]);
    } else {
      expect(short).toEqual([]);
    }
    // The radar and its legend name the players by last name.
    const radar = (await page.locator('main canvas[role="img"]').first().getAttribute("aria-label")).toLowerCase();
    for (const name of lastNames) expect(radar).toContain(name);
    expect(await findBrokenWords(page.locator("main .panel h3:visible, main .panel a.font-bold:visible"))).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Statistics tab holds the box score, the advanced numbers and the clubs: one line a row from 640px, two columns from 1280px", async ({ page }) => {
  test.setTimeout(150_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Statistics");
  await expect(page.getByRole("region", { name: "Scoring", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
  // There is no Advanced tab: its numbers are here.
  await expect(page.getByRole("tab", { name: "Advanced", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Impact", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rates", exact: true })).toBeVisible();
  const header = await page.getByRole("group", { name: "Players compared" }).innerText();
  expect(header).not.toContain(",");

  // The club rows: the record is the club's in the phase's standings.
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { standings } = await (await page.request.get(`${API}/${code}/phases/RS/standings`)).json();
  const basic = standings.find((row) => row.clubCode === a.clubCode)?.basic;
  if (basic) {
    const record = page.getByRole("region", { name: "The club", exact: true }).locator("li").first();
    await expect(record).toContainText(`${basic.gamesWon}-${basic.gamesLost}`);
  }

  // Per 100 possessions is shown, under Impact in the left column; the club is in the right.
  await expect(page.getByRole("region", { name: "Per 100 possessions", exact: true })).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    // A row is one line from 640px and two below.
    const points = page.getByRole("region", { name: "Scoring", exact: true }).locator("li").first();
    const height = (await points.boundingBox()).height;
    if (width >= 640) expect(height).toBeLessThan(40);
    else expect(height).toBeGreaterThan(40);
    // The groups sit in two columns from 1280px.
    const [scoring, rebounding] = await Promise.all(
      ["Scoring", "Rebounding"].map((name) => page.getByRole("region", { name, exact: true }).evaluate((el) => el.getBoundingClientRect().left)),
    );
    if (width >= 1280) expect(rebounding).toBeGreaterThan(scoring + 100);
    else expect(Math.abs(rebounding - scoring)).toBeLessThan(2);
    const per100 = await page.getByRole("region", { name: "Per 100 possessions", exact: true }).evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.abs(per100 - scoring)).toBeLessThan(2);
    const club = page.getByRole("region", { name: "The club", exact: true });
    if (await club.count()) expect(Math.abs((await club.evaluate((el) => el.getBoundingClientRect().left)) - rebounding)).toBeLessThan(2);
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("the Trends charts fit, show every game, and sit side by side from 1280px", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  await openTab(page, slug, a, b, "Trends");
  const charts = page.locator("main canvas");
  await expect(charts.first()).toBeVisible({ timeout: 30_000 });
  const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());
  // The first chart's note says every game, not an average that starts later.
  await expect(page.getByText("Every game, in order. Hover or tap a point for the game.").first()).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    expect(await cutTexts(page)).toEqual([]);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    const label = (await charts.first().getAttribute("aria-label")).toLowerCase();
    for (const name of lastNames) expect(label).toContain(name);
    const points = page.getByRole("heading", { name: "Points", exact: true });
    const rebounds = page.getByRole("heading", { name: "Rebounds", exact: true });
    const [first, second] = await Promise.all([points.boundingBox(), rebounds.boundingBox()]);
    if (width >= 1280) expect(Math.abs(first.y - second.y)).toBeLessThan(2);
    else expect(second.y).toBeGreaterThan(first.y + 50);
    await expectNoSidewaysScroll(page);
  });
});

test.describe("states and long names at 320px", () => {
  test.use({ viewport: { width: 320, height: HEIGHT } });

  test("two very long names with no headshot or crest wrap inside their panels in every tab", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });
    await page.route(/\/api\/seasons\/[^/]+\/season-stats\?/, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.players = body.players.map((player) =>
        [a.personKey, b.personKey].includes(player.personKey)
          ? { ...player, playerName: `${player.personKey === a.personKey ? "ABERCROMBIE FITZWILLIAM-SMYTHE" : "ZACHARIAS PAPADOPOULOS-KARAMANLIS"}, ALEXANDROS CONSTANTINOS`, playerImageUrl: null, clubImageUrl: null }
          : player,
      );
      await route.fulfill({ response, json: body });
    });
    for (const tab of ["Overview", "Statistics", "Trends"]) {
      await openTab(page, slug, a, b, tab);
      await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });
      await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
      await expectNoSidewaysScroll(page);
    }
  });

  test("failing and empty responses say so inside the layout", async ({ page }) => {
    test.setTimeout(150_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 320, height: HEIGHT });

    // The games fail: the Overview's form, meetings and season highs, and the Trends tab, each say so.
    await page.route(/\/players\/[^/]+\/games/, (route) => route.fulfill({ status: 500, json: {} }));
    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByText("Could not load the games.")).toHaveCount(3, { timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Could not load the trends.")).toBeVisible({ timeout: 45_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/players\/[^/]+\/games/);

    // No games at all.
    await page.route(/\/players\/[^/]+\/games/, (route) => route.fulfill({ json: { games: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } }));
    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByText("No games played yet.").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Their clubs have not met this season.")).toBeVisible();
    await expectNoSidewaysScroll(page);
    await page.getByRole("tab", { name: "Trends", exact: true }).click();
    await expect(page.getByText("Not enough games played to show a trend yet.")).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.unroute(/\/players\/[^/]+\/games/);

    // The advanced numbers fail: their three groups (Impact, Rates, Per 100 possessions) say so, and the box score still shows.
    await page.route(/\/players\/[^/]+\/advanced/, (route) => route.fulfill({ status: 500, json: {} }));
    await openTab(page, slug, a, b, "Statistics");
    await expect(page.getByText("Could not load the advanced numbers.")).toHaveCount(3, { timeout: 45_000 });
    await expect(page.getByRole("region", { name: "Scoring", exact: true }).locator("li").first()).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

// What was asked for after the first try on a phone: the players named over their values, readable statistic names with tips, a tip on every
// advanced row, and a tip that a second tap closes.
test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("every tab has the two players at its top, and the Statistics rows read in full", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const lastNames = [a, b].map((player) => player.playerName.split(",")[0].trim().toLowerCase());
    // The header at the top of a tab: both names, and a headshot circle for each.
    const expectHeader = async (group) => {
      await expect(group).toBeVisible({ timeout: 30_000 });
      const text = (await group.innerText()).toLowerCase();
      for (const name of lastNames) expect(text).toContain(name);
      await expect(group.locator(".rounded-full")).toHaveCount(2);
    };
    const header = page.getByRole("group", { name: "Players compared" });

    await openTab(page, slug, a, b, "Overview");
    await expect(page.getByRole("heading", { name: "Season line" })).toBeVisible({ timeout: 30_000 });
    await expectHeader(header);
    await expect(header).toHaveCount(1);

    await page.getByRole("tab", { name: "Statistics", exact: true }).tap();
    await expect(page.getByText(/Hover or tap a name for what it means./)).toBeVisible({ timeout: 30_000 });
    await expectHeader(header);
    // The rows are named in full, each with a tip, the advanced ones too.
    await expect(page.getByText(/^Team wins/).first()).toBeAttached();
    for (const label of ["Double-doubles", "Triple-doubles", "Possessions", "PER", "Usage %"]) {
      await expect(page.locator(".header-tip-label", { hasText: label }).first()).toBeAttached();
    }
    await expect(page.getByText(/^(DD|TD)$/)).toHaveCount(0);

    await page.getByRole("tab", { name: "Trends", exact: true }).tap();
    await expectHeader(header);
  });

  test("a second tap on a tip's name closes it", async ({ page }) => {
    test.setTimeout(120_000);
    const { slug, a, b } = await livePlayers(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openTab(page, slug, a, b, "Statistics");
    const label = page.locator(".header-tip-label", { hasText: "Double-doubles" });
    await expect(label).toBeAttached({ timeout: 30_000 });
    // The pointer rests in a corner, so scrolling never brings another label under it (which would open that label's tip).
    await page.mouse.move(0, 0);
    await label.scrollIntoViewIfNeeded();
    const tip = page.locator("[role=tooltip]");
    // A pause between taps keeps the browser from reading two quick taps as a double-tap.
    await label.tap();
    await expect(tip).toHaveCount(1);
    await page.waitForTimeout(500);
    await label.tap();
    await expect(tip).toHaveCount(0);
    // And it opens again.
    await page.waitForTimeout(500);
    await label.tap();
    await expect(tip).toHaveCount(1);
  });
});

test("every statistic row of the player comparison has a hover tip", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  const rowNames = page.locator("main span.text-xs.font-bold.tracking-wide.uppercase");
  for (const tab of ["Overview", "Statistics"]) {
    await openTab(page, slug, a, b, tab);
    await expect(rowNames.first()).toBeVisible({ timeout: 30_000 });
    expect(await rowNames.count()).toBeGreaterThan(1);
    await expect(page.locator("main span.text-xs.font-bold.tracking-wide.uppercase:not(:has(.header-tip-label))")).toHaveCount(0);
  }
});

// A played game of a mocked log: the player's side, both clubs and the score, and his line.
function loggedGame(gameCode, { side, local, road, localScore, roadScore, points, valuation, day }) {
  return {
    gameCode,
    played: true,
    side,
    localTeam: { clubCode: local, tvCode: local, name: local, abbreviatedName: local },
    roadTeam: { clubCode: road, tvCode: road, name: road, abbreviatedName: road },
    localScore,
    roadScore,
    roundNumber: gameCode,
    scheduledAt: new Date(Date.UTC(2025, 9, day, 19)).toISOString(),
    timePlayed: 1500,
    points,
    totalRebounds: 4,
    assistances: 3,
    valuation,
  };
}

test("the Overview has the players once, a one-line season line from 640px, and the meetings, teammates line and season highs from the game logs", async ({ page }) => {
  test.setTimeout(150_000);
  const { slug, a, b } = await livePlayers(page);
  // A and B met twice (A's club AAA against B's club BBB), and played one game on the same side.
  const logs = {
    [a.personKey]: [
      loggedGame(1, { side: "local", local: "AAA", road: "BBB", localScore: 90, roadScore: 80, points: 25, valuation: 30, day: 1 }),
      loggedGame(2, { side: "road", local: "BBB", road: "AAA", localScore: 85, roadScore: 70, points: 12, valuation: 9, day: 8 }),
      loggedGame(3, { side: "local", local: "AAA", road: "CCC", localScore: 77, roadScore: 75, points: 31, valuation: 33, day: 15 }),
      loggedGame(4, { side: "local", local: "AAA", road: "DDD", localScore: 60, roadScore: 70, points: 8, valuation: 4, day: 22 }),
    ],
    [b.personKey]: [
      loggedGame(1, { side: "road", local: "AAA", road: "BBB", localScore: 90, roadScore: 80, points: 18, valuation: 20, day: 1 }),
      loggedGame(2, { side: "local", local: "BBB", road: "AAA", localScore: 85, roadScore: 70, points: 22, valuation: 26, day: 8 }),
      loggedGame(4, { side: "local", local: "AAA", road: "DDD", localScore: 60, roadScore: 70, points: 14, valuation: 12, day: 22 }),
    ],
  };
  await page.route(/\/players\/([^/]+)\/games/, (route) => {
    const personKey = /\/players\/([^/]+)\/games/.exec(route.request().url())[1];
    const games = logs[personKey] ?? [];
    return route.fulfill({ json: { games, pagination: { limit: 100, offset: 0, total: games.length, hasMore: false } } });
  });
  await openTab(page, slug, a, b, "Overview");
  await expect(page.getByRole("heading", { name: "When they met" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading, [aria-busy=\"true\"]")).toHaveCount(0, { timeout: 30_000 });

  // The players are named once, in the header, with the lead line under it.
  await expect(page.getByRole("group", { name: "Players compared" })).toHaveCount(1);
  await expect(page.getByText(/ ahead in \d of 6 /)).toBeVisible();

  // The two meetings, newest first, with each player's PIR; game 4 was played together.
  const meetings = page.locator(".panel", { has: page.getByRole("heading", { name: "When they met" }) });
  await expect(meetings.getByText(/^Met 2 times/)).toBeVisible();
  await expect(meetings.getByText("Teammates: played 1 game together this season.")).toBeVisible();
  const rows = meetings.locator("li a");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute("href", /\/games\/2$/);
  await expect(rows.nth(0)).toContainText("AAA 70-85 BBB");
  await expect(rows.nth(1)).toContainText("AAA 90-80 BBB");

  // The season highs: A's best points game is game 3 (31), B's is game 2 (22); each links to its game.
  const highs = page.locator(".panel", { has: page.getByRole("heading", { name: "Season highs" }) });
  const pts = highs.locator("li").first();
  await expect(pts.locator("a").first()).toHaveAttribute("href", /\/games\/3$/);
  await expect(pts.locator("a").first()).toContainText("31");
  await expect(pts.locator("a").last()).toHaveAttribute("href", /\/games\/2$/);
  await expect(pts.locator("a").last()).toContainText("22");

  await atWidths(page, [1280, 1024, 640, 320], async (width) => {
    // A season line row is one line from 640px (name, places, numbers and bars) and two below.
    const row = page.locator(".panel", { has: page.getByRole("heading", { name: "Season line" }) }).locator("li").first();
    const height = (await row.boundingBox()).height;
    if (width >= 640) expect(height).toBeLessThan(40);
    else expect(height).toBeGreaterThan(40);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});

test("players whose clubs have not met yet see the scheduled meetings, soonest first, each linking to its game", async ({ page }) => {
  test.setTimeout(120_000);
  const { slug, a, b } = await livePlayers(page);
  // The two players on clubs AAA and BBB, with no shared game, and two meetings of the clubs on AAA's schedule.
  await page.route(/\/api\/seasons\/[^/]+\/season-stats\?/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.players = body.players.map((player) => (player.personKey === a.personKey ? { ...player, clubCode: "AAA" } : player.personKey === b.personKey ? { ...player, clubCode: "BBB" } : player));
    await route.fulfill({ response, json: body });
  });
  await page.route(/\/players\/[^/]+\/games/, (route) => route.fulfill({ json: { games: [], pagination: { limit: 100, offset: 0, total: 0, hasMore: false } } }));
  const club = (code) => ({ clubCode: code, tvCode: code, name: code, abbreviatedName: code });
  const scheduled = (gameCode, local, road, month) => ({ gameCode, played: false, localTeam: club(local), roadTeam: club(road), roundNumber: gameCode, roundName: `Round ${gameCode}`, scheduledAt: new Date(Date.UTC(2027, month, 5, 19)).toISOString() });
  await page.route(/\/teams\/AAA\/games/, (route) =>
    route.fulfill({ json: { games: [scheduled(12, "AAA", "BBB", 0), scheduled(13, "AAA", "CCC", 1), scheduled(30, "BBB", "AAA", 2)], pagination: { limit: 100, offset: 0, total: 3, hasMore: false } } }),
  );
  await openTab(page, slug, a, b, "Overview");
  const meetings = page.locator(".panel", { has: page.getByRole("heading", { name: "When they met" }) });
  await expect(meetings.getByText("Their clubs have not met this season.")).toBeVisible({ timeout: 30_000 });
  await expect(meetings.getByText("Scheduled", { exact: true })).toBeVisible();
  const rows = meetings.locator("li a");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("AAA vs BBB");
  await expect(rows.nth(0)).toHaveAttribute("href", /\/games\/12$/);
  await expect(rows.nth(1)).toContainText("AAA at BBB");

  await atWidths(page, [1280, 390, 320], async () => {
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    await expectNoSidewaysScroll(page);
  });
});
