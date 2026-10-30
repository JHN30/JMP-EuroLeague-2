import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi, shot } from "./support/game-fixtures";

// One attempt per zone for Team A, at the coordinates the spec lists, then two Restricted-area attempts for Team B and
// one shot without a location. Restricted area and Right wing 3 are made.
const ZONE_SHOTS = [
  ["Restricted area", "2FGM", 0, 50],
  ["In the paint", "2FGA", 200, 300],
  ["Left corner mid-range", "2FGA", 400, 100],
  ["Left wing mid-range", "2FGA", 350, 350],
  ["Central mid-range", "2FGA", 0, 500],
  ["Right wing mid-range", "2FGA", -350, 350],
  ["Right corner mid-range", "2FGA", -400, 100],
  ["Left corner 3", "3FGA", 700, 50],
  ["Left wing 3", "3FGA", 500, 480],
  ["Top of the key 3", "3FGA", 100, 700],
  ["Right wing 3", "3FGM", -500, 480],
  ["Right corner 3", "3FGA", -700, 50],
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

const zoneRow = (page, zone) => page.locator("tbody tr").filter({ has: page.getByRole("cell", { name: zone, exact: true }) });

// Team A's court is the first on the page, Team B's the second; the shot map and the zones each have their own.
const court = (page, side = 0) => page.getByRole("img", { name: /Shot chart, / }).nth(side);
const zoneCourt = (page, side = 0) => page.getByRole("img", { name: /Shooting zones, / }).nth(side);
const openZones = (page) => page.getByRole("tab", { name: "Shooting zones", exact: true }).click();

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

test("each zone has its own shot on Team A's court, and Team B's court shades only its zone", async ({ page }) => {
  await openShooting(page);
  await openZones(page);

  await expect(zoneCourt(page).locator("[data-zone]")).toHaveCount(14);
  for (const zone of ZONE_NAMES) {
    await expect(zoneCourt(page).locator(`[data-zone="${zone}"]`)).toHaveCount(1);
  }
  await expect(zoneCourt(page).locator('path[data-zone="Restricted area"] title')).toHaveText("Restricted area · 1-1 (100.0%)");
  await expect(zoneCourt(page).locator('path[data-zone="Right wing 3"] title')).toHaveText("Right wing 3 · 1-1 (100.0%)");
  await expect(zoneCourt(page).locator('path[data-zone="Deep 3"] title')).toHaveText("Deep 3 · 0-1 (0.0%)");

  // Team B took two shots in the Restricted area and none elsewhere.
  await expect(zoneCourt(page, 1).locator("[data-zone]")).toHaveCount(1);
  await expect(zoneCourt(page, 1).locator('path[data-zone="Restricted area"] title')).toHaveText("Restricted area · 1-2 (50.0%)");
});

test("each zone of the table gets its own shot", async ({ page }) => {
  await openShooting(page);

  // The zones in three groups, each under its heading and closed by its subtotal.
  const zones = page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Zone comparison" }) });
  expect(await zones.locator("tbody tr th").allTextContents()).toEqual(["Paint", "Mid-range", "Threes"]);
  expect(await zones.locator("tbody tr td:first-child").allTextContents()).toEqual([
    ...ZONE_NAMES.slice(0, 2), "Paint total",
    ...ZONE_NAMES.slice(2, 7), "Mid-range total",
    ...ZONE_NAMES.slice(7), "Threes total",
    "Location unknown",
  ]);
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
  // The feed's negative x is the shooter's right, as on EuroLeague's own chart.
  await mockGameApi(page, {
    shots: [shot(1, "A", "2FGM", -400, 300), shot(2, "A", "2FGM", 400, 300), shot(3, "A", "2FGM", 0, 50)],
  });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  const marker = (ordinal) => court(page).locator(".court-marker").nth(ordinal);
  const centre = async (ordinal, attribute) => Number(await marker(ordinal).locator("circle").getAttribute(attribute));
  // Distance from the baseline runs to the right; the shooter's right is the top half, the shooter's left the bottom.
  expect(await centre(0, "cx")).toBe(300);
  expect(await centre(0, "cy")).toBe(-400);
  expect(await marker(0).getAttribute("data-zone")).toContain("Right");
  expect(await centre(1, "cx")).toBe(300);
  expect(await centre(1, "cy")).toBe(400);
  expect(await marker(1).getAttribute("data-zone")).toContain("Left");
  expect(await centre(2, "cx")).toBe(50);
  expect(await centre(2, "cy")).toBe(0);

  // The zone regions use the same mapping: the shooter's right zones fill the top half.
  await openZones(page);
  const zoneBox = async (zone) => zoneCourt(page).locator(`path[data-zone="${zone}"]`).boundingBox();
  const svgBox = await zoneCourt(page).boundingBox();
  expect((await zoneBox("Right wing mid-range")).y + (await zoneBox("Right wing mid-range")).height).toBeLessThanOrEqual(svgBox.y + svgBox.height / 2 + 1);
  expect((await zoneBox("Left wing mid-range")).y).toBeGreaterThanOrEqual(svgBox.y + svgBox.height / 2 - 1);
});

test("a shot past half court sits on the half-court line and says where it was taken", async ({ page }) => {
  await mockGameApi(page, { shots: [shot(1, "A", "3FGM", 100, 1300)] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  const marker = court(page).locator('[data-zone="Backcourt"]');
  await expect(marker.locator("circle")).toHaveAttribute("cx", "1242.5");
  await expect(marker.locator("circle")).toHaveAttribute("cy", "100");
  const title = await marker.locator("title").textContent();
  expect(title).toContain("ONE, AL");
  expect(title).toContain("Made 3PT");
  expect(title).toContain("Backcourt");
  expect(title).toContain("13.0 m from the basket");
  expect(title).toContain("past the half-court line, 14.6 m from the baseline");
});

test("a shot without a location is not drawn", async ({ page }) => {
  await openShooting(page);

  // 17 attempts, one of them without a location: Team A has 14 drawn and Team B 2.
  await expect(court(page).locator("[data-zone]")).toHaveCount(14);
  await expect(court(page, 1).locator("[data-zone]")).toHaveCount(2);
  await expect(zoneRow(page, "Location unknown").locator("td").nth(1)).toHaveText("1");
});

test("both teams' courts follow the filters", async ({ page }) => {
  await openShooting(page);
  await page.getByLabel("Result").selectOption({ label: "Made" });
  // Team A's two makes and Team B's one.
  await expect(court(page).locator("[data-zone]")).toHaveCount(2);
  await expect(court(page, 1).locator("[data-zone]")).toHaveCount(1);
});

test("the table follows the filters", async ({ page }) => {
  await openShooting(page);
  await expect(zoneRow(page, "Left corner 3").locator("td").nth(1)).toHaveText("7.1%");

  await page.getByLabel("Result").selectOption({ label: "Made" });
  // Only Team A's two makes are left: a share of 50% each; the zones nobody scored from are left out.
  await expect(zoneRow(page, "Left corner 3")).toHaveCount(0);
  await expect(zoneRow(page, "Restricted area").locator("td").nth(1)).toHaveText("50.0%");
  await expect(zoneRow(page, "Right wing 3").locator("td").nth(1)).toHaveText("50.0%");
});

test("shot type and result filters exist on the shot map only", async ({ page }) => {
  await openShooting(page);
  await expect(page.getByLabel("Shot type")).toBeVisible();
  await expect(page.getByLabel("Result")).toBeVisible();

  for (const mode of ["Shooting zones"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    await expect(page.getByLabel("Period")).toBeVisible();
    await expect(page.getByLabel("Shot type")).toHaveCount(0);
    await expect(page.getByLabel("Result")).toHaveCount(0);
  }
});

test("a result filter set on the shot map does not reach the zones", async ({ page }) => {
  await openShooting(page);
  await page.getByLabel("Result").selectOption({ label: "Made" });
  await expect(court(page).locator("[data-zone]")).toHaveCount(2);

  await openZones(page);
  // Misses are back: every zone with a shot is shaded.
  await expect(zoneCourt(page).locator("[data-zone]")).toHaveCount(14);

  await page.getByRole("tab", { name: "Shot map", exact: true }).click();
  await expect(page.getByLabel("Result")).toHaveValue("made");
});

test("the zones shade each zone with attempts and label it with made over attempts", async ({ page }) => {
  await openShooting(page);
  await openZones(page);

  // Thirteen court regions and the backcourt strip, each with an attempt; no markers.
  await expect(zoneCourt(page).locator("[data-zone]")).toHaveCount(14);
  await expect(zoneCourt(page).locator('rect[data-zone="Backcourt"] title')).toHaveText("Backcourt · 0-1 (0.0%)");
  // A court this small labels its zones with the percentage only; the tooltip above carries made over attempts.
  await expect(zoneCourt(page, 1).getByText("50%", { exact: true })).toBeVisible();
  // The strip is labelled and there is no watermark.
  await expect(zoneCourt(page).getByText("BACKCOURT", { exact: true })).toBeVisible();
  await expect(zoneCourt(page).getByText("FIBA HALF COURT")).toHaveCount(0);
});

test("a zone without attempts is left empty on the heatmap", async ({ page }) => {
  await mockGameApi(page, { shots: [shot(1, "A", "2FGM", 0, 50)] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await openZones(page);

  await expect(zoneCourt(page).locator("[data-zone]")).toHaveCount(1);
  await expect(zoneCourt(page).getByText("100%", { exact: true })).toBeVisible();
});

test("both teams' panels sit side by side and fit one screen once the courts are scrolled up under the stuck filter box", async ({ page }) => {
  for (const height of [900, 1080]) {
    await page.setViewportSize({ width: 1280, height });
    await openShooting(page);
    for (const show of [() => page.getByRole("tab", { name: "Shot map", exact: true }).click(), () => openZones(page)]) {
      await show();
      await page.evaluate(() => window.scrollTo(0, 0));
      // The courts' box 16px under the filter box once it sticks under the nav.
      await page.evaluate(() => {
        const bar = document.querySelector(".shooting-filters");
        const courts = document.getElementById("shooting-presentation-panel").closest(".panel");
        const stuckBottom = parseFloat(getComputedStyle(bar).top) + bar.offsetHeight;
        window.scrollBy(0, courts.getBoundingClientRect().top - stuckBottom - 16);
      });
      const panels = page.locator("#shooting-presentation-panel .panel");
      const [first, second] = await Promise.all([panels.nth(0).boundingBox(), panels.nth(1).boundingBox()]);
      expect(Math.abs(first.y - second.y)).toBeLessThan(2);
      expect(second.x).toBeGreaterThan(first.x + first.width - 1);
      expect(first.y + first.height).toBeLessThanOrEqual(height);
    }
  }
});

test("the zone table spans the whole panel", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openShooting(page);

  const panel = await page.getByRole("heading", { name: "Zone comparison" }).locator("xpath=ancestor::div[contains(@class, 'panel')][1]").boundingBox();
  const table = await page.locator(".panel", { has: page.getByRole("heading", { name: "Zone comparison" }) }).locator("table").boundingBox();
  expect(table.width).toBeGreaterThan(panel.width - 40);
});

test("the Shooting tab offers the shot map and the shooting zones only", async ({ page }) => {
  await openShooting(page);

  const tabs = page.getByRole("tablist", { name: "Shooting presentation" }).getByRole("tab");
  await expect(tabs).toHaveText(["Shot map", "Shooting zones"]);
});

test("a game without shots says so", async ({ page }) => {
  await mockGameApi(page, { shots: [] });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();

  await expect(page.getByText("Shot data isn't available for this game yet.")).toBeVisible();
});

test("each court's header adds the box score's free throws and the paint points, and each team has its own player list", async ({ page }) => {
  await openShooting(page);
  const header = (side) => court(page, side).locator("xpath=ancestor::div[contains(@class, 'panel')][1]");
  // Free throws come from the box score: Team A 9-9, Team B 6-8.
  await expect(header(0)).toContainText("9-9 (100.0%)");
  await expect(header(1)).toContainText("6-8 (75.0%)");
  // One made Restricted-area shot each.
  await expect(header(0).locator("div", { has: page.locator(".header-tip-label", { hasText: /^Paint pts/ }) }).last()).toContainText("2");
  await header(0).locator(".header-tip-label", { hasText: "FT" }).hover();
  await expect(page.getByRole("tooltip")).toContainText("Free throws come from the box score");

  // One list per team, home first, and each narrows only its own team's court.
  const homeList = page.getByLabel("A player", { exact: true });
  const roadList = page.getByLabel("B player", { exact: true });
  expect(await homeList.locator("option").allTextContents()).toEqual(["All players", "ONE, AL"]);
  expect(await roadList.locator("option").allTextContents()).toEqual(["All players", "UNO, BO"]);
  const homeCourt = await court(page, 0).getAttribute("aria-label");
  const roadCourt = await court(page, 1).getAttribute("aria-label");
  await roadList.selectOption({ label: "UNO, BO" });
  await expect(homeList).toHaveValue("all");
  await expect(court(page, 0)).toHaveAttribute("aria-label", homeCourt);
  await homeList.selectOption({ label: "ONE, AL" });
  await expect(roadList).toHaveValue("B-STARTER");
  await expect(court(page, 1)).toHaveAttribute("aria-label", roadCourt);
  // The shared filters still apply to both courts.
  await page.getByLabel("Result", { exact: true }).selectOption("made");
  await expect(court(page, 0)).not.toHaveAttribute("aria-label", homeCourt);
  await expect(court(page, 1)).not.toHaveAttribute("aria-label", roadCourt);
});

test("the quarter and play-context tables split the shots, and the context table counts baskets, not FG%", async ({ page }) => {
  const shots = [
    shot(1, "A", "2FGM", 0, 50, { minute: 4, fastbreak: true }),
    shot(2, "A", "2FGA", 0, 60, { minute: 6 }),
    shot(3, "A", "3FGM", 500, 480, { minute: 25, pointsOffTurnover: true }),
    shot(4, "B", "2FGM", 0, 40, { minute: 7, secondChance: true }),
    shot(5, "B", "3FGM", -500, 480, { minute: 28, secondChance: true }),
  ];
  await openShooting(page, { shots });

  const quarters = page.locator(".panel", { has: page.getByRole("heading", { name: "Shooting by quarter" }) });
  expect(await quarters.locator("tbody tr td:first-child").allTextContents()).toEqual(["Q1", "Q3"]);
  await expect(quarters.locator("tbody tr").first()).toContainText("1-2");
  await expect(quarters.locator("tbody tr").nth(1)).toContainText("1-1");

  const contexts = page.locator(".panel", { has: page.getByRole("heading", { name: "Fast breaks, second chances and turnovers" }) });
  const contextRow = (label) => contexts.locator("tbody tr", { has: page.getByRole("cell", { name: label, exact: true }) });
  // Team A: one fast-break two and one three off a turnover; Team B: a two and a three on second chances.
  await expect(contextRow("Fast breaks").locator("td")).toHaveText(["Fast breaks", "1", "2 (more)", "0", "0"]);
  await expect(contextRow("Second chances").locator("td")).toHaveText(["Second chances", "0", "0", "2", "5 (more)"]);
  await expect(contextRow("Off turnovers").locator("td")).toHaveText(["Off turnovers", "1", "3 (more)", "0", "0"]);
  await expect(contexts.getByText("%")).toHaveCount(0);
});

test("each player's shooting lists who shot, and a name picks that player in their team's list until it is chosen again", async ({ page }) => {
  await openShooting(page);
  const players = page.locator("section", { has: page.getByRole("heading", { name: "Each player's shooting" }) });
  const name = players.getByRole("button", { name: "ONE, AL" });
  // Team A's player took 15 shots, the one without a location included; 2 went in.
  await expect(players.locator("tr", { has: page.getByRole("button", { name: "ONE, AL" }) })).toContainText("2-15");
  await expect(players.getByRole("button", { name: "UNO, BO" })).toBeVisible();

  const roadCourt = await court(page, 1).getAttribute("aria-label");
  await name.click();
  await expect(page.getByLabel("A player", { exact: true })).toHaveValue("A-STARTER");
  await expect(name).toHaveAttribute("aria-pressed", "true");
  // Team B keeps every player.
  await expect(page.getByLabel("B player", { exact: true })).toHaveValue("all");
  await expect(court(page, 1)).toHaveAttribute("aria-label", roadCourt);

  await name.click();
  await expect(page.getByLabel("A player", { exact: true })).toHaveValue("all");
  await expect(name).toHaveAttribute("aria-pressed", "false");
});
