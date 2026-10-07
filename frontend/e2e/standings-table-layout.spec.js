import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

// The finished season has the Q badges and a longer table; the live season has the tier headings of a season in progress.
const FINISHED = "2025";

// Each test loads the page once and resizes the window through its widths: the layout depends on the viewport only, and a
// resize re-runs the media queries without a reload.
async function openStandings(page, season, { view } = {}) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 15_000 });
  if (view) await page.getByRole("tablist", { name: "Standings view" }).getByRole("tab", { name: view }).click();
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const table = (page) => page.locator("main table").first();

// What the pinned columns are doing right now, measured against the scrolling box.
const measureTable = (page) =>
  table(page).evaluate((tableEl) => {
    const box = tableEl.parentElement;
    const bounds = box.getBoundingClientRect();
    const row = tableEl.querySelector("tbody tr:not(.tier-row)");
    const [rankTd, teamTd, , winsTd] = row.querySelectorAll("td");
    const rank = rankTd.querySelector(".rank").getBoundingClientRect();
    const crest = teamTd.querySelector("img")?.getBoundingClientRect();
    const nameSpan = [...teamTd.querySelectorAll("a span")].find((span) => getComputedStyle(span).display !== "none");
    const pinnedRight = teamTd.getBoundingClientRect().right;
    const wins = document.createRange();
    wins.selectNodeContents(winsTd);
    const label = box.querySelector(".tier-row td span");
    // How far to the right the stats reach: the index of the last header that is fully inside the box.
    const headers = [...tableEl.querySelectorAll("thead th")];
    const reach = headers.reduce((last, th, index) => (th.getBoundingClientRect().width > 0 && th.getBoundingClientRect().right <= bounds.right + 1 ? index : last), 0);
    return {
      scrolled: Math.round(box.scrollLeft),
      crestInside: crest ? crest.right <= teamTd.getBoundingClientRect().right + 0.5 : null,
      statSize: getComputedStyle(winsTd).fontSize,
      rankLeft: Math.round(rankTd.getBoundingClientRect().left - bounds.left),
      teamLeft: Math.round(teamTd.getBoundingClientRect().left - bounds.left),
      teamWidth: Math.round(teamTd.getBoundingClientRect().width),
      rankToCrest: crest ? Math.round(crest.left - rank.right) : null,
      nameOpacity: nameSpan ? getComputedStyle(nameSpan).opacity : null,
      winsFromPinnedEdge: Math.round(wins.getBoundingClientRect().left - pinnedRight),
      tier: label ? Math.round(label.getBoundingClientRect().left - bounds.left) : null,
      reach,
    };
  });
const scroller = (page) => table(page).locator("xpath=..");

test("the KPI strip is two compact columns below 1280px and five across from it", async ({ page }) => {
  await openStandings(page);
  const strip = page.getByTestId("standings-kpi-strip");
  const cards = strip.locator(".kpi-chip");

  await atWidths(page, [320, 390, 639, 640, 768, 1023, 1024, 1279, 1280, 1440], async (width) => {
    const boxes = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    const lefts = new Set(boxes.map((box) => Math.round(box.left)));
    expect(await findBrokenWords(strip.locator(".name"))).toEqual([]);
    expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);

    if (width >= 1280) {
      expect(lefts.size).toBe(boxes.length);
      expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
      return;
    }
    expect(lefts.size).toBe(2);
    if (boxes.length % 2 === 1) expect(boxes.at(-1).width).toBeGreaterThan(boxes[0].width * 1.5);
    const crestHeight = await cards.first().locator(".kpi-chip-image").evaluate((el) => el.getBoundingClientRect().height);
    if (width < 640) expect(crestHeight).toBeLessThan(60);
    else expect(crestHeight).toBeGreaterThan(80);
  });
});

