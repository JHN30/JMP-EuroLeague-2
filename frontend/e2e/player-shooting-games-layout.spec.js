import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Games and Shooting tabs at every width. Each test loads the page once and resizes the window: the layout depends
// on the viewport only. The player is live; the game log (and the shot charts) are built from one of the player's real games so
// that each case has the shape it needs.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
// From 1280px the breakdown's right-hand column is only about 420px wide, the tightest the two tables get.
const WIDE = [...WIDTHS, 1280, 1440];
const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each box sits inside it. Text that a `truncate` element cuts with an ellipsis, a box that scrolls on its
// own, a tab strip (which scrolls) and a chart canvas are left to their own checks.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate, .overflow-x-auto, [role=region], [role=tablist], canvas")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const failing = (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } });

const LOG_URL = (url) => /\/api\/seasons\/[^/]+\/players\/[^/]+\/games$/.test(url.pathname);

// A log of `count` played games built from one of the player's real ones: they alternate home and away, every `lossEvery`th is lost
// and the stats and dates vary. `phases` gives the games phase names in turn.
async function logFor(page, { seasonCode, personKey }, { count = 40, lossEvery = 3, phases = [["RS", "Regular Season"]], rival } = {}) {
  const live = await (await page.request.get(`${API}/${seasonCode}/players/${personKey}/games?limit=100`)).json();
  const template = live.games.find((game) => game.played) ?? live.games[0];
  const tag = (club, name) => ({ ...club, abbreviatedName: name ?? club.abbreviatedName, name: name ?? club.name, tvCode: name ? "CZV" : club.tvCode, crestUrl: crest });
  const games = Array.from({ length: count }, (_, index) => {
    const home = index % 2 === 0;
    const won = lossEvery === 0 ? true : lossEvery === 1 ? false : (index + 1) % lossEvery !== 0;
    const mine = 70 + (index % 17);
    const theirs = won ? mine - 3 - (index % 9) : mine + 2 + (index % 11);
    const club = home ? template.localTeam : template.roadTeam;
    const other = tag(home ? template.roadTeam : template.localTeam, rival);
    const [phaseCode, phaseName] = phases[index % phases.length];
    return {
      ...template,
      gameCode: 9000 + index,
      played: true,
      side: home ? "local" : "road",
      phaseCode,
      phaseName,
      roundNumber: index + 1,
      roundName: null,
      scheduledAt: new Date(Date.UTC(2025, 9, 1 + index * 3, 18, 30)).toISOString(),
      localTeam: home ? tag(club) : other,
      roadTeam: home ? other : tag(club),
      localScore: home ? mine : theirs,
      roadScore: home ? theirs : mine,
      timePlayed: String(1500 + (index % 7) * 120),
      points: String(4 + ((index * 7) % 23)),
      totalRebounds: String(index % 9),
      assistances: String((index * 3) % 8),
      steals: String(index % 4),
      turnovers: String(index % 5),
      valuation: String(-2 + ((index * 5) % 31)),
      plusMinus: String((index % 21) - 10),
      fieldGoalsMade2: String(index % 6),
      fieldGoalsAttempted2: String((index % 6) + 3),
      fieldGoalsMade3: String(index % 4),
      fieldGoalsAttempted3: String((index % 4) + 2),
      freeThrowsMade: String(index % 5),
      freeThrowsAttempted: String((index % 5) + 1),
    };
  });
  return { games, pagination: { hasMore: false } };
}
const mockLog = async (page, payload) => {
  await page.unroute(LOG_URL).catch(() => {});
  await page.route(LOG_URL, (route) => route.fulfill({ json: payload }));
};

async function openTab(page, href, tab) {
  await page.goto(href);
  await page.getByRole("tab", { name: tab, exact: true }).click();
}

// The bar of a game in the chart and the value over (or under) it.
const chartBar = (page, index) => page.locator("#player-games-bars > ul > li:has(a)").nth(index).locator("a > div.relative");
const barParts = (bar) =>
  bar.evaluate((el) => {
    const [label, fill] = el.children;
    const top = (node) => (node ? node.getBoundingClientRect().top : null);
    return { text: label.textContent.trim(), label: top(label), bar: top(fill), hasBar: Boolean(fill) };
  });

