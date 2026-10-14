import { test, expect } from "@playwright/test";
import { buildEliminationBracket, eliminationStageOf } from "../src/postseason/eliminationBracket.js";
import { placements } from "../src/postseason/bracketModel.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASON = 2000;
const OUTCOMES = [
  ["r16", ["FOR", 2, "CIB", 0], ["MAD", 2, "BUD", 0], ["VIR", 2, "EST", 0], ["LJU", 2, "PAO", 1], ["OLY", 2, "VER", 0], ["BAS", 2, "PER", 0], ["TRE", 2, "BAR", 0], ["AEK", 2, "ZAL", 0]],
  ["qf", ["FOR", 2, "MAD", 1], ["VIR", 2, "LJU", 0], ["BAS", 2, "OLY", 0], ["AEK", 2, "TRE", 1]],
  ["sf", ["VIR", 3, "FOR", 0], ["BAS", 3, "AEK", 0]],
  ["final", ["VIR", 3, "BAS", 2]],
];
const STAGE_GAMES = { r16: 17, qf: 10, sf: 6, final: 5 };

async function load(request) {
  const get = async (path) => {
    const response = await request.get(`${API}/seasons/${SEASON}${path}`);
    expect(response.ok(), path).toBe(true);
    return response.json();
  };
  const [{ format }, { series }, { games }, { teams }] = await Promise.all([get("/format"), get("/postseason-series"), get("/games?phase=PO&limit=100"), get("/teams")]);
  return { format, series, games, teams };
}

// What a tie recorded: the winner's wins first.
const result = (slot) => {
  const winner = slot.winnerClubCode;
  const [a, b] = slot.participants;
  const wins = (side) => (slot.series.clubA.clubCode === side.clubCode ? slot.series.clubAWins : slot.series.clubBWins);
  const other = a.clubCode === winner ? b : a;
  return [winner, wins(a.clubCode === winner ? a : b), other.clubCode, wins(other)];
};

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("a game's stage comes from its group label, never its round number", () => {
  expect(["Group First Round 3", "Group First Round Final", "Group Quarterfinal 2", "Group Semifinal 1", "Group Final"].map(eliminationStageOf)).toEqual([0, 0, 1, 2, 3]);
  expect(eliminationStageOf("Group Final Four")).toBe(-1);
  expect(eliminationStageOf(null)).toBe(-1);
  expect(eliminationStageOf("Round 17")).toBe(-1);
});

test.describe("E2000 elimination bracket", () => {
  test("eight, four, two and one ties with the recorded series, connected to the champion", async ({ request }) => {
    const data = await load(request);
    expect(data.format.family).toBe("eliminationSeries");
    for (const [id, count] of Object.entries(STAGE_GAMES)) expect(data.games.filter((game) => ["r16", "qf", "sf", "final"][eliminationStageOf(game.groupName)] === id)).toHaveLength(count);
    const bracket = buildEliminationBracket(data);
    expect(bracket.issues).toEqual([]);
    expect(bracket.connected).toBe(true);
    expect(bracket.rounds.map((round) => round.slots.length)).toEqual([8, 4, 2, 1]);
    expect(bracket.rounds.map((round) => round.winTarget)).toEqual([2, 2, 3, 3]);
    for (const [id, ...ties] of OUTCOMES) {
      const round = bracket.rounds.find((entry) => entry.id === id);
      expect(round.slots.map(result).map((row) => row.join("|")).sort()).toEqual(ties.map((row) => row.join("|")).sort());
    }
    expect(bracket.champion.clubCode).toBe("VIR");
    expect(bracket.final.participants.map((side) => side.clubCode).sort()).toEqual(["BAS", "VIR"]);
    // The two ties feeding a later tie are drawn next to it.
    for (let index = 1; index < bracket.rounds.length; index += 1) {
      bracket.rounds[index].slots.forEach((slot, position) => expect(slot.sourceSlotIds).toEqual(bracket.rounds[index - 1].slots.slice(2 * position, 2 * position + 2).map((earlier) => earlier.id)));
    }
    expect(placements(bracket).map((row) => `${row.label}:${row.club.clubCode}`)).toEqual(["Champion:VIR", "Runner-up:BAS"]);
  });

  test("the replay is a note on the AEK and Tau semifinal, with only the recorded games", async ({ request }) => {
    const bracket = buildEliminationBracket(await load(request));
    const noted = bracket.all.filter((slot) => slot.note);
    expect(noted).toHaveLength(1);
    expect(noted[0].stageName).toBe("Semifinals");
    expect(noted[0].participants.map((side) => side.clubCode).sort()).toEqual(["AEK", "BAS"]);
    expect(noted[0].note).toContain("replayed");
    expect(noted[0].series.games.map((game) => game.gameCode)).toEqual([162, 163, 164]);
  });

  test("bad evidence leaves the slot unverified and the champion unknown", async ({ request }) => {
    const data = await load(request);
    const between = (entry, a, b) => [entry.clubA.clubCode, entry.clubB.clubCode].sort().join("|") === [a, b].sort().join("|");
    const oneShort = data.series.map((entry) => (between(entry, "VIR", "BAS") ? { ...entry, clubAWins: 2, clubBWins: 2 } : entry));
    expect(buildEliminationBracket({ ...data, series: oneShort }).champion).toBeNull();
    const unlabelled = buildEliminationBracket({ ...data, games: data.games.filter((game) => game.groupName !== "Group Final") });
    expect(unlabelled.champion).toBeNull();
    expect(unlabelled.connected).toBe(false);
    const strangers = data.series.map((entry) => (between(entry, "VIR", "BAS") ? { ...entry, clubA: entry.clubA, clubB: data.series[0].clubA.clubCode === entry.clubA.clubCode ? data.series[0].clubB : data.series[0].clubA } : entry));
    const mismatched = buildEliminationBracket({ ...data, series: strangers });
    expect(mismatched.champion).toBeNull();
    expect(mismatched.final.unverified).toBe(true);
    const noGames = buildEliminationBracket({ ...data, series: data.series.map((entry) => (between(entry, "FOR", "MAD") ? { ...entry, games: [] } : entry)) });
    expect(noGames.connected).toBe(false);
    expect(noGames.champion).toBeNull();
    expect(buildEliminationBracket({ ...data, series: [] }).champion).toBeNull();
    expect(buildEliminationBracket({ ...data, format: { ...data.format, family: "singleTable" } })).toBeNull();
  });
});