for (const { name, season, view } of [
  { name: "live season, Overall", season: undefined },
  { name: "live season, Last 10", season: undefined, view: "Last 10" },
  { name: "finished season, Overall", season: FINISHED },
]) {
  test(`${name}: the rank and team stay pinned and the record shows below 1280px`, async ({ page }) => {
    await openStandings(page, season, { view });
    // The headers wrap their label in a tooltip, so a column is picked by its place: #, Team, GP, W, L, PCT, PF.
    const COLUMN = { GP: 2, W: 3, L: 4, PCT: 5, PF: 6 };
    const header = (label) => table(page).locator("thead th").nth(COLUMN[label]);

    await atWidths(page, [320, 390, 768, 1024], async (width) => {
      const cells = table(page).locator("tbody tr:not(.tier-row)").first().locator("td");
      expect(await cells.evaluateAll((els) => els.slice(0, 2).map((el) => getComputedStyle(el).position))).toEqual(["sticky", "sticky"]);

      const bounds = await scroller(page).evaluate((el) => el.getBoundingClientRect().toJSON());
      if (width < 640) {
        // The first screen: the pinned rank and team, then wins, losses, percentage and points for.
        for (const label of ["W", "L", "PCT", "PF"]) {
          const box = await header(label).evaluate((el) => el.getBoundingClientRect().toJSON());
          expect(box.right).toBeLessThanOrEqual(bounds.right + 1);
        }
      }
      expect(await header("GP").evaluate((el) => el.getBoundingClientRect().width > 0)).toBe(width >= 640);

      // The rank sits close to the crest, and the wins value keeps some air next to the pinned edge.
      // The pinned columns animate their width for a moment after the window is resized.
      await page.waitForTimeout(400);
      const rest = await measureTable(page);
      if (width < 640) expect(rest.rankToCrest).toBeLessThan(12);
      // The stat numbers are slightly smaller on a phone.
      expect(rest.statSize).toBe(width < 640 ? "12px" : "14px");
      expect(rest.winsFromPinnedEdge).toBeGreaterThanOrEqual(8);

      // Swiping the stats leaves the rank and crest where they are. On a phone the team column follows the finger: it is
      // partway narrowed with the name half faded halfway through the swipe, and down to the crest with more columns showing
      // at the end. From 640px the team column stays as it is (a collapse there would leave the table narrower than its box).
      const swipeTo = (x) =>
        scroller(page).evaluate((el, left) => {
          el.scrollLeft = left;
        }, x);
      if (width < 640) {
        await swipeTo(18);
        await expect.poll(async () => (await measureTable(page)).scrolled).toBe(18);
        // The scroll handler runs a frame after the scroll position changes.
        await expect.poll(async () => (await measureTable(page)).teamWidth).toBeLessThan(rest.teamWidth - 20);
        const partway = await measureTable(page);
        expect(partway.teamWidth).toBeGreaterThan(50);
        expect(partway.teamWidth).toBeLessThan(rest.teamWidth - 20);
        expect(Number(partway.nameOpacity)).toBeGreaterThan(0);
        expect(Number(partway.nameOpacity)).toBeLessThan(1);

        await swipeTo(100);
        await expect.poll(async () => (await measureTable(page)).scrolled).toBeGreaterThan(36);
        await expect.poll(async () => (await measureTable(page)).teamWidth).toBeLessThanOrEqual(40);
        const away = await measureTable(page);
        expect(away.rankLeft).toBe(0);
        expect(away.teamLeft).toBeGreaterThanOrEqual(30);
        expect(away.nameOpacity).toBe("0");
        expect(away.crestInside).toBe(true);
        expect(away.reach).toBeGreaterThan(rest.reach);
        if (away.tier !== null) expect(away.tier).toBeGreaterThanOrEqual(0);
        await swipeTo(0);
        await expect.poll(async () => (await measureTable(page)).teamWidth).toBe(rest.teamWidth);
        await expect.poll(async () => (await measureTable(page)).nameOpacity).toBe("1");
      } else {
        await swipeTo(300);
        await page.waitForTimeout(400);
        const away = await measureTable(page);
        expect(away.scrolled).toBeGreaterThan(24);
        expect(away.rankLeft).toBe(0);
        expect(away.teamWidth).toBe(rest.teamWidth);
        expect(away.nameOpacity).toBe("1");
        await scroller(page).evaluate((el) => {
          el.scrollLeft = 0;
        });
      }
    });

    await atWidths(page, [1280, 1440], async () => {
      const cells = table(page).locator("tbody tr:not(.tier-row)").first().locator("td");
      expect(await cells.evaluateAll((els) => els.slice(0, 2).map((el) => getComputedStyle(el).position))).toEqual(["static", "static"]);
      expect(await table(page).locator("thead th").count()).toBe(14);
      expect(await header("GP").evaluate((el) => el.getBoundingClientRect().width > 0)).toBe(true);
    });
  });
}

