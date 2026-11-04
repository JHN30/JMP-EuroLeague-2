import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The Head-to-head page at every width. Each test loads the page once and resizes the window: the layout depends on the viewport only.
// Most tests use mocked responses (two very long club names, forty meetings over five seasons) so the data is the same on every run;
// one reads a live pair of clubs.
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
const insideWindow = (locator, width) =>
  locator.evaluateAll((els, right) => els.filter((el) => el.getBoundingClientRect().width > 1).every((el) => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= right + 1), width);

// The "top" of each element, to tell a row of boxes from a stack.
const tops = (locator) => locator.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));

const SEASONS = [2021, 2022, 2023, 2024, 2025].map((year) => ({ seasonCode: `E${year}`, name: `EuroLeague ${year}-${String(year + 1).slice(2)}`, startYear: year }));
const CLUB_A = { clubCode: "A", name: "Crvena Zvezda Meridianbet Belgrade Basketball Club", abbreviatedName: "Crvena Zvezda", tvCode: "CZV" };
const CLUB_B = { clubCode: "B", name: "Kosner Baskonia Vitoria-Gasteiz Basketball Club", abbreviatedName: "Baskonia", tvCode: "KBA" };
const CLUBS = [CLUB_A, CLUB_B, { clubCode: "C", name: "Anadolu Efes Istanbul", abbreviatedName: "Anadolu Efes", tvCode: "EFS" }];
const THE_CODES = new Set([CLUB_A.tvCode, CLUB_B.tvCode]);
const THE_NAMES = new Set([CLUB_A.abbreviatedName, CLUB_B.abbreviatedName]);

// Eight meetings a season, home and away alternating; the last of the last season has not been played yet.
function meetingsOf(seasonCode) {
  const season = Number(seasonCode.slice(1)) - 2020;
  return Array.from({ length: 8 }, (_, index) => {
    const aHome = index % 2 === 0;
    const scoreA = 70 + ((index * 7 + season) % 25);
    const scoreB = 68 + ((index * 5 + season * 3) % 25);
    const unplayed = seasonCode === "E2025" && index === 7;
    return {
      gameCode: season * 100 + index,
      played: !unplayed,
      localTeam: aHome ? CLUB_A : CLUB_B,
      roadTeam: aHome ? CLUB_B : CLUB_A,
      localScore: unplayed ? null : aHome ? scoreA : scoreB,
      roadScore: unplayed ? null : aHome ? scoreB : scoreA,
      roundNumber: index * 4 + 1,
      phaseCode: season === 3 && index === 7 ? "FF" : "RS",
      scheduledAt: new Date(Date.UTC(2020 + season, 10 + (index % 2), 1 + index * 3, 18)).toISOString(),
    };
  });
}

// `games` is "ok", "error" (a 500), "empty" (no meetings), "sparse" (meetings in two of the five seasons only) or a promise that holds the
// games back until it settles.
async function mockApi(page, { seasons = "ok", games = "ok", absent = [] } = {}) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/seasons") {
      return seasons === "error" ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: { seasons: SEASONS } });
    }
    if (/\/teams$/.test(pathname)) return route.fulfill({ json: { teams: CLUBS } });
    const match = /\/seasons\/(\d{4})\/teams\/[AB]\/games$/.exec(pathname);
    if (match) {
      // Club A was not in this season: the API answers 404 TEAM_NOT_FOUND.
      if (absent.includes(match[1])) return route.fulfill({ status: 404, json: { error: { code: "TEAM_NOT_FOUND", message: "Team not found" } } });
      if (games === "error") return route.fulfill({ status: 500, json: {} });
      if (games instanceof Promise) await games;
      const met = games === "sparse" ? ["2022", "2024"].includes(match[1]) : games !== "empty";
      const list = met ? meetingsOf(`E${match[1]}`) : [];
      return route.fulfill({ json: { games: list, pagination: { limit: 100, offset: 0, total: list.length, hasMore: false } } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
}

const OPEN = "/2025/compare/head-to-head?teamA=A&teamB=B";
const heroOf = (page) => page.locator("section.panel", { hasText: "completed meetings" });
const panelTitled = (page, name) => page.locator("section.panel").filter({ has: page.getByRole("heading", { name, exact: true }) });
const historyOf = (page) => panelTitled(page, "Meetings");

// Every mocked meeting from Club A's side, in date order, as the page reads them.
const MEETINGS = SEASONS.flatMap(({ seasonCode }) => meetingsOf(seasonCode)).sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt));
const fromA = (game) => {
  const homeIsA = game.localTeam.clubCode === "A";
  const scoreA = homeIsA ? game.localScore : game.roadScore;
  const scoreB = homeIsA ? game.roadScore : game.localScore;
  return { scoreA, scoreB, winner: !game.played ? null : scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null };
};
const PLAYED = MEETINGS.filter((game) => game.played);
const recordOf = (games) => ({ a: games.filter((game) => fromA(game).winner === "A").length, b: games.filter((game) => fromA(game).winner === "B").length });

