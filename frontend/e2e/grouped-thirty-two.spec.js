import { test, expect } from "@playwright/test";
import { buildGroupedBracket, finalFourKind } from "../src/postseason/groupedBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { crossGroupQualifiers } from "../src/lib/seasonFormat.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
async function load(request, season) {
  const get = async (path) => {
    const response = await request.get(`${API}/seasons/${season}${path}`);
    expect(response.ok(), path).toBe(true);
    return response.json();
  };
  const [{ format }, { standings }, { standings: regular }, { teams }, { series }, { games }] = await Promise.all([
    get("/format"), get("/phases/TS/standings"), get("/phases/RS/standings"), get("/teams"), get("/postseason-series"), get("/games?phase=FF&limit=100"),
  ]);
  return { format, standings, regular, teams, series, games };
}

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test.describe("E2001 thirty-two clubs", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });

  test("recorded group winners play two semifinals and a final, with no third place", async ({ request }) => {
    const data = await load(request, 2001);
    expect(data.format.plannedClubs).toBe(32);
    expect(data.format.stages.find((stage) => stage.code === "FF").thirdPlaceGame).toBe(false);
    const bracket = buildGroupedBracket(data);
    expect(bracket.direct).toBe(true);
    expect(bracket.issues).toEqual([]);
    expect(bracket.connected).toBe(true);
    expect(bracket.third).toBeNull();
    expect(bracket.semis.map((slot) => slot.participants.map((side) => side.clubCode).sort().join("|")).sort()).toEqual(["PAN|TEL", "TRE|VIR"]);
    expect(bracket.champion.clubCode).toBe("PAN");
    const rows = placements(bracket);
    expect(rows.map((row) => `${row.club.clubCode}:${row.label}`)).toEqual(["PAN:Champion", "VIR:Runner-up", "TRE:Final Four", "TEL:Final Four"]);
    expect(rows.some((row) => /Third|Fourth/.test(row.label))).toBe(false);
    expect(data.games.map(finalFourKind).sort()).toEqual(["final", "semi", "semi"]);
  });

  test("Postseason names no third or fourth place", async ({ page }) => {
    await page.goto("/2001/postseason");
    await expect(page.getByText("Panathinaikos Athens are the champions")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("group", { name: "Third place", exact: true })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Third place|Fourth place/i);
    await expect(page.locator("main")).toContainText("Final Four");
    await page.getByText("How the postseason works", { exact: true }).click();
    await expect(page.locator("main")).not.toContainText(/third-place game: |Best of|Play-In|1 v 8/);
  });

  test("Standings, Home and Teams show four groups of eight and four, without a best-sixth marker", async ({ request, page }) => {
    const data = await load(request, 2001);
    expect(crossGroupQualifiers(data.format, "RS", data.regular).size).toBe(0);
    await page.goto("/2001/standings?phase=RS");
    for (const name of ["A", "B", "C", "D"]) {
      const region = page.getByRole("region", { name: `Group ${name}`, exact: true });
      await expect(region.locator("table tbody a[href*='/teams/']")).toHaveCount(8, { timeout: 30_000 });
      await expect(region.locator(".tier-row-postseason")).toHaveText("Top 16 places");
    }
    await expect(page.locator(".badge", { hasText: "Best 6th" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("sixth-placed");
    await page.goto("/2001/home");
    for (const name of ["E", "F", "G", "H"]) {
      await expect(page.getByRole("region", { name: `Group ${name}`, exact: true }).getByRole("listitem")).toHaveCount(4, { timeout: 30_000 });
    }
    await page.goto("/2001/teams");
    await expect(page.locator("main a[href*='/teams/']")).toHaveCount(32, { timeout: 30_000 });
    await page.goto("/2001/overview");
    await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Defeated /)).toHaveCount(2);
    await expect(page.locator("main")).toContainText("no third-place game");
  });

  test("the forfeit reads as a recorded 2-0 forfeit", async ({ page }) => {
    await page.goto("/2001/games/264");
    await expect(page.getByText("Forfeit", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Recorded forfeit, awarded 2-0/)).toBeVisible();
    await expect(page.getByText("Period scores were not recorded: this game was a forfeit.")).toBeVisible();
    await page.goto("/2001/standings?phase=TS");
    await expect(page.getByText(/This stage includes a recorded forfeit/)).toBeVisible({ timeout: 30_000 });
    await page.goto("/2001/standings?phase=RS");
    await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/recorded forfeit/)).toHaveCount(0);
  });
});

