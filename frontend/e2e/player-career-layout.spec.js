import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Season by season tab at every width. Each test loads the page once and resizes the window: the layout
// depends on the viewport only. The data is live (a player of the current season who also played earlier); the states are mocked.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];

async function openCareer(page, href) {
  await page.goto(href);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByRole("region", { name: "Season by season table" })).toBeVisible({ timeout: 60_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each panel sits inside it. Text that a `truncate` element cuts with an ellipsis, a box that scrolls on its
// own (a region or a scrolling tab strip) and a chart canvas that is still redrawing after a resize are left to their own checks.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate, [role=region], .tabs-scroll, canvas")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);

test("the summary, the season table and the trends fit, and the table scrolls on its own with the season pinned", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await openCareer(page, href);
  const summary = page.locator('section[aria-label="Career summary"]');
  const tableRegion = page.getByRole("region", { name: "Season by season table" });
  const trends = page.locator('section[aria-label="Trends"]');
  await expect(trends.locator(".panel")).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    await expectNoSidewaysScroll(page);
    // Summary cards: two to a row below 640px, four from 640px.
    expect(await columns(summary.locator("div.grid > div"))).toBe(width < 640 ? 2 : 4);
    expect(await holdsContent(summary.locator("div.grid > div"))).toBe(true);

    // The season table scrolls inside its own panel (a keyboard can reach it) and the page does not.
    await expect(tableRegion).toHaveAttribute("tabindex", "0");
    const scrolls = await tableRegion.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 390) expect(scrolls).toBe(true);

    // The season column is pinned: it keeps its place when the table is scrolled, and it is narrow on a phone.
    const pinned = await tableRegion.evaluate((el) => {
      el.scrollLeft = 0;
      const cell = el.querySelector("tbody td:first-child");
      const before = cell.getBoundingClientRect();
      el.scrollLeft = 80;
      const after = cell.getBoundingClientRect();
      el.scrollLeft = 0;
      return { moved: Math.abs(after.left - before.left), width: before.width, panel: el.getBoundingClientRect().width };
    });
    if (scrolls) expect(pinned.moved).toBeLessThan(1);
    if (width < 640) expect(pinned.width).toBeLessThan(pinned.panel / 2);

    // Scrolled cells never show beside the pinned column: the point just inside the panel's left edge belongs to the season cell.
    if (scrolls) {
      const leak = await tableRegion.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
        el.scrollLeft = 120;
        const box = el.getBoundingClientRect();
        const row = el.querySelector("tbody tr").getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + 2, row.top + row.height / 2);
        const inSeasonCell = Boolean(hit?.closest("td:first-child, th:first-child"));
        el.scrollLeft = 0;
        return !inSeasonCell;
      });
      expect(leak).toBe(false);
    }

    // A season badge sits under the season below 640px and beside it from 640px.
    const badge = tableRegion.locator("tbody td:first-child .badge").first();
    if ((await badge.count()) > 0) {
      const placement = await badge.evaluate((el) => {
        const link = el.closest("td").querySelector("a").getBoundingClientRect();
        return el.getBoundingClientRect().top >= link.bottom - 1 ? "under" : "beside";
      });
      expect(placement).toBe(width < 640 ? "under" : "beside");
    }

    // Trends: one chart, a bar column per season in the table, scrolling in its own region when the seasons don't fit.
    const chart = trends.getByRole("region", { name: "Points by season" });
    await expect(chart).toHaveAttribute("tabindex", "0");
    expect(await chart.locator("div.flex-1[title]").count()).toBe(await tableRegion.locator("tbody tr").count());
    expect(await holdsContent(trends.locator(".panel"))).toBe(true);
    // The three facts over the chart are side by side and their numbers are not cut.
    const facts = trends.locator("div.grid-cols-3 > div");
    expect(await columns(facts)).toBe(3);
    expect(await facts.locator("p.text-2xl").evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1))).toBe(true);
  });
});

test("the trend chart switches between the twelve stats", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await openCareer(page, href);
  const trends = page.locator('section[aria-label="Trends"]');
  const stats = trends.getByRole("tablist", { name: "Trend stat" }).getByRole("tab");
  await expect(stats).toHaveCount(12);
  await expect(trends.getByRole("region", { name: "Points by season" })).toBeVisible();
  await stats.filter({ hasText: "Rebounds" }).click();
  await expect(trends.getByRole("region", { name: "Rebounds by season" })).toBeVisible();
  await expect(trends).toContainText("Best season");
  await stats.filter({ hasText: "Win shares" }).click();
  await expect(trends).toContainText("Career total");
});

