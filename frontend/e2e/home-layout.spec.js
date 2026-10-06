import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug } from "./support/layout";

async function openHome(page, width) {
  await page.setViewportSize({ width, height: HEIGHT });
  const season = await seasonSlug(page);
  await page.goto(`/${season}/home`);
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible();
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 15_000 });
}

const panel = (page, title) => page.locator("section", { has: page.getByRole("heading", { name: title }) });
const top = (locator) => locator.evaluate((element) => element.getBoundingClientRect().top);

// How far the card nearest the row's centre is from it, and which card that is.
const nearestCard = (row) =>
  row.evaluate((element) => {
    const middle = element.getBoundingClientRect().left + element.clientWidth / 2;
    const offsets = [...element.children].map((card) => {
      const box = card.getBoundingClientRect();
      return Math.abs(box.left + box.width / 2 - middle);
    });
    const best = Math.min(...offsets);
    return { index: offsets.indexOf(best), offset: Math.round(best) };
  });

test.describe("panel padding", () => {
  for (const { width, padding } of [
    { width: 390, padding: "16px" },
    { width: 640, padding: "20px" },
    { width: 1024, padding: "24px" },
  ]) {
    test(`is ${padding} at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      await expect(panel(page, "League table")).toHaveCSS("padding-left", padding);
      await expect(panel(page, "Upcoming games")).toHaveCSS("padding-left", padding);
    });
  }
});

test.describe("standings", () => {
  for (const width of [390, 768, 1023]) {
    test(`show every row at natural height at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      const list = panel(page, "League table").getByRole("list");
      await expect(list.getByRole("listitem").first()).toBeVisible();
      await expect(list).toHaveCSS("overflow-y", "visible");
      await expect.poll(() => list.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
    });
  }

  for (const width of [1024, 1280]) {
    test(`match the results panel height and scroll inside at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      const standings = panel(page, "League table");
      const results = panel(page, "Latest scores");
      await expect(standings.getByRole("list")).toHaveCSS("overflow-y", "auto");
      await expect
        .poll(async () => Math.abs((await standings.boundingBox()).height - (await results.boundingBox()).height))
        .toBeLessThanOrEqual(1);
    });
  }
});

test.describe("KPI strip", () => {
  for (const width of [320, 390, 639, 640, 768, 1023, 1279]) {
    test(`is a 2x2 grid between the latest scores and the leaders at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      const strip = page.getByTestId("home-kpi-strip");
      const chips = strip.locator(".kpi-chip");
      await expect(chips).toHaveCount(4);
      const boxes = await chips.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(2);
      expect(new Set(boxes.map((box) => Math.round(box.left))).size).toBe(2);
      expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
      expect(await findBrokenWords(strip.locator(".name"))).toEqual([]);

      const resultsBottom = await panel(page, "Latest scores").evaluate((el) => el.getBoundingClientRect().bottom);
      const standingsBottom = await panel(page, "League table").evaluate((el) => el.getBoundingClientRect().bottom);
      const stripBox = await strip.evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(stripBox.top).toBeGreaterThanOrEqual(Math.max(resultsBottom, standingsBottom) - 1);
      expect(await top(page.getByRole("group", { name: /leaders$/ }).first())).toBeGreaterThanOrEqual(stripBox.bottom - 1);
    });
  }

  test("is four across at 1280px", async ({ page }) => {
    await openHome(page, 1280);
    const boxes = await page.getByTestId("home-kpi-strip").locator(".kpi-chip").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
    expect(new Set(boxes.map((box) => Math.round(box.left))).size).toBe(4);
  });
});

