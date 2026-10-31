import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The team page's Games and Shooting tabs at every width. Each test loads the page once and resizes the window: the layout depends
// on the viewport only. The club is live; the games (and the shot charts) are mocked so that each case has the shape it needs.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
// From 1280px the breakdown's right-hand column is only about 420px wide, the tightest the two tables get.
const WIDE = [...WIDTHS, 1280, 1440];
const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";

async function liveTeam(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  // The two clubs with the longest abbreviated names: the page's club and its opponent, to stretch the rows.
  const [team, rival] = [...teams].sort((a, b) => (b.abbreviatedName ?? "").length - (a.abbreviatedName ?? "").length);
  return { slug, code, team, rival };
}

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

// Whether everything inside each matching box sits inside that box. What is inside a box that scrolls on its own (the margin
// strip, a table) is meant to reach beyond it and is left out.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      const scrolled = (node) => {
        for (let up = node.parentElement; up && up !== el; up = up.parentElement) if (getComputedStyle(up).overflowX !== "visible") return true;
        return false;
      };
      return [...el.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || scrolled(child) || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

async function openTab(page, slug, clubCode, tab) {
  await page.goto(`/${slug}/teams/${clubCode}`);
  await page.getByRole("tab", { name: tab, exact: true }).click();
}

const failing = (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } });
const GAMES_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/games$/.test(url.pathname);

// `played` finished games, then `upcoming` to come, the club at home in every other one. Margins alternate in size and sign.
function gamesFor(team, opponent, { played = 3, upcoming = 3 } = {}) {
  const tag = (club) => ({ ...club, tvCode: club.tvCode ?? club.abbreviatedName, crestUrl: crest });
  const club = tag(team);
  const rival = tag(opponent);
  const row = (index, isPlayed) => {
    const home = index % 2 === 0;
    const margin = [16, -9, 2, -21, 7][index % 5];
    const winner = margin > 0;
    return {
      gameCode: 9000 + index,
      played: isPlayed,
      phaseCode: "RS",
      phaseName: "Regular Season",
      roundNumber: index + 1,
      scheduledAt: new Date(Date.UTC(2026, isPlayed ? 0 : 11, 1 + (index % 28), 18, 30)).toISOString(),
      localTeam: home ? club : rival,
      roadTeam: home ? rival : club,
      localScore: isPlayed ? (home === winner ? 90 : 90 - Math.abs(margin)) : null,
      roadScore: isPlayed ? (home === winner ? 90 - Math.abs(margin) : 90) : null,
    };
  };
  const games = [...Array.from({ length: played }, (_, i) => row(i, true)), ...Array.from({ length: upcoming }, (_, i) => row(played + i, false))];
  return { games, pagination: { hasMore: false } };
}
const mockGames = (page, payload) => page.route(GAMES_URL, (route) => route.fulfill({ json: payload }));

