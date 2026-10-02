import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi, shot } from "./support/game-fixtures";

// One attempt per zone for Team A, at the coordinates the spec lists, then two Restricted-area attempts for Team B and
// one shot without a location. Restricted area and Right wing 3 are made.
const ZONE_SHOTS = [
  ["Restricted area", "2FGM", 0, 50],
  ["In the paint", "2FGA", 200, 300],
  ["Left corner mid-range", "2FGA", -400, 100],
  ["Left wing mid-range", "2FGA", -350, 350],
  ["Central mid-range", "2FGA", 0, 500],
  ["Right wing mid-range", "2FGA", 350, 350],
  ["Right corner mid-range", "2FGA", 400, 100],
  ["Left corner 3", "3FGA", -700, 50],
  ["Left wing 3", "3FGA", -500, 480],
  ["Top of the key 3", "3FGA", 100, 700],
  ["Right wing 3", "3FGM", 500, 480],
  ["Right corner 3", "3FGA", 700, 50],
  ["Deep 3", "3FGA", 0, 950],
  ["Backcourt", "3FGA", 300, 1250],
];

const ZONE_NAMES = ZONE_SHOTS.map(([zone]) => zone);

function allShots() {
  return [
    ...ZONE_SHOTS.map(([, action, x, y], index) => shot(index + 1, "A", action, x, y)),
    shot(20, "B", "2FGM", 0, 40),
    shot(21, "B", "2FGA", 10, 60),
    shot(22, "A", "2FGA", -1, -1),
  ];
}

async function openShooting(page, options = {}) {
  await mockGameApi(page, { shots: allShots(), ...options });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zone comparison" })).toBeVisible();
}

const court = (page) => page.getByRole("img", { name: /Shot chart/ });
const zoneRow = (page, zone) => page.locator("tbody tr").filter({ has: page.getByRole("cell", { name: zone, exact: true }) });