test.describe("E2000 Postseason page", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });

  test("shows every series with its wins, the champion and no modern-format wording", async ({ page }) => {
    await page.goto(`/${SEASON}/postseason`);
    await expect(page.getByText("Kinder Virtus Bologna are the champions")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("list", { name: "Stages of the season" })).toContainText("Round of 16");
    await expect(page.getByRole("list", { name: "Stages of the season" })).not.toContainText(/Final Four|Top 16|Playoffs/);
    await expect(page.getByText(/Won the final series against Tau Ceramica Vitoria-Gasteiz 3-2/)).toBeVisible();
    await expect(page.locator('main [role="group"]').filter({ hasText: /Best of [35]/ })).toHaveCount(15);
    await expect(page.getByRole("group", { name: "Final", exact: true })).toContainText("3");
    await expect(page.getByRole("group", { name: "Semifinal 1", exact: true })).toBeVisible();
    await page.getByText("How the postseason works", { exact: true }).click();
    await expect(page.locator("main")).toContainText("There is no Top 16 or Final Four and no third-place game");
    await expect(page.locator("main")).not.toContainText(/1 v 8|One game|Winner of|projection|Play-In|Third place|Fourth place/);
  });

  test("selecting the AEK and Tau semifinal shows the replay note and the three recorded games", async ({ page }) => {
    await page.goto(`/${SEASON}/postseason`);
    await expect(page.getByRole("group", { name: "Semifinal 2", exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("group", { name: "Semifinal 2", exact: true }).getByRole("button").first().click();
    await expect(page.getByText(/replayed after Tau's appeal/)).toBeVisible();
    await expect(page.locator("main a[href*='/games/16']")).toHaveCount(3);
  });
});

test.describe("E2000 stage names and the champion", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });

  test("Games opens the knockout by stage, with the recorded game counts", async ({ page }) => {
    await page.goto(`/${SEASON}/games?phase=PO`);
    const stages = page.getByRole("tablist", { name: "Stage" });
    await expect(stages).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tablist", { name: "Round" })).toHaveCount(0);
    for (const [name, count] of [["Round of 16", 17], ["Quarterfinals", 10], ["Semifinals", 6], ["Final", 5]]) {
      await stages.getByRole("tab", { name: `${name} (${count})` }).click();
      await expect(page.locator("a.fixture-card")).toHaveCount(count);
    }
    await expect(page.locator("a.fixture-card").first()).toContainText("Final");
    await page.goto(`/${SEASON}/games?phase=PO&stage=qf`);
    await expect(page.locator("a.fixture-card")).toHaveCount(10, { timeout: 30_000 });
    await expect(page.locator("a.fixture-card").first()).toContainText("Quarterfinal");
    // The regular season keeps its round strip.
    await page.goto(`/${SEASON}/games?phase=RS`);
    await expect(page.getByRole("tablist", { name: "Round" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tablist", { name: "Stage" })).toHaveCount(0);
  });

  test("the game page and Home name the stage rather than a game number", async ({ page }) => {
    await page.goto(`/${SEASON}/games/169`);
    await expect(page.getByText("Final", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main")).not.toContainText(/Game 8|Round 22/);
    await page.goto(`/${SEASON}/home`);
    await expect(page.locator(".match-card-head").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".match-card-head span:first-child").first()).toHaveText("Final");
  });

  test("Overview names the champion and the four series on the road to the title", async ({ page }) => {
    await page.goto(`/${SEASON}/overview`);
    await expect(page.getByRole("heading", { name: "Road to the title" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Season champion")).toBeVisible();
    await expect(page.getByText("Kinder Virtus Bologna").first()).toBeVisible();
    await expect(page.getByText(/^Defeated /)).toHaveCount(4);
    for (const text of ["Round of 16 · Won series 2-0", "Quarterfinal · Won series 2-0", "Semifinal · Won series 3-0", "Final · Won series 3-2"]) await expect(page.getByText(text)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/Top 16|Final Four/);
  });
});

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`the elimination Postseason does not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${SEASON}/postseason`);
      await expect(page.getByText("Kinder Virtus Bologna are the champions")).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      await page.goto(`/${SEASON}/games?phase=PO`);
      await expect(page.getByRole("tablist", { name: "Stage" })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
