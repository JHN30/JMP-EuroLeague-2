import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// The finished season has the Q-less but longest tables; the live season is the one in progress.
const FINISHED = "2025";

const VIEWS = ["Overview", "Ratings", "Four factors", "Schedule", "Splits"];

// Each test loads the Advanced tab once and resizes the window through its widths: the layout depends on the viewport only.
async function openAdvanced(page, season, view = "Overview") {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Advanced" }).click();
  await pickView(page, view);
}

// Below 640px the views are a select, from it a tab strip.
async function pickView(page, view) {
  if (page.viewportSize().width < 640) await page.getByRole("combobox", { name: "View" }).selectOption({ label: view });
  else await page.getByRole("tablist", { name: "Advanced standings view" }).getByRole("tab", { name: view }).click();
  await expect(page.locator("#advanced-standings-panel table").first()).toBeVisible({ timeout: 30_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const table = (page) => page.locator("#advanced-standings-panel table").first();

// The team column of the first row, and whether the first two cells of every row (and of both header rows) are sticky.
const measure = (el) =>
  el.evaluate((tableEl) => {
    const box = tableEl.parentElement;
    const cell = tableEl.querySelector("tbody tr td:nth-child(2)");
    const name = [...cell.querySelectorAll("a span")].find((span) => span.getBoundingClientRect().width > 0);
    const crest = cell.querySelector("img")?.getBoundingClientRect();
    const rank = tableEl.querySelector("tbody tr td:first-child").getBoundingClientRect();
    const sticky = (rows) => rows.every((row) => [...row.children].slice(0, 2).every((c) => getComputedStyle(c).position === "sticky"));
    return {
      scrolled: Math.round(box.scrollLeft),
      overflow: box.scrollWidth - box.clientWidth,
      rankLeft: Math.round(rank.left - box.getBoundingClientRect().left),
      teamWidth: Math.round(cell.getBoundingClientRect().width),
      nameOpacity: name ? Number(getComputedStyle(name).opacity) : null,
      crestInside: crest ? crest.right <= cell.getBoundingClientRect().right + 0.5 : true,
      stickyHead: sticky([...tableEl.querySelectorAll("thead tr")]),
      stickyBody: sticky([...tableEl.querySelectorAll("tbody tr")]),
      staticBody: [...tableEl.querySelectorAll("tbody tr")].every((row) => [...row.children].slice(0, 2).every((c) => getComputedStyle(c).position === "static")),
    };
  });

const swipeTo = (el, x) =>
  el.evaluate((tableEl, left) => {
    tableEl.parentElement.scrollLeft = left;
  }, x);

for (const view of VIEWS) {
  for (const season of [undefined, FINISHED]) {
    test(`${view}${season ? " (finished season)" : ""}: the rank and crest stay pinned, the team folds away as it is swiped, and the page does not scroll sideways`, async ({ page }) => {
      await openAdvanced(page, season, view);

      await atWidths(page, [320, 390, 768], async (width) => {
        await page.waitForTimeout(300);
        const rest = await measure(table(page));
        expect(rest.stickyHead).toBe(true);
        expect(rest.stickyBody).toBe(true);
        expect(rest.teamWidth).toBeGreaterThan(width < 640 ? 70 : 200);

        if (width < 640 && rest.overflow >= 80) {
          await swipeTo(table(page), 18);
          await expect.poll(async () => (await measure(table(page))).scrolled).toBe(18);
          await expect.poll(async () => (await measure(table(page))).teamWidth).toBeLessThan(rest.teamWidth - 20);
          const partway = await measure(table(page));
          expect(partway.nameOpacity).toBeGreaterThan(0);
          expect(partway.nameOpacity).toBeLessThan(1);

          await swipeTo(table(page), 100);
          await expect.poll(async () => (await measure(table(page))).teamWidth).toBeLessThanOrEqual(40);
          const away = await measure(table(page));
          expect(away.nameOpacity).toBe(0);
          expect(away.crestInside).toBe(true);
          expect(away.rankLeft).toBe(0);

          await swipeTo(table(page), 0);
          await expect.poll(async () => (await measure(table(page))).teamWidth).toBe(rest.teamWidth);
          expect((await measure(table(page))).nameOpacity).toBe(1);
        } else if (width >= 640 && rest.overflow > 60) {
          // A table that hardly overflows (Schedule at 768px) has nothing to swipe to.
          await swipeTo(table(page), 300);
          await expect.poll(async () => (await measure(table(page))).scrolled).toBeGreaterThan(36);
          const away = await measure(table(page));
          expect(away.teamWidth).toBe(rest.teamWidth);
          expect(away.nameOpacity).toBe(1);
          expect(away.rankLeft).toBe(0);
          await swipeTo(table(page), 0);
        }
        if (width < 640) expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
      });

      // From xl the tables fit their box and nothing is pinned; the Splits table is still too wide until 86rem (1376px).
      await atWidths(page, [1280, 1440], async (width) => {
        const state = await measure(table(page));
        if (view === "Splits" && width < 1376) {
          expect(state.stickyBody).toBe(true);
        } else {
          expect(state.staticBody).toBe(true);
          expect(state.overflow).toBeLessThanOrEqual(0);
        }
      });
    });
  }
}

test("the advanced table shows short names below 640px and full names from it, and the link keeps the full name", async ({ page }) => {
  await openAdvanced(page, undefined, "Overview");
  const links = table(page).locator("tbody tr td:nth-child(2) a");
  const names = () =>
    links.evaluateAll((els) =>
      els.map((a) => ({
        shown: [...a.querySelectorAll("span")].find((span) => span.getBoundingClientRect().width > 0)?.textContent.trim() ?? "",
        full: a.getAttribute("aria-label") ?? a.textContent.trim(),
      })),
    );

  await atWidths(page, [320, 639], async () => {
    await expect.poll(async () => (await names()).filter((entry) => entry.shown !== entry.full).length).toBeGreaterThan(0);
    for (const entry of await names()) expect(entry.shown.length).toBeLessThanOrEqual(entry.full.length);
    await expect(links.first()).toHaveAccessibleName((await names())[0].full);
  });
  await atWidths(page, [640, 1280], async () => {
    for (const entry of await names()) expect(entry.shown).toBe(entry.full);
  });
});

test("the advanced table still shows full names, and no error, when the teams list cannot load", async ({ page }) => {
  await page.route(/\/api\/seasons\/[^/]+\/teams(\?.*)?$/, (route) => route.abort());
  await openAdvanced(page, undefined, "Overview");
  await atWidths(page, [320], async () => {
    const names = await table(page)
      .locator("tbody tr td:nth-child(2) a")
      .evaluateAll((els) => els.slice(0, 3).map((a) => a.textContent.trim()));
    for (const name of names) expect(name.length).toBeGreaterThan(8);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test("the Net bar fits between the pinned crest and the edge on a phone, the Splits dot chart is left out there, and it keeps its size from 640px", async ({ page }) => {
  await openAdvanced(page, FINISHED, "Overview");
  const room = () => table(page).evaluate((el) => el.parentElement.clientWidth - 2 * 36);

  await atWidths(page, [320, 390], async () => {
    const net = await table(page).locator(".net-cell").first().evaluate((el) => el.closest("td").getBoundingClientRect().width);
    expect(net).toBeLessThanOrEqual(await room());
  });

  await pickView(page, "Splits");
  await atWidths(page, [320, 390], async () => {
    // Below 640px the dot chart is left out: the home and away figures are the numbers beside it.
    await expect(table(page).locator(".home-away-link").first()).toBeHidden();
    const heads = await table(page).locator("thead tr").last().locator("th").evaluateAll((ths) => ths.filter((th) => th.getBoundingClientRect().width > 0).map((th) => th.textContent.trim().replace(/ \(.*$/, "")));
    expect(heads.slice(2, 7)).toEqual(["Home W-L", "Away W-L", "Home Net", "Away Net", "Home adv"]);
    // A record never breaks at its hyphen.
    const records = await table(page).locator("tbody tr td.whitespace-nowrap").evaluateAll((tds) => tds.slice(0, 40).filter((td) => /^\d+-\d+$/.test(td.textContent.trim())).map((td) => td.getBoundingClientRect().height));
    expect(Math.max(...records)).toBeLessThan(80);
    // Each group's heading spans exactly the columns shown.
    const spans = await table(page).evaluate((el) => [...el.querySelectorAll("thead tr:first-child th")].filter((th) => th.getBoundingClientRect().width > 0 && th.textContent.trim()).map((th) => [th.textContent.trim(), th.colSpan]));
    expect(spans).toEqual([["Home and away", 5], ["Recent form", 4]]);
  });
  await atWidths(page, [768, 1440], async () => {
    expect(await table(page).locator(".home-away-link").first().evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(240);
  });
});

test("the ratings scatter fits a phone, with small crests, and a tap shows a club's numbers", async ({ page }) => {
  await openAdvanced(page, FINISHED, "Ratings");
  const scatter = page.getByRole("img", { name: "Offensive rating against defensive rating for every club" });

  await atWidths(page, [320, 390], async (width) => {
    await expect(scatter).toBeVisible();
    const box = await scatter.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const radius = await scatter.locator("g[role=img] circle").first().evaluate((circle) => Number(circle.getAttribute("r")));
    expect(radius).toBeLessThan(13);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });

    const crest = scatter.locator("g[role=img]").first();
    await crest.focus();
    await expect(scatter.locator("text", { hasText: /^ORtg / })).toBeVisible();
  });
  await atWidths(page, [768], async () => {
    const radius = await scatter.locator("g[role=img] circle").first().evaluate((circle) => Number(circle.getAttribute("r")));
    expect(radius).toBe(13);
  });
});

test("the controls and notes stay inside the screen on a phone", async ({ page }) => {
  await openAdvanced(page, FINISHED, "Overview");
  await atWidths(page, [320, 390], async (width) => {
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    for (const locator of [
      page.getByRole("combobox", { name: "Scope" }),
      page.getByRole("combobox", { name: "Round" }),
      page.getByRole("combobox", { name: "View" }),
    ]) {
      const box = await locator.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  });
});
