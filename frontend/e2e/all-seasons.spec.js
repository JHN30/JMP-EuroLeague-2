import { test, expect } from "@playwright/test";
import { findPageOverflow, HEIGHT, mockLayoutImages, WIDTHS } from "./support/layout";

// Feature 34o: every season E2000-E2026 is presented for its own format. Everything but the champion comes from each season's format and data
// through the local API; the champions are the 34a inventory's season matrix (also used by scripts/check-season-matrix.mjs).
const API = "http://localhost:3000/api";
const CHAMPION = {
  2000: "VIR", 2001: "PAN", 2002: "BAR", 2003: "TEL", 2004: "TEL", 2005: "CSK", 2006: "PAN", 2007: "CSK", 2008: "PAN", 2009: "BAR", 2010: "PAN", 2011: "OLY",
  2012: "OLY", 2013: "TEL", 2014: "MAD", 2015: "CSK", 2016: "ULK", 2017: "MAD", 2018: "CSK", 2019: null, 2020: "IST", 2021: "IST", 2022: "MAD", 2023: "PAN",
  2024: "ULK", 2025: "OLY", 2026: null,
};
const YEARS = Object.keys(CHAMPION).map(Number);
const TIMEOUT = 30_000;

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

async function load(request, year) {
  const get = async (path) => {
    const response = await request.get(`${API}/seasons/${year}${path}`);
    expect(response.ok(), path).toBe(true);
    return response.json();
  };
  const [{ format }, { teams }, { phases }] = await Promise.all([get("/format"), get("/teams"), get("/phases")]);
  return { format, teams, phases };
}

// A page that renders must not fall into the error boundary, show a load error, or log a script error.
function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text().slice(0, 200));
  });
  return errors;
}

async function expectNoError(page, errors, where) {
  await expect(page.getByText("Something went wrong on this page.")).toHaveCount(0);
  await expect(page.getByText(/^Could not load/)).toHaveCount(0);
  expect(errors, where).toEqual([]);
}

test.describe("every season", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });

  for (const year of YEARS) {
    test(`${year}: the season pages load without an error`, async ({ page, request }) => {
      test.setTimeout(120_000);
      const { teams } = await load(request, year);
      const errors = watchErrors(page);
      const seasonName = (await (await request.get(`${API}/seasons/${year}`)).json()).season?.name;
      const targets = [["home", "Season overview"], ["overview", null], ["standings", "Standings"], ["games", "Games"], ["teams", null], ["leaders", "Leaders"], ["records", null], ["postseason", "Postseason"]];
      for (const [path, heading] of targets) {
        await page.goto(`/${year}/${path}`);
        await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
        if (heading) await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: TIMEOUT });
        await page.waitForLoadState("networkidle");
        await expectNoError(page, errors, `${year}/${path}`);
      }
      await page.goto(`/${year}/overview`);
      if (seasonName) await expect(page.getByRole("heading", { name: seasonName })).toBeVisible({ timeout: TIMEOUT });
      await page.goto(`/${year}/teams`);
      await expect(page.locator("main a[href*='/teams/']").first()).toBeVisible({ timeout: TIMEOUT });
      expect(teams.length).toBeGreaterThan(0);
      // One club's page and one player's page, to reach the season-scoped detail routes.
      const club = teams[0].clubCode;
      await page.goto(`/${year}/teams/${club}`);
      await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
      const players = (await (await request.get(`${API}/seasons/${year}/players?limit=1`)).json()).players;
      if (players.length > 0) {
        await page.goto(`/${year}/players/${players[0].personKey}`);
        await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
      }
      await page.waitForLoadState("networkidle");
      await expectNoError(page, errors, `${year} detail pages`);
    });

    test(`${year}: Standings and Games follow each stage of the format`, async ({ page, request }) => {
      test.setTimeout(180_000);
      const { format, phases } = await load(request, year);
      const excluded = format.exceptions.filter((entry) => entry.kind === "excludedClubs").flatMap((entry) => entry.clubs).length;
      for (const phase of phases) {
        const stage = format.stages.find((entry) => entry.code === phase.code);
        await page.goto(`/${year}/standings?phase=${phase.code}`);
        if (stage.type === "table") {
          const clubs = stage.plannedGroups * stage.plannedClubsPerGroup - (stage.plannedGroups === 1 ? excluded : 0);
          if (stage.observed.gamesPlayed === 0) continue;
          await expect(page.locator("table tbody a[href*='/teams/']").first()).toBeVisible({ timeout: TIMEOUT });
          // A phase that is under way lists the clubs it has; a loaded one lists the planned field.
          if (stage.dataState === "loaded") await expect(page.locator("table tbody a[href*='/teams/']")).toHaveCount(clubs);
          if (stage.plannedGroups > 1) await expect(page.getByRole("region", { name: /^Group [A-H]$/ })).toHaveCount(stage.plannedGroups);
        } else {
          await expect(page.getByText(/This phase is a knockout/)).toBeVisible({ timeout: TIMEOUT });
        }
        await page.goto(`/${year}/games?phase=${phase.code}`);
        await expect(page.locator("a.fixture-card").first()).toBeVisible({ timeout: TIMEOUT });
      }
      // Wording of a stage the season did not have never appears.
      for (const [code, word] of [["PI", /Play-In/], ["TS", /(?<!no )Top 16/]]) {
        if (format.stages.some((stage) => stage.code === code)) continue;
        for (const path of ["standings", "postseason", "overview"]) {
          await page.goto(`/${year}/${path}`);
          await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
          await page.waitForLoadState("networkidle");
          await expect(page.locator("main"), `${year}/${path}`).not.toContainText(word);
        }
      }
    });

    test(`${year}: Postseason shows the champion, the cancellation or no result`, async ({ page, request }) => {
      const { format, teams } = await load(request, year);
      await page.goto(`/${year}/postseason`);
      if (format.status === "cancelled") {
        await expect(page.getByRole("heading", { name: "Season cancelled" })).toBeVisible({ timeout: TIMEOUT });
        await expect(page.getByText(/are the champions/)).toHaveCount(0);
      } else if (CHAMPION[year]) {
        const name = teams.find((team) => team.clubCode === CHAMPION[year]).name;
        await expect(page.getByText(`${name} are the champions`)).toBeVisible({ timeout: TIMEOUT });
      } else {
        await expect(page.getByRole("heading", { name: "Postseason" })).toBeVisible({ timeout: TIMEOUT });
        await expect(page.getByText(/are the champions/)).toHaveCount(0);
      }
    });
  }
});

