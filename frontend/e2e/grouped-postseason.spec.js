import { test, expect } from "@playwright/test";
import { buildGroupedBracket, finalFourKind } from "../src/postseason/groupedBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { findPageOverflow, findBrokenWords, mockLayoutImages, WIDTHS } from "./support/layout";

const API = "http://localhost:3000/api";
const PODIUM = { 2012: ["OLY", "MAD", "CSK", "BAR"], 2013: ["TEL", "MAD", "BAR", "CSK"], 2014: ["MAD", "OLY", "CSK", "ULK"], 2015: ["CSK", "ULK", "TIV", "BAS"] };
async function load(request, season) {
  const get = async (path) => {
    const response = await request.get(`${API}/seasons/${season}${path}`);
    expect(response.ok(), path).toBe(true);
    return response.json();
  };
  const [{ format }, { standings }, { teams }, { series }, { games }] = await Promise.all([
    get("/format"), get("/phases/TS/standings"), get("/teams"), get("/postseason-series"), get("/games?phase=FF&limit=100"),
  ]);
  return { format, standings, teams, series, games };
}

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

for (const season of [2012, 2013, 2014, 2015]) {
  test(`${season}: recorded Top 16 qualifiers, every pairing, champion and placement`, async ({ request, page }) => {
    const data = await load(request, season);
    const bracket = buildGroupedBracket(data);
    expect(bracket.playIn).toEqual([]);
    expect(bracket.issues).toEqual([]);
    expect(bracket.connected).toBe(true);
    expect(bracket.playoffs.map((slot) => slot.label)).toEqual(["E1 v F4", "E2 v F3", "F1 v E4", "F2 v E3"]);
    expect(bracket.playoffs.every((slot) => slot.winTarget === 3 && slot.winnerClubCode)).toBe(true);
    const qualifiers = data.standings.filter((row) => row.basic.position <= 4).map((row) => row.clubCode).sort();
    expect(bracket.playoffs.flatMap((slot) => slot.participants.map((side) => side.clubCode)).sort()).toEqual(qualifiers);
    expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(PODIUM[season]);
    for (const game of data.games) {
      const slot = bracket.all.find((entry) => entry.series?.games.some((row) => row.gameCode === game.gameCode));
      expect(slot).toBeTruthy();
      expect(slot.participants.map((side) => side.clubCode).sort()).toEqual([game.localTeam.clubCode, game.roadTeam.clubCode].sort());
      expect(slot.winnerClubCode).toBe(game.localScore > game.roadScore ? game.localTeam.clubCode : game.roadTeam.clubCode);
    }
    await page.goto(`/${season}/postseason`);
    await expect(page.getByText(`${bracket.champion.name} are the champions`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("list", { name: "Stages of the season" })).toContainText("Top 16");
    await expect(page.getByRole("link", { name: "View Top 16 group standings" })).toHaveAttribute("href", `/${season}/standings?phase=TS`);
    for (const slot of bracket.playoffs) {
      const matchup = page.getByRole("group", { name: slot.label, exact: true });
      await expect(matchup).toBeVisible();
      await expect(matchup.locator('[title="Top 16 group place"]')).toHaveCount(2);
    }
    await page.getByRole("group", { name: "E1 v F4", exact: true }).getByRole("button").first().click();
    await expect(page.locator(".scroll-mt-28")).toContainText("Top 16:");
    await expect(page.locator(".scroll-mt-28 a[href*='/games/']").first()).toBeVisible();
    await page.getByText("How the postseason works", { exact: true }).click();
    await expect(page.locator("main")).not.toContainText(/1 v 8|2 v 7|Play-In|bracket is a projection/);
  });
}

test("leaders never advance, missing draws stay unknown and source order does not create seed mappings", async ({ request }) => {
  const data = await load(request, 2012);
  for (const count of [2, 3]) {
    const series = data.series.map((entry) => entry.phaseCode === "PO" ? { ...entry, clubAWins: count, clubBWins: 0 } : entry);
    const bracket = buildGroupedBracket({ ...data, series, games: [], standings: [...data.standings].reverse() });
    expect(bracket.playoffs.every((slot) => Boolean(slot.winnerClubCode) === (count === 3))).toBe(true);
    expect(bracket.semis.every((slot) => slot.participants.every((side) => !side.clubCode))).toBe(true);
    expect(bracket.champion).toBeNull();
    expect(bracket.connected).toBe(false);
  }
  const reversed = data.series.map((entry) => ({ ...entry, clubA: entry.clubB, clubB: entry.clubA, clubAWins: entry.clubBWins, clubBWins: entry.clubAWins }));
  expect(buildGroupedBracket({ ...data, series: reversed }).champion.clubCode).toBe("OLY");
  const missingRanks = buildGroupedBracket({ ...data, standings: [] });
  expect(missingRanks.playoffs.every((slot) => slot.participants.every((side) => side.seed === null && side.seedLabel === null))).toBe(true);
  expect(missingRanks.playoffs.every((slot) => /^Recorded quarterfinal/.test(slot.label))).toBe(true);
  const unknown = buildGroupedBracket({ ...data, games: data.games.map((game) => ({ ...game, groupName: null })) });
  expect(unknown.champion).toBeNull();
  expect(unknown.connected).toBe(false);
  expect(finalFourKind({ phaseCode: "PO", groupName: "Group CHAMPIONSHIP GAME" })).toBeNull();
  const duplicates = buildGroupedBracket({ ...data, series: [...data.series, data.series.find((entry) => entry.phaseCode === "PO")] });
  expect(duplicates.issues.length).toBeGreaterThan(0);
  const conflicting = structuredClone(data);
  const wrong = conflicting.series.find((entry) => entry.phaseCode === "PO");
  wrong.clubB = conflicting.series.find((entry) => entry.phaseCode === "PO" && entry !== wrong).clubB;
  expect(buildGroupedBracket(conflicting).issues.length).toBeGreaterThan(0);
});

test("unplayed or absent placement results do not invent third and fourth ranks", async ({ request }) => {
  const data = await load(request, 2012);
  const games = data.games.map((game) => finalFourKind(game) === "third" ? { ...game, played: false, localScore: null, roadScore: null } : game);
  const bracket = buildGroupedBracket({ ...data, games });
  expect(bracket.third.winnerClubCode).toBeNull();
  expect(bracket.third.series.games[0].localScore).toBeNull();
  expect(placements(bracket).some((row) => /Third|Fourth/.test(row.label))).toBe(false);
  expect(placements(bracket).filter((row) => row.label === "Final Four")).toHaveLength(2);
  const missing = buildGroupedBracket({ ...data, games: data.games.filter((game) => finalFourKind(game) !== "third") });
  expect(missing.third).toBeNull();
  expect(placements(missing).some((row) => /Third|Fourth/.test(row.label))).toBe(false);
  const unplayed = buildGroupedBracket({ ...data, games: data.games.map((game) => ({ ...game, played: false, localScore: null, roadScore: null })) });
  expect(unplayed.champion).toBeNull();
});

test("partial evidence retains recorded matches without inventing projections or connections", async ({ request, page }) => {
  const data = await load(request, 2012);
  await page.route("**/api/seasons/2012/phases/TS/standings*", (route) => route.fulfill({ json: { round: null, standings: [] } }));
  await page.route("**/api/seasons/2012/postseason-series", (route) => route.fulfill({ json: { series: data.series.filter((entry) => entry.phaseCode === "PO").map((entry) => ({ ...entry, clubAWins: 2, clubBWins: 0 })) } }));
  await page.route("**/api/seasons/2012/games?phase=FF*", (route) => route.fulfill({ json: { games: [], pagination: { hasMore: false } } }));
  await page.goto("/2012/postseason");
  await expect(page.getByRole("group", { name: "Recorded quarterfinal 1", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).toContainText("unavailable or unverified");
  await expect(page.getByRole("link", { name: "View recorded quarterfinal games" })).toHaveAttribute("href", "/2012/games?phase=PO");
  await expect(page.locator(".bk-in, .bk-out")).toHaveCount(0);
  await expect(page.getByText(/are the champions/)).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Play-In|bracket is a projection|1 v 8/);
});

test("format errors retain retry without showing a modern fallback bracket", async ({ page }) => {
  let fail = true;
  await page.route("**/api/seasons/2012/format", (route) => fail ? route.fulfill({ status: 500, json: { error: "Unavailable" } }) : route.continue());
  await page.goto("/2012/postseason");
  await expect(page.getByText("Could not load the postseason.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".bk-grid")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText(/are the champions/)).toBeVisible({ timeout: 30_000 });
});

test("season switches clear matchup detail and club focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2012/postseason");
  await expect(page.getByRole("group", { name: "E1 v F4", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("group", { name: "E1 v F4", exact: true }).getByRole("button").first().click();
  await expect(page.locator(".scroll-mt-28")).toContainText("Top 16:");
  await page.getByLabel("Selected season").first().selectOption("2013");
  await expect(page).toHaveURL(/\/2013\/postseason$/);
  await expect(page.getByText("Select a matchup to see its games.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".scroll-mt-28 a[href*='/games/']")).toHaveCount(0);
});

for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`recorded grouped bracket fits every season and width in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await mockLayoutImages(page);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    for (const season of [2012, 2013, 2014, 2015]) {
      await page.goto(`/${season}/postseason`);
      await expect(page.getByText(/are the champions/)).toBeVisible({ timeout: 30_000 });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(async () => { const overflow = await findPageOverflow(page); return overflow.scrollWidth - overflow.clientWidth; }).toBeLessThanOrEqual(0);
        expect(await findBrokenWords(page.locator('.bk-cell button span[title="Top 16 group place"]'))).toEqual([]);
      }
    }
    await page.waitForFunction(() => [...document.querySelectorAll(".bk-cell")].every((node) => Number(getComputedStyle(node).opacity) >= 0.99));
    await page.screenshot({ path: testInfo.outputPath("grouped-desktop.png"), fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.getByRole("group", { name: "E1 v F4", exact: true }).screenshot({ path: testInfo.outputPath("grouped-mobile-matchup.png"), animations: "disabled" });
  });
}
