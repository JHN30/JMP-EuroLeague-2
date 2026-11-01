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

// Rounds with their own ratings (jagged) and the cumulative season-to-date ratings that are their running mean; `gaps` are rounds the
// club did not play (no ratings, no games).
function trendOf(rounds, { gaps = [] } = {}) {
  let played = 0;
  let offenseSum = 0;
  let defenseSum = 0;
  return Array.from({ length: rounds }, (_, index) => {
    const skipped = gaps.includes(index + 1);
    const own = { offense: 112 + 14 * Math.sin(index * 1.7), defense: 110 + 12 * Math.cos(index * 1.3) };
    if (!skipped) {
      played += 1;
      offenseSum += own.offense;
      defenseSum += own.defense;
    }
    const offensive = offenseSum / Math.max(played, 1);
    const defensive = defenseSum / Math.max(played, 1);
    return {
      round: index + 1,
      gamesPlayed: played,
      roundGames: skipped ? 0 : 1,
      roundPossessions: skipped ? null : 72,
      roundOffensiveRating: skipped ? null : own.offense,
      roundDefensiveRating: skipped ? null : own.defense,
      roundNetRating: skipped ? null : own.offense - own.defense,
      offensiveRating: offensive,
      defensiveRating: defensive,
      netRating: offensive - defensive,
      pace: 72,
      srs: null,
      adjNetRating: null,
    };
  });
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
  // The caption says what the points and the dashed lines are, and the season averages are the cumulative values after the last round.
  await expect(ratings.locator("p.muted").last()).toContainText("dashed lines are the season averages");
  await expect(ratings.locator("p.muted").last()).toContainText("dashed lines are the season averages");
  const last = advancedOf().trend.at(-1);
  await expect(canvas).toHaveAttribute("data-average-offense", String(Number(last.offensiveRating.toFixed(1))));
  await expect(canvas).toHaveAttribute("data-average-defense", String(Number(last.defensiveRating.toFixed(1))));
  const averages = ratings.getByTestId("ratings-averages");
  await expect(averages).toContainText(`Offense ${last.offensiveRating.toFixed(1)}`);
  await expect(averages).toContainText(`Defense ${last.defensiveRating.toFixed(1)}`);
  await expect(averages).toContainText("over 38 games");

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // One copy of the "Season net ... after R38" badge is drawn: under the title on a phone, beside it from 640px.
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
  // Six page loads, each with the league standings, game flow and player impact beside the mocked answers.
  test.setTimeout(90_000);
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

// ---- Strength and four factors (the live league standings) ----

const STANDINGS_URL = (url) => /\/api\/seasons\/[^/]+\/advanced\/standings$/.test(url.pathname);
const PLAYERS_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/players-advanced$/.test(url.pathname);
const RANK = /^\d+(st|nd|rd|th) of \d+$/;

test("the strength tiles and tables and the four factors show each value with its league rank and average, at every width", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openAdvanced(page, { slug, team });
  const strength = block(page, "How strong the team is");
  const tiles = strength.locator(".grid > .panel");
  await expect(tiles).toHaveCount(4, { timeout: 30_000 });
  // (Each label carries its tip for screen readers, so the labels are matched by how they start.)
  await expect(tiles.locator(".eyebrow")).toHaveText([/^Net rating/, /^Adjusted net/, /^SRS/, /^Schedule/]);
  // Every table row has a value, a rank and the league average.
  const tableRows = strength.locator("tbody tr");
  await expect(tableRows).toHaveCount(17);
  await expect(tableRows.filter({ hasText: "Offensive rating" }).first().locator("td").nth(2)).toHaveText(RANK);
  // A figure that measures clubs against each other averages zero, said with its reason; the league's best is beside it.
  const net = tableRows.filter({ hasText: /^Net rating/ });
  await expect(net.locator("td").nth(3)).toHaveText(/^0 \(Zero for the league as a whole/);
  await expect(net.locator("td").nth(4)).toHaveText(/^[+-]\d+\.\d$/);
  await expect(strength.getByText(/After round \d+, against the \d+ clubs of the stage/)).toBeVisible();

  const factors = block(page, "What wins possessions, at both ends");
  await expect(factors.locator("li")).toHaveCount(10);
  await expect(factors.locator("li").filter({ hasText: "League" })).toHaveCount(10);

  await atWidths(page, [...WIDTHS, 1440], async (width) => {
    const boxes = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    // Two by two below lg, one row of four from lg.
    expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(width >= 1024 ? 1 : 2);
    // (The sections slide in and the bars grow, so the checks wait for them to settle.)
    await expect.poll(() => holdsContent(strength)).toBe(true);
    await expect.poll(() => holdsContent(factors.locator("li"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("before the schedule links every club, the schedule figures are blank with a note", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await page.route(STANDINGS_URL, async (route) => {
    const live = await (await route.fetch()).json();
    await route.fulfill({ json: { ...live, standings: live.standings.map((row) => ({ ...row, connected: false })) } });
  });
  await openAdvanced(page, { slug, team });
  const strength = block(page, "How strong the team is");
  await expect(strength.getByText(/appear once the games played link every club/)).toBeVisible({ timeout: 30_000 });
  const srs = strength.locator("tbody tr").filter({ hasText: /^SRS/ });
  await expect(srs.locator("td").nth(1)).toHaveText("—");
  await expect(srs.locator("td").nth(2)).toHaveText("—");
  // The ratings that don't depend on the schedule keep their ranks.
  await expect(strength.locator("tbody tr").filter({ hasText: "Offensive rating" }).first().locator("td").nth(2)).toHaveText(RANK);
  await expectNoSidewaysScroll(page);
});

test("when the league comparison fails, strength and four factors offer a retry and the rest of the tab stays", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.route(STANDINGS_URL, failing);
  await openAdvanced(page, { slug, team });
  await expect(page.getByText("Could not load the league comparison.")).toHaveCount(2, { timeout: 30_000 });
  await expect(block(page, "Offense and defense through the season")).toBeVisible();
  // The splits table without its season row.
  await expect(block(page, "Home, away and recent form").locator("tbody tr")).toHaveCount(4);
  await expectNoSidewaysScroll(page);
});

// ---- Splits and Play by play ----

test("the Splits are one table under the season row, and the facts are a tidy grid with league ranks", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openAdvanced(page, { slug, team });
  const splits = block(page, "Home, away and recent form");
  const rows = splits.locator("tbody tr");
  await expect(rows).toHaveCount(5, { timeout: 30_000 });
  await expect(rows.first()).toContainText("Season");
  await expect(rows.nth(1)).toContainText("vs season");
  // Every column says what it is.
  await expect(splits.locator("th", { hasText: "ORtg" })).toContainText("points scored per 100 possessions");
  await expect(splits.locator("th", { hasText: "MOV" })).toContainText("Margin of victory");
  const flow = block(page, "How games unfold");
  const facts = flow.locator("div.border-t > div");
  await expect(facts).toHaveCount(9);
  await expect(facts.filter({ hasText: "Clutch margin" })).toContainText("+2");
  await expect(facts.getByText(RANK).first()).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // The four ratings columns from 640px; below it they sit under each split's name.
    await expect(splits.locator("th", { hasText: "ORtg" })).toBeVisible({ visible: !phone });
    await expect(rows.nth(1).locator("td").first().locator("span.block")).toBeVisible({ visible: phone });
    expect(await holdsContent(splits)).toBe(true);

    // The nine facts: two columns on a phone, the wrapping row it was from 640px.
    const rects = await facts.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    if (phone) {
      expect(new Set(rects.map((rect) => Math.round(rect.left))).size).toBe(2);
      expect(new Set(rects.map((rect) => Math.round(rect.top))).size).toBe(5);
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
  const away = splits.locator("tbody tr").filter({ hasText: "Away" });
  await expect(away).toBeVisible({ timeout: 30_000 });
  await expect(away.locator("td").nth(1)).toHaveText("0");
  await expect(away.getByText("—").first()).toBeVisible();
  await expect(splits.locator("tbody tr").filter({ hasText: "Home" })).toContainText("1-0");
  await expect(page.getByText("No clutch minutes yet.")).toBeVisible();
  await expect(block(page, "How games unfold").locator("div.border-t > div").filter({ hasText: "Clutch margin" })).toContainText("—");
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

// ---- Player impact ----

function impactPlayer(index, overrides = {}) {
  return {
    personKey: `P${index}`,
    playerName: `${SURNAMES[index % SURNAMES.length].toUpperCase()}, ${["ISAAC", "DYLAN", "STERLING", "BRUNO", "CAMERON"][index % 5]}`,
    secondsPlayed: 30_000 - index * 1_000,
    onSeconds: 30_000 - index * 1_000,
    onNetRating: 4 - index,
    offNetRating: -2 + index,
    netRatingDiff: 6 - index * 2,
    rapm: 0.5 - index * 0.2,
    rapmOffense: 0.3,
    rapmDefense: 0.2 - index * 0.2,
    winShares: 1 + index * 0.4,
    offWinShares: 0.5 + index * 0.2,
    defWinShares: 0.5 + index * 0.2,
    ...overrides,
  };
}

test("the player impact charts are sorted, leave out short samples, link the players and fit every width", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  const players = [...Array.from({ length: 6 }, (_, index) => impactPlayer(index)), impactPlayer(6, { secondsPlayed: 3_000, onSeconds: 3_000, netRatingDiff: 40, winShares: 9 })];
  await page.route(PLAYERS_URL, (route) => route.fulfill({ json: { scope: "RS", round: 38, earlySeason: false, players } }));
  await openAdvanced(page, { slug, team });
  const impact = block(page, "Who drives the results");
  const onOff = impact.getByRole("list", { name: "On/off net rating" }).locator("li");
  const shares = impact.getByRole("list", { name: "Win shares" }).locator("li");
  // The player under 100 minutes is in neither chart.
  await expect(onOff).toHaveCount(6, { timeout: 30_000 });
  await expect(shares).toHaveCount(6);
  // On/off from the best difference; win shares from the most.
  await expect(onOff.first()).toContainText("+6.0");
  await expect(onOff.last()).toContainText("-4.0");
  await expect(shares.first()).toContainText("3.0");
  await expect(onOff.first().getByRole("link")).toHaveAttribute("href", `/${slug}/players/P0`);
  await expect(impact.getByText(/Team total/)).toContainText("Team total");

  await atWidths(page, [...WIDTHS, 1440], async (width) => {
    const [left, right] = await impact.locator(".grid > .panel").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    // Side by side from lg, stacked below.
    if (width >= 1024) expect(Math.abs(left.top - right.top)).toBeLessThan(2);
    else expect(right.top).toBeGreaterThan(left.bottom - 1);
    expect(await holdsContent(impact.locator("li"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the player impact states fit a phone: nobody with enough minutes, and failing", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const short = [impactPlayer(0, { secondsPlayed: 600, onSeconds: 600 })];
  await page.route(PLAYERS_URL, (route) => route.fulfill({ json: { scope: "RS", round: 2, earlySeason: true, players: short } }));
  await openAdvanced(page, { slug, team });
  await expect(page.getByText("No player has 100 on-court minutes in this stage yet.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("No player has 100 minutes in this stage yet.")).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(PLAYERS_URL);
  await page.route(PLAYERS_URL, failing);
  await page.reload();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByText("Could not load player impact.")).toBeVisible({ timeout: 30_000 });
  await expect(block(page, "Who drives the results").getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
