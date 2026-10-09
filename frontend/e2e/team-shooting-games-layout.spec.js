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
  await page.getByRole("tab", { name: "Losses", exact: true }).click();
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

const panelOf = (page, title) => page.locator("#team-shooting-panel section.panel", { has: page.getByRole("heading", { name: title }) });

// Which of a panel's badges are drawn, and whether they are under its title or beside it.
const badgesOf = (locator, take = 99) =>
  locator.evaluate((el, count) => {
    const title = el.querySelector("h2").getBoundingClientRect();
    const shown = [...el.querySelectorAll(".stat-badge")].slice(0, count).map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
    return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
  }, take);

test("the Shooting tab fits every width: the zones badges under their title, two controls visible and two behind Filters below 640px", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await openShooting(page, { team, rival, slug });
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 30_000 });
  const zones = panelOf(page, "Where the shots come from");
  const filters = page.getByRole("button", { name: /^Filters/ });
  const segment = page.getByLabel("Game segment");

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // There is no "games mapped" badge (the attempts are counted in the cards); the zones' badges are under the title on a phone and
    // beside it from 640px (one copy is drawn).
    await expect(page.getByText(/games mapped/)).toHaveCount(0);
    await expect.poll(() => badgesOf(zones)).toEqual({ count: 2, under: phone, beside: !phone });

    // The two main controls are always there; the segment select is behind the button below 640px and in the row from 640px.
    await expect(page.getByRole("tab", { name: "Opponents", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Every attempt", exact: true })).toBeVisible();
    if (phone) {
      await expect(filters).toBeVisible();
      await expect(segment).toBeHidden();
    } else {
      await expect(filters).toBeHidden();
      await expect(segment).toBeVisible();
    }
    expect(await holdsContent(page.locator("#team-panel section.panel"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the Filters button counts the segment and the result, opens the controls and filtering still works", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await openShooting(page, { team, rival, slug });
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const filters = page.getByRole("button", { name: /^Filters/ });
  const segment = page.getByLabel("Game segment");
  const fieldGoals = page.locator("p.eyebrow", { hasText: "Field goals" }).locator("xpath=following-sibling::p[1]");

  await expect(filters).toHaveText(/^Filters\s*▾$/);
  await expect(filters).toHaveAttribute("aria-expanded", "false");
  const before = await fieldGoals.textContent();
  await filters.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await expect(segment).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Result" })).toHaveCount(0);
  await segment.selectOption({ label: "Q1" });
  await expect(filters).toContainText("Filters · 1 active");
  await expect.poll(() => fieldGoals.textContent()).not.toBe(before);

  // The result strip exists only on "Every attempt"; both count.
  await page.getByRole("tab", { name: "Every attempt", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Result" })).toBeVisible();
  await page.getByRole("tab", { name: "Made", exact: true }).click();
  await expect(filters).toContainText("Filters · 2 active");
  // Closing the button does not reset a filter.
  await filters.click();
  await expect(segment).toBeHidden();
  await expect(filters).toContainText("Filters · 2 active");
  await expectNoSidewaysScroll(page);
});

test("the Shooting court and tables hold their content, with percentage-only chips on a narrow court", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await openShooting(page, { team, rival, slug });
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 30_000 });
  const court = page.getByRole("img", { name: /shot locations/ });
  await expect(court).toBeVisible();

  await atWidths(page, WIDE, async (width) => {
    // Every panel of the tab: its content inside it (the court, the legend, the two tables, the cards).
    expect(await holdsContent(page.locator("#team-panel section.panel"))).toBe(true);
    expect(await holdsContent(page.locator("#team-panel .rounded-field"))).toBe(true);
    // The court's chips: "made/attempts" and a percentage, or the percentage alone when the court is drawn under 420px wide (the
    // court is the page's width less its gutters, so that is a phone up to about 440px).
    const narrow = width <= 390;
    await expect
      .poll(async () => {
        const chips = await court.locator("text").allTextContents();
        return { percentages: chips.some((text) => /%/.test(text)), fractions: chips.some((text) => /^\d+\/\d+$/.test(text.trim())) };
      })
      .toEqual({ percentages: true, fractions: !narrow });
    await expectNoSidewaysScroll(page);
  });
});

test("the Shooting states fit a phone: no games, loading failing, no attempts, nothing located", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await mockGames(page, gamesFor(team, rival, { played: 0, upcoming: 3 }));
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("No played games yet this phase to map shot locations from.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  await page.unroute(GAMES_URL);
  await mockGames(page, gamesFor(team, rival, { played: 3, upcoming: 1 }));
  await page.route(SHOTS_URL, failing);
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("Could not load season shot locations.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Opponents' shots when the mocked attempts are all the club's: nothing to show.
  await page.unroute(SHOTS_URL);
  await mockShots(page, shotsFor([team.clubCode]));
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Opponents", exact: true }).click();
  await expect(page.getByText("No attempts match these filters.")).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Attempts without a location: counted, but there is nothing to place on the court or in the zones.
  await page.unroute(SHOTS_URL);
  await mockShots(page, shotsFor([team.clubCode, rival.clubCode], { located: false }));
  await openTab(page, slug, team.clubCode, "Shooting");
  await expect(page.getByText("No located attempts.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});

test("long club and round names are truncated inside their rows and never widen a Games panel", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  const longRival = { ...rival, abbreviatedName: "Meridianbet Crvena Zvezda Belgrade Basketball Club", name: "Meridianbet Crvena Zvezda Belgrade Basketball Club", tvCode: null };
  const payload = gamesFor(team, longRival, { played: 4, upcoming: 4 });
  for (const game of payload.games) Object.assign(game, { roundName: "Quarterfinals · Game five of the series", phaseCode: "PO", phaseName: "Play-offs" });
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

test("the Zones and Style tables name their columns at every width, leave out Half court and keep a short note", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await openShooting(page, { team, rival, slug });
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 30_000 });
  const zones = panelOf(page, "Where the shots come from");
  const style = panelOf(page, /^How .* scores$/);

  // The notes under the tables.
  await expect(zones.locator("p.muted")).toHaveText("Hottest and coldest only count zones with a fair number of attempts.");
  await expect(style.locator("p.muted")).toHaveText("A basket can be in more than one situation (a fast break off a turnover counts in both).");
  // The rows: the three situations the feed marks; no "Half court". The percentage is the baskets' share of all the attempts.
  await expect(style.locator("li")).toHaveCount(3);
  await expect(style.getByText("Half court")).toHaveCount(0);
  const attempts = Number(/-(\d+)/.exec(await page.locator("p.eyebrow", { hasText: "Field goals" }).locator("xpath=following-sibling::p[1]").textContent())[1]);
  expect(attempts).toBeGreaterThan(50);
  const figures = await style.locator("li").evaluateAll((rows) => rows.map((row) => [...row.children].slice(-3).map((el) => el.textContent.trim())));
  expect(figures).toHaveLength(3);
  for (const [percentage, baskets] of figures) expect(percentage).toBe(`${Math.round((Number(baskets) / attempts) * 100)}%`);

  await atWidths(page, WIDE, async () => {
    expect(await holdsContent(zones)).toBe(true);
    expect(await holdsContent(style)).toBe(true);
    for (const [panel, headings] of [[zones, ["Share", "Made", "FG%"]], [style, ["Of att.", "Baskets", "Points"]]]) {
      // Every heading is drawn (display, not hidden), and each sits over its column: its right edge is the numbers' right edge.
      const shown = await panel.locator("div[aria-hidden=true].border-b > span").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0 && el.textContent.trim()).map((el) => [el.textContent.trim(), el.getBoundingClientRect().right]));
      // The first column has no heading: a zone and a situation name themselves.
      expect(shown.map(([text]) => text)).not.toContain(panel === zones ? "Zone" : "Situation");
      for (const heading of headings) expect(shown.map(([text]) => text), heading).toContain(heading);
      const rights = await panel.locator("li").first().evaluate((li) => [...li.children].slice(-3).map((el) => el.getBoundingClientRect().right));
      const headRights = headings.map((heading) => shown.find(([text]) => text === heading)[1]);
      headRights.forEach((right, index) => expect(Math.abs(right - rights[index])).toBeLessThan(3));
    }
    expectNoSidewaysScroll(page);
  });
});
