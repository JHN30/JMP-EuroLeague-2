import { test, expect } from "@playwright/test";
import { competitionNotes, stageDescription, tableTiers } from "../src/lib/seasonFormat.js";
import { buildBracket, placements } from "../src/postseason/bracketModel.js";
import { findPageOverflow, findBrokenWords, mockLayoutImages, WIDTHS } from "./support/layout";

const API = "http://localhost:3000/api";
const EXCLUDED = ["CSK", "UNK", "DYR"];
const get = async (request, path) => {
  const response = await request.get(`${API}/seasons/2021${path}`);
  expect(response.ok(), path).toBe(true);
  return response.json();
};
const context = (page) => page.getByRole("complementary", { name: "Competition context" });
const warning = (page) => page.getByRole("complementary", { name: "2021-22 season: data caveat" });
const involvesExcluded = (game) => [game.localTeam?.clubCode, game.roadTeam?.clubCode].some((code) => EXCLUDED.includes(code));

async function allGames(request) {
  const games = [];
  for (let offset = 0; ; offset += 100) {
    const data = await get(request, `/games?limit=100&offset=${offset}&order=asc`);
    games.push(...data.games);
    if (!data.pagination.hasMore) return games;
  }
}

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("E2021 preserves both cohorts, corrected standings and archived performances", async ({ request }) => {
  const { format } = await get(request, "/format");
  expect(format).toMatchObject({ status: "completed", plannedClubs: 18, issues: [] });
  const rs = format.stages[0];
  expect(rs).toMatchObject({ code: "RS", plannedClubsPerGroup: 18, gamesPerClub: 34, observed: { gamesTotal: 306, gamesPlayed: 278 } });
  expect(rs.observed.clubs).toHaveLength(18);
  expect(rs.observed.groups[0].clubs).toHaveLength(15);
  expect(format.exceptions[0]).toMatchObject({ kind: "excludedClubs", countedGames: 28, decidedOn: "2022-03-22" });
  expect(stageDescription(rs, format)).toContain("planned format was 18 clubs");
  expect(stageDescription(rs, format)).toContain("15 eligible clubs remained, with 28 counted");

  const games = await allGames(request);
  expect(games).toHaveLength(327);
  const regular = games.filter((game) => game.phaseCode === "RS");
  expect(regular).toHaveLength(306);
  expect(regular.filter((game) => game.played && involvesExcluded(game))).toHaveLength(68);
  expect(regular.filter((game) => game.gameStatus === "Cancelled")).toHaveLength(28);
  expect(regular.filter((game) => !involvesExcluded(game) && game.played)).toHaveLength(210);
  const { round, standings } = await get(request, "/phases/RS/standings");
  expect(round).toBe(34);
  expect(standings).toHaveLength(15);
  expect(standings.every((row) => row.basic.gamesPlayed === 28 && !EXCLUDED.includes(row.clubCode))).toBe(true);
  expect(standings[0]).toMatchObject({ clubCode: "BAR", basic: { gamesWon: 21, gamesLost: 7 } });
  expect(standings[6]).toMatchObject({ clubCode: "MCO", basic: { position: 7 } });
  for (const row of standings) {
    expect((await get(request, `/teams/${row.clubCode}/games?status=scheduled&limit=100`)).games).toEqual([]);
  }
  expect((await get(request, "/games?status=scheduled&limit=100")).games).toEqual([]);

  const { teams } = await get(request, "/team-stats?phase=RS");
  expect(teams.find((row) => row.clubCode === "BAR").gamesPlayed).toBe(32);
  expect(teams.find((row) => row.clubCode === "CSK").gamesPlayed).toBe(24);
  const stats = await get(request, "/season-stats?phase=RS&mode=accumulated&limit=100");
  expect(stats.players.some((row) => EXCLUDED.includes(row.clubCode))).toBe(true);
  for (const kind of ["player-seasons", "single-games", "team-seasons", "team-games"]) {
    const records = await get(request, `/records/${kind}?metric=pointsScored`);
    expect(records.records.length).toBeGreaterThan(0);
  }
  const { series } = await get(request, "/postseason-series");
  const identities = await get(request, "/teams");
  const bracket = buildBracket({ standings, teams: identities.teams, series, regularSeasonDone: true, format, tiers: tableTiers(format, "RS") });
  expect(bracket.playIn).toEqual([]);
  expect(bracket.champion.clubCode).toBe("IST");
  expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(["IST", "MAD", "BAR", "OLY"]);
});

test("annulment notes require the matching season, RS phase and an excluded participant", async ({ request }) => {
  const { format } = await get(request, "/format");
  const games = await allGames(request);
  const archived = games.find((game) => game.played && game.phaseCode === "RS" && involvesExcluded(game));
  const scope = { gameCode: archived.gameCode, phaseCode: "RS", game: archived };
  expect(competitionNotes(format, "E2021", scope)[0].note).toContain("Archived played game");
  for (const [season, option] of [
    ["2022", scope], ["2021", { ...scope, phaseCode: "PO" }],
    ["2021", { ...scope, game: { ...archived, phaseCode: "PO" } }],
    ["2021", { ...scope, game: { ...archived, localTeam: null, roadTeam: null } }],
    ["2021", { ...scope, game: { ...archived, played: false, gameStatus: null } }],
    ["2021", { gameCode: archived.gameCode, phaseCode: "RS" }],
  ]) expect(competitionNotes(format, season, option)).toEqual([]);
  expect(competitionNotes(null, "2021", scope)).toEqual([]);
  expect(competitionNotes(format, "2021", { phaseCode: "RS", clubCode: "CSK" })[0].note).toContain("absent from the corrected final");
});