test("the page fits at every width, with the header figures two by two below 640px and in one row from it", async ({ page }) => {
  test.setTimeout(120_000);
  await mockApi(page);
  await page.goto(OPEN);
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });
  // Eight meetings in each of five seasons, one not played yet.
  await expect(page.getByText("39 completed meetings")).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    await expectNoSidewaysScroll(page);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    expect(await findBrokenWords(page.locator("main .panel h2:visible, main .panel .font-semibold:visible:not(:has(.relative))"))).toEqual([]);

    // The header's three figures: two by two below 640px, one row from it, never outside the window.
    const figures = heroOf(page).locator("dl > div");
    await expect(figures).toHaveCount(3);
    expect(new Set(await tops(figures)).size).toBe(width < 640 ? 2 : 1);
    expect(await insideWindow(figures, width)).toBe(true);
    // The last ten meetings: five to a line below 640px, ten in one line from it.
    const chips = heroOf(page).locator("ol a");
    await expect(chips).toHaveCount(10);
    expect(new Set(await tops(chips)).size).toBe(width < 640 ? 2 : 1);
    expect(await insideWindow(chips, width)).toBe(true);

    // The two clubs' selects are the header's names, with the series record between them.
    const hero = heroOf(page);
    await expect(hero.getByRole("combobox")).toHaveCount(2);
    expect(await insideWindow(hero.locator("span.text-primary"), width)).toBe(true);

    // The streak figure names its club by TV code below 640px and by abbreviated name from 640px.
    const streak = heroOf(page).locator("dl > div", { hasText: "Current streak" }).locator(".relative");
    const streakShort = await shown(streak.locator("> span[aria-hidden=true]"));
    const streakFull = await shown(streak.locator("> span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(streakShort).toHaveLength(1);
      expect(THE_CODES.has(streakShort[0])).toBe(true);
      expect(streakFull).toEqual([]);
    } else {
      expect(streakShort).toEqual([]);
      expect(streakFull).toHaveLength(1);
      expect(THE_NAMES.has(streakFull[0])).toBe(true);
    }
  });
});

