import { test, expect } from "@playwright/test";
import { LINEUPS, SEASON, mockGameApi, rosterBox } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const LONG_NAME = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI";
const NAMES = { A1: "ONE, AL", A2: LONG_NAME, A3: "THREE, ART", A4: "FOUR, ARI", A5: "FIVE, ABBY" };
const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", crestUrl: crest };
const CZV = { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", crestUrl: crest };

// The box score of `rosterBox`, with one starter's name made very long.
function longNameBox() {
  const box = rosterBox();
  return { ...box, playerStats: box.playerStats.map((row) => (row.personKey === "A2" ? { ...row, personName: LONG_NAME } : row)) };
}

// `rosterBox`'s game with two overtimes (3,000 seconds): six period labels on the ruler.
const TWO_OVERTIMES = { ...LINEUPS, gameSeconds: 3000 };

const ev = (playType, clubCode, personCode) => ({ periodNumber: 1, markerTime: "05:00", playType, clubCode, personCode, playerName: NAMES[personCode] ?? personCode });
const EVENTS = [
  ev("2FGM", "A", "A2"), ev("AS", "A", "A1"),
  ev("3FGM", "A", "A2"), ev("AS", "A", "A1"),
  ev("2FGM", "A", "A3"), ev("AS", "A", "A1"),
  ev("2FGM", "A", "A4"), ev("AS", "A", "A2"),
];

async function openRotations(page, { lineups = TWO_OVERTIMES, boxScore = longNameBox(), game = {}, mock = {} } = {}) {
  await mockGameApi(page, { boxScore, lineups, playByPlay: { events: EVENTS }, ...mock });
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
  await page.getByRole("tab", { name: "Rotations", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Rotations", exact: true })).toHaveAttribute("aria-selected", "true");
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

// Whether everything inside each matched element sits inside its box.
const holdsContent = (locator) =>
  locator.evaluateAll((elements) =>
    elements.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const section = (page, heading) => page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) });

// For every player row of the timelines: the bar's width against the row's, and whether the bar is on a line of its own.
const timelineGeometry = (page) =>
  section(page, "Minutes on the court")
    .locator("li")
    .evaluateAll((rows) =>
      rows.map((row) => {
        const rowBox = row.getBoundingClientRect();
        const bar = row.querySelector("div.relative").getBoundingClientRect();
        const link = row.querySelector("a").getBoundingClientRect();
        const minutes = row.querySelector("span.tabular-nums").getBoundingClientRect();
        return {
          barWidth: Math.round(bar.width),
          rowWidth: Math.round(rowBox.width),
          below: bar.top >= link.bottom - 1,
          sameLine: Math.abs(bar.top + bar.height / 2 - (link.top + link.height / 2)) < 12,
          linkInside: link.right <= minutes.left + 1 || link.right <= rowBox.right + 1,
          minutesRight: Math.round(minutes.right) <= Math.round(rowBox.right) + 1,
        };
      }),
    );

const rulerOverlaps = (page) =>
  section(page, "Minutes on the court")
    .locator("div[aria-hidden=true]")
    .first()
    .evaluate((ruler) => {
      const labels = [...ruler.querySelectorAll("span.absolute")].map((label) => label.getBoundingClientRect());
      let overlaps = 0;
      for (let i = 1; i < labels.length; i++) if (labels[i].left < labels[i - 1].right) overlaps += 1;
      return { count: labels.length, overlaps };
    });

test("the timeline rows are two lines below 640px, with the bar across the panel and a ruler that does not overlap, and one line from 640px", async ({ page }) => {
  await openRotations(page);
  await expect(page.getByRole("heading", { name: "Minutes on the court" })).toBeVisible();
  await expect(section(page, "Minutes on the court").locator("li").first()).toBeVisible();
  const firstPanel = section(page, "Minutes on the court").locator(".panel").first();

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    const rows = await timelineGeometry(page);
    expect(rows.length).toBeGreaterThan(8);
    for (const row of rows) {
      expect(row.below).toBe(true);
      expect(row.barWidth).toBeGreaterThan(row.rowWidth - 4);
      expect(row.minutesRight).toBe(true);
    }
    // Two overtimes: six period labels, none on top of another.
    expect(await rulerOverlaps(page)).toEqual({ count: 6, overlaps: 0 });
    expect(await firstPanel.evaluate((el) => getComputedStyle(el).paddingTop)).toBe("12px");
    // The names, the stint text and the bars are still there for every player.
    await expect(section(page, "Minutes on the court").locator("li .sr-only").first()).toHaveText(/On court:/);
    expect(await section(page, "Minutes on the court").locator("li span[title]").count()).toBeGreaterThan(8);
    expect(await holdsContent(section(page, "Minutes on the court").locator(".panel"))).toBe(true);
  });

  await atWidths(page, [640, 768, 1024], async () => {
    await expectNoPageOverflow(page);
    const rows = await timelineGeometry(page);
    for (const row of rows) {
      expect(row.sameLine).toBe(true);
      expect(row.barWidth).toBeLessThan(row.rowWidth - 100);
    }
    expect(await firstPanel.evaluate((el) => getComputedStyle(el).paddingTop)).toBe("16px");
  });
});

