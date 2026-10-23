import { test, expect } from "@playwright/test";
import { bracketSeeds, buildBracket, placements, raceStatus } from "../src/postseason/bracketModel.js";
import { tableTiers } from "../src/lib/seasonFormat.js";
import { DIRECT_EIGHT_SEASONS } from "./support/direct-eight-seasons";

const API = "http://localhost:3000/api";
const format = { stages: [
  { code: "RS", type: "table", qualification: [{ positions: [1, 8], within: "table", kind: "direct", to: "PO" }] },
  { code: "PO", winTarget: 3 }, { code: "FF", winTarget: 1, thirdPlaceGame: true },
] };
const standings = Array.from({ length: 16 }, (_, i) => ({ clubCode: `C${i + 1}`, basic: { position: i + 1, gamesWon: 30 - i, gamesLost: i } }));
const teams = standings.map((row) => ({ clubCode: row.clubCode, name: row.clubCode }));
const tiers = tableTiers(format, "RS");
const build = (series = [], rows = standings) => buildBracket({ standings: rows, teams, series, regularSeasonDone: false, format, tiers });

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("direct qualification projects eight seeds without Play-In and tolerates absent evidence", () => {
  const bracket = build();
  expect(bracket.playIn).toEqual([]);
  expect(bracket.all.some((slot) => slot.stage === "PI")).toBe(false);
  expect(bracket.playoffs.map((slot) => slot.participants.map((club) => club.clubCode))).toEqual([
    ["C1", "C8"], ["C2", "C7"], ["C3", "C6"], ["C4", "C5"],
  ]);
  expect(bracket.playoffs.every((slot) => slot.state === "projected")).toBe(true);
  expect(placements(bracket)).toBeNull();
  expect(build([], standings.slice(0, 6)).playoffs[0].participants[1].placeholder).toBe("To be decided");
  expect(build([], []).champion).toBeNull();
  expect(raceStatus([], new Map(), bracketSeeds(tiers)).size).toBe(0);
});

for (const [wins, losses] of [[2, 0], [2, 1], [3, 1]]) {
  test(`a reversed quarterfinal pairing at ${wins}-${losses} advances only at three wins`, () => {
    const series = [{ phaseCode: "PO", clubA: { clubCode: "C8" }, clubB: { clubCode: "C1" }, clubAWins: losses, clubBWins: wins, games: [] }];
    const bracket = build(series);
    expect(bracket.playoffs[0].winnerClubCode).toBe(wins === 3 ? "C1" : null);
    expect(bracket.semis[0].participants[0].clubCode).toBe(wins === 3 ? "C1" : undefined);
    expect(build([{ ...series[0], phaseCode: "FF" }]).playoffs[0].series).toBeNull();
    expect(build([{ ...series[0], clubA: { clubCode: "C9" } }]).playoffs[0].series).toBeNull();
  });
}

test("the direct-eight race has one cutoff and preserves uncertainty at tied wins", () => {
  const options = bracketSeeds(tiers);
  expect(options).toEqual({ directSeeds: 8, playInLast: 8 });
  const race = raceStatus(standings, new Map(), options);
  expect(race.get("C8").status).toBe("playoffs");
  expect(race.get("C9").status).toBe("out");
  const tied = standings.map((row) => row.clubCode === "C9" ? { ...row, basic: { ...row.basic, gamesWon: standings[7].basic.gamesWon } } : row);
  const tieRace = raceStatus(tied, new Map(), options);
  expect(tieRace.get("C8").status).toBe("alive");
  expect(tieRace.get("C9").status).toBe("alive");
  expect([...tieRace.values()].some((row) => row.status.includes("playin"))).toBe(false);
});