test.describe("swipe rows below 640px", () => {
  for (const width of [320, 390]) {
    for (const { name, group } of [
      { name: "upcoming games", group: /^Upcoming games$/ },
      { name: "leader cards", group: /leaders$/ },
    ]) {
      test.describe(`${name} at ${width}px`, () => {
        test("start and end on the panel's content edge with the neighbouring card peeking out", async ({ page }) => {
          await openHome(page, width);
          const row = page.getByRole("group", { name: group }).first();
          await expect(row).toHaveCSS("scroll-snap-type", "x mandatory");
          await expect(row).toHaveAttribute("tabindex", "0");

          const geometry = await row.evaluate((el) => {
            const panelStyle = getComputedStyle(el.closest("section"));
            const panelBox = el.closest("section").getBoundingClientRect();
            const edge = parseFloat(panelStyle.paddingLeft) + parseFloat(panelStyle.borderLeftWidth);
            const [first, second] = [...el.children].map((card) => card.getBoundingClientRect());
            return {
              contentLeft: panelBox.left + edge,
              contentWidth: panelBox.width - 2 * edge,
              rowRight: el.getBoundingClientRect().right,
              first: first.toJSON(),
              second: second.toJSON(),
            };
          });
          expect(Math.abs(geometry.first.left - geometry.contentLeft)).toBeLessThanOrEqual(1);
          expect(geometry.first.width / geometry.contentWidth).toBeGreaterThan(0.8);
          expect(geometry.first.width / geometry.contentWidth).toBeLessThan(0.9);
          expect(geometry.rowRight - geometry.second.left).toBeGreaterThan(20);
          expect(geometry.second.left - geometry.first.right).toBeLessThanOrEqual(12);

          await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
          await expect
            .poll(() =>
              row.evaluate((el) => {
                const panelStyle = getComputedStyle(el.closest("section"));
                const edge = parseFloat(panelStyle.paddingRight) + parseFloat(panelStyle.borderRightWidth);
                const last = el.lastElementChild.getBoundingClientRect();
                return Math.abs(Math.round(el.closest("section").getBoundingClientRect().right - edge - last.right));
              }),
            )
            .toBe(0);
        });

        test("settle on a centred card after a scroll and after ArrowRight", async ({ page }) => {
          await openHome(page, width);
          const row = page.getByRole("group", { name: group }).first();
          await row.evaluate((el) => el.scrollTo({ left: 150, behavior: "instant" }));
          await expect.poll(async () => (await nearestCard(row)).offset).toBeLessThanOrEqual(2);

          await row.evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
          await row.focus();
          await page.keyboard.press("ArrowRight");
          await expect.poll(async () => nearestCard(row)).toEqual({ index: 1, offset: 0 });
        });
      });
    }
  }
});

test.describe("rows from 640px", () => {
  for (const width of [640, 768]) {
    test(`do not snap or take a tab stop at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      for (const group of [/^Upcoming games$/, /leaders$/]) {
        const row = page.getByRole("group", { name: group }).first();
        await expect(row).toHaveCSS("scroll-snap-type", "none");
        await expect(row).not.toHaveAttribute("tabindex", /.*/);
      }
    });
  }

  test("leader cards are two columns at 768px", async ({ page }) => {
    await openHome(page, 768);
    const cards = await page.getByRole("group", { name: /leaders$/ }).first().evaluate((el) => [...el.children].map((card) => Math.round(card.getBoundingClientRect().left)));
    expect(new Set(cards).size).toBe(2);
  });
});

test.describe("latest scores", () => {
  const cards = (page) => panel(page, "Latest scores").getByRole("link");

  test("show five and a Show more button below 640px", async ({ page }) => {
    await openHome(page, 390);
    await expect(cards(page)).toHaveCount(5);
    const more = page.getByRole("button", { name: "Show 5 more" });
    await expect(more).toHaveAttribute("aria-expanded", "false");

    await more.click();
    await expect(cards(page)).toHaveCount(10);
    const fewer = page.getByRole("button", { name: "Show fewer" });
    await expect(fewer).toHaveAttribute("aria-expanded", "true");

    await fewer.click();
    await expect(cards(page)).toHaveCount(5);
  });

  for (const width of [640, 768, 1280]) {
    test(`show all ten with no button at ${width}px`, async ({ page }) => {
      await openHome(page, width);
      await expect(cards(page)).toHaveCount(10);
      await expect(page.getByRole("button", { name: /^Show (\d+ more|fewer)$/ })).toBeHidden();
    });
  }
});

test.describe("form trend", () => {
  const stat = (page) => page.getByText(/^Avg point diff/);
  const chart = (page) => page.getByRole("img", { name: /^Point differential per game/ });

  test("puts the stat above the chart at 639px and beside it at 640px", async ({ page }) => {
    await openHome(page, 639);
    const above = { stat: await stat(page).boundingBox(), chart: await chart(page).boundingBox() };
    expect(above.stat.y + above.stat.height).toBeLessThanOrEqual(above.chart.y + 1);

    await page.setViewportSize({ width: 640, height: HEIGHT });
    await expect
      .poll(async () => {
        const beside = { stat: await stat(page).boundingBox(), chart: await chart(page).boundingBox() };
        return beside.stat.x + beside.stat.width <= beside.chart.x + 1;
      })
      .toBe(true);
  });
});