test("the assist connections stay inside their panels, stacked below 1024px and side by side from it", async ({ page }) => {
  await openRotations(page);
  await expect(page.getByRole("heading", { name: "Assist connections" })).toBeVisible();
  const panels = section(page, "Assist connections").locator(".panel");
  await expect(panels.first().locator("li").first()).toBeVisible();
  const lefts = () => panels.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    expect(await holdsContent(panels)).toBe(true);
    expect(new Set(await lefts()).size).toBe(1);
  });
  await atWidths(page, [640, 768, 1023], async () => {
    await expectNoPageOverflow(page);
    expect(new Set(await lefts()).size).toBe(1);
  });
  await atWidths(page, [1024], async () => {
    expect(new Set(await lefts()).size).toBe(2);
  });
});

test("each five-man unit is a card below 640px (the names, then the six figures under their labels) and a table row from 640px", async ({ page }) => {
  await openRotations(page);
  await expect(page.getByRole("heading", { name: "Five-man units" })).toBeVisible();
  const table = section(page, "Five-man units").locator("table").first();
  await expect(table.locator("tbody tr").first()).toBeVisible();

  const measure = () =>
    table.evaluate((el) => {
      const panel = el.closest(".panel").getBoundingClientRect();
      const rows = [...el.querySelectorAll("tbody tr")].map((row) => {
        const cells = [...row.children];
        const names = cells[0].getBoundingClientRect();
        const figures = cells.slice(1).map((cell) => cell.getBoundingClientRect());
        return {
          namesAboveFigures: names.bottom <= figures[0].top + 1,
          oneFigureRow: new Set(figures.map((rect) => Math.round(rect.top))).size === 1,
          inside: [names, ...figures].every((rect) => rect.left >= panel.left - 1 && rect.right <= panel.right + 1),
          labels: cells.slice(1).map((cell) => getComputedStyle(cell, "::before").content),
          display: getComputedStyle(row).display,
          namesWide: Math.round(names.width),
        };
      });
      const box = el.parentElement;
      return { rows, scrolls: box.scrollWidth > box.clientWidth + 1, headerRole: el.querySelector("thead th").getAttribute("role") };
    });

  await atWidths(page, [320, 390, 639], async (width) => {
    await expectNoPageOverflow(page);
    const { rows, scrolls, headerRole } = await measure();
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(row).toMatchObject({ namesAboveFigures: true, oneFigureRow: true, inside: true, display: "grid" });
      expect(row.labels).toEqual(['"Min"', '"Poss"', '"PF"', '"PA"', '"+/-"', '"Net rtg"']);
      expect(row.namesWide).toBeGreaterThan(width - 80);
    }
    // Nothing to swipe, and the header row stays in the accessibility tree.
    expect(scrolls).toBe(false);
    expect(headerRole).toBe("columnheader");
    await expect(table.getByRole("columnheader", { name: "Net rtg" })).toBeAttached();
    await expect(table.getByRole("link", { name: "ONE, AL" }).first()).toHaveAttribute("href", `/${SEASON}/players/A1`);
  });

  await atWidths(page, [640, 768, 1024], async () => {
    const { rows } = await measure();
    for (const row of rows) {
      expect(row.display).toBe("table-row");
      expect(row.labels).toEqual(["none", "none", "none", "none", "none", "none"]);
    }
  });
});

test("the select, badges, notes and a team without on-court rows hold their content at 320px", async ({ page }) => {
  // Team A has no on-court intervals: its panel says so. Team B's minutes differ from the box score, so its badge says Approximate.
  const lineups = { ...TWO_OVERTIMES, onCourt: TWO_OVERTIMES.onCourt.filter((row) => row.side !== "local") };
  const box = longNameBox();
  const boxScore = { ...box, playerStats: box.playerStats.map((row) => (row.personKey === "B2" ? { ...row, timePlayed: 2400 } : row)) };
  await openRotations(page, { lineups, boxScore });
  await expect(page.getByText("On-court times aren't available for this team.")).toBeVisible();

  await atWidths(page, [320], async (width) => {
    await expectNoPageOverflow(page);
    const approximate = page.getByText(/Approximate · up to \d+ s off the box score/);
    await expect(approximate).toBeVisible();
    for (const locator of [approximate, page.getByText("On-court times aren't available for this team."), page.getByRole("combobox", { name: "Minimum minutes" }), page.getByText(/Small samples swing a lot/)]) {
      const rect = await locator.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    }
  });
});

test("the Rotations note for a game that is not played stays inside the panel at 320px", async ({ page }) => {
  await openRotations(page, { game: { played: false, localScore: null, roadScore: null }, mock: { played: false } });
  await atWidths(page, [320], async (width) => {
    const note = page.getByText("Rotations aren't available until this game is played.");
    await expect(note).toBeVisible();
    const rect = await note.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    await expectNoPageOverflow(page);
  });
});