test("played-annulled and cancelled games retain their evidence with distinct notes", async ({ page, request }) => {
  const games = await allGames(request);
  const archived = games.find((game) => game.played && game.phaseCode === "RS" && involvesExcluded(game));
  const cancelled = games.find((game) => game.gameStatus === "Cancelled");
  await page.goto(`/2021/games/${archived.gameCode}`);
  await expect(context(page)).toContainText("Archived played game");
  await expect(context(page)).toContainText("removed from the official regular-season standings");
  const box = await get(request, `/games/${archived.gameCode}/box-score`);
  expect(box.playerStats.length).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.locator("main table").first()).toBeVisible();
  await page.goto(`/2021/games/${cancelled.gameCode}`);
  await expect(context(page)).toContainText("Cancelled fixture");
  await expect(context(page)).toContainText("not played");
  const eligibleOnly = games.find((game) => game.phaseCode === "RS" && !involvesExcluded(game));
  await page.goto(`/2021/games/${eligibleOnly.gameCode}`);
  await expect(page.getByRole("tab", { name: "Box score", exact: true })).toBeVisible();
  await expect(page.getByText("Loading competition context.")).toHaveCount(0);
  await expect(context(page)).toHaveCount(0);
  await expect(warning(page)).toHaveCount(0);
});

test("corrected standings, retained race, team form and remaining fixtures have context", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2021/overview");
  await expect(page.getByText(/15 eligible clubs remained, with 28 counted/)).toBeVisible();
  await page.goto("/2021/standings");
  await expect(warning(page)).toHaveCount(0);
  await expect(context(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  const slider = page.getByRole("slider", { name: "Round shown in the race" });
  await expect(slider).toHaveValue("34");
  await slider.press("Home");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await expect(warning(page)).toHaveCount(0);
  await page.goto("/2021/teams/BAR?phase=RS");
  await expect(page.getByText("Remaining", { exact: true }).locator("..")).toHaveText("Remaining0");
  await expect(page.getByText("Played", { exact: true }).locator("..")).toHaveText("Played28");
  await expect(page.getByText("League position", { exact: true }).locator("..")).toContainText("1st of 15");
  await page.goto("/2021/teams/CSK?phase=RS");
  await expect(context(page)).toContainText("This club was withdrawn on 2022-03-22");
  await expect(context(page)).toContainText("archived games and performances remain accessible");
});

test("statistics, comparisons, player logs and Records stay available without repeated banners", async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const stats = await get(request, "/season-stats?phase=RS&mode=accumulated&limit=100");
  const player = stats.players.find((row) => EXCLUDED.includes(row.clubCode));
  const visit = async (path) => {
    await page.goto(`/2021/${path}`);
    await expect(warning(page)).toHaveCount(0);
  };
  await visit("teams/CSK?phase=RS");
  await page.getByRole("tab", { name: "Statistics", exact: true }).click();
  await expect(page.getByRole("region", { name: "Traditional", exact: true })).toBeVisible();
  await visit(`players/${player.personKey}`);
  await page.getByRole("tab", { name: "Games", exact: true }).click();
  await expect(page.locator("main a[href*='/games/']").first()).toBeVisible();
  await visit("leaders?scope=teams&metric=points");
  await expect(page.locator("main a[href*='/teams/']").first()).toBeVisible();
  await visit("compare?teamA=BAR&teamB=CSK");
  await expect(page.getByText("Where each club is stronger")).toBeVisible();
  await visit("compare/head-to-head?teamA=BAR&teamB=CSK");
  await expect(page.getByText(/completed meetings/)).toBeVisible();
  await visit("records");
  await expect(page.locator("main a[href*='/players/']").first()).toBeVisible();
  await visit("postseason");
  await expect(page.getByText(/are the champions/)).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/Play-In|Play-in/);
});

for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`exclusion context wraps in ${theme} at each supported width`, async ({ page, request }) => {
    test.setTimeout(90_000);
    await mockLayoutImages(page);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    const games = await allGames(request);
    const archived = games.find((game) => game.phaseCode === "RS" && game.played && involvesExcluded(game));
    for (const path of ["overview", "standings", "teams/CSK?phase=RS", `games/${archived.gameCode}`]) {
      await page.goto(`/2021/${path}`);
      await expect(warning(page)).toHaveCount(0);
      await expect(page.locator("main h1")).toBeVisible();
      if (path.startsWith("teams/") || path.startsWith("games/")) await expect(context(page)).toBeVisible();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(async () => {
          const overflow = await findPageOverflow(page);
          return overflow.scrollWidth - overflow.clientWidth;
        }, { message: `${path} at ${width}` }).toBeLessThanOrEqual(0);
        expect(await findBrokenWords(context(page).locator("p"))).toEqual([]);
      }
    }
  });
}

test("the shared warning remains when additional format context cannot load", async ({ page }) => {
  await page.route("**/api/seasons/2021/format", (route) => route.fulfill({ status: 500, json: { error: "Unavailable" } }));
  await page.goto("/2021/teams/CSK");
  await expect(warning(page)).toHaveCount(0);
  await expect(page.getByText("Additional competition context is unavailable.")).toBeVisible({ timeout: 30_000 });
  await expect(context(page)).toHaveCount(0);
  await page.goto("/2021/home");
  await expect(warning(page)).toBeVisible();
});
