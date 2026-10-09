import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The team page's Advanced tab at every width. Each test loads the page once and resizes the window: the layout depends on the
// viewport only. The club is live; the advanced and lineups answers are mocked (in the shapes the live endpoints return) so that
// each case has the size it needs: a full season of rounds, a short one, lineups with long names.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];

async function liveTeam(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  const team = [...teams].sort((a, b) => (b.name ?? "").length - (a.name ?? "").length)[0];
  return { slug, team };
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

// Whether everything inside each matching box sits inside that box (what is inside a box that scrolls on its own is left out).
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
        // (A tab strip draws its tabs a few pixels outside its own box by design.)
        return rect.width === 0 || scrolled(child) || child.closest("[role=tablist]") || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const failing = (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } });
const ADVANCED_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/advanced$/.test(url.pathname);
const LINEUPS_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/lineups$/.test(url.pathname);

// ---- Mocked answers, in the live shapes ----

function trendOf(rounds) {
  return Array.from({ length: rounds }, (_, index) => ({
    round: index + 1,
    gamesPlayed: index + 1,
    offensiveRating: 110 + 6 * Math.sin(index / 3) + index * 0.05,
    defensiveRating: 112 + 4 * Math.cos(index / 4),
    netRating: -2 + 6 * Math.sin(index / 3) - 4 * Math.cos(index / 4),
    pace: 72,
    srs: null,
    adjNetRating: null,
  }));
}

function splitsOf({ home = [19, 11], away = [19, 5], last5 = [5, 3], last10 = [10, 7] } = {}) {
  const part = (key, [games, wins], net) => ({
    [`${key}Games`]: games,
    [`${key}Wins`]: wins,
    [`${key}Mov`]: games ? net / 2 : null,
    [`${key}OffensiveRating`]: games ? 110.58 : null,
    [`${key}DefensiveRating`]: games ? 114.34 : null,
    [`${key}NetRating`]: games ? net : null,
    [`${key}Pace`]: games ? 74.03 : null,
  });
  return { roundNumber: 38, ...part("home", home, -3.765), ...part("away", away, 9.734), ...part("last5", last5, 2.335), ...part("last10", last10, 4.7476) };
}

const PBP = {
  games: 38,
  countedPossessions: 2804,
  timedGames: 38,
  timeLeadingSeconds: 36224,
  timeTrailingSeconds: 49310,
  timeTiedSeconds: 6866,
  runs6Plus: 117,
  clutchGames: 24,
  clutchSeconds: 5825,
  clutchPointsFor: 215,
  clutchPointsAgainst: 213,
  avgPossessionSeconds: 16.560287,
  leadChangesPerGame: 6.631579,
  tiesPerGame: 4.631579,
  largestLead: 26,
  longestRun: 18,
  assistedFgPct: 0.58348,
};

function advancedOf({ rounds = 38, splits = splitsOf(), pbp = PBP } = {}) {
  return { scope: "RS", scopes: ["RS", "all"], trend: trendOf(rounds), splits, pbp, zones: [] };
}

const mockAdvanced = (page, payload) => page.route(ADVANCED_URL, (route) => route.fulfill({ json: payload }));

async function openAdvanced(page, { slug, team, payload = advancedOf(), lineups = { lineups: [] } }) {
  await mockAdvanced(page, payload);
  await page.route(LINEUPS_URL, (route) => route.fulfill({ json: { scope: "RS", size: 5, minPossessions: 100, ...lineups } }));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
}

const block = (page, title) => page.locator("#team-advanced-panel section", { has: page.getByRole("heading", { name: title }) });

// ---- Ratings ----

