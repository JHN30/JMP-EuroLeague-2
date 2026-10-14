import { test, expect } from "@playwright/test";
import { buildGroupedBracket, finalFourKind } from "../src/postseason/groupedBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASONS = [2008, 2009, 2010, 2011];
const LABELS = ["E1 v F2", "F1 v E2", "G1 v H2", "H1 v G2"];
const PODIUM = { 2008: ["PAN", "CSK", "BAR", "OLY"], 2009: ["BAR", "OLY", "CSK", "PAR"], 2010: ["PAN", "TEL", "SIE", "MAD"], 2011: ["OLY", "CSK", "BAR", "PAN"] };
const PAIRS = {
  2008: ["MAD|OLY", "BAR|BAS", "PAN|SIE", "CSK|PAR"],
  2009: ["BAR|MAD", "PAR|TEL", "BAS|CSK", "OLY|SOP"],
  2010: ["BAS|TEL", "BAR|PAN", "MAD|PAM", "OLY|SIE"],
  2011: ["BIL|CSK", "OLY|SIE", "PAN|TEL", "BAR|UNK"],
};
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

for (const season of SEASONS) {
  test.describe(`${season} four Top 16 groups`, () => {
    test.beforeEach(async ({ page }) => {
      await mockLayoutImages(page);
    });

    test("recorded qualifiers, pairs, champion and placements form the bracket", async ({ request }) => {
      const data = await load(request, season);
      expect(data.format.family).toBe("top16Bo5Playoffs");
      const bracket = buildGroupedBracket(data);
      expect(bracket.issues).toEqual([]);
      expect(bracket.connected).toBe(true);
      expect(bracket.playoffs.map((slot) => slot.label)).toEqual(LABELS);
      expect(bracket.playoffs.every((slot) => slot.winTarget === 3 && slot.winnerClubCode)).toBe(true);
      expect(bracket.playoffs.map((slot) => slot.participants.map((side) => side.clubCode).sort().join("|")).sort()).toEqual([...PAIRS[season]].map((pair) => pair.split("|").sort().join("|")).sort());
      const qualifiers = data.standings.filter((row) => row.basic.position <= 2).map((row) => row.clubCode).sort();
      expect(bracket.playoffs.flatMap((slot) => slot.participants.map((side) => side.clubCode)).sort()).toEqual(qualifiers);
      expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(PODIUM[season]);
      for (const game of data.games) {
        const slot = bracket.all.find((entry) => entry.series?.games.some((row) => row.gameCode === game.gameCode));
        expect(slot).toBeTruthy();
        expect(slot.winnerClubCode).toBe(game.localScore > game.roadScore ? game.localTeam.clubCode : game.roadTeam.clubCode);
      }
    });

    test("a leader is not a winner, reversed order is the same and bad evidence stays unknown", async ({ request }) => {
      const data = await load(request, season);
      for (const count of [2, 3]) {
        const series = data.series.map((entry) => entry.phaseCode === "PO" ? { ...entry, clubAWins: count, clubBWins: 0 } : entry);
        const bracket = buildGroupedBracket({ ...data, series, games: [] });
        expect(bracket.playoffs.every((slot) => Boolean(slot.winnerClubCode) === (count === 3))).toBe(true);
        expect(bracket.champion).toBeNull();
      }
      const reversed = data.series.map((entry) => ({ ...entry, clubA: entry.clubB, clubB: entry.clubA, clubAWins: entry.clubBWins, clubBWins: entry.clubAWins }));
      expect(buildGroupedBracket({ ...data, series: reversed, standings: [...data.standings].reverse() }).champion.clubCode).toBe(PODIUM[season][0]);
      const missing = buildGroupedBracket({ ...data, standings: [] });
      expect(missing.playoffs.every((slot) => /^Recorded quarterfinal/.test(slot.label) && slot.participants.every((side) => side.seedLabel === null))).toBe(true);
      const conflicting = structuredClone(data);
      const wrong = conflicting.series.find((entry) => entry.phaseCode === "PO");
      wrong.clubB = conflicting.series.find((entry) => entry.phaseCode === "PO" && entry !== wrong).clubB;
      expect(buildGroupedBracket(conflicting).issues.length).toBeGreaterThan(0);
      expect(buildGroupedBracket({ ...data, games: data.games.map((game) => ({ ...game, groupName: null })) }).champion).toBeNull();
      expect(data.games.map(finalFourKind).sort()).toEqual(["final", "semi", "semi", "third"]);
    });

    test("Postseason shows the four groups, best-of-five matchups and the champion", async ({ request, page }) => {
      const bracket = buildGroupedBracket(await load(request, season));
      await page.goto(`/${season}/postseason`);
      await expect(page.getByText(`${bracket.champion.name} are the champions`)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("list", { name: "Stages of the season" })).toContainText("Four groups; top two per group reach the Playoffs");
      await expect(page.getByRole("link", { name: "View Top 16 group standings" })).toHaveAttribute("href", `/${season}/standings?phase=TS`);
      for (const label of LABELS) {
        const matchup = page.getByRole("group", { name: label, exact: true });
        await expect(matchup).toBeVisible();
        await expect(matchup.locator('[title="Top 16 group place"]')).toHaveCount(2);
      }
      await page.getByText("How the postseason works", { exact: true }).click();
      await expect(page.locator("main")).toContainText("best-of-five");
      await expect(page.locator("main")).not.toContainText(/1 v 8|2 v 7|Play-In|bracket is a projection|Two groups/);
    });

    test("Overview, team Leaders and Compare keep the group wording and the unavailable-rating note", async ({ request, page }) => {
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^Defeated /)).toHaveCount(3);
      await expect(page.getByText(/in the postseason · defeated 3 opponents/)).toBeVisible();
      await expect(page.locator("main")).not.toContainText("League leader");
      await page.goto(`/${season}/leaders?scope=teams&phase=TS`);
      await expect(page.getByText(/played in separate groups/)).toBeVisible({ timeout: 30_000 });
      const { standings } = await load(request, season);
      const [a, b] = ["E", "F"].map((name) => standings.find((row) => row.groupName === name && row.basic.position === 1));
      await page.goto(`/${season}/compare?teamA=${a.clubCode}&teamB=${b.clubCode}&phase=TS`);
      await expect(page.getByText(/played in separate groups/)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("tab", { name: "Statistics" }).click();
      await expect(page.locator("main")).toContainText("Group E · 1st");
      await expect(page.locator("main")).toContainText("Group F · 1st");
    });

    test("Standings, Home and Games show four Top 16 groups of four", async ({ request, page }) => {
      const { standings } = await load(request, season);
      expect([...new Set(standings.map((row) => row.groupName))]).toEqual(["E", "F", "G", "H"]);
      await page.goto(`/${season}/standings?phase=TS`);
      for (const name of ["E", "F", "G", "H"]) {
        const region = page.getByRole("region", { name: `Group ${name}`, exact: true });
        await expect(region.locator("table tbody a[href*='/teams/']")).toHaveCount(4, { timeout: 30_000 });
        await expect(region.locator('[title="Qualified"]')).toHaveCount(2);
      }
      await page.goto(`/${season}/home`);
      const panel = page.locator("section", { has: page.getByRole("heading", { name: "Group tables" }) });
      await expect(panel).toBeVisible({ timeout: 30_000 });
      for (const name of ["E", "F", "G", "H"]) await expect(panel.getByRole("region", { name: `Group ${name}`, exact: true }).getByRole("listitem")).toHaveCount(4);
      await page.goto(`/${season}/games?phase=TS&round=11`);
      const cards = page.locator("a.fixture-card");
      await expect(cards).toHaveCount(8, { timeout: 30_000 });
      await page.getByLabel("Group", { exact: true }).selectOption("G");
      await expect(cards).toHaveCount(2);
      await expect(cards.filter({ hasText: "Group G" })).toHaveCount(2);
    });
  });
}

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`four-group Postseason does not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2008/postseason");
      await expect(page.getByRole("group", { name: "E1 v F2", exact: true })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
