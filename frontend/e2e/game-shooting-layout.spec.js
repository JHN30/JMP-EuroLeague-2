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

// The box with the quarter buttons and the two courts; the heading, the view tabs and the filter box sit above it.
const studio = (page) => page.locator(".panel").filter({ has: page.locator("#shooting-presentation-panel") });
const filterBox = (page) => page.locator(".shooting-filters");
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
    await expect(select(page, "PAO player")).toBeHidden();
    await filtersButton(page).click();
    await expect(filtersButton(page)).toHaveAttribute("aria-expanded", "true");

    // The two teams' player lists share a line, home first; Shot type and Result share the next one.
    const [homePlayer, roadPlayer, shotType, result, context] = await Promise.all(
      ["PAO player", "CZV player", "Shot type", "Result", "Play context"].map((name) => boxOf(select(page, name))),
    );
    expect(Math.abs(homePlayer.top - roadPlayer.top)).toBeLessThan(2);
    expect(roadPlayer.left).toBeGreaterThan(homePlayer.right);
    expect(Math.abs(shotType.top - result.top)).toBeLessThan(2);
    expect(result.left).toBeGreaterThan(shotType.right);
    expect(shotType.top).toBeGreaterThan(homePlayer.bottom - 1);
    expect(context.top).toBeGreaterThan(shotType.bottom - 1);

    await select(page, "Shot type").selectOption("3");
    await select(page, "Result").selectOption("made");
    await expect(filtersButton(page)).toContainText("2 active");
    await filtersButton(page).click();
    await expect(select(page, "PAO player")).toBeHidden();
    await expect(filtersButton(page)).toContainText("2 active");
    await expect(page.getByRole("img", { name: /Shot chart, Panathinaikos.*: 5 attempts shown/ })).toBeVisible();
  });
  await atWidths(page, [320], async () => {
    await filtersButton(page).click();
    const [shotType, result] = await Promise.all(["Shot type", "Result"].map((name) => boxOf(select(page, name))));
    expect(result.top).toBeGreaterThan(shotType.bottom - 1);
    expect(await holdsContent(page.locator("[id] > .grid", { has: select(page, "Shot type") }))).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("the Period select is left out on a phone for both views, where the quarter buttons do its job", async ({ page }) => {
  await openShooting(page);
  await atWidths(page, [390], async () => {
    await filtersButton(page).click();
    await expect(select(page, "Period")).toBeHidden();
    await mode(page, "Shooting zones");
    await expect(select(page, "Period")).toBeHidden();
    await mode(page, "Shot map");
  });
  await atWidths(page, [768, 1280], async () => {
    for (const name of ["PAO player", "CZV player", "Shot type", "Period", "Result", "Play context"]) await expect(select(page, name)).toBeVisible();
    await expect(select(page, "Team")).toHaveCount(0);
  });
});

test("on a wide screen the home player list opens the filter row and the away one closes it, and the row is filled on both views", async ({ page }) => {
  await openShooting(page);
  const rowOf = async (names) => {
    const boxes = await Promise.all(names.map((name) => boxOf(select(page, name))));
    for (const box of boxes) expect(Math.abs(box.top - boxes[0].top)).toBeLessThan(2);
    for (let index = 1; index < boxes.length; index += 1) expect(boxes[index].left).toBeGreaterThan(boxes[index - 1].right);
    return boxes;
  };
  const filled = async (boxes) => {
    const panel = await boxOf(filterBox(page));
    // The last select ends near the panel's right edge, inside its padding.
    expect(panel.right - boxes.at(-1).right).toBeLessThan(40);
  };
  await atWidths(page, [1280], async () => {
    await filled(await rowOf(["PAO player", "Shot type", "Period", "Result", "Play context", "CZV player"]));
    await mode(page, "Shooting zones");
    await filled(await rowOf(["PAO player", "Period", "Play context", "CZV player"]));
    await mode(page, "Shot map");
  });
  await atWidths(page, [1024], async () => {
    await mode(page, "Shooting zones");
    await filled(await rowOf(["PAO player", "Period", "Play context", "CZV player"]));
    await mode(page, "Shot map");
  });
});

test("from 1280px the filter box stays under the nav down to the player tables, and a name there scrolls the courts in below it", async ({ page }) => {
  await openShooting(page);
  const navBottom = () => page.locator(".app-nav").evaluate((el) => el.getBoundingClientRect().bottom);
  const players = page.locator("section", { has: page.getByRole("heading", { name: "Each player's shooting" }) });

  await atWidths(page, [1024], async () => {
    await players.scrollIntoViewIfNeeded();
    expect((await boxOf(filterBox(page))).bottom).toBeLessThan(await navBottom());
  });
  await atWidths(page, [1280, 1440], async () => {
    await players.scrollIntoViewIfNeeded();
    const bar = await boxOf(filterBox(page));
    expect(bar.top).toBeGreaterThanOrEqual(await navBottom());
    expect(bar.top - (await navBottom())).toBeLessThan(12);
    // The bar still works from down here, and the tables follow it.
    await select(page, "Result").selectOption("made");
    await expect(select(page, "Result")).toHaveValue("made");
    await select(page, "Result").selectOption("all");

    await players.getByRole("button", { name: LONG_NAME }).click();
    await expect.poll(async () => (await boxOf(page.locator("#shooting-presentation-panel"))).top - (await boxOf(filterBox(page))).bottom).toBeGreaterThan(0);
    await players.getByRole("button", { name: LONG_NAME }).click();
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

test("the legend and the zone table fit every width, and the table has no inner scroll at 320px", async ({ page }) => {
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
    const cell = zones.locator("tbody tr", { has: page.locator("td") }).first().locator("td").nth(2);
    expect(await cell.evaluate((el) => el.querySelector("span.muted").getBoundingClientRect().top >= el.getBoundingClientRect().top + 12)).toBe(true);
  });
  await atWidths(page, [768, 1024], async () => {
    await expectNoPageOverflow(page);
    await expect(zones.locator("th", { hasText: "Panathinaikos AKTOR Athens" }).locator("span.max-sm\\:sr-only")).toBeVisible();
    await expect(zones.locator("th span[title]").first()).toBeHidden();
  });
});

test("the courts and the legend fit every width", async ({ page }) => {
  await openShooting(page);
  for (const name of ["Shot map", "Shooting zones"]) {
    await mode(page, name);
    await atWidths(page, [320, 390, 639, 768, 1024], async () => {
      await expectNoPageOverflow(page);
      expect(await holdsContent(studio(page))).toBe(true);
    });
  }
});

test("a narrow heatmap labels each zone with its percentage in larger type, and a wide one keeps made over attempts", async ({ page }) => {
  await openShooting(page);
  await mode(page, "Shooting zones");
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
  // The courts are as tall as the window leaves room for, so a tall window is what makes them wide enough.
  await page.setViewportSize({ width: 1600, height: 1400 });
  await expect.poll(async () => (await chipTexts()).some(({ text }) => text.includes("/"))).toBe(true);
});

test("in each zone the team with the higher FG% is shaded in its own colour, from three attempts a side, and a tie or a one-sided zone is not", async ({ page }) => {
  const shots = [
    shot(1, "A", "2FGM", 0, 50), shot(2, "A", "2FGM", 0, 60), shot(10, "A", "2FGM", 0, 55), // Restricted area: A 3/3
    shot(3, "B", "2FGM", 0, 40), shot(4, "B", "2FGA", 10, 60), shot(11, "B", "2FGM", 5, 45), // B 2/3
    shot(5, "A", "2FGA", 200, 300), shot(12, "A", "2FGA", 210, 300), shot(13, "A", "2FGM", 190, 300), // In the paint: A 1/3
    shot(6, "B", "2FGM", 200, 300), shot(14, "B", "2FGM", 210, 300), shot(15, "B", "2FGM", 190, 300), // B 3/3
    shot(7, "A", "3FGM", 500, 480), // Left wing 3: only A
    shot(8, "A", "3FGA", -500, 480), shot(9, "B", "3FGA", -500, 480), // Right wing 3: both 0/1, too few to shade
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
    // The paint total (A 4/6, B 5/6) is shaded too; the threes total (A 1/2, B 0/1) is too small.
    await expect(row("Paint total").locator("span.font-bold")).toHaveClass(/text-secondary/);
    await expect(row("Threes total").locator("span.font-bold")).toHaveCount(0);
    await expect(zones.locator("span.font-bold")).toHaveCount(3);
    expect(await zones.locator(".overflow-x-auto").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expectNoPageOverflow(page);
  }
});

test("the team panels stack on a phone with their stat lines inside their boxes, side by side from 640px, on both views", async ({ page }) => {
  await openShooting(page);
  const panels = studio(page).locator(".panel").filter({ has: page.getByText("eFG%", { exact: true }) });
  for (const name of ["Shot map", "Shooting zones"]) {
    await mode(page, name);
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
      await expect(panels.nth(1).getByText("CZV", { exact: true })).toBeVisible();
    });
    await atWidths(page, [768, 1024], async () => {
      await expectNoPageOverflow(page);
      const [first, second] = await Promise.all([boxOf(panels.nth(0)), boxOf(panels.nth(1))]);
      expect(Math.abs(first.top - second.top)).toBeLessThan(2);
    });
  }
});

test("a game without shots says so and fits a phone", async ({ page }) => {
  await openShooting(page, { shots: [] });
  await expect(page.getByText("Shot data isn't available for this game yet.")).toBeVisible();
  await atWidths(page, [320, 1024], async () => {
    await expectNoPageOverflow(page);
  });
});