test("the Games tab fits every width: highs beside the splits from 1024px, a chart that scrolls, a fuller table with its controls in the heading", async ({ page }) => {
  test.setTimeout(150_000);
  const player = await veteranPlayer(page);
  const rival = "Meridianbet Crvena Zvezda Belgrade";
  const log = await logFor(page, player, { count: 40, phases: [["RS", "Regular Season"], ["RS", "Regular Season"], ["PO", "Play-offs"], ["F4", "Final Four"]], rival });
  // He starts every other game. Each game has advanced numbers: the first is 5 minutes (so no game PER), the sixth has
  // the best game score.
  log.games.forEach((game, index) => {
    game.started = index % 2 === 0;
    game.advanced = {
      secondsPlayed: index === 0 ? 300 : 1500,
      gameScore: index === 5 ? 30 : 5,
      gamePer: 12,
      trueShootingPct: 0.5,
      efgPct: 0.5,
      usagePct: 0.2,
      assistPct: 0.1,
      tovPct: 0.1,
      orbPct: 0.05,
      drbPct: 0.15,
      stealPct: 0.02,
      blockPct: 0.01,
    };
  });
  await mockLog(page, log);
  await openTab(page, player.href, "Games");
  const bars = page.locator("section.panel", { has: page.getByRole("heading", { name: "How each game went" }) });
  await expect(bars).toBeVisible({ timeout: 60_000 });
  const table = page.getByRole("region", { name: "Every game, box scores" });
  const splits = page.getByRole("region", { name: "Splits, per game" });
  const highs = page.getByRole("region", { name: "Season highs" });
  const boxScores = page.locator("section.panel", { has: page.getByRole("heading", { name: "Every game" }) });
  const strips = ["Phase", "Stat to chart", "Games to show"].map((name) => page.getByRole("tablist", { name }));

  // The highs: the best game in points, rebounds, assists and PIR, each opening a game.
  await expect(highs.getByRole("link")).toHaveCount(4);
  await expect(highs.getByRole("link").first()).toHaveAttribute("href", /\/games\/\d+$/);
  await expect(highs.getByRole("link").first()).toHaveAccessibleName(/PTS, the season high/);

  // The splits: eight rows; Started and Off the bench split the 40 games in two.
  const splitRows = splits.locator("tbody tr");
  await expect(splitRows).toHaveCount(8);
  await expect(splitRows.filter({ hasText: "Started" }).locator("td").nth(1)).toHaveText("20");
  await expect(splitRows.filter({ hasText: "Off the bench" }).locator("td").nth(1)).toHaveText("20");

  // The box scores: the new columns and the starter mark.
  for (const header of ["BLK", "FG", "PF", "FD"]) await expect(table.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
  await expect(table.locator(".sr-only", { hasText: /^Started$/ }).first()).toBeAttached();

  // The Advanced numbers: the same games with the advanced columns; the 5-minute game has no PER, and the best game score
  // is in colour.
  const numbers = page.getByRole("tablist", { name: "Box score numbers" });
  await numbers.getByRole("tab", { name: "Advanced" }).click();
  for (const header of ["GmSc", "PER", "TS%", "eFG%", "USG%", "AST%", "TOV%", "ORB%", "DRB%", "STL%", "BLK%"]) {
    await expect(table.getByRole("columnheader", { name: new RegExp(`^${header}`) })).toBeVisible();
  }
  await expect(table.getByRole("columnheader", { name: "PTS", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("oldest");
  const firstGame = table.locator("tbody tr").first();
  await expect(firstGame.locator("td").nth(4)).toHaveText("—");
  await expect(firstGame.locator("td").nth(4)).toHaveAttribute("title", "Game PER is shown from 10 minutes played");
  await expect(firstGame.locator("td").nth(5)).toHaveText("50.0%");
  await expect(table.locator("td.text-primary", { hasText: "30.0" })).toHaveCount(1);
  await numbers.getByRole("tab", { name: "Basic" }).click();
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("newest");

  // +/- goes below zero: the first game is -10 (its value under the bar), a later one +5 (over it).
  await page.getByRole("tab", { name: "+/-", exact: true }).click();
  // (polled: the bars grow to their new heights from the last stat's).
  await expect.poll(async () => {
    const minus = await barParts(chartBar(page, 0));
    return { text: minus.text, under: minus.label > minus.bar };
  }).toEqual({ text: "-10", under: true });
  await expect.poll(async () => {
    const plus = await barParts(chartBar(page, 15));
    return { text: plus.text, over: plus.label < plus.bar };
  }).toEqual({ text: "+5", over: true });
  await page.getByRole("tab", { name: "PTS", exact: true }).click();

  await atWidths(page, WIDE, async (width) => {
    const phone = width < 640;
    await expectNoSidewaysScroll(page);
    expect(await holdsContent(page.locator("#player-games-panel section.panel"))).toBe(true);

    // The chart's two badges: under the title below 640px, beside it from 640px; two are drawn (the other pair is display: none).
    await expect
      .poll(() =>
        bars.evaluate((el) => {
          const title = el.querySelector("h2").getBoundingClientRect();
          const shown = [...el.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
          return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
        }),
      )
      .toEqual({ count: 2, under: phone, beside: !phone });
    // 40 bars scroll inside their own box at a phone's width; the page does not.
    if (width <= 390) expect(await bars.locator("#player-games-bars").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

    // The highs sit beside the splits from 1024px and above them below it.
    const [highsBox, splitsBox] = [await highs.boundingBox(), await splits.boundingBox()];
    if (width >= 1024) expect(highsBox.x + highsBox.width).toBeLessThanOrEqual(splitsBox.x + 1);
    else expect(highsBox.y + highsBox.height).toBeLessThanOrEqual(splitsBox.y + 1);

    // The box scores' filter, sort and count are in the panel heading: beside the title from 1280px.
    const heading = await boxScores.evaluate((el) => {
      const title = el.querySelector("h2").getBoundingClientRect();
      const filter = el.querySelector("[role=tablist]").getBoundingClientRect();
      return { inHeading: Boolean(el.querySelector(".panel-header [role=tablist]") && el.querySelector(".panel-header select")), beside: filter.left >= title.right - 1 };
    });
    expect(heading.inHeading).toBe(true);
    if (width >= 1280) expect(heading.beside).toBe(true);

    // Each strip is one row, inside the window, with the selected tab on screen.
    for (const strip of strips) {
      const state = await strip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const tabs = [...el.querySelectorAll("[role=tab]")];
        const selected = el.querySelector("[aria-selected=true]").getBoundingClientRect();
        return {
          oneRow: new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1,
          visible: selected.left >= box.left - 1 && selected.right <= box.right + 1,
          inWindow: box.right <= window.innerWidth + 1,
        };
      });
      expect(state).toEqual({ oneRow: true, visible: true, inWindow: true });
    }

    // The game table scrolls in its own region (a keyboard can reach it) with the opponent pinned.
    await expect(table).toHaveAttribute("tabindex", "0");
    const scrolls = await table.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 390) expect(scrolls).toBe(true);
    const pinned = await table.evaluate((el) => {
      el.scrollLeft = 0;
      const cell = el.querySelector("tbody td:first-child");
      const before = cell.getBoundingClientRect();
      el.scrollLeft = 80;
      const after = cell.getBoundingClientRect();
      el.scrollLeft = 0;
      return { moved: Math.abs(after.left - before.left), width: before.width, panel: el.getBoundingClientRect().width };
    });
    if (scrolls) expect(pinned.moved).toBeLessThan(1);
    if (phone) expect(pinned.width).toBeLessThan(pinned.panel * 0.4);

    // Scrolled cells never show beside or over the pinned column: at several scroll positions, every point across the pinned
    // cell belongs to it.
    if (scrolls) {
      const leaks = await table.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
        const box = el.getBoundingClientRect();
        const found = [];
        for (const left of [60, 120, 200, 300, 400]) {
          el.scrollLeft = left;
          const row = [...el.querySelectorAll("tbody tr")].map((tr) => tr.getBoundingClientRect()).find((rect) => rect.top > 120 && rect.bottom < window.innerHeight - 10);
          const cell = el.querySelector("tbody td:first-child").getBoundingClientRect();
          for (let x = box.left + 2; x < cell.right - 2; x += 6) {
            const hit = document.elementFromPoint(x, row.top + row.height / 2);
            if (!hit?.closest("td:first-child, th:first-child")) found.push(left + ":" + Math.round(x));
          }
        }
        el.scrollLeft = 0;
        return found;
      });
      expect(leaks).toEqual([]);
    }

    // The opponent: its TV code below 640px, the abbreviated name from 640px (never cut); the crest only from 640px.
    const labels = await table.locator("tbody td:first-child a").first().evaluate((link) =>
      [...link.querySelectorAll(".relative > span")].filter((s) => s.getBoundingClientRect().width > 1).map((s) => s.textContent.trim()).join(""),
    );
    expect(labels.length).toBeGreaterThan(0);
    if (!phone) expect(labels).toBe(rival);
    else expect(labels).not.toBe(rival);
    const crestShown = await table.locator("tbody td:first-child img").first().evaluate((img) => img.getBoundingClientRect().width > 0).catch(() => false);
    if (phone) expect(crestShown).toBe(false);

    // The lines under PTS and PIR are drawn from 640px only.
    const line = await table.locator(".bar-line").first().evaluate((el) => getComputedStyle(el).display);
    expect(line === "none").toBe(phone);
    expect(await page.getByText("The lines under PTS and PIR compare the games shown.").isVisible()).toBe(!phone);
  });

  // Arrow keys move between the phase tabs.
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const phase = page.getByRole("tablist", { name: "Phase" });
  await phase.getByRole("tab").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(phase.getByRole("tab").nth(1)).toBeFocused();
});

test("the Games tab states fit a phone: a few games, none, no match for the filter, show all, failing", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);

  // Three games, all lost, the first without a field-goal attempt: no Phase strip, and "Wins" matches nothing.
  const few = await logFor(page, player, { count: 3, lossEvery: 1 });
  Object.assign(few.games[0], { fieldGoalsAttempted2: "0", fieldGoalsMade2: "0", fieldGoalsAttempted3: "0", fieldGoalsMade3: "0" });
  // A season without advanced numbers.
  for (const game of few.games) game.advanced = null;
  await mockLog(page, few);
  await openTab(page, player.href, "Games");
  await expect(page.getByRole("heading", { name: "How each game went" })).toBeVisible({ timeout: 60_000 });

  // A few games fill the chart's width at 1280px rather than leaving it empty.
  const fill = await page.locator("#player-games-bars").evaluate((el) => ({ box: el.clientWidth, list: el.querySelector("ul").getBoundingClientRect().width }));
  expect(fill.list).toBeGreaterThan(fill.box - 2);
  // FG% without an attempt: a dash and no bar.
  await page.getByRole("tab", { name: "FG%", exact: true }).click();
  expect(await barParts(chartBar(page, 0))).toMatchObject({ text: "—", hasBar: false });
  expect((await barParts(chartBar(page, 1))).hasBar).toBe(true);

  await page.setViewportSize({ width: 320, height: HEIGHT });
  await expect(page.getByRole("tablist", { name: "Phase" })).toHaveCount(0);
  // Without advanced numbers there is no Basic / Advanced switch.
  await expect(page.getByRole("tablist", { name: "Box score numbers" })).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  expect(await holdsContent(page.locator("#player-games-panel section.panel"))).toBe(true);
  // No wins: the split's Wins row is all dashes.
  const wins = page.getByRole("region", { name: "Splits, per game" }).locator("tbody tr").filter({ hasText: "Wins" });
  await expect(wins.locator("td").nth(1)).toHaveText("0");
  await expect(wins.locator("td").nth(2)).toHaveText("—");
  await page.getByRole("tab", { name: "Wins", exact: true }).click();
  await expect(page.getByText("No games match this filter.")).toBeVisible();
  await expectNoSidewaysScroll(page);

  // A long log: "Show all" and "Show fewer".
  await mockLog(page, await logFor(page, player, { count: 40 }));
  await openTab(page, player.href, "Games");
  await expect(page.getByRole("button", { name: /^Show all/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /^Show all/ }).click();
  await expect(page.getByRole("button", { name: "Show fewer" })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // No game log.
  await mockLog(page, { games: [], pagination: { hasMore: false } });
  await openTab(page, player.href, "Games");
  await expect(page.getByText("No game log available yet.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // A failing request.
  await page.unroute(LOG_URL);
  await page.route(LOG_URL, failing);
  await openTab(page, player.href, "Games");
  await expect(page.getByText("Could not load the game log.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

// ---- The Shooting tab ----

// The Shooting tab sets the player's shots (one request) against one other player of his position, picked from the
// position's shots (one request of compact rows, with the shooters' names, clubs and games).
const PLAYER_SHOTS_URL = (url) => /\/api\/seasons\/[^/]+\/players\/[^/]+\/shots$/.test(url.pathname);
const POSITION_SHOTS_URL = (url) => /\/api\/seasons\/[^/]+\/shots$/.test(url.pathname);
const PLAYER_URL = (url) => /\/api\/seasons\/[^/]+\/players\/[^/]+$/.test(url.pathname);

// One field-goal attempt by the player; coordinates are centimetres from the hoop.
const shot = (ordinal, personCode, actionCode, coordX, coordY, overrides = {}) => ({
  shotOrdinal: ordinal,
  clubCode: "AAA",
  personCode,
  playerName: "ONE, AL",
  actionCode,
  points: actionCode.startsWith("3") ? 3 : 2,
  coordX,
  coordY,
  fastbreak: false,
  secondChance: false,
  pointsOffTurnover: false,
  minute: 3,
  markerTime: "07:00",
  pointsA: null,
  pointsB: null,
  ...overrides,
});

// Seven spots, two of them made twos (one at the rim, 2 paint points) and three of them threes (two made).
const SPOTS = [[0, 50, "2FGM"], [200, 300, "2FGA"], [-500, 480, "3FGM"], [100, 700, "3FGA"], [-400, 100, "2FGA"], [350, 350, "2FGM"], [650, 150, "3FGM"]];

// The player's attempts in every quarter and an overtime: 2PT 10-20 and 3PT 10-15.
function shotsFor(personCode, { located = true } = {}) {
  const rows = [];
  let ordinal = 1;
  for (const minute of [3, 15, 25, 35, 45]) {
    for (const [index, [x, y, action]] of SPOTS.entries()) {
      rows.push(shot(ordinal++, personCode, action, located ? x : null, located ? y : null, { minute, fastbreak: index === 0, secondChance: index === 5 }));
    }
  }
  return { shots: rows };
}

// The position's compact rows [coordX, coordY, actionCode, minute, flags, personCode] and its shooters:
// - one of his own, left out of the other side;
// - P2 ("Pat Two", 2 games): his spots in three quarters, 2PT 6-12 and 3PT 6-9, 6 paint points. His profile, so the
//   suggested one;
// - P3 ("Sam Three", 4 games): 15 missed threes from one spot, so fewer attempts than P2.
function positionShotsFor(personCode) {
  const rows = [[0, 50, "2FGM", 3, 0, personCode]];
  for (const minute of [3, 15, 25]) {
    for (const [x, y, action] of SPOTS) rows.push([x, y, action, minute, 0, "P2"]);
  }
  for (let index = 0; index < 15; index += 1) rows.push([-500, 480, "3FGA", 15, 0, "P3"]);
  return {
    players: [
      { personCode, name: "ONE, AL", club: "AAA", games: 3 },
      { personCode: "P2", name: "TWO, PAT", club: "BBB", games: 2 },
      { personCode: "P3", name: "THREE, SAM", club: "CCC", games: 4 },
    ],
    shots: rows,
  };
}

const mockShooting = async (page, { own, field }) => {
  await page.unroute(PLAYER_SHOTS_URL).catch(() => {});
  await page.unroute(POSITION_SHOTS_URL).catch(() => {});
  await page.route(PLAYER_SHOTS_URL, (route) => (typeof own === "function" ? own(route) : route.fulfill({ json: own })));
  await page.route(POSITION_SHOTS_URL, (route) => (typeof field === "function" ? field(route) : route.fulfill({ json: field })));
};

async function openShooting(page, player, { log, own = shotsFor(player.personKey), field = positionShotsFor(player.personKey) } = {}) {
  await mockLog(page, log ?? (await logFor(page, player, { count: 3 })));
  await mockShooting(page, { own, field });
  await openTab(page, player.href, "Shooting");
}

const title = (page, against = /\S/) => page.getByRole("heading", { name: new RegExp(` against ${against.source}`) });
const picker = (page) => page.getByRole("combobox", { name: /^Compare with a/ });
// The picker's choices (the page's season and phase selects have options of their own).
const choices = (page) => page.getByRole("listbox", { name: /^Compare with a/ }).getByRole("option");
// A side's "made-attempted (percent)" line over its court: the count and the percentage are separate spans.
const line = (page, made, attempted, percent) =>
  page.locator("p.tabular-nums").filter({ hasText: new RegExp(`^${made}-${attempted}\\s*\\(${percent.replace(".", "\\.")}%\\)$`) });

test("the Shooting tab is the studio, the player against the closest player of his position, and fits every width", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  const positionRequests = [];
  page.on("request", (request) => {
    if (POSITION_SHOTS_URL(new URL(request.url()))) positionRequests.push(new URL(request.url()));
  });
  await openShooting(page, player);

  // The closest profile is picked first: P2, his shots against P2's, with P2's paint points per game (6 over 2 games).
  await expect(title(page, /Two/)).toBeVisible({ timeout: 60_000 });
  expect(positionRequests.at(-1).searchParams.get("phase")).toBeTruthy();
  await expect(picker(page)).toHaveValue("Pat Two");
  await expect(line(page, 10, 20, "50.0").first()).toBeVisible();
  await expect(line(page, 10, 15, "66.7").first()).toBeVisible();
  await expect(line(page, 6, 12, "50.0").first()).toBeVisible();
  await expect(line(page, 6, 9, "66.7").first()).toBeVisible();
  await expect(page.locator("p.tabular-nums").filter({ hasText: /^3\.0$/ }).first()).toBeVisible();
  await expect(page.getByText(/per game: \S+ 3 games, Two 2 games\./)).toBeVisible();

  // The list: the whole position first, then the players by attempts, the suggested one tagged, his own name left out.
  await picker(page).click();
  const options = choices(page);
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toContainText(/^All (guards|forwards|centers|players)/);
  await expect(options.nth(1)).toContainText("Pat Two");
  await expect(options.nth(1)).toContainText("Most similar");
  await expect(options.nth(2)).toContainText("Sam Three");
  await expect(options.nth(2)).toContainText("CCC · 15 shots · 4 games");

  // Escape keeps the choice and closes the list.
  await picker(page).press("Escape");
  await expect(picker(page)).toHaveValue("Pat Two");
  await expect(options).toHaveCount(0);

  // Searching narrows the list, and Enter chooses.
  await picker(page).fill("thr");
  await expect(options).toHaveCount(1);
  await picker(page).press("Enter");
  await expect(title(page, /Three/)).toBeVisible();
  await expect(picker(page)).toHaveValue("Sam Three");
  await expect(line(page, 0, 15, "0.0").first()).toBeVisible();

  // The whole position, pooled, without his own shot.
  await picker(page).click();
  await options.nth(0).click();
  await expect(title(page, /every/)).toBeVisible();
  await expect(line(page, 6, 24, "25.0").first()).toBeVisible();
  await expect(page.getByText(/pooled \(2 players\)/)).toBeVisible();
  await expect(page.getByText(/6 player games\./)).toBeVisible();

  // Scrolled up under the sticky filters, the open list stays beneath them (and the navigation).
  await picker(page).click();
  await expect(options.nth(2)).toBeVisible();
  const top = (await picker(page).boundingBox()).y;
  await page.evaluate((by) => window.scrollBy(0, by), top - 120);
  const filters = await page.locator(".shooting-filters").boundingBox();
  const pickerBox = await picker(page).boundingBox();
  const onTop = await page.evaluate(
    ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest(".shooting-filters")),
    [pickerBox.x + pickerBox.width / 2, filters.y + filters.height - 4],
  );
  expect(onTop).toBe(true);
  await picker(page).press("Escape");

  // No player filter and no player table: each side is one player, or a whole position.
  await expect(page.locator("option", { hasText: "All players" })).toHaveCount(0);
  await expect(page.getByText("Each player's shooting")).toHaveCount(0);

  // Every panel holds its content (the filter box has no box of its own below 640px: it is just the Filters button there).
  await atWidths(page, WIDE, async () => {
    expect(await holdsContent(page.locator("#player-detail-panel .panel:not(.shooting-filters)"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });

  // The open list fits a phone too.
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await picker(page).click();
  await expect(options.nth(2)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a player without a position is set against every player", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await page.route(PLAYER_URL, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.player.positionName = null;
    await route.fulfill({ response, json });
  });
  const positions = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (POSITION_SHOTS_URL(url)) positions.push(url.searchParams.get("position"));
  });
  await openShooting(page, player);
  await expect(page.getByRole("combobox", { name: "Compare with a player" })).toBeVisible({ timeout: 60_000 });
  expect(positions.at(-1)).toBeNull();
  await picker(page).click();
  await expect(choices(page).nth(0)).toContainText(/^All players/);
});

test("the Shooting states fit a phone: no games in the phase, a failing request, no attempts, nothing located", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // Every game is in a phase the page is not on.
  await openShooting(page, player, { log: await logFor(page, player, { count: 3, phases: [["ZZ", "Another phase"]] }) });
  await expect(page.getByText("No played games yet this phase to map shot locations from.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // A failing position request, with its retry.
  await openShooting(page, player, { field: failing });
  await expect(page.getByText("Could not load this player's shot locations.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The player has no attempts in the phase.
  await openShooting(page, player, { own: { shots: [] } });
  await expect(page.getByText("No shot locations recorded for this player in this phase yet.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // Attempts without a location: still counted, and nothing spills out of the page.
  await openShooting(page, player, { own: shotsFor(player.personKey, { located: false }) });
  await expect(title(page)).toBeVisible({ timeout: 60_000 });
  await expect(line(page, 10, 20, "50.0").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
});
