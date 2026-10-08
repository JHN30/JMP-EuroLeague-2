import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// The finished season has the Q badges; the live season is the season in progress.
const FINISHED = "2025";

const VIEWS = [
  { name: "Streaks and form", label: "Streaks and form", tables: 1 },
  { name: "Winning margins", label: "Winning margins", tables: 3 },
  { name: "Ahead/behind, net points per quarter", label: "Ahead/behind", tables: 2 },
];

// Each test loads the page once and resizes the window through its widths: the layout depends on the viewport only.
async function openBreakdown(page, season, label) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole("combobox", { name: "Breakdown" }).selectOption({ label });
  await expect(page.locator("main table.breakdown-table").first()).toBeVisible({ timeout: 30_000 });
}

// Below 640px the breakdowns are options of the View select, from it of the Breakdown select.
async function pickBreakdown(page, label) {
  const name = page.viewportSize().width < 640 ? "View" : "Breakdown";
  await page.getByRole("combobox", { name }).selectOption({ label });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const tables = (page) => page.locator("main table.breakdown-table");

// The team column of the first row: its width and what it shows, and whether the crest sits inside it.
const measureTeam = (table) =>
  table.evaluate((el) => {
    const box = el.parentElement;
    const cell = el.querySelector("tbody tr td:nth-child(2)");
    const name = [...cell.querySelectorAll("a span")].find((span) => span.getBoundingClientRect().width > 0);
    const crest = cell.querySelector("img")?.getBoundingClientRect();
    const rank = el.querySelector("tbody tr td:first-child").getBoundingClientRect();
    return {
      scrolled: Math.round(box.scrollLeft),
      rankLeft: Math.round(rank.left - box.getBoundingClientRect().left),
      teamWidth: Math.round(cell.getBoundingClientRect().width),
      nameOpacity: name ? Number(getComputedStyle(name).opacity) : null,
      crestInside: crest ? crest.right <= cell.getBoundingClientRect().right + 0.5 : true,
      positions: [...el.querySelectorAll("tbody tr")[0].querySelectorAll("td")].slice(0, 2).map((td) => getComputedStyle(td).position),
    };
  });

const swipeTo = (table, x) =>
  table.evaluate((el, left) => {
    el.parentElement.scrollLeft = left;
  }, x);

// Words of a shown name that the browser had to cut across two lines (a multi-word name may wrap at its spaces).
const splitWords = (links) =>
  links.evaluateAll((els) => {
    const split = [];
    for (const a of els) {
      const span = [...a.querySelectorAll("span")].find((el) => el.getBoundingClientRect().width > 0);
      const node = span?.firstChild;
      if (!node) continue;
      let index = 0;
      for (const word of node.textContent.split(/(\s+)/)) {
        if (word.trim()) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + word.length);
          if (range.getClientRects().length > 1) split.push(word);
        }
        index += word.length;
      }
    }
    return split;
  });

for (const { name, label, tables: count } of VIEWS) {
  for (const season of [undefined, FINISHED]) {
    test(`${name}${season ? " (finished season)" : ""}: the rank and crest stay pinned, the team folds away as it is swiped, and the page does not scroll sideways`, async ({ page }) => {
      await openBreakdown(page, season, label);
      await expect(tables(page)).toHaveCount(count);

      await atWidths(page, [320, 390, 768], async (width) => {
        await page.waitForTimeout(300);
        for (let index = 0; index < count; index++) {
          const table = tables(page).nth(index);
          const rest = await measureTeam(table);
          expect(rest.positions).toEqual(["sticky", "sticky"]);
          expect(rest.teamWidth).toBeGreaterThan(width < 640 ? 70 : 200);

          // A table that hardly overflows (the expected-wins table, now three numbers) does not collapse at all.
          const overflow = await table.evaluate((el) => el.parentElement.scrollWidth - el.parentElement.clientWidth);
          if (width < 640 && overflow < 80) {
            // It is left uncollapsed: the column must not stop half way, whatever the swipe.
            await swipeTo(table, 9999);
            await page.waitForTimeout(300);
            const end = await measureTeam(table);
            expect(end.teamWidth).toBe(rest.teamWidth);
            expect(end.nameOpacity).toBe(1);
            await swipeTo(table, 0);
            continue;
          }
          if (width < 640) {
            // Partway through the swipe the team column is narrower and the name is half faded; at the end it is the crest alone.
            await swipeTo(table, 18);
            await expect.poll(async () => (await measureTeam(table)).scrolled).toBe(18);
            // The scroll handler runs a frame after the scroll position changes.
            await expect.poll(async () => (await measureTeam(table)).teamWidth).toBeLessThan(rest.teamWidth - 20);
            const partway = await measureTeam(table);
            expect(partway.teamWidth).toBeLessThan(rest.teamWidth - 20);
            expect(partway.teamWidth).toBeGreaterThan(40);
            expect(partway.nameOpacity).toBeGreaterThan(0);
            expect(partway.nameOpacity).toBeLessThan(1);

            await swipeTo(table, 100);
            await expect.poll(async () => (await measureTeam(table)).scrolled).toBeGreaterThan(36);
            await expect.poll(async () => (await measureTeam(table)).teamWidth).toBeLessThanOrEqual(40);
            const away = await measureTeam(table);
            expect(away.nameOpacity).toBe(0);
            expect(away.crestInside).toBe(true);
            expect(away.rankLeft).toBe(0);

            await swipeTo(table, 0);
            await expect.poll(async () => (await measureTeam(table)).teamWidth).toBe(rest.teamWidth);
            expect((await measureTeam(table)).nameOpacity).toBe(1);
          } else {
            await swipeTo(table, 300);
            await expect.poll(async () => (await measureTeam(table)).scrolled).toBeGreaterThan(36);
            const away = await measureTeam(table);
            expect(away.teamWidth).toBe(rest.teamWidth);
            expect(away.nameOpacity).toBe(1);
            expect(away.rankLeft).toBe(0);
            await swipeTo(table, 0);
          }
        }
        if (width < 640) expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      });

      // From xl the tables fit their box and nothing is pinned.
      await atWidths(page, [1280, 1440], async () => {
        for (let index = 0; index < count; index++) {
          expect((await measureTeam(tables(page).nth(index))).positions).toEqual(["static", "static"]);
          expect(await tables(page).nth(index).evaluate((el) => el.parentElement.scrollWidth - el.parentElement.clientWidth)).toBeLessThanOrEqual(0);
        }
      });
    });
  }
}

