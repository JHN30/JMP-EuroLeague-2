import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// The finished season has the most scopes and rounds; the live season is the one in progress.
const FINISHED = "2025";

async function openStandings(page, season) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/standings`);
  await expect(page.locator("main table tbody tr").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".loading")).toHaveCount(0, { timeout: 15_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const optionTexts = (select) => select.locator("option").allTextContents();
const insideViewport = async (locator, width) => {
  const box = await locator.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.height).toBeGreaterThanOrEqual(32);
};

test("the Table tab has one View select below 640px with the views and breakdowns, and the tabs from 640px", async ({ page }) => {
  await openStandings(page, FINISHED);
  const viewSelect = page.getByRole("combobox", { name: "View" });
  const breakdownSelect = page.getByRole("combobox", { name: "Breakdown" });
  const viewTabs = page.getByRole("tablist", { name: "Standings view" });

  await atWidths(page, [320, 390, 639], async (width) => {
    await expect(viewSelect).toBeVisible();
    await expect(viewTabs).toBeHidden();
    await expect(breakdownSelect).toBeHidden();
    expect(await optionTexts(viewSelect)).toEqual(["Overall", "Home", "Away", "Last 10", "Streaks and form", "Winning margins", "Ahead/behind"]);
    await insideViewport(viewSelect, width);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
  });

  // The label's text starts where the tab text above it starts.
  const textLeft = (locator) =>
    locator.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return Math.round(range.getBoundingClientRect().left);
    });
  await atWidths(page, [320, 390], async () => {
    const tabText = await textLeft(page.getByRole("tablist", { name: "Standings display" }).getByRole("tab").first());
    expect(await textLeft(page.locator("main label", { hasText: "View" }).locator("span"))).toBe(tabText);
  });

  // Each choice does what the tab or the breakdown did.
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await viewSelect.selectOption({ label: "Home" });
  await expect(page.locator("main table").first().locator("thead th", { hasText: "PCT" })).toBeVisible();
  await viewSelect.selectOption({ label: "Winning margins" });
  await expect(page.locator("main table.breakdown-table").first()).toBeVisible();
  await viewSelect.selectOption({ label: "Overall" });
  await expect(page.locator("main table.breakdown-table")).toHaveCount(0);

  // The selection survives a resize, both ways.
  await viewSelect.selectOption({ label: "Away" });
  await atWidths(page, [1280], async () => {
    await expect(viewSelect).toBeHidden();
    await expect(viewTabs.getByRole("tab", { name: "Away" })).toHaveAttribute("aria-selected", "true");
    await expect(breakdownSelect).toBeVisible();
    await breakdownSelect.selectOption({ label: "Streaks and form" });
    await expect(page.locator("main table.breakdown-table").first()).toBeVisible();
  });
  await atWidths(page, [320], async () => {
    await expect(viewSelect).toHaveValue("streaks");
  });
  await atWidths(page, [640, 768], async () => {
    await expect(viewSelect).toBeHidden();
    await expect(breakdownSelect).toBeVisible();
    await expect(breakdownSelect).toHaveValue("streaks");
  });
});

test("the Round and Breakdown labels keep the tab text's half-rem inset when they wrap onto a row of their own", async ({ page }) => {
  await openStandings(page, FINISHED);
  // A tab strip insets its text by 0.5rem (index.css); the labels beside it carry the same 0.5rem margin, so a label that
  // wraps under the tabs starts where the tab text starts. Below 640px the labels are not shown (the selects replace them).
  const margin = (locator) => locator.evaluate((el) => getComputedStyle(el).marginInlineStart);
  await atWidths(page, [640, 1024, 1280], async () => {
    expect(await margin(page.locator("main label", { hasText: "Breakdown" }))).toBe("8px");
  });
  await page.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.locator("#advanced-standings-panel table").first()).toBeVisible({ timeout: 30_000 });
  await atWidths(page, [640, 1024, 1280], async () => {
    expect(await margin(page.locator("main label", { hasText: "Round" }).filter({ visible: true }))).toBe("8px");
  });
});

test("the Advanced tab has a Scope and Round row and one View select below 640px, and the tabs from 640px", async ({ page }) => {
  await openStandings(page, FINISHED);
  await page.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.locator("#advanced-standings-panel table").first()).toBeVisible({ timeout: 30_000 });
  const scope = page.getByRole("combobox", { name: "Scope" });
  const round = page.getByRole("combobox", { name: "Round" });
  const view = page.getByRole("combobox", { name: "View" });
  const scopeTabs = page.getByRole("tablist", { name: "Advanced standings scope" });
  const viewTabs = page.getByRole("tablist", { name: "Advanced standings view" });

  await atWidths(page, [320, 390, 639], async (width) => {
    await expect(scope).toBeVisible();
    await expect(round).toBeVisible();
    await expect(view).toBeVisible();
    await expect(scopeTabs).toBeHidden();
    await expect(viewTabs).toBeHidden();
    expect(await optionTexts(view)).toEqual(["Overview", "Ratings", "Four factors", "Schedule", "Splits", "Explained"]);
    // Scope and Round share a row; the View select is under them.
    const [scopeBox, roundBox, viewBox] = await Promise.all([scope.boundingBox(), round.boundingBox(), view.boundingBox()]);
    expect(Math.abs(scopeBox.y - roundBox.y)).toBeLessThan(2);
    expect(viewBox.y).toBeGreaterThan(scopeBox.y + scopeBox.height - 1);
    for (const select of [scope, round, view]) await insideViewport(select, width);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
  });

  // Each of the six views, and a scope change that resets the round.
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await view.selectOption({ label: "Ratings" });
  await expect(page.getByRole("img", { name: "Offensive rating against defensive rating for every club" })).toBeVisible();
  await view.selectOption({ label: "Explained" });
  await expect(page.locator("table.explained-table")).toBeVisible();
  await view.selectOption({ label: "Splits" });
  await expect(page.locator("#advanced-standings-panel table").first().locator("thead th", { hasText: "Home adv" })).toBeVisible();
  const scopes = await optionTexts(scope);
  expect(scopes.length).toBeGreaterThan(0);
  if (scopes.length > 1) {
    await scope.selectOption({ index: 1 });
    await expect(page.locator("#advanced-standings-panel table").first()).toBeVisible();
    const rounds = await round.locator("option").evaluateAll((options) => options.map((option) => option.value));
    await expect(round).toHaveValue(rounds[rounds.length - 1]);
    await scope.selectOption({ index: 0 });
  }

  // The choice survives widening, and the tabs take over.
  await view.selectOption({ label: "Schedule" });
  await atWidths(page, [640, 1280], async () => {
    await expect(scope).toBeHidden();
    await expect(view).toBeHidden();
    await expect(viewTabs.getByRole("tab", { name: "Schedule" })).toHaveAttribute("aria-selected", "true");
    await expect(scopeTabs).toBeVisible();
    await expect(round).toBeVisible();
  });
});