test("the Games tab fits every width: panels as wide as the page, TV codes below 640px, the strip's badges under its title", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival, { played: 38, upcoming: 12 }));
  await openTab(page, slug, team.clubCode, "Games");
  const strip = page.locator("section", { has: page.getByRole("heading", { name: "How the games went" }) });
  await expect(strip).toBeVisible({ timeout: 30_000 });
  const rows = page.locator("#team-panel ul > li > a, #team-results-panel ul > li > a").filter({ has: page.locator("p.truncate, p.muted") });
  await expect(page.getByRole("heading", { name: "Next games" })).toBeVisible();
  await expect(strip.locator("p.muted")).toHaveText("Oldest on the left. Click a bar to open the game.");
  const tag = rival.tvCode ?? rival.abbreviatedName;
  const name = rival.abbreviatedName ?? rival.name;

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // Every panel is as wide as the page's content (not widened by a row).
    const widths = await page.locator("#team-panel section.panel").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
    expect(widths.length).toBe(3);
    const main = Math.round(await page.locator("main").evaluate((el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight)));
    if (width < 1024) for (const value of widths) expect(value).toBe(main);
    expect(await holdsContent(page.locator("#team-panel section.panel"))).toBe(true);

    // The opponent in a row: the TV code below 640px, the abbreviated name from 640px, never cut.
    const labels = await page.locator("#team-panel .panel li > a p span.truncate").evaluateAll((els) => [
      ...new Set(
        els.map((el) =>
          [...el.querySelectorAll(".relative > span")]
            .filter((s) => s.getBoundingClientRect().width > 1)
            .map((s) => s.textContent.trim())
            .join(""),
        ),
      ),
    ]);
    expect(labels).toEqual([phone ? tag : name]);
    // No opponent is cut: the label (not its screen-reader copy) is as wide as the space the row gave it.
    const cut = await page.locator("#team-panel .panel li > a span.truncate").evaluateAll((els) =>
      els.filter((el) => el.querySelector(".relative") && el.querySelector(".relative").getBoundingClientRect().width > el.getBoundingClientRect().width + 1).map((el) => el.textContent),
    );
    expect(cut, `at ${width}px`).toEqual([]);
    // From 1024px each game is one line: the opponent and the round side by side, the date and time (or the score) beside them.
    if (width >= 1024) {
      const heights = await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(0);
      for (const height of heights) expect(height).toBeLessThan(52);
      // Two full columns end level on their own, with their "Show all" buttons level.
      const columns = page.locator("#team-panel section.panel").filter({ has: page.getByRole("button", { name: /^Show all/ }) });
      const [upcoming, results] = await columns.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(Math.abs(upcoming - results)).toBeLessThan(2);
      const buttons = await page.getByRole("button", { name: /^Show all/ }).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(buttons).size).toBe(1);
    }

    // "Show all" sits straight under each list's last row.
    const gaps = await page.locator("#team-panel section.panel").filter({ has: page.getByRole("button", { name: /^Show all/ }) }).evaluateAll((els) =>
      els.map((el) => el.querySelector("button").getBoundingClientRect().top - el.querySelector("ul").getBoundingClientRect().bottom),
    );
    for (const gap of gaps) expect(gap).toBeLessThan(16);
    // The result filter: in the heading row from 640px, on its own row under the heading below; each tab carries its count.
    const filter = page.getByRole("tablist", { name: "Results filter" });
    await expect(filter).toHaveCount(1);
    await expect(filter.getByRole("tab")).toHaveText([/^All \d+$/, /^Wins \d+$/, /^Losses \d+$/]);
    const inHeading = await filter.evaluate((el) => Boolean(el.closest(".panel-header")));
    expect(inHeading).toBe(!phone);
    // The next game is tinted without hovering.
    const nextRow = page.locator("section.panel", { has: page.getByRole("heading", { name: "Next games" }) }).locator("ul a").first();
    await expect(nextRow).toHaveClass(/bg-primary\/5/);

    // The strip's two badges: under the title below 640px, beside it from 640px; two are drawn (the other pair is display: none).
    await expect
      .poll(() =>
        strip.evaluate((el) => {
          const title = el.querySelector("h2").getBoundingClientRect();
          const shown = [...el.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
          return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
        }),
      )
      .toEqual({ count: 2, under: phone, beside: !phone });

    // With 38 games the strip scrolls inside its own box on a phone, and the page does not.
    const scrolls = await strip.locator(".overflow-x-auto").evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 390) expect(scrolls).toBe(true);
    await expectNoSidewaysScroll(page);
  });
  void rows;
});

test("the Games tab states fit a phone: few games, none played, none to come, no season, failing", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  const cases = [
    [gamesFor(team, rival, { played: 3, upcoming: 2 }), async () => expect(page.getByRole("heading", { name: "How the games went" })).toBeVisible()],
    [gamesFor(team, rival, { played: 0, upcoming: 4 }), async () => expect(page.getByText("No games played yet.")).toBeVisible()],
    [gamesFor(team, rival, { played: 4, upcoming: 0 }), async () => expect(page.getByText("No games left to play.")).toBeVisible()],
    [{ games: [], pagination: { hasMore: false } }, async () => expect(page.getByText("No games scheduled yet.")).toBeVisible()],
  ];
  for (const [payload, expectation] of cases) {
    await page.unroute(GAMES_URL).catch(() => {});
    await mockGames(page, payload);
    await openTab(page, slug, team.clubCode, "Games");
    await expectation();
    await expectNoSidewaysScroll(page);
  }

  // A filter with no matches, and "Show all" on a long list.
  await page.unroute(GAMES_URL);
  await mockGames(page, gamesFor(team, rival, { played: 4, upcoming: 12 }));
  await openTab(page, slug, team.clubCode, "Games");
  await page.getByRole("tab", { name: /^Losses \d+$/ }).click();
  await expect(page.getByRole("button", { name: /^Show all/ })).toBeVisible();
  await page.getByRole("button", { name: /^Show all/ }).click();
  await expect(page.getByRole("button", { name: "Show fewer" })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(GAMES_URL);
  await page.route(GAMES_URL, failing);
  await openTab(page, slug, team.clubCode, "Games");
  await expect(page.getByText("Could not load the games.").first()).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});