test("the highs, the opened profile, the table views and the clubs fit", async ({ page }) => {
  test.setTimeout(120_000);
  const { href } = await veteranPlayer(page);
  await openCareer(page, href);
  const highsAndProfile = page.locator('section[aria-label="Highs and profile"]');
  await highsAndProfile.getByRole("button", { name: "Compare the profile by season" }).click();
  await expect(highsAndProfile.locator("canvas")).toBeVisible({ timeout: 60_000 });
  const table = page.getByRole("region", { name: "Season by season table" });
  const clubs = page.getByRole("region", { name: "Clubs by season" });

  await atWidths(page, WIDTHS, async (width) => {
    // The radar stays inside its panel and does not stretch the page.
    await expectNoSidewaysScroll(page);
    await expect.poll(() => holdsContent(highsAndProfile.locator(".panel"))).toBe(true);
    const radar = await highsAndProfile.locator("canvas").evaluate((canvas) => {
      const panel = canvas.closest(".panel").getBoundingClientRect();
      const box = canvas.getBoundingClientRect();
      return box.left >= panel.left - 1 && box.right <= panel.right + 1;
    });
    expect(radar).toBe(true);

    // The career highs: two to a row below 1024px, four from 1024px.
    expect(await columns(highsAndProfile.locator('a[href*="/games/"]'))).toBe(width < 1024 ? 2 : 4);
    // Eight highs, so the last row is full at two and at four to a row (a player without a game for one stat shows seven or fewer).
    expect(await highsAndProfile.locator('a[href*="/games/"]').count()).toBeLessThanOrEqual(8);

    // Each table view keeps the season pinned while its region scrolls, and the view tabs stay on one line inside the panel.
    for (const view of ["Totals", "Role", "Per game"]) {
      await page.getByRole("tab", { name: view, exact: true }).click();
      const pinned = await table.evaluate((el) => {
        el.scrollLeft = 0;
        const cell = el.querySelector("tbody td:first-child");
        const before = cell.getBoundingClientRect().left;
        el.scrollLeft = 60;
        const after = cell.getBoundingClientRect().left;
        el.scrollLeft = 0;
        return { scrolls: el.scrollWidth > el.clientWidth, moved: Math.abs(after - before) };
      });
      if (pinned.scrolls) expect(pinned.moved).toBeLessThan(1);
    }
    const viewTabs = page.getByRole("tablist", { name: "Table view" }).getByRole("tab");
    expect(await viewTabs.evaluateAll((tabs) => new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size)).toBe(1);
    expect(await holdsContent(page.locator('section[aria-label="Seasons"] .panel, section[aria-label="Teams"] .panel'))).toBe(true);
    // The clubs row scrolls in its own region.
    await expect(clubs).toHaveAttribute("tabindex", "0");
  });
});

// Sergio Llull: Real Madrid since 2007-08, with old 10-game regular seasons, a 2017-18 of playoff games only, and a
// registered 2026-27 without games so far. Isaac Bonga: Bayern, Partizan and Panathinaikos.
const LLULL = "/2025-26/players/TGB";
const BONGA = "/2025-26/players/006760";

const seasonLinks = (page) => page.getByRole("region", { name: "Season by season table" }).locator("tbody td:first-child a");
// A season's GP cell: the fourth, after the season, the team and the age. The total is its first line; the games after
// the regular season are listed under it.
const gamesCell = (page, season) =>
  page.getByRole("region", { name: "Season by season table" }).locator("tbody tr").filter({ has: page.getByRole("link", { name: season, exact: true }) }).locator("td").nth(3);
const gamesOf = async (page, season) => Number((await gamesCell(page, season).innerText()).split("\n")[0]);

test("the tab opens on all games, and the regular season drops the seasons without regular-season games", async ({ page }) => {
  test.setTimeout(120_000);
  await openCareer(page, LLULL);
  const phases = page.getByRole("tablist", { name: "Games counted" });
  await expect(phases.getByRole("tab", { name: "All games" })).toHaveAttribute("aria-selected", "true");
  const summary = page.locator('section[aria-label="Career summary"]');
  await expect(summary).toContainText("every phase");

  // Every phase: 30 games in 2014-15, the 4 playoff games of 2017-18, and no row for 2026-27 (no games yet).
  expect(await gamesOf(page, "2014-15")).toBe(30);
  // Under the total, the games after the regular season: 10 + 14 Top 16 + 6 postseason.
  await expect(gamesCell(page, "2014-15")).toContainText("14 Top 16");
  await expect(gamesCell(page, "2014-15")).toContainText("6 postseason");
  expect(await gamesOf(page, "2017-18")).toBe(4);
  await expect(gamesCell(page, "2017-18")).toContainText("4 postseason");
  await expect(seasonLinks(page).filter({ hasText: "2026-27" })).toHaveCount(0);
  const games = () => summary.locator("p").nth(1).innerText().then((text) => Number(text.replace(/\D/g, "")));
  expect(await games()).toBeGreaterThan(326);

  // The regular season: 10 games in 2014-15, and 2017-18 leaves the table and the season count.
  await phases.getByRole("tab", { name: "Regular season" }).click();
  await expect(summary).toContainText("regular season");
  expect(await gamesOf(page, "2014-15")).toBe(10);
  await expect(gamesCell(page, "2014-15")).not.toContainText("postseason");
  await expect(seasonLinks(page).filter({ hasText: "2017-18" })).toHaveCount(0);
  expect(await games()).toBe(326);
  await expect(summary.locator("p").first()).toHaveText(String(await seasonLinks(page).count()));
});

