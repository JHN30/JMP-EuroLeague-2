import { test, expect } from "@playwright/test";
import { buildGroupedBracket, finalFourKind } from "../src/postseason/groupedBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { crossGroupQualifier, crossGroupQualifiers, tableTiers } from "../src/lib/seasonFormat.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASONS = [2004, 2005, 2006, 2007];
const SIXTH = { 2004: "PES", 2005: "CIB", 2006: "PAR", 2007: "ROM" };
const PODIUM = { 2004: ["TEL", "BAS", "PAN", "CSK"], 2005: ["CSK", "TEL", "BAS", "BAR"], 2006: ["PAN", "CSK", "MAL", "BAS"], 2007: ["CSK", "TEL", "SIE", "BAS"] };
const PAIRS = {
  2004: ["PES|TEL", "CSK|ULK", "IST|PAN", "BAS|TRE"],
  2005: ["BAR|MAD", "OLY|TEL", "CSK|IST", "BAS|PAN"],
  2006: ["BAS|OLY", "CSK|TEL", "DYN|PAN", "BAR|MAL"],
  2007: ["SIE|ULK", "BAS|PAR", "BAR|TEL", "CSK|OLY"],
};
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

test("group tiers keep places 1-5 and the cross-group place is named only from recorded clubs", () => {
  const stage = (code, qualification, clubs = []) => ({ code, type: "table", qualification, observed: { clubs } });
  const format = { stages: [
    stage("RS", [{ kind: "postseason", positions: [1, 5], within: "group", to: "TS" }, { bestOfPosition: 6, count: 1, to: "TS", criterion: null }]),
    stage("TS", [], ["A6", "B1"]),
  ] };
  expect(tableTiers(format, "RS", "group")).toEqual([{ tier: "postseason", from: 1, to: 5 }]);
  expect(tableTiers(format, "RS")).toBeNull();
  expect(crossGroupQualifier(format, "RS")).toEqual({ position: 6, count: 1, to: "TS" });
  const rows = [
    { clubCode: "A6", basic: { position: 6 } }, { clubCode: "B6", basic: { position: 6 } },
    { clubCode: "B1", basic: { position: 1 } }, { clubCode: "C6", basic: { position: 5 } },
  ];
  expect([...crossGroupQualifiers(format, "RS", rows)]).toEqual(["A6"]);
  format.stages[1].observed.clubs = [];
  expect(crossGroupQualifiers(format, "RS", rows).size).toBe(0);
  expect(crossGroupQualifier({ stages: [stage("RS", [{ kind: "postseason", positions: [1, 4], within: "group", to: "TS" }])] }, "RS")).toBeNull();
});

