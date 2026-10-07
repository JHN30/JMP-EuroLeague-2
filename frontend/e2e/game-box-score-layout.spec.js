import { test, expect } from "@playwright/test";
import { ADVANCED, BOX_SCORE, SEASON, mockGameApi, player } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const headshot = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='40'><rect width='30' height='40' fill='gray'/></svg>";
// The feed writes "LAST, FIRST"; the table shows "LAST FIRST".
const FEED_LONG_NAME = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI";
const LONG_NAME = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS CODI";

// The two shown players come first: one with a very long hyphenated name, no jersey number and a three-digit stat, one with a
// headshot and a jersey number; the fixture's own players follow (and have advanced rows).
// Ordinary long names: every word of them fits the narrow column, so none may be cut across two lines.
const ORDINARY = [
  player("local", "A-T", "THIEMANN, JOHANNES", { dorsal: "32", started: true, timePlayed: 1700, points: 17 }),
  player("local", "A-P", "PAJOLA, ALESSANDRO", { dorsal: "66", started: true, timePlayed: 1650, points: 9 }),
  player("local", "A-TA", "TANASKOVIC, NIKOLA", { dorsal: "10", started: true, timePlayed: 1600, points: 9 }),
  player("local", "A-H", "HAYES, KEVARRIUS", { dorsal: "13", started: true, timePlayed: 1500, points: 9 }),
];
const PLAYERS = [
  ...ORDINARY,
  player("local", "A-LONG", FEED_LONG_NAME, { dorsal: null, started: true, timePlayed: 1900, points: 101, totalRebounds: 120, valuation: 100 }),
  player("local", "A-PHOTO", "LIGHTY, DAVID", { dorsal: "23", headshotUrl: headshot, positionName: "Forward", timePlayed: 1200, points: 14, valuation: 11 }),
  ...BOX_SCORE.playerStats,
];