test("the table shows per game, totals and role, each with its career row", async ({ page }) => {
  test.setTimeout(120_000);
  await openCareer(page, BONGA);
  const table = page.getByRole("region", { name: "Season by season table" });
  const headers = () => table.locator("thead th").allInnerTexts();

  expect(await headers()).toEqual(expect.arrayContaining(["GP", "PTS", "TS%"]));
  await expect(table.locator("tfoot")).toContainText("Career");

  await page.getByRole("tab", { name: "Totals", exact: true }).click();
  expect(await headers()).toEqual(expect.arrayContaining(["GP", "PTS", "2PM-A", "3PM-A", "FTM-A"]));
  // The career row is the sum of the seasons (PTS is the sixth column).
  const points = await table.locator("tbody tr").evaluateAll((rows) => rows.map((row) => Number(row.children[5].textContent.replace(/\D/g, ""))));
  const careerPoints = Number((await table.locator("tfoot td").nth(5).innerText()).replace(/\D/g, ""));
  expect(careerPoints).toBe(points.reduce((sum, value) => sum + value, 0));

  await page.getByRole("tab", { name: "Role", exact: true }).click();
  expect(await headers()).toEqual(expect.arrayContaining(["Started", "USG%", "Pts from 2s"]));
  await expect(table.locator("tbody tr").first().locator("td").nth(3)).toHaveText(/^\d+\/\d+$/);
  // The separate role table is gone.
  await expect(page.getByText("How the role changed")).toHaveCount(0);
});

test("the clubs are stints, and the radar starts on the last three seasons and keeps at least one", async ({ page }) => {
  test.setTimeout(120_000);
  await openCareer(page, LLULL);
  const stints = page.locator('section[aria-label="Teams"] li');
  await expect(stints).toHaveCount(1);
  await expect(stints.first()).toContainText("2007-08 to 2026-27");
  await expect(stints.first()).toContainText("Real Madrid");
  await expect(stints.first()).toContainText("20 seasons");

  const profile = page.locator('section[aria-label="Highs and profile"]');
  await profile.getByRole("button", { name: "Compare the profile by season" }).click();
  const chips = profile.getByRole("group", { name: "Seasons on the radar" }).getByRole("button");
  await expect(chips).toHaveCount(await seasonLinks(page).count());
  const pressed = profile.locator("[aria-pressed=true]");
  await expect(pressed).toHaveText(["2023-24", "2024-25", "2025-26"]);
  await expect(profile.locator("canvas")).toBeVisible({ timeout: 60_000 });

  // Turning seasons off stops at the last one; turning one on adds it.
  for (const season of ["2023-24", "2024-25"]) await chips.filter({ hasText: season }).click();
  const lastOn = chips.filter({ hasText: "2025-26" });
  await expect(lastOn).toBeDisabled();
  await lastOn.click({ force: true });
  await expect(pressed).toHaveText(["2025-26"]);
  await chips.filter({ hasText: "2014-15" }).click();
  await expect(pressed).toHaveText(["2014-15", "2025-26"]);
  await expect(profile.locator("canvas")).toBeVisible({ timeout: 60_000 });

  await openCareer(page, BONGA);
  await expect(stints).toHaveCount(3);
  await expect(stints.nth(0)).toContainText("Bayern");
  await expect(stints.nth(0)).toContainText("2022-23 to 2023-24");
  await expect(stints.nth(1)).toContainText("Partizan");
  await expect(stints.nth(2)).toContainText("Panathinaikos");
});

// Answers the career requests: the first request for the player's own page is live, later ones follow `answer`.
async function shapeCareer(page, answer) {
  let first = null;
  await page.route(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/, async (route) => {
    const code = new URL(route.request().url()).pathname.split("/")[3];
    first ??= code;
    const verdict = answer(code === first);
    if (verdict === "live") return route.continue();
    return route.fulfill({ status: verdict, json: { error: "Mocked" } });
  });
}

test("a player with one season, no seasons, or a failing history keeps the tab tidy", async ({ page }) => {
  test.setTimeout(120_000);
  const { href } = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // One season: only the current one answers, so the table has no Career row and the radar one outline.
  await shapeCareer(page, (isCurrent) => (isCurrent ? "live" : 404));
  await openCareer(page, href);
  await expect(page.getByRole("region", { name: "Season by season table" }).locator("tfoot")).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  expect(await holdsContent(page.locator('#player-detail-panel section[aria-label="Career summary"] div.grid > div, #player-detail-panel section[aria-label="Trends"] .panel'))).toBe(true);
  await page.unroute(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/);

  // No seasons at all after the page itself has loaded.
  await page.goto(href);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
  await shapeCareer(page, () => 404);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByText("No archived seasons found for this player.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);
  await page.unroute(/\/api\/seasons\/[^/]+\/players\/[^/?]+$/);

  // A failing history.
  await page.goto(href);
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 30_000 });
  await shapeCareer(page, () => 500);
  await page.getByRole("tab", { name: "Season by season" }).click();
  await expect(page.getByText("Could not load season history.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
