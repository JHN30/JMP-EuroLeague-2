import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The Home header names the round of the next unplayed game and says where it stands. The clock is fixed and the two games requests the
// header makes (the next scheduled games, and the games of that round) are answered from here, so every state can be reached whatever
// the season's real calendar.
const API = "http://localhost:3000/api/seasons";

// Four real games supply the fields Upcoming games needs; each state sets their start times, results and round.
async function realGames(page, slug) {
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { games } = await (await page.request.get(`${API}/${code}/games?status=scheduled&order=asc&limit=4`)).json();
  return games;
}

// `at` are ISO instants and `played` the results, one per game; `round` is the number the games are given.
function roundOf(games, { at, played = [], round = 5 }) {
  return games.map((game, index) => ({ ...game, roundNumber: round, roundName: `Round ${round}`, scheduledAt: at[index], played: Boolean(played[index]) }));
}

async function serveRound(page, { scheduled, round }) {
  await page.route(/\/api\/seasons\/[^/]+\/games\?/, (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("status") === "scheduled") return route.fulfill({ json: { games: scheduled, pagination: { limit: 10, offset: 0, total: scheduled.length, hasMore: false } } });
    if (url.searchParams.get("round")) return route.fulfill({ json: { games: round, pagination: { limit: 100, offset: 0, total: round.length, hasMore: false } } });
    return route.fallback();
  });
}

const header = (page) => page.locator("main h1");
const statusLine = (page) => header(page).locator("xpath=following-sibling::p");

async function openHome(page, now) {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const slug = await seasonSlug(page);
  const games = await realGames(page, slug);
  await page.clock.setFixedTime(new Date(now));
  return { slug, games };
}

// The same four games, one hour apart from 17:45 on Tuesday 13 October 2026 (UTC).
const TUESDAY = ["2026-10-13T17:45:00Z", "2026-10-13T18:45:00Z", "2026-10-13T19:45:00Z", "2026-10-13T20:45:00Z"];
const unplayed = (games) => games.filter((game) => !game.played);

test.describe("the round line", () => {
  test.use({ timezoneId: "UTC", locale: "en-US" });

  for (const [name, now, expected] of [
    ["days ahead", "2026-10-10T12:00:00Z", /^Starts in 3 days \(Tue, Oct 13, 0?5:45\s?PM\)$/],
    ["tomorrow", "2026-10-12T12:00:00Z", /^Starts tomorrow at 0?5:45\s?PM$/],
    ["today", "2026-10-13T08:00:00Z", /^Starts today at 0?5:45\s?PM$/],
  ]) {
    test(`says when the round starts: ${name}`, async ({ page }) => {
      const { slug, games } = await openHome(page, now);
      const round = roundOf(games, { at: TUESDAY });
      await serveRound(page, { scheduled: round, round });
      await page.goto(`/${slug}/home`);
      await expect(header(page)).toHaveText("Round 5", { timeout: 30_000 });
      await expect(statusLine(page)).toHaveText(expected);
    });
  }

  test("says how many games are played and when the next one is, once the round has started", async ({ page }) => {
    const { slug, games } = await openHome(page, "2026-10-13T18:50:00Z");
    // The first two have started (one has its result), two are still to come.
    const round = roundOf(games, { at: TUESDAY, played: [true, false, false, false] });
    await serveRound(page, { scheduled: unplayed(round), round });
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText("Round 5", { timeout: 30_000 });
    await expect(statusLine(page)).toHaveText(/^Under way · 1 of 4 games played · next game today at 0?7:45\s?PM$/);
  });

  test("leaves out the next game when every unplayed game has started", async ({ page }) => {
    const { slug, games } = await openHome(page, "2026-10-13T21:30:00Z");
    const round = roundOf(games, { at: TUESDAY, played: [true, true, true, false] });
    await serveRound(page, { scheduled: unplayed(round), round });
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText("Round 5", { timeout: 30_000 });
    await expect(statusLine(page)).toHaveText("Under way · 3 of 4 games played");
  });

  test("moves on to the next round once the last game of this one is played", async ({ page }) => {
    const { slug, games } = await openHome(page, "2026-10-14T09:00:00Z");
    const next = roundOf(games, { at: TUESDAY.map((at) => at.replace("-13T", "-20T")), round: 6 });
    await serveRound(page, { scheduled: next, round: next });
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText("Round 6", { timeout: 30_000 });
    await expect(statusLine(page)).toHaveText(/^Starts in 6 days \(Tue, Oct 20, 0?5:45\s?PM\)$/);
  });

  // With nothing scheduled, the season's format says why: finished, or waiting for its next stage's fixtures.
  async function serveFormatStatus(page, status) {
    await page.route(/\/api\/seasons\/[^/]+\/format$/, async (route) => {
      const response = await route.fetch();
      const { format } = await response.json();
      await route.fulfill({ response, json: { format: { ...format, status: status ?? format.status } } });
    });
  }

  test("says the season has finished when the format says it is complete", async ({ page }) => {
    const { slug } = await openHome(page, "2026-10-14T09:00:00Z");
    await serveRound(page, { scheduled: [], round: [] });
    await serveFormatStatus(page, "completed");
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText("Season overview", { timeout: 30_000 });
    await expect(statusLine(page)).toHaveText("The season has finished.");
  });

  test("names the next stage, not the end of the season, when an ongoing season has nothing scheduled", async ({ page }) => {
    const { slug } = await openHome(page, "2026-10-14T09:00:00Z");
    await serveRound(page, { scheduled: [], round: [] });
    await serveFormatStatus(page, null);
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText("Season overview", { timeout: 30_000 });
    await expect(statusLine(page)).toHaveText("Play-In fixtures not published yet.");
  });

  test("keeps today's header, with no line, when the games cannot be loaded", async ({ page }) => {
    const { slug } = await openHome(page, "2026-10-10T12:00:00Z");
    await page.route(/\/api\/seasons\/[^/]+\/games\?(?=.*status=scheduled)/, (route) => route.fulfill({ status: 500, json: {} }));
    await page.goto(`/${slug}/home`);
    await expect(header(page)).toHaveText(/^(Round \d+|Season overview)$/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible();
    await expect(statusLine(page)).toHaveCount(0);
  });

  test("moves on by itself as the minutes pass", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: HEIGHT });
    const slug = await seasonSlug(page);
    const games = await realGames(page, slug);
    await page.clock.install({ time: new Date("2026-10-12T16:30:00Z") });
    const round = roundOf(games, { at: TUESDAY.map((at) => at.replace("-13T", "-12T")) });
    await serveRound(page, { scheduled: round, round });
    await page.goto(`/${slug}/home`);
    await expect(statusLine(page)).toHaveText(/^Starts today at 0?5:45\s?PM$/, { timeout: 30_000 });
    // Two hours later the first game has started.
    await page.clock.fastForward("02:00:00");
    await expect(statusLine(page)).toHaveText(/^Under way · 0 of 4 games played · next game today at 0?6:45\s?PM$/);
  });
});

