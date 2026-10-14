import { test, expect } from "@playwright/test";
import { groupPositionLabel, isGroupedTable, mostWinsEntry } from "../src/standings/standingsGroups.js";
import { groupedStageCodes, summaryTableStage } from "../src/lib/seasonFormat.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASONS = [2012, 2013, 2014, 2015];
const MODERN = 2024;
const get = async (request, season, path) => {
  const response = await request.get(`${API}/seasons/${season}${path}`);
  expect(response.ok(), `${season}${path}`).toBe(true);
  return response.json();
};

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("group helpers label only observed groups and never invent a league leader", () => {
  const rows = [
    { clubCode: "A1", groupName: "A", basic: { position: 1, gamesWon: 8, pointsDifference: 40 } },
    { clubCode: "B1", groupName: "B", basic: { position: 1, gamesWon: 8, pointsDifference: 60 } },
    { clubCode: "B2", groupName: "B", basic: { position: 2, gamesWon: 5, pointsDifference: 5 } },
  ];
  expect(isGroupedTable(rows)).toBe(true);
  expect(isGroupedTable([{ groupName: "Regular Season" }, { groupName: "Regular Season" }])).toBe(false);
  expect(isGroupedTable([{ groupName: null }, { groupName: null }])).toBe(false);
  expect(groupPositionLabel(rows[2])).toBe("Group B · 2nd");
  expect(groupPositionLabel({ groupName: null, basic: { position: 1 } })).toBeNull();
  expect(groupPositionLabel({ groupName: "A", basic: {} })).toBeNull();
  expect(mostWinsEntry(rows)).toMatchObject({ entry: { clubCode: "B1" }, tied: 1 });
  expect(mostWinsEntry([])).toBeNull();
});

test("summary stage is the Top 16 for grouped seasons and the regular season elsewhere", () => {
  const table = (code, plannedGroups, gamesPlayed) => ({ code, type: "table", plannedGroups, observed: { gamesPlayed } });
  const grouped = { stages: [table("RS", 4, 120), table("TS", 2, 0), { code: "PO", type: "knockout" }] };
  expect(summaryTableStage(grouped)).toBe("RS");
  grouped.stages[1].observed.gamesPlayed = 4;
  expect(summaryTableStage(grouped)).toBe("TS");
  expect([...groupedStageCodes(grouped)]).toEqual(["RS", "TS"]);
  expect(summaryTableStage({ stages: [table("RS", 1, 300)] })).toBe("RS");
  expect(summaryTableStage(null)).toBe("RS");
  expect(groupedStageCodes(null).size).toBe(0);
});