for (const season of SEASONS) {
  test.describe(`${season} three groups and best-of-three`, () => {
    test.beforeEach(async ({ page }) => {
      await mockLayoutImages(page);
    });

    test("recorded qualifiers, pairs, series, champion and placements form the bracket", async ({ request }) => {
      const data = await load(request, season);
      expect(data.format.family).toBe("top16Bo3Playoffs");
      const bracket = buildGroupedBracket(data);
      expect(bracket.issues).toEqual([]);
      expect(bracket.connected).toBe(true);
      expect(bracket.playoffs.every((slot) => slot.winTarget === 2 && slot.winnerClubCode)).toBe(true);
      expect(bracket.playoffs.every((slot) => slot.series.games.length === 2 || slot.series.games.length === 3)).toBe(true);
      expect(bracket.playoffs.map((slot) => slot.participants.map((side) => side.clubCode).sort().join("|")).sort()).toEqual(PAIRS[season].map((pair) => pair.split("|").sort().join("|")).sort());
      expect(placements(bracket).slice(0, 4).map((row) => row.club.clubCode)).toEqual(PODIUM[season]);
      expect(data.games.map(finalFourKind).sort()).toEqual(["final", "semi", "semi", "third"]);
    });

    test("a one-game lead is not a winner and bad evidence stays unknown", async ({ request }) => {
      const data = await load(request, season);
      for (const count of [1, 2]) {
        const series = data.series.map((entry) => entry.phaseCode === "PO" ? { ...entry, clubAWins: count, clubBWins: 0 } : entry);
        const bracket = buildGroupedBracket({ ...data, series, games: [] });
        expect(bracket.playoffs.every((slot) => Boolean(slot.winnerClubCode) === (count === 2))).toBe(true);
        expect(bracket.champion).toBeNull();
      }
      const reversed = data.series.map((entry) => ({ ...entry, clubA: entry.clubB, clubB: entry.clubA, clubAWins: entry.clubBWins, clubBWins: entry.clubAWins }));
      expect(buildGroupedBracket({ ...data, series: reversed, standings: [...data.standings].reverse() }).champion.clubCode).toBe(PODIUM[season][0]);
      expect(buildGroupedBracket({ ...data, standings: [] }).playoffs.every((slot) => /^Recorded quarterfinal/.test(slot.label))).toBe(true);
    });

    test("exactly one sixth-placed club is marked, from the recorded Top 16 field", async ({ request, page }) => {
      const data = await load(request, season);
      const marked = crossGroupQualifiers(data.format, "RS", data.regular);
      expect([...marked]).toEqual([SIXTH[season]]);
      await page.goto(`/${season}/standings?phase=RS`);
      for (const name of ["A", "B", "C"]) {
        const region = page.getByRole("region", { name: `Group ${name}`, exact: true });
        await expect(region.locator("table tbody a[href*='/teams/']")).toHaveCount(8, { timeout: 30_000 });
        await expect(region.locator(".tier-row-postseason")).toHaveText("Top 16 places");
      }
      await expect(page.locator(".badge", { hasText: "Best 6th" })).toHaveCount(1);
      const row = page.locator("tr", { has: page.locator(".badge", { hasText: "Best 6th" }) });
      await expect(row.locator('a[href*="/teams/"]').first()).toBeVisible();
      await expect(page.locator("main")).toContainText("one sixth-placed club also qualified");
      await expect(page.locator('[title="Qualified"]')).toHaveCount(16);
    });

    test("Postseason says best-of-three and shows four quarterfinals, the champion and third place", async ({ request, page }) => {
      const bracket = buildGroupedBracket(await load(request, season));
      await page.goto(`/${season}/postseason`);
      await expect(page.getByText(`${bracket.champion.name} are the champions`)).toBeVisible({ timeout: 30_000 });
      for (const slot of bracket.playoffs) await expect(page.getByRole("group", { name: slot.label, exact: true })).toBeVisible();
      await expect(page.getByText("Best of 3", { exact: true }).first()).toBeVisible();
      await page.getByText("How the postseason works", { exact: true }).click();
      await expect(page.locator("main")).toContainText("best-of-three");
      await expect(page.locator("main")).not.toContainText(/best-of-five|Best of 5|Play-In|bracket is a projection/);
    });

    test("Top 16 groups, Home, Games and Overview show groups of eight and four", async ({ request, page }) => {
      const { standings } = await load(request, season);
      expect([...new Set(standings.map((row) => row.groupName))]).toEqual(["D", "E", "F", "G"]);
      await page.goto(`/${season}/standings?phase=TS`);
      for (const name of ["D", "E", "F", "G"]) {
        await expect(page.getByRole("region", { name: `Group ${name}`, exact: true }).locator("table tbody a[href*='/teams/']")).toHaveCount(4, { timeout: 30_000 });
      }
      await page.goto(`/${season}/home`);
      await expect(page.locator("section", { has: page.getByRole("heading", { name: "Group tables" }) })).toBeVisible({ timeout: 30_000 });
      await page.goto(`/${season}/games?phase=RS&round=3`);
      const cards = page.locator("a.fixture-card");
      await expect(cards).toHaveCount(12, { timeout: 30_000 });
      await page.getByLabel("Group", { exact: true }).selectOption("B");
      await expect(cards).toHaveCount(4);
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^Defeated /)).toHaveCount(3);
    });
  });
}

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`three-group Standings and Postseason do not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2004/standings?phase=RS");
      await expect(page.locator(".badge", { hasText: "Best 6th" })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      await page.goto("/2004/postseason");
      await expect(page.getByText("Best of 3", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