// Stages for the stage tests, whatever the live season has, and the live season format with its status replaced.
const PHASES_URL = (url) => /\/api\/seasons\/[^/]+\/phases$/.test(url.pathname);
const FORMAT_URL = (url) => /\/api\/seasons\/[^/]+\/format$/.test(url.pathname);
const mockPhases = (page, phases) => page.route(PHASES_URL, (route) => route.fulfill({ json: { phases } }));
async function mockStatus(page, code, status) {
  const { format } = await (await page.request.get(`${API}/${code}/format`)).json();
  await page.route(FORMAT_URL, (route) => route.fulfill({ json: { format: { ...format, status } } }));
}
const stageTab = (page, name) => page.getByRole("tablist", { name: "Phase" }).getByRole("tab", { name, exact: true });
const seasonLabel = (code) => {
  const year = Number(code.slice(-4));
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
};

test("the Games tab follows the stage tabs, and every stage tab says so when the club never reached the stage", async ({ page }) => {
  const { slug, code, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  // The club plays the first two stages and has not reached the Final Four in a season still going.
  await mockPhases(page, [{ code: "RS", name: "Regular Season" }, { code: "PO", name: "Playoffs" }, { code: "FF", name: "Final Four" }]);
  await mockStatus(page, code, "inProgress");
  // Five played (the last two in the playoffs: -21 and +7) and two regular-season games to come.
  const payload = gamesFor(team, rival, { played: 5, upcoming: 2 });
  for (const game of payload.games.slice(3, 5)) Object.assign(game, { phaseCode: "PO", phaseName: "Playoffs" });
  await mockGames(page, payload);
  await openTab(page, slug, team.clubCode, "Games");

  const strip = page.locator("section", { has: page.getByRole("heading", { name: "How the games went" }) });
  const chip = page.locator(".next-chip");
  await expect(strip.locator("ul > li")).toHaveCount(3, { timeout: 30_000 });
  await expect(strip.locator(".stat-badge:visible").first()).toHaveText("2-1");
  await expect(page.getByRole("heading", { name: "Next games" })).toBeVisible();
  const chipText = await chip.textContent();

  await stageTab(page, "Playoffs").click();
  await expect(strip.locator("ul > li")).toHaveCount(2);
  await expect(strip.locator(".stat-badge:visible").first()).toHaveText("1-1");
  await expect(page.getByText("No games left to play.")).toBeVisible();
  await expectNoSidewaysScroll(page);

  await stageTab(page, "Final Four").click();
  const club = team.abbreviatedName ?? team.name ?? team.clubCode;
  const notYet = `${club} hasn't played in the Final Four yet. Only the clubs that qualify play in it.`;
  await expect(page.getByText(notYet)).toBeVisible();
  await expect(page.getByRole("heading", { name: "How the games went" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Latest results" })).toHaveCount(0);
  // The header's next game is the season's, whatever stage is chosen.
  await expect(chip).toHaveText(chipText);
  await expectNoSidewaysScroll(page);

  // The same sentence on every tab with the stage strip; the stage stays chosen in the address.
  for (const tab of ["Overview", "Statistics", "Shooting"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(page.getByText(notYet)).toBeVisible();
    await expectNoSidewaysScroll(page);
  }
});

test("a stage the club went past or missed in a finished season says which", async ({ page }) => {
  const { slug, code, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await mockPhases(page, [{ code: "RS", name: "Regular Season" }, { code: "PI", name: "Play-In" }, { code: "PO", name: "Playoffs" }, { code: "FF", name: "Final Four" }]);
  await mockStatus(page, code, "completed");
  // Straight from the regular season to the playoffs, and out before the Final Four.
  const payload = gamesFor(team, rival, { played: 5, upcoming: 0 });
  for (const game of payload.games.slice(3, 5)) Object.assign(game, { phaseCode: "PO", phaseName: "Playoffs" });
  await mockGames(page, payload);
  await openTab(page, slug, team.clubCode, "Games");
  const club = team.abbreviatedName ?? team.name ?? team.clubCode;

  await stageTab(page, "Play-In").click();
  await expect(page.getByText(`${club} didn't play in the Play-In in ${seasonLabel(code)}.`)).toBeVisible({ timeout: 30_000 });
  await stageTab(page, "Final Four").click();
  await expect(page.getByText(`${club} didn't qualify for the Final Four in ${seasonLabel(code)}.`)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

// ---- The Shooting tab ----

const SHOTS_URL = (url) => /\/api\/seasons\/[^/]+\/games\/\d+\/shots$/.test(url.pathname);

// One field-goal attempt: `club` is the page's club or its opponent, coordinates are centimetres from the hoop.
const shot = (ordinal, club, actionCode, coordX, coordY, overrides = {}) => ({
  shotOrdinal: ordinal,
  clubCode: club,
  personCode: `${club}-P`,
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

// Attempts for the clubs in every quarter and one overtime, from the zones of the court, some made in a situation.
function shotsFor(clubs, { located = true } = {}) {
  const spots = [[0, 50, "2FGM"], [200, 300, "2FGA"], [-500, 480, "3FGM"], [100, 700, "3FGA"], [-400, 100, "2FGA"], [350, 350, "2FGM"], [650, 150, "3FGM"]];
  const rows = [];
  let ordinal = 1;
  for (const minute of [3, 15, 25, 35, 45]) {
    for (const club of clubs) {
      for (const [index, [x, y, action]] of spots.entries()) {
        rows.push(shot(ordinal++, club, action, located ? x : null, located ? y : null, { minute, fastbreak: index === 0, secondChance: index === 5 }));
      }
    }
  }
  return { shots: rows };
}

const mockShots = (page, payload) => page.route(SHOTS_URL, (route) => route.fulfill({ json: payload }));

async function openShooting(page, { team, rival, slug, payload = shotsFor([team.clubCode, rival.clubCode]) }) {
  await mockGames(page, gamesFor(team, rival, { played: 3, upcoming: 2 }));
  await mockShots(page, payload);
  await openTab(page, slug, team.clubCode, "Shooting");
}

// The studio's two courts: the club's and the opponents', labelled by side.
const courtOf = (page, side) => page.getByRole("img", { name: new RegExp(`^(Shooting zones|Shot chart), ${side}`) });
const courtPanels = (page) => page.locator("#shooting-presentation-panel .grid > .panel");
const headerValue = (panel, label) => panel.locator("p.eyebrow", { hasText: new RegExp(`^${label}`) }).locator("xpath=following-sibling::p[1]");

test("the Shooting tab is the shooting studio: the club and its opponents side by side, opening on the zones, at every width", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await openShooting(page, { team, rival, slug });
  const name = team.abbreviatedName ?? team.name;
  await expect(page.getByRole("heading", { name: `${name} and its opponents, Regular Season` })).toBeVisible({ timeout: 30_000 });
  // Opens on the zones; the shot map is the other tab.
  await expect(page.getByRole("tab", { name: "Shooting zones" })).toHaveAttribute("aria-selected", "true");
  await expect(courtOf(page, team.name)).toBeVisible();
  await expect(courtOf(page, "Opponents")).toBeVisible();
  // Every opponent is one side: the zone and quarter tables compare the club with "Opponents", never the rival by name.
  await expect(page.locator("table", { hasText: "Restricted area" }).first()).toContainText("Opponents");
  await expect(page.locator("table", { hasText: "Restricted area" }).first()).not.toContainText(rival.name);
  // The player table is the club's only.
  const playerSection = page.locator("section", { has: page.getByRole("heading", { name: "Each player's shooting" }) });
  await expect(playerSection).toContainText(team.name);
  await expect(playerSection).not.toContainText("Opponents");

  await atWidths(page, WIDE, async (width) => {
    const [club, opponents] = await courtPanels(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    // Side by side from 640px, stacked below.
    if (width >= 640) expect(Math.abs(club.top - opponents.top)).toBeLessThan(2);
    else expect(opponents.top).toBeGreaterThan(club.bottom - 1);
    expect(await holdsContent(courtPanels(page))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the studio's filters narrow both courts, with no player filter, and free throws come from the stage's totals", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 1440, height: HEIGHT });
  await openShooting(page, { team, rival, slug });
  await expect(courtOf(page, team.name)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Shot map" }).click();
  const [clubPanel, opponentsPanel] = [courtPanels(page).first(), courtPanels(page).last()];

  // Both courts are whole teams: no player list for either side, and the player table's names pick nothing.
  await expect(page.getByLabel(/ player$/)).toHaveCount(0);
  const playerSection = page.locator("section", { has: page.getByRole("heading", { name: "Each player's shooting" }) });
  await expect(playerSection.getByText("ONE, AL")).toBeVisible();
  await expect(playerSection.getByRole("button")).toHaveCount(0);
  await expect(playerSection).not.toContainText("Choose a player");

  // FT is the stage total for each side (or the missing mark when the live summary has none).
  for (const panel of [clubPanel, opponentsPanel]) {
    await expect(headerValue(panel, "FT")).toHaveText(/^(\d+-\d+ \(\d+\.\d%\)|—)$/);
  }

  // The period and play-context filters narrow both courts.
  const opponentsBefore = await headerValue(opponentsPanel, "2PT").textContent();
  await page.getByLabel("Period").selectOption({ label: "Q1" });
  await expect.poll(() => headerValue(opponentsPanel, "2PT").textContent()).not.toBe(opponentsBefore);
  await page.getByLabel("Play context").selectOption({ label: "Fast breaks" });
  // One made fast-break two per side in each mocked game, and the same shots are served for each of the three played games.
  await expect(headerValue(opponentsPanel, "2PT")).toHaveText(/^3-3 /);
  await expectNoSidewaysScroll(page);
});

test("the Shooting states fit a phone: no games, loading failing, no shots, nothing located", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await mockGames(page, gamesFor(team, rival, { played: 0, upcoming: 3 }));
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("No played games yet in the Regular Season to map shot locations from.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  await page.unroute(GAMES_URL);
  await mockGames(page, gamesFor(team, rival, { played: 3, upcoming: 1 }));
  await page.route(SHOTS_URL, failing);
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("Could not load season shot locations.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(SHOTS_URL);
  await mockShots(page, { shots: [] });
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("No shot locations recorded in the Regular Season yet.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  // Attempts without a location still fill the tables; the courts stay empty, and nothing breaks.
  await page.unroute(SHOTS_URL);
  await mockShots(page, shotsFor([team.clubCode, rival.clubCode], { located: false }));
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByRole("heading", { name: "Each player's shooting" })).toBeVisible({ timeout: 30_000 });
  await expect(courtOf(page, "Opponents")).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("long club and round names are truncated inside their rows and never widen a Games panel", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  const longRival = { ...rival, abbreviatedName: "Meridianbet Crvena Zvezda Belgrade Basketball Club", name: "Meridianbet Crvena Zvezda Belgrade Basketball Club", tvCode: null };
  const payload = gamesFor(team, longRival, { played: 4, upcoming: 4 });
  // The page opens on the regular season, so the games are in it; the long round name is what stretches the rows.
  for (const game of payload.games) Object.assign(game, { roundName: "Quarterfinals · Game five of the series" });
  await mockGames(page, payload);
  await openTab(page, slug, team.clubCode, "Games");
  await expect(page.getByRole("heading", { name: "Next games" })).toBeVisible({ timeout: 30_000 });

  await atWidths(page, [320, 390, 639, 640, 768, 1023, 1024], async (width) => {
    const widths = await page.locator("#team-panel section.panel").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
    const main = Math.round(await page.locator("main").evaluate((el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight)));
    if (width < 1024) for (const value of widths) expect(value).toBe(main);
    expect(await holdsContent(page.locator("#team-panel section.panel"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});