for (const { season, clubs, rsGames, counts, podium } of DIRECT_EIGHT_SEASONS) {
  test(`${season}: actual data, champion, placement and direct bracket match the verified era`, async ({ page, request }) => {
    const base = `${API}/seasons/E${season}`;
    const get = async (path) => {
      const response = await request.get(base + path);
      expect(response.ok(), path).toBe(true);
      return response.json();
    };
    const { format: actual } = await get("/format");
    expect(actual.status).toBe("completed");
    expect(actual.issues).toEqual([]);
    expect(actual.stages.map((stage) => stage.code)).toEqual(["RS", "PO", "FF"]);
    expect(actual.stages.map((stage) => stage.observed.gamesPlayed)).toEqual(counts);
    const { standings: rows } = await get("/phases/RS/standings");
    expect(rows).toHaveLength(clubs);
    expect(rows.every((row) => row.basic.gamesPlayed === rsGames && row.basic.qualified === (row.basic.position <= 8))).toBe(true);
    const { teams: actualTeams } = await get("/teams");
    const { series } = await get("/postseason-series");
    const bracket = buildBracket({ standings: rows, teams: actualTeams, series, regularSeasonDone: true, format: actual, tiers: tableTiers(actual, "RS") });
    expect(bracket.playoffs.every((slot) => slot.series && slot.winnerClubCode)).toBe(true);
    expect(bracket.semis.every((slot) => slot.series && slot.winnerClubCode)).toBe(true);
    expect(bracket.champion.clubCode).toBe(podium[0]);
    expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(podium);
    await page.goto(`/${season}/postseason`);
    await expect(page.getByText(`${bracket.champion.name} are the champions`)).toBeVisible();
    await expect(page.getByRole("group", { name: "Third place", exact: true })).toBeVisible();
    await expect(page.locator(".bk-grid [role=group]")).toHaveCount(8);
    await page.getByText("How the postseason works", { exact: true }).click();
    await expect(page.getByText(new RegExp(`Each of the ${clubs} clubs`))).toContainText(`${rsGames} games`);
    await expect(page.locator("main")).not.toContainText(/Play-In|Play-in|top six|seventh to tenth/i);
    await page.getByRole("group", { name: "1 v 8", exact: true }).getByRole("button").first().click();
    await expect(page.locator(".scroll-mt-28").getByText(/Game 1/)).toBeVisible();
    await expect(page.locator(".scroll-mt-28 a[href*='/games/']").first()).toBeVisible();
  });

  for (const theme of ["light-euroleague", "dark-euroleague"]) {
    test(`${season}: direct bracket fits ${theme} at every supported width`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
      await page.goto(`/${season}/postseason`);
      await expect(page.getByText(/are the champions/)).toBeVisible();
      await expect(page.locator(".bk-cell").last()).toHaveCSS("opacity", "1");
      for (const width of [1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        expect(await page.locator(".bk-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(width >= 1024 ? 3 : 1);
        if (width === 1024) await page.screenshot({ path: `test-results/direct-eight-${season}-${theme}-1024.png`, fullPage: true });
      }
      await page.screenshot({ path: `test-results/direct-eight-${season}-${theme}-320.png`, fullPage: true });
    });
  }
}

test("historical pre-playoff and partial states use direct seeds and the actual next stage", async ({ page, request }) => {
  const { format: actual } = await (await request.get(`${API}/seasons/E2016/format`)).json();
  await page.route(/\/seasons\/[^/]+\/postseason-series$/, (route) => route.fulfill({ json: { series: [] } }));
  await page.route(/\/seasons\/[^/]+\/format$/, (route) => route.fulfill({ json: { format: { ...actual, status: "ongoing", stages: actual.stages.map((stage) => ({ ...stage, dataState: stage.code === "RS" ? "loaded" : "upcoming", observed: { ...stage.observed, gamesPlayed: stage.code === "RS" ? 240 : 0 } })) } } }));
  await page.goto("/2016/postseason");
  await expect(page.getByText("The regular season is over: the Playoffs are next")).toBeVisible();
  await expect(page.getByRole("group", { name: "1 v 8", exact: true }).getByRole("button")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Play-In", exact: true })).toHaveCount(0);
});

test("a format failure shows retry instead of an invented historical bracket", async ({ page }) => {
  let fail = true;
  await page.route(/\/seasons\/[^/]+\/format$/, (route) => fail ? route.fulfill({ status: 500, json: { error: "Unavailable" } }) : route.continue());
  await page.goto("/2016/postseason");
  await expect(page.getByText("Could not load the postseason.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry|try again/i })).toBeVisible();
  await expect(page.locator(".bk-grid")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(/are the champions/)).toBeVisible();
});

test("historical format loading and empty standings never invent a bracket", async ({ page }) => {
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  await page.route(/\/seasons\/[^/]+\/format$/, async (route) => { await delayed; await route.continue(); });
  await page.route(/\/seasons\/[^/]+\/phases\/RS\/standings$/, (route) => route.fulfill({ json: { standings: [] } }));
  await page.goto("/2016/postseason");
  await expect(page.getByRole("status", { name: "Loading the postseason" })).toBeVisible();
  await expect(page.locator(".bk-grid")).toHaveCount(0);
  release();
  await expect(page.getByText("The standings are not available yet, so there is no bracket to show.")).toBeVisible();
});

test("an ongoing direct-eight race uses eight places, but incomplete fixtures cannot clinch clubs", async ({ page, request }) => {
  const { format: actual } = await (await request.get(`${API}/seasons/E2016/format`)).json();
  let incomplete = false;
  await page.route(/\/seasons\/[^/]+\/postseason-series$/, (route) => route.fulfill({ json: { series: [] } }));
  await page.route(/\/seasons\/[^/]+\/format$/, (route) => route.fulfill({ json: { format: {
    ...actual, status: "ongoing", issues: incomplete ? [{ code: "GAME_COUNT", stage: "RS" }] : [],
    stages: actual.stages.map((stage) => ({ ...stage, dataState: stage.code === "RS" ? "partial" : "upcoming", observed: { ...stage.observed, gamesPlayed: stage.code === "RS" ? 200 : 0 } })),
  } } }));
  await page.goto("/2016/postseason");
  await expect(page.getByRole("heading", { name: "Race for the bracket" })).toBeVisible();
  await expect(page.getByText(/Top 8: straight to the Playoffs/)).toBeVisible();
  // Two zones, measured against 9th and 8th: no Play-In zone between them.
  await expect(page.getByRole("heading", { name: "Playoffs 1-8", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Chasing \d+(-\d+)?$/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "vs 9th" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Play-In|Play-in/);
  incomplete = true;
  await page.reload();
  await expect(page.getByText("The qualification race is unavailable while regular-season data is incomplete.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Race for the bracket" })).toHaveCount(0);
  await expect(page.getByText(/are the champions/)).toHaveCount(0);
});