test("the breakdown tables show short names below 640px and full names from it, and the link keeps the full name", async ({ page }) => {
  await openBreakdown(page, undefined, "Winning margins");
  const links = page.locator("main table.breakdown-table tbody tr td:nth-child(2) a");
  const names = () =>
    links.evaluateAll((els) =>
      els.map((a) => {
        const shown = [...a.querySelectorAll("span")].find((span) => span.getBoundingClientRect().width > 0);
        return { shown: shown?.textContent.trim() ?? "", full: a.getAttribute("aria-label") ?? a.textContent.trim() };
      }),
    );

  await atWidths(page, [320, 639], async () => {
    await expect.poll(async () => (await names()).filter((entry) => entry.shown !== entry.full).length).toBeGreaterThan(0);
    for (const entry of await names()) expect(entry.shown.length).toBeLessThanOrEqual(entry.full.length);
    expect(await splitWords(links)).toEqual([]);
    await expect(links.first()).toHaveAccessibleName((await names())[0].full);
  });
  await atWidths(page, [640, 1280], async () => {
    for (const entry of await names()) expect(entry.shown).toBe(entry.full);
  });
});

test("the breakdown tables still show full names, and no error, when the teams list cannot load", async ({ page }) => {
  await page.route(/\/api\/seasons\/[^/]+\/teams(\?.*)?$/, (route) => route.abort());
  await openBreakdown(page, undefined, "Streaks and form");
  await atWidths(page, [320], async () => {
    const names = await page.locator("main table.breakdown-table tbody tr td:nth-child(2) a").evaluateAll((els) => els.slice(0, 3).map((a) => a.textContent.trim()));
    for (const name of names) expect(name.length).toBeGreaterThan(8);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

// What a column needs to be seen whole on a phone: it must fit between the pinned crest and the right edge of the box.
test("the season strips and bars fit between the pinned crest and the edge on a phone, and long headers wrap", async ({ page }) => {
  await openBreakdown(page, FINISHED, "Winning margins");
  const columnFits = (selector) =>
    page.locator(`main table.breakdown-table ${selector}`).first().evaluate((el) => {
      const cell = el.closest("td");
      const room = cell.closest(".standings-scroll").clientWidth - 2 * 36;
      return { width: Math.round(cell.getBoundingClientRect().width), room };
    });

  await atWidths(page, [320, 390], async () => {
    const strip = await columnFits(".margin-strip");
    expect(strip.width).toBeLessThanOrEqual(strip.room);
    // "Biggest win" and "Biggest loss" stack over two lines instead of widening their columns.
    const heads = await tables(page).first().locator("thead th").evaluateAll((ths) => ths.map((th) => ({ text: th.textContent.trim(), width: th.getBoundingClientRect().width, height: th.getBoundingClientRect().height })));
    const biggestWin = heads.find((head) => head.text.startsWith("Biggest win"));
    expect(biggestWin.width).toBeLessThan(80);
    expect(biggestWin.height).toBeGreaterThan(heads[0].height - 1);

    // The expected-wins table shows wins, expected wins and the difference as numbers; the dot chart is for wider screens.
    const expected = tables(page).nth(1);
    const shown = await expected.locator("thead th").evaluateAll((ths) => ths.filter((th) => th.getBoundingClientRect().width > 0).map((th) => th.textContent.trim().replace(/\(.*$/, "").trim()));
    expect(shown.slice(2)).toEqual(["Wins", "Expected", "Diff"]);
    await expect(expected.locator(".viz-svg").first()).toBeHidden();
  });
  await atWidths(page, [640, 1280], async () => {
    const expected = tables(page).nth(1);
    await expect(expected.locator("tbody .viz-svg").first()).toBeVisible();
    await expect(expected.locator("thead th", { hasText: "Diff" })).toBeHidden();
  });

  await pickBreakdown(page, "Streaks and form");
  await expect(tables(page).first().locator(".results-ribbon").first()).toBeVisible();
  await atWidths(page, [320, 390], async () => {
    const ribbon = await columnFits(".results-ribbon");
    expect(ribbon.width).toBeLessThanOrEqual(ribbon.room);
  });

  await pickBreakdown(page, "Ahead/behind");
  await page.getByRole("tab", { name: "Net points per quarter" }).click();
  await expect(tables(page).first()).toBeVisible();
});