// The source's totals for a club that played a forfeit are empty for that stage; the pages say so.
for (const [season, forfeitClubs, names, other] of [[2001, ["TEL", "ULK"], ["Maccabi Elite", "Ulker"], "PAN"], [2003, ["TEL", "PAM"], ["Maccabi Elite", "Pamesa Valencia"], "CSK"]]) {
  test(`${season}: clubs of the forfeit get a note where team totals are missing`, async ({ page, request }) => {
    await mockLayoutImages(page);
    const { teams } = await (await request.get(`${API}/seasons/${season}/team-stats?phase=TS`)).json();
    expect(teams.filter((team) => team.own.points === null).map((team) => team.clubCode).sort()).toEqual([...forfeitClubs].sort());
    const note = (text) => page.getByRole("note").filter({ hasText: text });
    await page.goto(`/${season}/teams/${forfeitClubs[0]}?phase=TS`);
    await expect(note(/Team totals are unavailable for/).first()).toBeVisible({ timeout: 30_000 });
    await expect(note(/recorded forfeit/).first()).toContainText(names[0]);
    await page.goto(`/${season}/teams/${other}?phase=TS`);
    await expect(page.getByText("GROUP POSITION", { exact: true }).or(page.getByText(/Group position/i)).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.goto(`/${season}/teams/${forfeitClubs[0]}?phase=RS`);
    await expect(page.getByText(/Played|PLAYED/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.goto(`/${season}/leaders?scope=teams&phase=TS`);
    await expect(note(/Team totals are unavailable for/)).toContainText(names[0], { timeout: 30_000 });
    await expect(note(/Team totals are unavailable for/)).toContainText(names[1]);
    await page.goto(`/${season}/leaders?scope=teams&phase=RS`);
    await expect(page.getByText("SCORING").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.goto(`/${season}/compare?teamA=${forfeitClubs[0]}&teamB=${other}&phase=TS`);
    await page.getByRole("tab", { name: "Statistics" }).click();
    await expect(note(/Team totals are unavailable for/)).toContainText(names[0], { timeout: 30_000 });
    await expect(note(/Team totals are unavailable for/)).not.toContainText(names[1]);
  });
}

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`E2001 Postseason and the forfeit team page do not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2001/postseason");
      await expect(page.getByRole("group", { name: "Final", exact: true })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      await page.goto("/2001/teams/TEL?phase=TS");
      await expect(page.getByRole("note").first()).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});

// A recorded forfeit counts as a win or loss, but its awarded score is not points played: scoring averages, margins and highlights
// leave it out, and result lists label it.
const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
async function clubGames(request, season, clubCode, phase) {
  const { games } = await (await request.get(`${API}/seasons/${season}/teams/${clubCode}/games?limit=100&order=asc`)).json();
  return games.filter((game) => game.played && (!phase || game.phaseCode === phase)).map((game) => {
    const home = game.localTeam.clubCode === clubCode;
    return { forfeit: game.gameStatus === "Walkover", own: home ? game.localScore : game.roadScore, other: home ? game.roadScore : game.localScore, at: game.scheduledAt };
  });
}

for (const season of [2001, 2003]) {
  test.describe(`${season} forfeit and score statistics`, () => {
    test.beforeEach(async ({ page }) => {
      await mockLayoutImages(page);
    });

    test("Overview highlights and chart use real games only", async ({ page }) => {
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Defining games" })).toBeVisible({ timeout: 30_000 });
      const text = await page.locator("main").innerText();
      const combined = [...text.matchAll(/(\d+) combined points/g)].map((match) => Number(match[1]));
      expect(combined.length).toBeGreaterThan(0);
      expect(Math.min(...combined)).toBeGreaterThanOrEqual(100);
    });

    test("Team Games margin strip excludes the forfeit and results label it", async ({ page, request }) => {
      // The strip covers the whole season, every phase.
      const games = await clubGames(request, season, "TEL", null);
      const real = games.filter((game) => !game.forfeit);
      expect(real.length).toBe(games.length - 1);
      await page.goto(`/${season}/teams/TEL?phase=TS`);
      await page.getByRole("tab", { name: "Games" }).click();
      await expect(page.getByText(`${signed(mean(real.map((game) => game.own - game.other)))} average margin`).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("The recorded forfeit is counted in the record but has no margin bar.")).toBeVisible();
      await expect(page.getByText("Forfeit", { exact: true }).first()).toBeVisible();
      const wins = games.filter((game) => game.own > game.other).length;
      await expect(page.getByText(`${wins}-${games.length - wins}`, { exact: true }).first()).toBeVisible();
    });

    test("Compare trends average only real games and keep the forfeit in the record", async ({ page, request }) => {
      const games = (await clubGames(request, season, "TEL", "TS")).sort((a, b) => new Date(a.at) - new Date(b.at));
      const recent = games.slice(-5);
      const scored = mean(recent.filter((game) => !game.forfeit).map((game) => game.own));
      await page.goto(`/${season}/compare?teamA=TEL&teamB=CSK&phase=TS`);
      await page.getByRole("tab", { name: "Trends" }).click();
      await expect(page.getByText("FORM")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("main")).toContainText(scored.toFixed(1));
      const wins = recent.filter((game) => game.own > game.other).length;
      await expect(page.locator("main")).toContainText(`Last 5: ${wins}-${5 - wins}`);
    });
  });
}

test("E2003 Head to head leaves the forfeit out of notable meetings and labels it", async ({ page }) => {
  await mockLayoutImages(page);
  await page.goto("/2003/compare/head-to-head?teamA=TEL&teamB=PAM");
  const notable = page.locator("section", { has: page.getByRole("heading", { name: "Notable meetings" }) });
  await expect(notable).toBeVisible({ timeout: 30_000 });
  await expect(notable).not.toContainText("20-0");
  await expect(notable).not.toContainText("0-20");
  await expect(page.getByText("Forfeit", { exact: true }).first()).toBeVisible();
});