async function openBoxScore(page, { view = "Traditional", boxScore = { ...BOX_SCORE, playerStats: PLAYERS }, game = {} } = {}) {
  await mockGameApi(page, { boxScore, advanced: ADVANCED });
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({
      json: {
        game: {
          gameCode: 1,
          played: true,
          phaseName: "Regular season",
          roundNumber: 12,
          scheduledAt: "2025-01-01T18:00:00Z",
          localTeam: { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", crestUrl: crest },
          roadTeam: { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", crestUrl: crest },
          localScore: 112,
          roadScore: 101,
          ...game,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${SEASON}/games/1`);
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  if (view === "Advanced") await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  if (view === "Advanced") await expect(page.locator("table thead").first()).toContainText("GmSc");
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
const firstTable = (page) => page.locator("table").first();

// Where the pinned first column is, how many stat columns are fully visible beside it, and how the name looks.
const measure = (table) =>
  table.evaluate((el) => {
    const box = el.parentElement;
    const boxRect = box.getBoundingClientRect();
    const first = el.querySelector("tbody tr td:first-child");
    const pinned = first.getBoundingClientRect();
    const cells = [...el.querySelectorAll("tbody tr:first-child td")].slice(1);
    const visible = cells.filter((cell) => {
      const rect = cell.getBoundingClientRect();
      return rect.left >= pinned.right - 1 && rect.right <= boxRect.right + 1;
    }).length;
    const name = first.querySelector(".box-score-name");
    const sticky = (rows) => rows.every((row) => getComputedStyle(row.children[0]).position === "sticky");
    return {
      scrolled: Math.round(box.scrollLeft),
      overflow: box.scrollWidth - box.clientWidth,
      pinnedWidth: Math.round(pinned.width),
      pinnedLeft: Math.round(pinned.left - boxRect.left),
      visible,
      nameOpacity: name ? Number(getComputedStyle(name).opacity) : null,
      stickyAll: sticky([...el.querySelectorAll("tr")]),
    };
  });

const swipeTo = (table, x) =>
  table.evaluate((el, left) => {
    el.parentElement.scrollLeft = left;
  }, x);

for (const view of ["Traditional", "Advanced"]) {
  test(`${view}: the player column is pinned and narrow below 640px, folds to the jersey number when swiped, and the stats are tight`, async ({ page }) => {
    await openBoxScore(page, { view });
    const table = firstTable(page);

    await atWidths(page, [320, 390, 639], async (width) => {
      await page.waitForTimeout(300);
      const rest = await measure(table);
      expect(rest.stickyAll).toBe(true);
      expect(rest.pinnedWidth).toBeLessThanOrEqual(124);
      expect(rest.visible).toBeGreaterThanOrEqual(width === 320 ? 3 : 4);
      expect(rest.overflow).toBeGreaterThan(122);
      expect(rest.nameOpacity).toBe(1);

      // At rest the headshot is not shown (the jersey number is); the position line is left out of the phone view; every name is
      // a link to the player, written without the feed's comma.
      expect(await table.locator(".box-score-photo").first().evaluate((image) => Number(getComputedStyle(image).opacity))).toBe(0);
      expect(await table.locator(".box-score-dorsal").first().evaluate((span) => Number(getComputedStyle(span).opacity))).toBe(1);
      expect(await table.getByText("Forward").evaluateAll((els) => els.every((el) => el.getBoundingClientRect().width === 0))).toBe(true);
      await expect(table.getByRole("link", { name: LONG_NAME })).toHaveAttribute("href", `/${SEASON}/players/A-LONG`);

      // The long name wraps inside its cell and is never wider than the pinned column; a short name is not cut mid-word.
      const names = await table.locator("tbody tr td:first-child").evaluateAll((cells) =>
        cells.map((cell) => {
          const link = cell.querySelector("a").getBoundingClientRect();
          const box = cell.getBoundingClientRect();
          return { inside: link.left >= box.left - 1 && link.right <= box.right + 1, text: cell.querySelector("a").textContent };
        }),
      );
      expect(names.every((entry) => entry.inside)).toBe(true);
      // A word is never cut across two lines (the long name above is the one exception: its first word is wider than the column).
      for (const { personName } of ORDINARY) {
        const words = await table.getByRole("link", { name: personName.replace(",", "") }).evaluate((a) => {
          const split = [];
          let index = 0;
          for (const word of a.firstChild.textContent.split(/(\s+)/)) {
            if (word.trim()) {
              const range = document.createRange();
              range.setStart(a.firstChild, index);
              range.setEnd(a.firstChild, index + word.length);
              if (range.getClientRects().length > 1) split.push(word);
            }
            index += word.length;
          }
          return split;
        });
        expect(words).toEqual([]);
      }

      // A swipe narrows the column with the finger and fades the name; at the far end only the jersey number is left.
      await swipeTo(table, 18);
      await expect.poll(async () => (await measure(table)).scrolled).toBe(18);
      await expect.poll(async () => (await measure(table)).pinnedWidth).toBeLessThan(rest.pinnedWidth - 20);
      const partway = await measure(table);
      expect(partway.nameOpacity).toBeGreaterThan(0);
      expect(partway.nameOpacity).toBeLessThan(1);

      await swipeTo(table, 100);
      await expect.poll(async () => (await measure(table)).pinnedWidth).toBeLessThanOrEqual(40);
      const away = await measure(table);
      expect(away.nameOpacity).toBe(0);
      expect(away.pinnedLeft).toBe(0);
      expect(away.stickyAll).toBe(true);
      // Folded, the headshot takes the jersey number's place and stays inside the cell; a player without a headshot keeps the number.
      const photo = await table.locator("tbody tr", { hasText: "LIGHTY DAVID" }).locator("td:first-child").evaluate((cell) => {
        const image = cell.querySelector(".box-score-photo");
        const rect = image.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        return {
          shown: Number(getComputedStyle(image).opacity),
          dorsal: Number(getComputedStyle(cell.querySelector(".box-score-dorsal")).opacity),
          inside: rect.width > 0 && rect.left >= box.left - 1 && rect.right <= box.right + 1,
        };
      });
      expect(photo).toEqual({ shown: 1, dorsal: 0, inside: true });
      const noPhoto = await table.locator("tbody tr td:first-child").first().evaluate((cell) => {
        const number = cell.querySelector("span");
        return { hasPhoto: Boolean(cell.querySelector(".box-score-photo")), opacity: Number(getComputedStyle(number).opacity), text: number.textContent };
      });
      expect(noPhoto).toEqual({ hasPhoto: false, opacity: 1, text: "-" });

      await swipeTo(table, 0);
      await expect.poll(async () => (await measure(table)).pinnedWidth).toBe(rest.pinnedWidth);
      expect((await measure(table)).nameOpacity).toBe(1);

      await expectNoPageOverflow(page);
    });

    // From 640px the column is as before: headshot, full name and position, pinned and unchanged when swiped.
    await atWidths(page, [640, 768, 1024], async () => {
      await page.waitForTimeout(300);
      const rest = await measure(table);
      expect(rest.pinnedWidth).toBeGreaterThan(180);
      expect(rest.stickyAll).toBe(true);
      await expect(table.getByText("Forward")).toBeVisible();
      expect(await table.locator("tbody img").first().evaluate((image) => Math.round(image.getBoundingClientRect().width))).toBeGreaterThan(20);
      expect(await table.locator("tbody a").evaluateAll((links) => links.some((link) => link.textContent.includes(",")))).toBe(false);
      await swipeTo(table, 120);
      await expect.poll(async () => (await measure(table)).scrolled).toBeGreaterThan(0);
      const away = await measure(table);
      expect(away.pinnedWidth).toBe(rest.pinnedWidth);
      expect(away.nameOpacity).toBe(1);
      expect(away.pinnedLeft).toBe(0);
      await swipeTo(table, 0);
    });
  });
}

test("the team header, the view switch and a team without a box score hold their content at 320px", async ({ page }) => {
  await openBoxScore(page, { boxScore: { ...BOX_SCORE, playerStats: PLAYERS.filter((row) => row.side === "local") } });

  await atWidths(page, [320], async (width) => {
    await expect(page.getByText("Box score not available yet.")).toBeVisible();
    await expectNoPageOverflow(page);
    const heading = page.getByRole("heading", { level: 3, name: "Panathinaikos AKTOR Athens" });
    await expect(heading).toBeVisible();
    for (const locator of [heading, page.getByText("Coach: COACH, ALPHA"), page.getByText("Winner"), page.getByRole("tablist", { name: "Box score view" }), page.getByText("Box score not available yet.")]) {
      const box = await locator.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  });
});
