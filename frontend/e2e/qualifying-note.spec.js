import { test, expect } from "@playwright/test";
import { competitionNotes } from "../src/lib/seasonFormat.js";
import { findPageOverflow, mockLayoutImages } from "./support/layout";

const API = "http://localhost:3000/api";
const NOTED = { 2001: /produced 2 of its 32 clubs/, 2009: /Two-legged knockout/, 2010: /Two-legged knockout/, 2011: /Vilnius and Charleroi/, 2012: /Cantù/, 2013: /Lietuvos rytas/, 2014: /UNICS/ };
const UNNOTED = [2000, 2002, 2003, 2007, 2008, 2015, 2016, 2024];
const NOTE = "Competition context";
const GAP = /The qualifying games are not loaded, so no qualifying results are shown/;

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

async function format(request, season) {
  const response = await request.get(`${API}/seasons/${season}/format`);
  expect(response.ok()).toBe(true);
  return (await response.json()).format;
}

test("the format records qualifying only where the inventory established it", async ({ request }) => {
  for (const season of Object.keys(NOTED)) {
    const data = await format(request, season);
    const facts = data.exceptions.filter((entry) => entry.kind === "qualifying");
    expect(facts, season).toHaveLength(1);
    expect(facts[0].stage).toBe("RS");
    expect(facts[0].note).toMatch(NOTED[season]);
    expect(data.stages.map((stage) => stage.code), season).not.toContain("QU");
    const phases = (await (await request.get(`${API}/seasons/${season}/phases`)).json()).phases.map((phase) => phase.code);
    expect(phases).not.toContain("QU");
    expect(phases).toEqual(data.stages.map((stage) => stage.code));
  }
  for (const season of UNNOTED) expect((await format(request, season)).exceptions.filter((entry) => entry.kind === "qualifying"), season).toEqual([]);
});

test("the note is for the regular-season table only, never a game, club or later stage", () => {
  const data = { seasonCode: "E2010", status: "completed", exceptions: [{ kind: "qualifying", stage: "RS", note: "Fact." }] };
  const shown = competitionNotes(data, "2010", { phaseCode: "RS", roundNumber: 4 });
  expect(shown).toHaveLength(1);
  expect(shown[0].note).toMatch(GAP);
  expect(shown[0].note.startsWith("Fact.")).toBe(true);
  expect(competitionNotes(data, "2010", { phaseCode: "RS", clubCode: "BAR" })).toEqual([]);
  expect(competitionNotes(data, "2010", { gameCode: 5, phaseCode: "RS", game: { phaseCode: "RS" } })).toEqual([]);
  for (const phaseCode of ["TS", "PO", "FF", undefined]) expect(competitionNotes(data, "2010", { phaseCode })).toEqual([]);
});

test.describe("pages", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });
  const note = (page) => page.getByRole("complementary", { name: NOTE }).filter({ hasText: GAP });

  test("the regular season Standings, Games and Race show it", async ({ page }) => {
    for (const path of ["/2001/standings?phase=RS", "/2010/standings?phase=RS", "/2010/games?phase=RS", "/2014/standings?phase=RS"]) {
      await page.goto(path);
      await expect(note(page), path).toBeVisible({ timeout: 30_000 });
      await expect(note(page)).toHaveCount(1);
    }
    await page.goto("/2011/standings?phase=RS");
    await expect(note(page)).toHaveCount(1, { timeout: 30_000 });
    await page.getByRole("tab", { name: "Race" }).click();
    await expect(page.getByRole("tab", { name: "Race", selected: true })).toBeVisible();
    await expect(note(page)).toHaveCount(1, { timeout: 30_000 });
  });

  test("it is absent for seasons without an established qualifying round and on other pages (a finished season's Home shows its Top 16 table)", async ({ page }) => {
    for (const path of ["/2008/standings?phase=RS", "/2015/standings?phase=RS", "/2002/standings?phase=RS", "/2024/standings?phase=RS", "/2008/games?phase=RS", "/2015/home", "/2012/home"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Standings" }).or(page.getByRole("heading", { name: "Games" })).or(page.getByRole("heading", { name: /Group tables|Standings/ })).first()).toBeVisible({ timeout: 30_000 });
      await expect(note(page), path).toHaveCount(0);
    }
    for (const path of ["/2010/standings?phase=TS", "/2010/games?phase=TS", "/2010/standings?phase=PO", "/2010/standings?phase=FF"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: /Standings|Games/ }).first()).toBeVisible({ timeout: 30_000 });
      await expect(note(page), path).toHaveCount(0);
    }
    await page.goto("/2010/postseason");
    await expect(page.getByRole("heading", { name: "Postseason" })).toBeVisible({ timeout: 30_000 });
    await expect(note(page)).toHaveCount(0);
  });

  test("a game page and a club page do not carry it", async ({ page, request }) => {
    const games = (await (await request.get(`${API}/seasons/2010/games?phase=RS&limit=1`)).json()).games;
    await page.goto(`/2010/games/${games[0].gameCode}`);
    await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await expect(note(page)).toHaveCount(0);
    await page.goto(`/2010/teams/${games[0].localTeam.clubCode}`);
    await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await expect(note(page)).toHaveCount(0);
  });

  test("team counts and the standings field are unchanged by the note", async ({ request }) => {
    for (const season of [2001, 2012]) {
      const data = await format(request, season);
      const teams = (await (await request.get(`${API}/seasons/${season}/teams`)).json()).teams;
      expect(teams).toHaveLength(data.plannedClubs);
      const standings = (await (await request.get(`${API}/seasons/${season}/phases/RS/standings`)).json()).standings;
      expect(standings).toHaveLength(data.plannedClubs);
    }
  });
});

test.describe("layouts", () => {
  for (const width of [320, 390, 768, 1024]) {
    test(`the qualifying note does not overflow at ${width}px`, async ({ page }) => {
      await mockLayoutImages(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/2001/standings?phase=RS");
      await expect(page.getByRole("complementary", { name: NOTE }).filter({ hasText: GAP })).toBeVisible({ timeout: 30_000 });
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  }
});