test("the meeting margin chart fills its box at every width, and each meeting is two lines below 640px and one from it", async ({ page }) => {
  test.setTimeout(120_000);
  await mockApi(page);
  await page.goto(OPEN);
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });
  const canvas = page.getByRole("img", { name: "Meeting margin timeline from Crvena Zvezda's perspective" });
  await expect(canvas).toBeVisible();
  // The title's tip says which way the bars point, by name.
  await expect(page.getByText("Above the line: Crvena Zvezda won. Below it: Baskonia won.")).toBeAttached();

  await atWidths(page, WIDTHS, async (width) => {
    // The drawing is as wide as the box inside the well's padding, after a resize too.
    await expect
      .poll(() => canvas.evaluate((el) => Math.abs(el.getBoundingClientRect().width - (el.parentElement.clientWidth - 16))), { timeout: 20_000 })
      .toBeLessThanOrEqual(2);
    // The records beside the margin chart from 1024px, stacked below; the notable meetings under the chart.
    const left = (name) => page.getByRole("heading", { name: new RegExp(`^${name}`) }).evaluate((el) => el.closest(".panel").getBoundingClientRect().left);
    const [records, margins] = await Promise.all([left("Records by type of game"), left("Meeting margin")]);
    if (width >= 1024) expect(margins).toBeGreaterThan(records + 100);
    else expect(Math.abs(records - margins)).toBeLessThan(2);
    // The plot is the short one below 1024px; from 1024px it grows to the records' height, which it must not set.
    const [chartPanel, recordsPanel] = await Promise.all([
      page.getByRole("heading", { name: /^Meeting margin/ }).evaluate((el) => el.closest(".panel").getBoundingClientRect().height),
      page.getByRole("heading", { name: "Records by type of game" }).evaluate((el) => el.closest(".panel").getBoundingClientRect().height),
    ]);
    if (width >= 1024) expect(Math.abs(chartPanel - recordsPanel)).toBeLessThan(2);
    else expect((await canvas.boundingBox()).height).toBeLessThanOrEqual(170);
    // The notable meetings: four cards across from 1024px, two from 640px, one below.
    const cards = panelTitled(page, "Notable meetings").locator("li");
    await expect(cards).toHaveCount(4);
    expect(new Set(await tops(cards)).size).toBe(width >= 1024 ? 1 : width >= 640 ? 2 : 4);

    // The meetings: the game still to play and the latest ten, each two lines below 640px and one from it.
    const rows = historyOf(page).locator("li > a");
    await expect(rows).toHaveCount(11);
    const height = (await rows.nth(1).boundingBox()).height;
    if (width < 640) expect(height).toBeGreaterThanOrEqual(44);
    else expect(height).toBeLessThan(40);
    // Each side is the TV code below 640px and the abbreviated name from 640px.
    const slots = rows.nth(1).locator(".relative");
    const short = await shown(slots.locator("> span[aria-hidden=true]"));
    const full = await shown(slots.locator("> span:not([aria-hidden=true])"));
    if (width < 640) {
      expect(short.every((label) => THE_CODES.has(label)) && short.length === 2).toBe(true);
      expect(full).toEqual([]);
    } else {
      expect(short).toEqual([]);
      expect(full.every((label) => THE_NAMES.has(label)) && full.length === 2).toBe(true);
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the pickers and the way back fit at every width", async ({ page }) => {
  test.setTimeout(90_000);
  await mockApi(page);
  await page.goto(OPEN);
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    // The page holds the two clubs' all-time series, so the two team selects are its only controls: no season range.
    const selects = page.locator("main").getByRole("combobox");
    await expect(selects).toHaveCount(2);
    expect(await insideWindow(selects, width)).toBe(true);
    // Below 640px the two team selects stack with the swap button between them; from 640px they sit in one row.
    const swap = page.getByRole("button", { name: "Swap teams" });
    const box = await swap.boundingBox();
    const [teamA, teamB] = await Promise.all([page.getByRole("combobox", { name: "Team A" }).boundingBox(), page.getByRole("combobox", { name: "Team B" }).boundingBox()]);
    // Team A sits on the panel's left content edge and Team B on its right one from 640px; below it both stay on the left edge, one under the other.
    const edges = await page.getByRole("combobox", { name: "Team A" }).evaluate((el) => {
      const panel = el.closest(".panel");
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      return { left: rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight) };
    });
    expect(Math.abs(teamA.x - edges.left), "Team A left").toBeLessThanOrEqual(1);
    if (width >= 640) expect(Math.abs(teamB.x + teamB.width - edges.right), "Team B right").toBeLessThanOrEqual(1);
    if (width < 640) {
      expect(Math.abs(teamB.x - edges.left), "Team B left").toBeLessThanOrEqual(1);
      expect(box.y).toBeGreaterThan(teamA.y + teamA.height - 1);
      expect(teamB.y).toBeGreaterThan(box.y + box.height - 1);
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(43.9);
    } else {
      expect(Math.abs(teamA.y - teamB.y)).toBeLessThan(4);
    }
    // The way back to Compare is in the page below 640px's bar and above the header from 640px; either way one link, inside the window.
    const back = page.getByRole("link", { name: "Back to Compare" });
    await expect(back).toHaveCount(1);
    expect(await insideWindow(back, width)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the Season breakdown lists only the seasons in which the clubs met, with the series and no season range", async ({ page }) => {
  test.setTimeout(60_000);
  await mockApi(page, { games: "sparse" });
  await page.setViewportSize({ width: 320, height: HEIGHT });
  // A link from before the season range was dropped still opens the page, with every season counted.
  await page.goto(`${OPEN}&from=E2023&through=E2024`);
  await expect(page.getByText("16 completed meetings")).toBeVisible({ timeout: 30_000 });
  const rows = page.locator("section.panel", { hasText: "Season breakdown" }).locator("li");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("2022-23");
  await expect(rows.nth(1)).toContainText("2024-25");
  await expect(page.getByText("From season")).toHaveCount(0);
  await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
  await expectNoSidewaysScroll(page);
});

test("a club that was not in some of the seasons still has its meetings from the others", async ({ page }) => {
  test.setTimeout(60_000);
  // Club A missing from the first two of five seasons: the API answers 404 TEAM_NOT_FOUND for them, which means no games, not a failure.
  await mockApi(page, { absent: ["2021", "2022"] });
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(OPEN);
  await expect(page.getByText("23 completed meetings")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Could not load head-to-head history.")).toHaveCount(0);
  const rows = page.locator("section.panel", { hasText: "Season breakdown" }).locator("li");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("2023-24");
  await expect(rows.nth(2)).toContainText("2025-26");
});

test("long names do not wrap into the page: a very long club name fits its select and its header at 320px", async ({ page }) => {
  test.setTimeout(60_000);
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.goto(OPEN);
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
  await expectNoSidewaysScroll(page);
  // The two selects in the header stay inside the window, one under the other.
  const selects = heroOf(page).getByRole("combobox");
  expect(await insideWindow(selects, 320)).toBe(true);
  const [first, second] = await tops(selects);
  expect(second).toBeGreaterThan(first);
});

test("the loading, error, empty and nothing-chosen states fit at 320px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // Loading: the games are held back.
  let release;
  await mockApi(page, { games: new Promise((resolve) => (release = resolve)) });
  await page.goto(OPEN);
  await expect(page.getByRole("status", { name: "Loading head-to-head history" })).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
  release();
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Nothing chosen.
  await mockApi(page);
  await page.goto("/2025/compare/head-to-head");
  await expect(page.getByText("Select two teams to see their head-to-head history.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // No meetings.
  await mockApi(page, { games: "empty" });
  await page.goto(OPEN);
  await expect(page.getByText("These teams have not met in any archived season.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // The games fail.
  await mockApi(page, { games: "error" });
  await page.goto(OPEN);
  await expect(page.getByText("Could not load head-to-head history.")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // The seasons fail.
  await mockApi(page, { seasons: "error" });
  await page.goto(OPEN);
  await expect(page.getByText("Could not load seasons.")).toBeVisible({ timeout: 45_000 });
  await expectNoSidewaysScroll(page);
});

// The error state is one block across the page's content width with the message and Retry centred in it, and Retry is a full touch target.
test("the error fills the content width, centred, with a full-size Retry that loads the page again", async ({ page }) => {
  test.setTimeout(120_000);
  let failing = true;
  await mockApi(page, { games: "error" });
  // Once Retry is pressed the games load.
  await page.route("**/api/seasons/*/teams/*/games*", (route) => (failing ? route.fallback() : route.fulfill({ json: { games: meetingsOf("E2025"), pagination: { limit: 100, offset: 0, total: 40, hasMore: false } } })));
  await page.goto(OPEN);
  const alert = page.getByRole("alert").filter({ hasText: "Could not load head-to-head history." });
  await expect(alert).toBeVisible({ timeout: 45_000 });
  await atWidths(page, [1280, 390, 320], async (width) => {
    const box = await alert.boundingBox();
    const main = await page.locator("main").boundingBox();
    // As wide as the content, not a narrow strip in a corner.
    expect(box.width).toBeGreaterThan(main.width * 0.9);
    // Centred in its own box: the button's middle is the block's middle.
    const retry = await alert.getByRole("button", { name: "Retry" }).boundingBox();
    expect(Math.abs(retry.x + retry.width / 2 - (box.x + box.width / 2))).toBeLessThan(2);
    expect(retry.height).toBeGreaterThanOrEqual(44);
    if (width < 640) expect(retry.width).toBeGreaterThan(box.width * 0.7);
    await expectNoSidewaysScroll(page);
  });
  failing = false;
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 45_000 });
});

test.describe("on a touch screen", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("a tap on the swap button swaps the two clubs", async ({ page }) => {
    test.setTimeout(60_000);
    await mockApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(OPEN);
    await expect(page.getByText(/completed meetings/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Swap teams" }).tap();
    await expect(page).toHaveURL(/teamA=B&teamB=A/);
    await expect(page.getByRole("img", { name: "Meeting margin timeline from Baskonia's perspective" })).toBeVisible();
  });
});

test("a live pair of clubs fits at every width", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { teams } = await (await page.request.get(`${API}/${slug}/teams`)).json();
  const { games } = await (await page.request.get(`${API}/${slug}/teams/${teams[0].clubCode}/games?limit=100&order=asc`)).json();
  const first = games[0];
  const other = first ? (first.localTeam.clubCode === teams[0].clubCode ? first.roadTeam : first.localTeam) : teams[1];
  await page.goto(`/${slug}/compare/head-to-head?teamA=${teams[0].clubCode}&teamB=${other.clubCode}`);
  await expect(page.getByText(/completed meetings|have not met/)).toBeVisible({ timeout: 45_000 });

  await atWidths(page, WIDTHS, async (width) => {
    await expectNoSidewaysScroll(page);
    await expect.poll(() => outsidePanels(page), { timeout: 20_000 }).toEqual([]);
    if (await heroOf(page).count()) {
      expect(await insideWindow(heroOf(page).locator("dl > div, ol a"), width)).toBe(true);
      expect(await insideWindow(historyOf(page).locator("li > a"), width)).toBe(true);
    }
  });
});

test("the header shows the series once, with the last ten meetings in order, each linking to its game", async ({ page }) => {
  test.setTimeout(60_000);
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(OPEN);
  await expect(page.getByText("39 completed meetings")).toBeVisible({ timeout: 30_000 });
  const { a, b } = recordOf(PLAYED);
  await expect(heroOf(page).locator("span.text-primary")).toHaveText(`${a}-${b}`);
  // No second strip of cards repeats it.
  await expect(page.locator(".kpi-strip")).toHaveCount(0);
  await expect(page.getByText("Series record")).toHaveCount(0);

  const last = PLAYED.slice(-10);
  const codeOf = (game) => ({ A: CLUB_A.tvCode, B: CLUB_B.tvCode })[fromA(game).winner] ?? "-";
  const chips = heroOf(page).locator("ol a");
  await expect(chips).toHaveText(last.map(codeOf));
  const season = (game) => String(2020 + Math.floor(game.gameCode / 100));
  await expect(chips.last()).toHaveAttribute("href", `/${season(last.at(-1))}/games/${last.at(-1).gameCode}`);
});

test("the records by type of game, the notable meetings and the folded history agree with the meetings", async ({ page }) => {
  test.setTimeout(60_000);
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(OPEN);
  await expect(page.getByText("39 completed meetings")).toBeVisible({ timeout: 30_000 });

  // A stage row only for stages the clubs met in: the regular season and one Final Four, no play-in. The Final Four is the neutral court.
  const records = panelTitled(page, "Records by type of game");
  // Each row is read out as one sentence: the type, each club's wins, then the games.
  const rowOf = (label) => records.locator("li .sr-only").filter({ hasText: new RegExp(`^${label.replace(/[()]/g, "\\$&")}:`) });
  const said = ({ a, b }, games) => `${CLUB_A.abbreviatedName} ${a}, ${CLUB_B.abbreviatedName} ${b}, ${games} games`;
  const regularGames = PLAYED.filter((game) => game.phaseCode === "RS");
  await expect(rowOf("Regular season")).toContainText(said(recordOf(regularGames), regularGames.length));
  const finalFour = recordOf(PLAYED.filter((game) => game.phaseCode === "FF"));
  await expect(rowOf("Final Four")).toContainText(said(finalFour, 1));
  await expect(rowOf("Neutral (Final Four)")).toContainText(said(finalFour, 1));
  await expect(rowOf("Play-in")).toHaveCount(0);
  const close = PLAYED.filter((game) => Math.abs(game.localScore - game.roadScore) <= 5);
  await expect(rowOf("Close games (≤5)")).toContainText(`, ${close.length} games`);

  // Each club's biggest win, by its margin.
  const margins = PLAYED.map((game) => fromA(game).scoreA - fromA(game).scoreB);
  const notable = panelTitled(page, "Notable meetings");
  await expect(notable.locator("li", { hasText: `${CLUB_A.abbreviatedName} win` })).toContainText(`+${Math.max(...margins)}`);
  await expect(notable.locator("li", { hasText: `${CLUB_B.abbreviatedName} win` })).toContainText(`+${-Math.min(...margins)}`);

  // The history: the game still to play first, then the played ones newest first; the rest fold behind a button.
  const rows = historyOf(page).locator("li > a");
  await expect(rows).toHaveCount(11);
  await expect(rows.first()).toContainText("Upcoming");
  await expect(rows.nth(1)).toHaveAttribute("href", new RegExp(`/games/${PLAYED.at(-1).gameCode}$`));
  const more = historyOf(page).getByRole("button", { name: "Show all 40 meetings" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(rows).toHaveCount(40);
  await historyOf(page).getByRole("button", { name: "Show fewer" }).click();
  await expect(rows).toHaveCount(11);
});
