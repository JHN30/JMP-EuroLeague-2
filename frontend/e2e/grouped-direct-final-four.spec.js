import { test, expect } from "@playwright/test";
import { buildGroupedBracket, finalFourKind } from "../src/postseason/groupedBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { crossGroupQualifiers, competitionNotes } from "../src/lib/seasonFormat.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASONS = [2002, 2003];
const SIXTH = { 2002: "SIE", 2003: "ZAL" };
const PODIUM = { 2002: ["BAR", "TRE", "SIE", "CSK"], 2003: ["TEL", "FOR", "CSK", "SIE"] };
const SEMIS = { 2002: ["SIE|TRE", "BAR|CSK"], 2003: ["FOR|SIE", "CSK|TEL"] };
const LABELS = { 2002: ["E1", "F1", "G1", "D1"], 2003: ["F1", "E1", "G1", "D1"] };
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

test("forfeit notes name the game, the stage and no club page", () => {
  const format = { seasonCode: "E2003", status: "completed", exceptions: [{ kind: "walkover", gameCode: 200, stage: "TS", note: "x" }] };
  const own = competitionNotes(format, "2003", { gameCode: 200, game: { localScore: 20, roadScore: 0 } });
  expect(own).toHaveLength(1);
  expect(own[0].note).toContain("awarded 20-0");
  expect(own[0].note).toContain("no box score");
  expect(competitionNotes(format, "2003", { gameCode: 201 })).toEqual([]);
  expect(competitionNotes(format, "2003", { phaseCode: "TS" })[0].note).toContain("recorded forfeit");
  expect(competitionNotes(format, "2003", { phaseCode: "RS" })).toEqual([]);
  expect(competitionNotes(format, "2003", { phaseCode: "TS", clubCode: "TEL" })).toEqual([]);
});

