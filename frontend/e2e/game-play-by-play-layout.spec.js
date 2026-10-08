import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", tvCode: "PAO", crestUrl: crest };
const CZV = { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", tvCode: "CZV", crestUrl: crest };
const LONG_NAME = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI";
const LONG_INFO = "Two Pointer (12/20 - 25 pt) from the left wing off a pass by the point guard after a long possession";

const base = { fastbreak: false, secondChance: false, pointsOffTurnover: false, periodNumber: 4 };
// Newest first in the list, so the feed's last event is the row on top: a typical score, a long name with a long detail, a
// steal, a timeout without a player or crest, and a TV timeout.
const FEED = [
  { ...base, eventOrdinal: 1, markerTime: "09:50", playType: "2FGM", clubCode: "A", playerName: "WATERS, NATE", playInfo: "Two Pointer (2/3)", pointsA: 63, pointsB: 59 },
  { ...base, eventOrdinal: 2, markerTime: "09:20", playType: "2FGM", clubCode: "B", playerName: LONG_NAME, playInfo: LONG_INFO, pointsA: 63, pointsB: 61 },
  { ...base, eventOrdinal: 3, markerTime: "09:01", playType: "ST", clubCode: "A", playerName: "HIFI, NADIR", playInfo: "Steal (2)" },
  { ...base, eventOrdinal: 4, markerTime: "08:40", playType: "TOUT", clubCode: "B", playerName: null, teamName: "Crvena Zvezda Meridianbet Belgrade", playInfo: "Time Out (1)" },
  { ...base, eventOrdinal: 5, markerTime: "07:17", playType: "TOUT_TV", clubCode: null, playerName: null, teamName: null, playInfo: "TV Time Out (4)" },
];
const MANY = Array.from({ length: 140 }, (_, index) => ({
  ...base,
  eventOrdinal: index + 1,
  periodNumber: 1 + Math.floor(index / 40),
  markerTime: "05:00",
  playType: "FTM",
  clubCode: index % 2 ? "A" : "B",
  playerName: "WATERS, NATE",
  playInfo: "Free Throw In (1/2)",
  pointsA: index,
  pointsB: index,
}));

async function openPlayByPlay(page, { events = FEED, played = true } = {}) {
  await mockGameApi(page, { playByPlay: { events }, played });
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({
      json: {
        game: {
          gameCode: 1,
          played,
          phaseName: "Regular season",
          roundNumber: 12,
          scheduledAt: "2025-01-01T18:00:00Z",
          localTeam: PAN,
          roadTeam: CZV,
          localScore: played ? 112 : null,
          roadScore: played ? 101 : null,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Play-by-play", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Play-by-play", exact: true })).toHaveAttribute("aria-selected", "true");
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

const log = (page) => page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Play-by-play" }) });
const rows = (page) => log(page).locator(".divide-y > div");
const filtersButton = (page) => page.getByRole("button", { name: /^Filters/ });
const select = (page, name) => page.getByRole("combobox", { name, exact: true });
const heightOf = (locator) => locator.evaluate((el) => Math.round(el.getBoundingClientRect().height));

test("a typical row is two lines on a phone and a long name and detail wrap instead of being cut", async ({ page }) => {
  await openPlayByPlay(page, { events: FEED });
  await select(page, "Event type").selectOption("all");
  await expect(rows(page)).toHaveCount(5);

  await atWidths(page, [320, 390, 639], async () => {
    await expectNoPageOverflow(page);
    expect(await holdsContent(log(page))).toBe(true);
    // Newest first: the TV timeout, the timeout, the steal, the long row, the score.
    const score = rows(page).nth(4);
    const long = rows(page).nth(3);
    expect(await heightOf(score)).toBeLessThanOrEqual(58);
    expect(await heightOf(rows(page).nth(2))).toBeLessThanOrEqual(58);
    expect(await heightOf(rows(page).nth(0))).toBeLessThanOrEqual(58);
    // The long name and detail take more lines but are neither clipped nor cut with an ellipsis.
    expect(await heightOf(long)).toBeGreaterThan(await heightOf(score));
    const cut = await long.evaluate((row) =>
      [...row.querySelectorAll("span.font-medium, p.muted")].map((el) => ({
        wide: el.scrollWidth > el.clientWidth + 1,
        lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
      })),
    );
    for (const entry of cut) expect(entry.wide).toBe(false);
    // The name has no comma in it, the way the Box score shows it.
    await expect(long).toContainText("MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS CODI");
    await expect(score).toContainText("WATERS NATE");
    await expect(score).not.toContainText(",");
  });

  await atWidths(page, [768, 1024], async () => {
    await expectNoPageOverflow(page);
    // One line for the name and badge and one for the detail, and the crest column is back.
    expect(await heightOf(rows(page).nth(4))).toBeLessThanOrEqual(64);
    await expect(rows(page).nth(4).locator("img")).toBeVisible();
  });
});

test("below 640px the filters sit behind one button, Key plays counting as the default, and they keep working when it is closed", async ({ page }) => {
  await openPlayByPlay(page, { events: MANY });
  await atWidths(page, [390], async () => {
    await expect(filtersButton(page)).toHaveText(/^Filters\s*▾?$/);
    await expect(select(page, "Event type")).toBeHidden();
    await filtersButton(page).click();
    const [type, period] = await Promise.all(["Event type", "Period"].map((name) => select(page, name).evaluate((el) => el.getBoundingClientRect().top)));
    expect(Math.abs(type - period)).toBeLessThan(2);
    await select(page, "Event type").selectOption("scoring");
    await select(page, "Period").selectOption("2");
    await expect(filtersButton(page)).toContainText("2 active");
    await filtersButton(page).click();
    await expect(select(page, "Period")).toBeHidden();
    await expect(log(page).locator(".stat-badge").first()).toHaveText("40 events");
    await expect(rows(page)).toHaveCount(40);
  });
  await atWidths(page, [320], async () => {
    await filtersButton(page).click();
    expect(await holdsContent(log(page))).toBe(true);
    await expectNoPageOverflow(page);
  });
  await atWidths(page, [768, 1280], async () => {
    for (const name of ["Event type", "Period", "Team"]) await expect(select(page, name)).toBeVisible();
    await expect(filtersButton(page)).toBeHidden();
  });
});

test("the event count badge, Show 60 more and the empty states fit a phone", async ({ page }) => {
  await openPlayByPlay(page, { events: MANY });
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await filtersButton(page).click();
  await select(page, "Event type").selectOption("all");
  await filtersButton(page).click();
  await atWidths(page, [390, 320], async () => {
    await expect(rows(page)).toHaveCount(60);
    const badge = log(page).locator(".stat-badge").first();
    await expect(badge).toHaveText("140 events");
    expect(await badge.evaluate((el) => el.getBoundingClientRect().right <= el.closest(".panel").getBoundingClientRect().right)).toBe(true);
    await expectNoPageOverflow(page);
  });
  await log(page).getByRole("button", { name: "Show 60 more" }).click();
  await expect(rows(page)).toHaveCount(120);
  await expectNoPageOverflow(page);
});

test("an unplayed game and an empty feed say so and fit a phone", async ({ page }) => {
  await openPlayByPlay(page, { played: false, events: [] });
  await expect(page.getByText("Play-by-play isn't available until this game is played.")).toBeVisible();
  await atWidths(page, [320], async () => {
    await expectNoPageOverflow(page);
  });
  await page.unroute("**/api/**");
  await openPlayByPlay(page, { events: [] });
  await expect(page.getByText("Play-by-play isn't available for this game yet.")).toBeVisible();
  await atWidths(page, [320], async () => {
    await expectNoPageOverflow(page);
  });
});