test.describe("URL state and the season switcher", () => {
  test.beforeEach(async ({ page }) => {
    await mockLayoutImages(page);
  });

  test("a group, a round and a stage survive a reload", async ({ page }) => {
    await page.goto("/2012/standings?phase=TS&group=F");
    await expect(page.getByLabel("Group", { exact: true })).toHaveValue("F", { timeout: TIMEOUT });
    await page.reload();
    await expect(page.getByLabel("Group", { exact: true })).toHaveValue("F", { timeout: TIMEOUT });
    await page.goto("/2008/games?phase=RS&round=3");
    await expect(page.getByRole("tab", { name: /Round 3$/, selected: true })).toBeVisible({ timeout: TIMEOUT });
    await page.reload();
    await expect(page.getByRole("tab", { name: /Round 3$/, selected: true })).toBeVisible({ timeout: TIMEOUT });
    await page.goto("/2000/games?phase=PO&stage=sf");
    await expect(page.getByRole("tab", { name: "Semifinals (6)", selected: true })).toBeVisible({ timeout: TIMEOUT });
    await page.reload();
    await expect(page).toHaveURL(/stage=sf/);
    await expect(page.getByRole("tab", { name: "Semifinals (6)", selected: true })).toBeVisible({ timeout: TIMEOUT });
  });

  test("an unknown phase, group or stage falls back without an error", async ({ page }) => {
    const errors = watchErrors(page);
    for (const path of ["/2012/standings?phase=XX", "/2012/standings?phase=TS&group=Z", "/2000/games?phase=PO&stage=nope", "/2005/games?phase=RS&round=999"]) {
      await page.goto(path);
      await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
      await page.waitForLoadState("networkidle");
      await expectNoError(page, errors, path);
    }
  });

  test("the season switcher keeps the page and lists exactly the loaded seasons", async ({ page, request }) => {
    const { seasons } = await (await request.get(`${API}/seasons`)).json();
    expect(seasons.map((season) => season.seasonCode).sort()).toEqual(YEARS.map((year) => `E${year}`).sort());
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/2012/postseason");
    await expect(page.getByText(/are the champions/)).toBeVisible({ timeout: TIMEOUT });
    const options = await page.getByLabel("Selected season").first().locator("option").allTextContents();
    expect(options).toHaveLength(YEARS.length);
    await page.getByLabel("Selected season").first().selectOption("2005");
    await expect(page).toHaveURL(/\/2005\/postseason$/);
    await expect(page.getByText(/are the champions/)).toBeVisible({ timeout: TIMEOUT });
    await page.goto("/2027/home");
    // A season the database does not hold falls back to the current one.
    await expect(page).toHaveURL(/\/2026\/home$/, { timeout: TIMEOUT });
  });

  test("Records and head to head open for a historical season", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/2005/compare/head-to-head");
    await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
    await page.goto("/2005/records");
    await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
    await page.waitForLoadState("networkidle");
    await expectNoError(page, errors, "records and head to head");
  });
});

// One season per format transition, in both themes and at the four widths.
const TRANSITIONS = [2000, 2001, 2002, 2004, 2008, 2012, 2016, 2019, 2021, 2023, 2025, 2026];
for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`transition seasons fit every width in ${theme}`, async ({ page }) => {
    test.setTimeout(600_000);
    await mockLayoutImages(page);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    for (const year of TRANSITIONS) {
      for (const path of ["postseason", "standings"]) {
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          await page.goto(`/${year}/${path}`);
          await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: TIMEOUT });
          await page.waitForLoadState("networkidle");
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          expect(await findPageOverflow(page), `${year}/${path} ${width}px ${theme}`).toMatchObject({ offenders: [] });
        }
      }
    }
  });
}