test("the Ratings title has the panel's width below 640px with the badge under it, and the chart is not too tall", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openAdvanced(page, { slug, team });
  const ratings = block(page, "Offense and defense through the season").first();
  await expect(ratings).toBeVisible({ timeout: 30_000 });
  const canvas = ratings.locator("canvas");
  await expect(canvas).toBeVisible();
  // The caption says what the points are: the season to date, not one round.
  await expect(ratings.locator("p.muted")).toContainText("Season to date");

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // One copy of the "Net ... after R38" badge is drawn: under the title on a phone, beside it from 640px.
    await expect
      .poll(() =>
        ratings.evaluate((el) => {
          const title = el.querySelector("h2").getBoundingClientRect();
          const shown = [...el.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
          return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
        }),
      )
      .toEqual({ count: 1, under: phone, beside: !phone });
    // The title takes at most two lines (it took three beside the badge).
    const lines = await ratings.locator("h2").evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2);

    // The chart: as wide as its box, and shorter on a phone.
    await expect.poll(() => canvas.evaluate((el) => Math.round(el.getBoundingClientRect().height))).toBe(phone ? 240 : 288);
    expect(await holdsContent(ratings)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the chart's dots shrink as the rounds grow, and a short season has no chart", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  for (const [rounds, radius] of [[4, "4"], [12, "4"], [20, "2"], [25, "2"], [38, "0"]]) {
    await page.unroute(ADVANCED_URL).catch(() => {});
    await openAdvanced(page, { slug, team, payload: advancedOf({ rounds }) });
    await expect(page.locator("#team-advanced-panel canvas")).toHaveAttribute("data-point-radius", radius, { timeout: 30_000 });
    await expectNoSidewaysScroll(page);
  }

  await page.unroute(ADVANCED_URL);
  await openAdvanced(page, { slug, team, payload: advancedOf({ rounds: 1 }) });
  await expect(page.getByText("Not enough rounds played yet to chart the ratings.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#team-advanced-panel canvas")).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});

// ---- Splits and Play by play ----

test("the Splits are two by two below 640px and two columns from 640px, and the facts are a tidy grid", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openAdvanced(page, { slug, team });
  const splits = block(page, "Home, away and recent form");
  await expect(splits.locator(".panel")).toHaveCount(4, { timeout: 30_000 });
  const flow = block(page, "How games unfold");
  const facts = flow.locator("div.border-t > div");
  await expect(facts).toHaveCount(8);

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // Two columns either way (four from xl, not reached here); on a phone the block is short.
    const cards = await splits.locator(".panel").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    expect(new Set(cards.map((card) => Math.round(card.left))).size).toBe(2);
    expect(new Set(cards.map((card) => Math.round(card.top))).size).toBe(2);
    if (phone) expect((await splits.boundingBox()).height).toBeLessThan(600);
    expect(await holdsContent(splits.locator(".panel"))).toBe(true);
    expect(await holdsContent(splits)).toBe(true);

    // The eight facts: four rows of two on a phone, the wrapping row it was from 640px.
    const rects = await facts.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    if (phone) {
      expect(new Set(rects.map((rect) => Math.round(rect.left))).size).toBe(2);
      expect(new Set(rects.map((rect) => Math.round(rect.top))).size).toBe(4);
    } else {
      expect(await flow.locator("div.border-t").evaluate((el) => getComputedStyle(el).display)).toBe("flex");
    }
    expect(await holdsContent(flow)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("a split with one game or none, and a game flow without clutch or timed games, fit a phone", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const payload = advancedOf({
    splits: splitsOf({ home: [1, 1], away: [0, 0], last5: [1, 1], last10: [1, 1] }),
    pbp: { ...PBP, timeLeadingSeconds: null, timeTrailingSeconds: null, timeTiedSeconds: null, clutchPointsFor: null, clutchPointsAgainst: null, clutchSeconds: 0, longestRun: null, avgPossessionSeconds: null },
  });
  await openAdvanced(page, { slug, team, payload });
  const splits = block(page, "Home, away and recent form");
  await expect(splits.locator(".panel")).toHaveCount(4, { timeout: 30_000 });
  await expect(splits.getByText("1 game", { exact: true }).first()).toBeVisible();
  await expect(splits.getByText("—")).toHaveCount(1);
  await expect(page.getByText("No clutch minutes yet.")).toBeVisible();
  expect(await holdsContent(splits)).toBe(true);
  expect(await holdsContent(block(page, "How games unfold"))).toBe(true);
  await expectNoSidewaysScroll(page);
});

// ---- Lineups and the states ----

const SURNAMES = ["Bonga-Aleksandropoulos", "Osetkowski", "Brown", "Fernando", "Payne", "Whitaker-McIntyre", "Nunn", "Okobo", "Lessort", "Hezonja"];

// Ten lineups of `size` players with long surnames; the first has the best net rating, the third the most possessions.
function lineupsOf(size = 5, count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const names = Array.from({ length: size }, (_, player) => `${SURNAMES[(index + player) % SURNAMES.length].toUpperCase()}, ${["ISAAC", "DYLAN", "STERLING", "BRUNO", "CAMERON"][player % 5]}`);
    return {
      lineupSize: size,
      lineup: names.map((_, player) => `0${index}${player}`).join(","),
      lineupNames: names.join("; "),
      games: 6 + index,
      seconds: 3318 - index * 100,
      possessionsFor: index === 2 ? 190 : 102 + index,
      possessionsAgainst: 99,
      ortg: 116.67 - index,
      drtg: 109.09,
      netRating: 7.58 - index * 1.4,
    };
  });
}