// The same instants read in other time zones: the day word and the time are the viewer's.
for (const [timezoneId, expected] of [
  ["UTC", /^Starts tomorrow at 0?1:00\s?AM$/],
  ["America/Los_Angeles", /^Starts today at 0?6:00\s?PM$/],
  ["Asia/Dubai", /^Starts today at 0?5:00\s?AM$/],
]) {
  test.describe(`a viewer in ${timezoneId}`, () => {
    test.use({ timezoneId, locale: "en-US" });

    test("sees their own day and time for a start at 01:00 UTC", async ({ page }) => {
      // 21:30 UTC on Monday 12 October is 14:30 in Los Angeles and 01:30 on Tuesday in Dubai, where the 01:00 UTC start (05:00) is today and not tomorrow.
      const { slug, games } = await openHome(page, "2026-10-12T21:30:00Z");
      const round = roundOf(games, { at: ["2026-10-13T01:00:00Z", "2026-10-13T02:00:00Z", "2026-10-13T03:00:00Z", "2026-10-13T04:00:00Z"] });
      await serveRound(page, { scheduled: round, round });
      await page.goto(`/${slug}/home`);
      await expect(header(page)).toHaveText("Round 5", { timeout: 30_000 });
      await expect(statusLine(page)).toHaveText(expected);
    });
  });
}

test.describe("the header at 320px", () => {
  test.use({ viewport: { width: 320, height: HEIGHT }, timezoneId: "UTC", locale: "en-US" });

  test("keeps the line inside its panel", async ({ page }) => {
    const { slug, games } = await openHome(page, "2026-10-10T12:00:00Z");
    await page.setViewportSize({ width: 320, height: HEIGHT });
    const round = roundOf(games, { at: TUESDAY });
    await serveRound(page, { scheduled: round, round });
    await page.goto(`/${slug}/home`);
    await expect(statusLine(page)).toBeVisible({ timeout: 30_000 });
    const inside = await statusLine(page).evaluate((line) => {
      const panel = line.closest(".panel").getBoundingClientRect();
      const box = line.getBoundingClientRect();
      return box.left >= panel.left && box.right <= panel.right && document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(inside).toBe(true);
  });
});