for (const season of SEASONS) {
  test.describe(`${season} Top 16 directly to the Final Four`, () => {
    test.beforeEach(async ({ page }) => {
      await mockLayoutImages(page);
    });

    test("recorded group winners play the semifinals, final and third-place game", async ({ request }) => {
      const data = await load(request, season);
      expect(data.format.family).toBe("top16ToFinalFour");
      const bracket = buildGroupedBracket(data);
      expect(bracket.direct).toBe(true);
      expect(bracket.playoffs).toEqual([]);
      expect(bracket.issues).toEqual([]);
      expect(bracket.connected).toBe(true);
      expect(bracket.semis.map((slot) => slot.participants.map((side) => side.clubCode).sort().join("|")).sort()).toEqual([...SEMIS[season]].map((pair) => pair.split("|").sort().join("|")).sort());
      const winners = data.standings.filter((row) => row.basic.position === 1).map((row) => row.clubCode).sort();
      expect(bracket.semis.flatMap((slot) => slot.participants.map((side) => side.clubCode)).sort()).toEqual(winners);
      expect(bracket.semis.flatMap((slot) => slot.participants.map((side) => side.seedLabel)).sort()).toEqual([...LABELS[season]].sort());
      expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(PODIUM[season]);
      expect(data.games.map(finalFourKind).sort()).toEqual(["final", "semi", "semi", "third"]);
    });

    test("missing standings or games and a non-winner pairing stay unverified", async ({ request }) => {
      const data = await load(request, season);
      const missing = buildGroupedBracket({ ...data, standings: [] });
      expect(missing.connected).toBe(false);
      expect(missing.issues.length).toBeGreaterThan(0);
      expect(buildGroupedBracket({ ...data, games: [] }).champion).toBeNull();
      const swapped = data.standings.map((row) => (row.basic.position === 1 ? { ...row, basic: { ...row.basic, position: 2 } } : row));
      expect(buildGroupedBracket({ ...data, standings: swapped }).connected).toBe(false);
      const unplayed = buildGroupedBracket({ ...data, games: data.games.map((game) => ({ ...game, played: false, localScore: null, roadScore: null })) });
      expect(unplayed.champion).toBeNull();
    });

    test("Postseason has no quarterfinal column and shows the semifinals, final and third place", async ({ request, page }) => {
      const bracket = buildGroupedBracket(await load(request, season));
      await page.goto(`/${season}/postseason`);
      await expect(page.getByText(`${bracket.champion.name} are the champions`)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("list", { name: "Stages of the season" })).toContainText("the winner of each group reaches the Final Four");
      await expect(page.getByRole("list", { name: "Stages of the season" })).not.toContainText("Playoffs");
      await expect(page.getByRole("link", { name: "View Top 16 group standings" })).toHaveAttribute("href", `/${season}/standings?phase=TS`);
      await expect(page.getByRole("group", { name: "Third place", exact: true })).toBeVisible();
      await expect(page.getByRole("group", { name: "Final", exact: true })).toBeVisible();
      await expect(page.locator('[title="Top 16 group place"]')).toHaveCount(8);
      await page.getByText("How the postseason works", { exact: true }).click();
      await expect(page.locator("main")).toContainText("no quarterfinals");
      await expect(page.locator("main")).not.toContainText(/Best of|best-of|1 v 8|Play-In|Winner of 1 v 8|bracket is a projection/);
    });

    test("Standings name the Final Four, mark the best sixth and Home shows group tables", async ({ request, page }) => {
      const data = await load(request, season);
      expect([...crossGroupQualifiers(data.format, "RS", data.regular)]).toEqual([SIXTH[season]]);
      await page.goto(`/${season}/standings?phase=TS&group=D`);
      await expect(page.locator(".tier-row-postseason")).toHaveText("Final Four places", { timeout: 30_000 });
      await expect(page.getByText("Final Four cutoff")).toBeVisible();
      await expect(page.locator("main")).not.toContainText(/Playoff places|Playoff cutoff/);
      await page.goto(`/${season}/standings?phase=RS&group=A`);
      await expect(page.locator(".tier-row-postseason")).toHaveText("Top 16 places", { timeout: 30_000 });
      await page.goto(`/${season}/standings?phase=RS`);
      await expect(page.locator(".badge", { hasText: "Best 6th" })).toHaveCount(1, { timeout: 30_000 });
      await page.goto(`/${season}/home`);
      await expect(page.getByRole("heading", { name: "Group tables" })).toBeVisible({ timeout: 30_000 });
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^Defeated /)).toHaveCount(2);
    });
  });
}

test("E2003 forfeit reads as a recorded forfeit without a box score; E2002 has none", async ({ page, request }) => {
  await mockLayoutImages(page);
  const game = (await (await request.get(`${API}/seasons/2003/games/200`)).json()).game;
  expect(game.gameStatus).toBe("Walkover");
  await page.goto("/2003/games/200");
  await expect(page.getByText("Forfeit", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Recorded forfeit, awarded 20-0/)).toBeVisible();
  await expect(page.getByText("Period scores were not recorded: this game was a forfeit.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Score by period 0");
  await page.goto("/2003/games?phase=TS&round=18");
  await expect(page.locator("a.fixture-card", { hasText: "Forfeit" })).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByText(/This stage includes a recorded forfeit/)).toBeVisible();
  await page.goto("/2003/standings?phase=TS");
  await expect(page.getByText(/This stage includes a recorded forfeit/)).toBeVisible({ timeout: 30_000 });
  await page.goto("/2003/standings?phase=RS");
  await expect(page.getByRole("heading", { name: "Group A" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/recorded forfeit/)).toHaveCount(0);
  await page.goto("/2002/standings?phase=TS");
  await expect(page.getByRole("heading", { name: "Group D" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/recorded forfeit/)).toHaveCount(0);
});

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`direct Postseason and the forfeit page do not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2003/postseason");
      await expect(page.getByRole("group", { name: "Final", exact: true })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      await page.goto("/2003/games/200");
      await expect(page.getByText(/Recorded forfeit, awarded 20-0/)).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
