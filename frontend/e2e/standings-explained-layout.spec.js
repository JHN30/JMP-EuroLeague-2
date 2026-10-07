import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// The finished season has the longest tables; the live season is the one in progress.
const FINISHED = "2025";

// Each test loads the Explained view once and resizes the window through its widths: the layout depends on the viewport only.
async function openExplained(page, season) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Advanced" }).click();
  await page.getByRole("tablist", { name: "Advanced standings view" }).getByRole("tab", { name: "Explained" }).click();
  await expect(page.locator("table.explained-table")).toBeVisible({ timeout: 30_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

// Where every statistic's blocks are, against the table: its name block, its explanation and its picture.
const measureRows = (page) =>
  page.locator("table.explained-table").evaluate((table) => {
    const box = table.getBoundingClientRect();
    const rows = [...table.querySelectorAll("tbody tr:not(.explained-section)")].map((row) => {
      const name = row.querySelector("td.explained-name").getBoundingClientRect();
      const body = row.querySelector(".explained-body").getBoundingClientRect();
      const text = row.querySelector(".explained-text").getBoundingClientRect();
      const visual = row.querySelector(".explained-visual").getBoundingClientRect();
      const pictures = [...row.querySelectorAll(".explained-visual svg, .explained-visual .waffle")].map((el) => el.getBoundingClientRect());
      return {
        below: body.top >= name.bottom - 1,
        beside: body.left >= name.right - 1 && Math.abs(body.top - name.top) < 40,
        nameWidth: Math.round(name.width),
        left: Math.round(name.left - box.left),
        // The explanation is as wide as the table less the cell's padding.
        full: body.width > box.width - 64 && body.right <= box.right + 1,
        pictureBelowText: visual.top >= text.bottom - 1,
        picturesInside: pictures.every((rect) => rect.right <= box.right + 1 && rect.left >= box.left - 1),
      };
    });
    const sections = [...table.querySelectorAll("tr.explained-section td")].map((td) => Math.abs(td.getBoundingClientRect().width - box.width) < 2);
    // Hidden on a phone by clipping the header group to one pixel (its text stays for screen readers).
    const headBox = table.querySelector("thead").getBoundingClientRect();
    return { rows, sections, headVisible: headBox.width > 4 && headBox.height > 4, scroll: table.parentElement.scrollWidth - table.parentElement.clientWidth };
  });

for (const season of [undefined, FINISHED]) {
  test(`${season ? "finished" : "live"} season: each statistic is stacked below 640px and a two-column table from it`, async ({ page }) => {
    await openExplained(page, season);

    await atWidths(page, [320, 390, 639], async () => {
      await page.waitForTimeout(300);
      const state = await measureRows(page);
      expect(state.rows.length).toBeGreaterThan(10);
      for (const row of state.rows) {
        expect(row.below).toBe(true);
        expect(row.left).toBe(0);
        expect(row.full).toBe(true);
        expect(row.pictureBelowText).toBe(true);
        expect(row.picturesInside).toBe(true);
      }
      expect(state.sections.every(Boolean)).toBe(true);
      expect(state.headVisible).toBe(false);
      expect(state.scroll).toBeLessThanOrEqual(0);
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });

    await atWidths(page, [640, 768, 1280], async () => {
      const state = await measureRows(page);
      for (const row of state.rows) {
        expect(row.beside).toBe(true);
        expect(row.nameWidth).toBe(224);
      }
      expect(state.headVisible).toBe(true);
    });
  });
}

test("the header labels stay in the accessibility tree while hidden on a phone, and the Example team select fits", async ({ page }) => {
  await openExplained(page, FINISHED);
  await atWidths(page, [320, 390], async (width) => {
    await expect(page.locator("table.explained-table thead th", { hasText: "Statistic" })).toHaveCount(1);
    const select = page.getByRole("combobox", { name: "Example team" });
    const box = await select.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await select.selectOption({ index: 3 });
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    await select.selectOption({ index: 0 });
  });
});