for (const season of SEASONS) {
  test.describe(`${season} grouped pages`, () => {
    test.beforeEach(async ({ page }) => {
      await mockLayoutImages(page);
    });

    test("Home shows the Top 16 group tables with no league table or leader", async ({ page, request }) => {
      await page.goto(`/${season}/home`);
      const panel = page.locator("section", { has: page.getByRole("heading", { name: "Group tables" }) });
      await expect(panel).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "League table" })).toHaveCount(0);
      for (const name of ["E", "F"]) {
        await expect(panel.getByRole("region", { name: `Group ${name}`, exact: true }).getByRole("listitem")).toHaveCount(8);
      }
      await expect(panel).toContainText("positions are within each group");
      await expect(page.getByTestId("home-kpi-strip")).toContainText("Most wins · any group");
      await expect(page.getByTestId("home-kpi-strip")).not.toContainText("Leader in wins");
      const { standings } = await get(request, season, "/phases/TS/standings");
      expect(isGroupedTable(standings)).toBe(true);
    });

    test("Overview names the most wins in any group, not a league leader", async ({ page }) => {
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Phase story" })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("main")).toContainText("Top 16");
      await expect(page.locator("main")).not.toContainText("League leader");
      await expect(page.locator("main")).not.toContainText("Play-In");
    });

    test("Road to the title counts only playoff and Final Four games", async ({ page }) => {
      await page.goto(`/${season}/overview`);
      await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^Defeated /)).toHaveCount(3);
      const results = await page.getByText(/^Won series \d+-\d+$/).allTextContents();
      expect(results.length).toBeGreaterThan(0);
      for (const text of results) {
        const [wins, losses] = text.match(/(\d+)-(\d+)/).slice(1).map(Number);
        expect(wins + losses).toBeLessThanOrEqual(5);
      }
      await expect(page.getByText(/in the postseason · defeated 3 opponents/)).toBeVisible();
    });

    test("Games filters a round by group and labels each game", async ({ page, request }) => {
      const { standings } = await get(request, season, "/phases/RS/standings");
      const names = [...new Set(standings.map((row) => row.groupName))];
      expect(names).toEqual(["A", "B", "C", "D"]);
      await page.goto(`/${season}/games?phase=RS&round=3`);
      const select = page.getByLabel("Group", { exact: true });
      await expect(select).toBeVisible({ timeout: 30_000 });
      const cards = page.locator("a.fixture-card");
      await expect(cards).toHaveCount(12);
      for (const name of names) await expect(cards.filter({ hasText: `Group ${name}` })).toHaveCount(3);
      await select.selectOption("B");
      await expect(page).toHaveURL(/group=B/);
      await expect(cards).toHaveCount(3);
      await expect(cards.filter({ hasText: "Group B" })).toHaveCount(3);
      await page.reload();
      await expect(select).toHaveValue("B");
      await expect(cards).toHaveCount(3);
      await page.getByRole("tab", { name: "Top 16" }).click();
      await expect(page).not.toHaveURL(/group=/);
      await expect(select).toHaveValue("");
      await expect(page.locator("a.fixture-card").first()).toContainText(/Group [EF]/);
    });

    test("an invalid group in the address is dropped", async ({ page }) => {
      await page.goto(`/${season}/games?phase=RS&round=3&group=Z`);
      await expect(page.getByLabel("Group", { exact: true })).toHaveValue("", { timeout: 30_000 });
      await expect(page).not.toHaveURL(/group=/);
      await expect(page.locator("a.fixture-card")).toHaveCount(12);
    });

    test("a game header and the team page state the place within the group", async ({ page, request }) => {
      const { standings } = await get(request, season, "/phases/RS/standings");
      const club = standings.find((row) => row.groupName === "D" && row.basic.position === 1);
      await page.goto(`/${season}/teams/${club.clubCode}?phase=RS`);
      await expect(page.getByText("Group position", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("main")).toContainText("1st in Group D");
      await expect(page.locator("main")).not.toContainText("of 24");

      const { games } = await get(request, season, "/games?phase=RS&round=3&limit=100");
      await page.goto(`/${season}/games/${games[0].gameCode}`);
      await expect(page.locator("main")).toContainText(`${games[0].groupName} · Round 3`, { timeout: 30_000 });
    });

    test("team Leaders and Compare say adjusted ratings are unavailable across groups", async ({ page, request }) => {
      const adjusted = await get(request, season, "/advanced/standings?scope=RS");
      expect(adjusted.standings.every((row) => row.connected === false && row.srs === null)).toBe(true);
      await page.goto(`/${season}/leaders?scope=teams&phase=RS`);
      await expect(page.getByText(/played in separate groups/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Simple rating/)).toHaveCount(0);

      const { standings } = await get(request, season, "/phases/RS/standings");
      const a = standings.find((row) => row.groupName === "A" && row.basic.position === 1);
      const b = standings.find((row) => row.groupName === "B" && row.basic.position === 1);
      await page.goto(`/${season}/compare?teamA=${a.clubCode}&teamB=${b.clubCode}&phase=RS`);
      await expect(page.getByText(/played in separate groups/)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("tab", { name: "Statistics" }).click();
      await expect(page.getByText(/played in separate groups and did not face/)).toBeVisible();
      await expect(page.locator("main")).toContainText("Group A · 1st");
      await expect(page.locator("main")).toContainText("Group B · 1st");
    });

    test("no EuroCup drop-down games appear in any stage", async ({ request }) => {
      const { stages } = (await get(request, season, "/format")).format;
      for (const stage of stages) {
        const { games } = await get(request, season, `/games?phase=${stage.code}&limit=100`);
        expect(games.every((game) => game.phaseCode === stage.code)).toBe(true);
        expect(JSON.stringify(games)).not.toMatch(/EuroCup|ECUP|Eurocup/);
      }
    });
  });
}

test.describe("modern season regression", () => {
  test("Home, Games and the team page keep the single-table wording", async ({ page }) => {
    await mockLayoutImages(page);
    await page.goto(`/${MODERN}/home`);
    await expect(page.getByRole("heading", { name: "League table" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Group tables" })).toHaveCount(0);
    await expect(page.getByTestId("home-kpi-strip")).toContainText("Leader in wins");
    await page.goto(`/${MODERN}/games?phase=RS&round=3`);
    await expect(page.locator("a.fixture-card").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Group", { exact: true })).toHaveCount(0);
    await expect(page.locator("a.fixture-card").first()).not.toContainText("Group");
    await page.goto(`/${MODERN}/leaders?scope=teams&phase=RS`);
    await expect(page.getByText(/separate groups/)).toHaveCount(0);
  });
});

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`grouped Home and Games do not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2012/home");
      await expect(page.getByRole("heading", { name: "Group tables" })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      await page.goto("/2012/games?phase=RS&round=3");
      await expect(page.getByLabel("Group", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("a.fixture-card").first()).toBeVisible();
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