test("the court is a landscape FIBA half court that scales with the window", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openShooting(page);

  // One SVG unit per centimetre: 14 m from baseline to half court, a 1 m backcourt strip and margins, 15 m across.
  await expect(court(page)).toHaveAttribute("viewBox", "-177.5 -770 1555 1540");
  for (const width of [1600, 1280, 600]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await court(page).boundingBox();
    expect(box.width).toBeLessThanOrEqual(1555);
    expect(box.width).toBeLessThanOrEqual(width);
    expect(box.width / box.height).toBeCloseTo(1555 / 1540, 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  // At its widest the court is drawn at one pixel per centimetre, never more.
  await page.setViewportSize({ width: 2400, height: 1200 });
  expect((await court(page).boundingBox()).width).toBeLessThanOrEqual(1555);
});

test("each zone of the table gets its own shot", async ({ page }) => {
  await openShooting(page);

  await expect(page.locator("tbody tr")).toHaveCount(15);
  expect(await page.locator("tbody tr td:first-child").allTextContents()).toEqual([...ZONE_NAMES, "Location unknown"]);
  for (const zone of ZONE_NAMES) {
    // Team A took one of its 14 located shots in each zone.
    await expect(zoneRow(page, zone).locator("td").nth(1)).toHaveText("7.1%");
  }
  await expect(zoneRow(page, "Restricted area").locator("td").nth(2)).toContainText("100.0%");
  await expect(zoneRow(page, "Right wing 3").locator("td").nth(2)).toContainText("100.0%");
  await expect(zoneRow(page, "Deep 3").locator("td").nth(2)).toContainText("0.0%");

  // Team B took two shots in the Restricted area and none elsewhere: a share, and dashes without attempts.
  await expect(zoneRow(page, "Restricted area").locator("td").nth(3)).toHaveText("100.0%");
  await expect(zoneRow(page, "Restricted area").locator("td").nth(4)).toContainText("50.0%");
  await expect(zoneRow(page, "In the paint").locator("td").nth(3)).toHaveText("—");
  await expect(zoneRow(page, "In the paint").locator("td").nth(4)).toHaveText("—");
});

test("a shot is drawn with the hoop on the left and the shooter's right at the top", async ({ page }) => {
  await mockGameApi(page, {
    shots: [shot(1, "A", "2FGM", 350, 350), shot(2, "A", "2FGM", -350, 350), shot(3, "A", "2FGM", 0, 50)],
  });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  const centre = async (zone, attribute) => Number(await court(page).locator(`[data-zone="${zone}"] circle`).first().getAttribute(attribute));
  // Distance from the baseline runs to the right; the right wing is above the left wing.
  expect(await centre("Right wing mid-range", "cx")).toBe(350);
  expect(await centre("Right wing mid-range", "cy")).toBe(-350);
  expect(await centre("Left wing mid-range", "cx")).toBe(350);
  expect(await centre("Left wing mid-range", "cy")).toBe(350);
  expect(await centre("Restricted area", "cx")).toBe(50);
  expect(await centre("Restricted area", "cy")).toBe(0);
});

test("a shot past half court sits on the half-court line and says where it was taken", async ({ page }) => {
  await mockGameApi(page, { shots: [shot(1, "A", "3FGM", 100, 1300)] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  const marker = court(page).locator('[data-zone="Backcourt"]');
  await expect(marker.locator("circle")).toHaveAttribute("cx", "1242.5");
  await expect(marker.locator("circle")).toHaveAttribute("cy", "-100");
  const title = await marker.locator("title").textContent();
  expect(title).toContain("ONE, AL");
  expect(title).toContain("Made 3PT");
  expect(title).toContain("Backcourt");
  expect(title).toContain("13.0 m from the basket");
  expect(title).toContain("past the half-court line, 14.6 m from the baseline");
});

test("a shot without a location is counted, not drawn", async ({ page }) => {
  await openShooting(page);

  // 17 attempts, one of them without a location.
  await expect(page.getByText("16 plotted · 1 without location")).toBeVisible();
  await expect(court(page).locator("[data-zone]")).toHaveCount(16);
  await expect(zoneRow(page, "Location unknown").locator("td").nth(1)).toHaveText("1");
  await expect(zoneRow(page, "Location unknown").locator("td").nth(2)).toHaveText("—");
});

test("the table follows the filters", async ({ page }) => {
  await openShooting(page);
  await expect(zoneRow(page, "Left corner 3").locator("td").nth(1)).toHaveText("7.1%");

  await page.getByLabel("Result").selectOption({ label: "Made" });
  // Only Team A's two makes are left: a share of 50% each, and dashes everywhere else.
  await expect(zoneRow(page, "Left corner 3").locator("td").nth(1)).toHaveText("—");
  await expect(zoneRow(page, "Restricted area").locator("td").nth(1)).toHaveText("50.0%");
  await expect(zoneRow(page, "Right wing 3").locator("td").nth(1)).toHaveText("50.0%");
});

test("shot type and result filters exist on the shot map only", async ({ page }) => {
  await openShooting(page);
  await expect(page.getByLabel("Shot type")).toBeVisible();
  await expect(page.getByLabel("Result")).toBeVisible();

  for (const mode of ["Zone heatmap", "Shooting comparison"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    await expect(page.getByLabel("Period")).toBeVisible();
    await expect(page.getByLabel("Shot type")).toHaveCount(0);
    await expect(page.getByLabel("Result")).toHaveCount(0);
  }
});

test("a result filter set on the shot map does not reach the heatmap", async ({ page }) => {
  await openShooting(page);
  await page.getByLabel("Result").selectOption({ label: "Made" });
  await expect(zoneRow(page, "Left corner 3").locator("td").nth(1)).toHaveText("—");

  await page.getByRole("tab", { name: "Zone heatmap", exact: true }).click();
  // Misses are back: every zone with a shot is shaded and the table shows all of Team A's shots again.
  await expect(court(page).locator("[data-zone]")).toHaveCount(14);
  await expect(zoneRow(page, "Left corner 3").locator("td").nth(1)).toHaveText("7.1%");

  await page.getByRole("tab", { name: "Shot map", exact: true }).click();
  await expect(page.getByLabel("Result")).toHaveValue("made");
});

test("the zone heatmap shades each zone with attempts and labels it with made over attempts", async ({ page }) => {
  await openShooting(page);
  await page.getByRole("tab", { name: "Zone heatmap", exact: true }).click();

  // Thirteen court regions and the backcourt strip, each with an attempt; no markers.
  await expect(court(page).locator("[data-zone]")).toHaveCount(14);
  await expect(court(page).locator('path[data-zone="Restricted area"] title')).toHaveText("Restricted area · 2-3 (66.7%)");
  await expect(court(page).locator('rect[data-zone="Backcourt"] title')).toHaveText("Backcourt · 0-1 (0.0%)");
  // Team A's make plus Team B's make and miss in the Restricted area: 2 of 3.
  await expect(court(page).getByText("2/3", { exact: true })).toBeVisible();
  await expect(court(page).getByText("67%", { exact: true })).toBeVisible();
  // The strip is labelled, there is no watermark, and the zone table stays below the court.
  await expect(court(page).getByText("BACKCOURT", { exact: true })).toBeVisible();
  await expect(court(page).getByText("FIBA HALF COURT")).toHaveCount(0);
  const courtBox = await court(page).boundingBox();
  const tableBox = await page.getByRole("heading", { name: "Zone comparison" }).boundingBox();
  expect(tableBox.y).toBeGreaterThan(courtBox.y + courtBox.height);
});

test("a zone without attempts is left empty on the heatmap", async ({ page }) => {
  await mockGameApi(page, { shots: [shot(1, "A", "2FGM", 0, 50)] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await page.getByRole("tab", { name: "Zone heatmap", exact: true }).click();

  await expect(court(page).locator("[data-zone]")).toHaveCount(1);
  await expect(court(page).getByText("1/1", { exact: true })).toBeVisible();
});

test("the court shrinks to fit the window height", async ({ page }) => {
  for (const height of [700, 1200]) {
    await page.setViewportSize({ width: 1600, height });
    await openShooting(page);
    const box = await court(page).boundingBox();
    expect(box.height).toBeLessThanOrEqual(height * 0.9 + 1);
    expect(box.width / box.height).toBeCloseTo(1555 / 1540, 2);
  }
});

test("the zone table spans the whole panel", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openShooting(page);

  const panel = await page.getByRole("heading", { name: "Zone comparison" }).locator("xpath=ancestor::div[contains(@class, 'panel')][1]").boundingBox();
  const table = await page.locator("table").boundingBox();
  expect(table.width).toBeGreaterThan(panel.width - 40);
});

test("the Shooting tab offers the shot map, the zone heatmap and the team comparison only", async ({ page }) => {
  await openShooting(page);

  const tabs = page.getByRole("tablist", { name: "Shooting presentation" }).getByRole("tab");
  await expect(tabs).toHaveText(["Shot map", "Zone heatmap", "Shooting comparison"]);
});

test("a game without shots says so", async ({ page }) => {
  await mockGameApi(page, { shots: [] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  await expect(page.getByText("Shot data isn't available for this game yet.")).toBeVisible();
});
