import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi, shot } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", tvCode: "PAO", crestUrl: crest };
const CZV = { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", tvCode: "CZV", crestUrl: crest };
const LONG_NAME = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI";

// Shots over the four quarters and one overtime (minute 45), for both teams, one with a very long name and one without a location.
function allShots() {
  const rows = [];
  const spots = [[0, 50, "2FGM"], [200, 300, "2FGA"], [-500, 480, "3FGM"], [100, 700, "3FGA"], [-400, 100, "2FGA"], [350, 350, "2FGM"]];
  let ordinal = 1;
  for (const minute of [3, 15, 25, 35, 45]) {
    for (const club of ["A", "B"]) {
      for (const [x, y, action] of spots) {
        rows.push(shot(ordinal++, club, action, x, y, { minute, ...(club === "A" && x === 0 ? { playerName: LONG_NAME, personCode: "A-LONG" } : {}) }));
      }
    }
  }
  rows.push(shot(ordinal, "A", "2FGA", -1, -1));
  return rows;
}

async function openShooting(page, { shots = allShots(), game = {} } = {}) {
  await mockGameApi(page, { shots });
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({
      json: {
        game: {
          gameCode: 1,
          played: true,
          phaseName: "Regular season",
          roundNumber: 12,
          scheduledAt: "2025-01-01T18:00:00Z",
          localTeam: PAN,
          roadTeam: CZV,
          localScore: 112,
          roadScore: 101,
          ...game,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Shooting", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Shooting", exact: true })).toHaveAttribute("aria-selected", "true");
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoPageOverflow = (page) => expect.poll(async () => (await findPageOverflow(page)).offenders).toEqual([]);

// Whether everything inside each matched element sits inside its box. What a strip scrolls on its own is left out.
const holdsContent = (locator) =>
  locator.evaluateAll((elements) =>
    elements.every((el) => {
      const box = el.getBoundingClientRect();
      const scrolled = (child) => {
        for (let node = child.parentElement; node && node !== el; node = node.parentElement) if (getComputedStyle(node).overflowX !== "visible") return true;
        return false;
      };
      return [...el.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || scrolled(child) || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const studio = (page) => page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Shooting studio" }) });
const filtersButton = (page) => page.getByRole("button", { name: /^Filters/ });
const select = (page, name) => page.getByRole("combobox", { name, exact: true });
const mode = (page, name) => page.getByRole("tab", { name, exact: true }).click();
const boxOf = (locator) =>
  locator.evaluate((el) => {
    const { top, bottom, left, right } = el.getBoundingClientRect();
    return { top, bottom, left, right };
  });

test("the header has no status badge, the mode strip is one row below 640px, and nothing overflows", async ({ page }) => {
  await openShooting(page);
  const modes = page.getByRole("tablist", { name: "Shooting presentation" });
  await expect(page.getByRole("heading", { name: "Shooting studio" })).toBeVisible();

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    expect(await holdsContent(studio(page))).toBe(true);
    await expect(studio(page).locator(".stat-badge")).toHaveCount(0);
    // One row that scrolls inside its own box: every mode on the same line.
    const tops = await modes.getByRole("tab").evaluateAll((tabs) => tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await studio(page).evaluate((el) => getComputedStyle(el).paddingTop)).toBe("12px");
  });
  await atWidths(page, [640, 768, 1024], async () => {
    await expectNoPageOverflow(page);
    await expect(studio(page).locator(".stat-badge")).toHaveCount(0);
    await expect(filtersButton(page)).toBeHidden();
  });
});

test("below 640px the filters sit behind one button that counts the changed ones, and they keep working when it is closed", async ({ page }) => {
  await openShooting(page);
  await atWidths(page, [390], async () => {
    await expect(filtersButton(page)).toHaveText(/^Filters\s*▾?$/);
    await expect(filtersButton(page)).toHaveAttribute("aria-expanded", "false");
    await expect(select(page, "Team")).toBeHidden();
    await filtersButton(page).click();
    await expect(filtersButton(page)).toHaveAttribute("aria-expanded", "true");

    // Team and Player take a line each; Shot type and Result share one in two columns.
    const [team, player, shotType, result, context] = await Promise.all(
      ["Team", "Player", "Shot type", "Result", "Play context"].map((name) => boxOf(select(page, name))),
    );
    expect(player.top).toBeGreaterThan(team.bottom - 1);
    expect(Math.abs(shotType.top - result.top)).toBeLessThan(2);
    expect(result.left).toBeGreaterThan(shotType.right);
    expect(context.top).toBeGreaterThan(shotType.bottom - 1);

    await select(page, "Team").selectOption({ label: CZV.name });
    await select(page, "Shot type").selectOption("3");
    await expect(filtersButton(page)).toContainText("2 active");
    await filtersButton(page).click();
    await expect(select(page, "Team")).toBeHidden();
    await expect(filtersButton(page)).toContainText("2 active");
    await expect(page.getByRole("img", { name: /Shot chart: 10 of/ })).toBeVisible();
  });
  await atWidths(page, [320], async () => {
    await filtersButton(page).click();
    const [shotType, result] = await Promise.all(["Shot type", "Result"].map((name) => boxOf(select(page, name))));
    expect(result.top).toBeGreaterThan(shotType.bottom - 1);
    expect(await holdsContent(studio(page))).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("the Period select is left out on a phone for the map and the heatmap, where the quarter buttons do its job, and kept for the comparison", async ({ page }) => {
  await openShooting(page);
  await atWidths(page, [390], async () => {
    await filtersButton(page).click();
    await expect(select(page, "Period")).toBeHidden();
    await mode(page, "Zone heatmap");
    await expect(select(page, "Period")).toBeHidden();
    await mode(page, "Shooting comparison");
    await expect(select(page, "Period")).toBeVisible();
    await expect(select(page, "Team")).toHaveCount(0);
    await mode(page, "Shot map");
  });
  await atWidths(page, [768, 1280], async () => {
    for (const name of ["Team", "Player", "Shot type", "Period", "Result", "Play context"]) await expect(select(page, name)).toBeVisible();
  });
});

test("the quarter buttons share one row with no scrolling, with short labels below 640px and full ones from 640px", async ({ page }) => {
  // Two overtimes (minutes 45 and 50): Play, Full, Q1 to Q4 and two overtime buttons.
  const extra = [shot(101, "A", "2FGM", 0, 50, { minute: 50 })];
  await openShooting(page, { shots: [...allShots(), ...extra] });
  const row = studio(page).locator(".playback-row");
  const buttons = row.locator("> button");
  await expect(buttons).toHaveCount(8);

  await atWidths(page, [320, 390, 639], async () => {
    const tops = await buttons.evaluateAll((all) => all.map((button) => Math.round(button.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await holdsContent(row)).toBe(true);
    await expect(buttons.first().locator("span[aria-hidden]")).toBeVisible();
    await expect(buttons.first().locator("span[aria-hidden]")).toHaveText("Play");
    await expect(row.getByRole("button", { name: "Animate quarters", exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Full game", exact: true })).toBeVisible();
    await expectNoPageOverflow(page);
  });
  await atWidths(page, [768, 1024], async () => {
    await expect(buttons.first().locator("span[aria-hidden]")).toBeHidden();
    await expect(buttons.first().getByText("Animate quarters")).toBeVisible();
    await expect(buttons.nth(1).getByText("Full game")).toBeVisible();
    await expect(row.getByRole("button", { name: "Full game", exact: true })).toBeVisible();
  });
  // Choosing a quarter still marks it.
  await row.getByRole("button", { name: "Q2", exact: true }).click();
  await expect(row.getByRole("button", { name: "Q2", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("the court, the legend and the zone table fit every width, and the table has no inner scroll at 320px", async ({ page }) => {
  await openShooting(page);
  const zones = page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Zone comparison" }) });
  const tableBox = zones.locator(".overflow-x-auto");

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    expect(await holdsContent(zones)).toBe(true);
    expect(await tableBox.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // The team columns are headed by their TV codes, the detail sits under the FG%.
    await expect(zones.locator("th", { hasText: "PAO" })).toBeVisible();
    await expect(zones.locator("th", { hasText: "CZV" })).toBeVisible();
    const cell = zones.locator("tbody tr").first().locator("td").nth(2);
    expect(await cell.evaluate((el) => el.querySelector("span.muted").getBoundingClientRect().top >= el.getBoundingClientRect().top + 12)).toBe(true);
  });
  await atWidths(page, [768, 1024], async () => {
    await expectNoPageOverflow(page);
    await expect(zones.locator("th", { hasText: "Panathinaikos AKTOR Athens" }).locator("span.max-sm\\:sr-only")).toBeVisible();
    await expect(zones.locator("th span[title]").first()).toBeHidden();
  });
});

test("a narrow heatmap labels each zone with its percentage in larger type, and a wide one keeps made over attempts", async ({ page }) => {
  await openShooting(page);
  await mode(page, "Zone heatmap");
  const chipTexts = () =>
    page.locator(".court-chip text").evaluateAll((texts) =>
      texts.map((text) => ({ text: text.textContent, height: text.getBoundingClientRect().height })),
    );
  await atWidths(page, [320, 390], async () => {
    await expect.poll(async () => (await chipTexts()).length).toBeGreaterThan(0);
    for (const { text, height } of await chipTexts()) {
      expect(text).toMatch(/^\d+%$/);
      expect(height).toBeGreaterThanOrEqual(10);
    }
  });
  await atWidths(page, [1024], async () => {
    await expect.poll(async () => (await chipTexts()).some(({ text }) => text.includes("/"))).toBe(true);
  });
});

test("in each zone the team with the higher FG% is shaded in its own colour, and a tie or a one-sided zone is not", async ({ page }) => {
  const shots = [
    shot(1, "A", "2FGM", 0, 50), shot(2, "A", "2FGM", 0, 60), // Restricted area: A 2/2
    shot(3, "B", "2FGM", 0, 40), shot(4, "B", "2FGA", 10, 60), // B 1/2
    shot(5, "A", "2FGA", 200, 300), shot(6, "B", "2FGM", 200, 300), // In the paint: A 0/1, B 1/1
    shot(7, "A", "3FGM", -500, 480), // Left wing 3: only A
    shot(8, "A", "3FGA", 500, 480), shot(9, "B", "3FGA", 500, 480), // Right wing 3: both 0/1
  ];
  await openShooting(page, { shots });
  const zones = page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Zone comparison" }) });
  const row = (zone) => zones.locator("tbody tr").filter({ has: page.getByRole("cell", { name: zone, exact: true }) });
  const shaded = (zone) => row(zone).locator("span.font-bold");

  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: HEIGHT });
    await expect(shaded("Restricted area")).toHaveCount(1);
    await expect(shaded("Restricted area")).toHaveClass(/text-primary/);
    await expect(shaded("Restricted area")).toContainText("(higher)");
    await expect(row("Restricted area").locator("td").nth(2)).toContainText("100.0%");
    await expect(shaded("In the paint")).toHaveClass(/text-secondary/);
    await expect(shaded("Left wing 3")).toHaveCount(0);
    await expect(shaded("Right wing 3")).toHaveCount(0);
    await expect(zones.locator("span.font-bold")).toHaveCount(2);
    expect(await zones.locator(".overflow-x-auto").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expectNoPageOverflow(page);
  }
});

test("the comparison panels stack on a phone with their stat lines inside their boxes, side by side from 640px", async ({ page }) => {
  await openShooting(page);
  await mode(page, "Shooting comparison");
  const panels = studio(page).locator(".panel").filter({ has: page.getByText("eFG%", { exact: true }) });
  await expect(panels).toHaveCount(2);

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    expect(await holdsContent(panels)).toBe(true);
    const [first, second] = await Promise.all([boxOf(panels.nth(0)), boxOf(panels.nth(1))]);
    expect(second.top).toBeGreaterThan(first.bottom - 1);
    await expect(panels.nth(0).locator("p.tabular-nums").first()).toHaveText(/\d+-\d+ \(\d+\.\d%\)/);
    // A percentage never splits in the middle: each stat cell is as wide as its widest word.
    expect(await panels.nth(0).locator("p.tabular-nums").evaluateAll((cells) => cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1))).toBe(true);
    // The club name is the short one on a phone.
    await expect(panels.nth(1).getByText("Crvena Zvezda", { exact: true })).toBeVisible();
  });
  await atWidths(page, [768, 1024], async () => {
    await expectNoPageOverflow(page);
    const [first, second] = await Promise.all([boxOf(panels.nth(0)), boxOf(panels.nth(1))]);
    expect(Math.abs(first.top - second.top)).toBeLessThan(2);
  });
});

test("a game without shots says so and fits a phone", async ({ page }) => {
  await openShooting(page, { shots: [] });
  await expect(page.getByText("Shot data isn't available for this game yet.")).toBeVisible();
  await atWidths(page, [320, 1024], async () => {
    await expectNoPageOverflow(page);
  });
});