test("the Q badge sits on the rank circle's corner on a phone, in front of the team cell", async ({ page }) => {
  await openStandings(page, FINISHED);
  await atWidths(page, [320], async () => {
    const rankCells = table(page).locator("tbody tr:not(.tier-row) td:first-child");
    expect(await rankCells.count()).toBeGreaterThan(8);
    // The rank circle stays inside its cell (the Q badge overhangs its corner on purpose).
    expect(
      await rankCells.evaluateAll(
        (els) =>
          els.filter((el) => {
            const circle = el.querySelector(".rank").getBoundingClientRect();
            const cell = el.getBoundingClientRect();
            return circle.left < cell.left - 0.5 || circle.right > cell.right + 0.5;
          }).length,
      ),
    ).toBe(0);
    const badges = table(page).locator(".badge", { hasText: "Q" });
    expect(await badges.count()).toBeGreaterThan(3);
    await badges.nth(3).evaluate((el) => el.scrollIntoView({ block: "center" }));
    // The badge sits over the rank circle's corner, on top of the team cell next to it.
    expect(
      await badges.nth(3).evaluate((el) => {
        const box = el.getBoundingClientRect();
        const topmost = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return box.width > 0 && (topmost === el || el.contains(topmost));
      }),
    ).toBe(true);
  });
});

test("a club shows its short name below 640px and its full name from 640px, and the link keeps the full name", async ({ page }) => {
  await openStandings(page);
  const links = table(page).locator("tbody tr:not(.tier-row) td:nth-child(2) a");
  const names = () =>
    links.evaluateAll((els) =>
      els.map((a) => {
        const shown = [...a.querySelectorAll("span")].find((span) => span.getBoundingClientRect().width > 0);
        return { shown: shown?.textContent.trim() ?? "", full: a.getAttribute("aria-label") ?? a.textContent.trim() };
      }),
    );

  await atWidths(page, [320, 639], async () => {
    // The short names arrive with the teams list, after the table.
    await expect.poll(async () => (await names()).filter((entry) => entry.shown !== entry.full).length).toBeGreaterThan(0);
    const entries = await names();
    for (const entry of entries) {
      expect(entry.shown.length).toBeGreaterThan(0);
      expect(entry.shown.length).toBeLessThanOrEqual(entry.full.length);
    }
    await expect(links.first()).toHaveAccessibleName(entries[0].full);
  });

  await atWidths(page, [640, 1280], async () => {
    const entries = await names();
    for (const entry of entries) expect(entry.shown).toBe(entry.full);
    await expect(links.first()).toHaveAccessibleName(entries[0].full);
  });
});

test("the table still shows full names, and no error, when the teams list cannot load", async ({ page }) => {
  await page.route(/\/api\/seasons\/[^/]+\/teams(\?.*)?$/, (route) => route.abort());
  await openStandings(page);
  await atWidths(page, [320], async () => {
    const rows = table(page).locator("tbody tr:not(.tier-row)");
    expect(await rows.count()).toBeGreaterThan(10);
    const names = await rows.locator("td:nth-child(2) a").evaluateAll((els) => els.slice(0, 3).map((a) => a.textContent.trim()));
    for (const name of names) expect(name.length).toBeGreaterThan(8);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