// Answers like the endpoint: the lineups of the asked size, none below a possessions minimum the mock sets.
function mockLineups(page, { reachable = 100, calls = [] } = {}) {
  return page.route(LINEUPS_URL, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const size = Number(params.get("size"));
    const minimum = Number(params.get("minPossessions"));
    calls.push({ size, minimum });
    return route.fulfill({ json: { scope: "RS", size, minPossessions: minimum, lineups: minimum <= reachable ? lineupsOf(size) : [] } });
  });
}

test("the lineup rows hold their content at every width, with the badges under the faces on the narrowest phones", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await mockAdvanced(page, advancedOf());
  await mockLineups(page);
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  const lineups = block(page, "Best lineups");
  const rows = lineups.locator("li");
  await expect(rows).toHaveCount(10, { timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    expect(await holdsContent(rows)).toBe(true);
    expect(await holdsContent(lineups)).toBe(true);
    // The first row has one badge (best net rating); the third is the most used.
    const first = await rows.first().evaluate((li) => {
      const faces = li.querySelector(".flex.-space-x-2").getBoundingClientRect();
      const badges = [...li.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect());
      return { faces: faces.toJSON(), badges: badges.map((badge) => badge.toJSON()) };
    });
    expect(first.badges.length).toBe(1);
    // Where the badge does not fit beside the five faces (the narrowest phones) it wraps under them.
    if (width <= 320) expect(first.badges[0].top).toBeGreaterThanOrEqual(first.faces.bottom - 1);
    await expect(rows.nth(2).locator(".stat-badge", { hasText: "Most used" })).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

test("the lineup size tabs and the minimum select ask for what they say, and the fallback and empty messages fit", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const calls = [];
  await mockAdvanced(page, advancedOf());
  await mockLineups(page, { reachable: 50, calls });
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  const lineups = block(page, "Best lineups");

  // Auto asks for 100, finds none, and shows 50 with a note.
  await expect(lineups.getByText("No 5-man lineup has reached 100 possessions yet, so this shows 50+")).toBeVisible({ timeout: 30_000 });
  expect(calls.some((call) => call.size === 5 && call.minimum === 100)).toBe(true);
  expect(calls.some((call) => call.size === 5 && call.minimum === 50)).toBe(true);
  await expect(lineups.locator("li")).toHaveCount(10);
  // (The rows slide in, so the check waits for them to settle.)
  await expect.poll(() => holdsContent(lineups)).toBe(true);
  await expectNoSidewaysScroll(page);

  await lineups.getByRole("tab", { name: "3-man", exact: true }).click();
  await expect.poll(() => calls.some((call) => call.size === 3)).toBe(true);
  await lineups.getByRole("tab", { name: "2-man", exact: true }).click();
  await expect.poll(() => calls.some((call) => call.size === 2)).toBe(true);

  // A minimum nothing reaches: the empty message, which fits.
  await lineups.getByLabel("Minimum possessions").selectOption("200");
  await expect(lineups.getByText("No 2-man lineup has reached 200 possessions yet.")).toBeVisible();
  await expect(lineups.locator("li")).toHaveCount(0);
  expect(calls.some((call) => call.size === 2 && call.minimum === 200)).toBe(true);
  await expectNoSidewaysScroll(page);
});

test("the Advanced states fit a phone: failing, nothing yet, lineups failing, and no Shooting pointer", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await page.route(ADVANCED_URL, failing);
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText("Could not load advanced team stats.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(ADVANCED_URL);
  await mockAdvanced(page, { ...advancedOf(), scope: null, trend: [] });
  await page.reload();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText("Advanced stats are not available yet for this club.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  // Lineups failing leaves the rest of the tab; the scope strip is one row.
  await page.unroute(ADVANCED_URL);
  await mockAdvanced(page, advancedOf());
  await page.route(LINEUPS_URL, failing);
  await page.reload();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText("Could not load lineups.")).toBeVisible({ timeout: 30_000 });
  const scope = page.getByRole("tablist", { name: "Advanced stats scope" });
  await expect(scope).toBeVisible();
  expect(await scope.evaluate((el) => new Set([...el.querySelectorAll("[role=tab]")].map((tab) => Math.round(tab.getBoundingClientRect().top))).size)).toBe(1);
  // No Shooting pointer panel: the Shooting tab is next to this one.
  await expect(page.getByRole("button", { name: "Open Shooting →" })).toHaveCount(0);
  await expect(page.getByText("Shot zones, the court map")).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});
