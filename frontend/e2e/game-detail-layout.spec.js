import { test, expect } from "@playwright/test";
import { BOX_SCORE, SEASON, mockGameApi, player } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const team = (name, abbreviatedName, clubCode) => ({ clubCode, name, abbreviatedName, crestUrl: crest });
const PAN = team("Panathinaikos AKTOR Athens", "Panathinaikos", "A");
const CZV = team("Crvena Zvezda Meridianbet Belgrade", "Crvena Zvezda", "B");

const PLAY_BY_PLAY = {
  events: [
    { playType: "2FGM", clubCode: "A", periodNumber: 1, markerTime: "09:00", pointsA: 2, pointsB: 0 },
    { playType: "3FGM", clubCode: "B", periodNumber: 1, markerTime: "08:00", pointsA: 2, pointsB: 3 },
    { playType: "2FGM", clubCode: "A", periodNumber: 2, markerTime: "09:00", pointsA: 4, pointsB: 3 },
  ],
};

// A box score whose local best player has a very long hyphenated name, and (with `overtime`) a fifth period.
function boxScoreWith({ overtime = false } = {}) {
  const periodScores = overtime
    ? [...BOX_SCORE.periodScores, { side: "local", periodNumber: 5, score: 6 }, { side: "road", periodNumber: 5, score: 5 }]
    : BOX_SCORE.periodScores;
  const star = player("local", "A-STAR", "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI", {
    started: true, timePlayed: 1200, points: 44, totalRebounds: 12, assistances: 9, valuation: 50,
  });
  return { ...BOX_SCORE, periodScores, playerStats: [star, ...BOX_SCORE.playerStats] };
}

// The game route registered last wins over the one `mockGameApi` registers, so the page gets these teams and scores.
async function openGame(page, { game = {}, mock = {}, overtime = false } = {}) {
  await mockGameApi(page, { playByPlay: PLAY_BY_PLAY, boxScore: boxScoreWith({ overtime }), ...mock });
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

// A chart redraws a frame after the window is resized, so the page may be wider than the screen for that frame.
const expectNoPageOverflow = (page) => expect.poll(async () => (await findPageOverflow(page)).offenders).toEqual([]);

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const tabList = (page) => page.getByRole("tablist", { name: "Game detail" });
const tabState = (page) =>
  tabList(page).evaluate((el) => {
    const active = el.querySelector("[aria-selected=true]").getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return {
      rows: new Set([...el.children].map((tab) => Math.round(tab.getBoundingClientRect().top))).size,
      height: Math.round(box.height),
      scrolls: el.scrollWidth > el.clientWidth + 1,
      activeInView: active.left >= box.left - 1 && active.right <= box.right + 1,
      font: getComputedStyle(el.children[0]).fontSize,
    };
  });

// Words of a shown name that the browser had to cut across two lines (a multi-word name may wrap at its spaces).
const splitWords = (locator) =>
  locator.evaluateAll((elements) => {
    const split = [];
    for (const el of elements) {
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        let index = 0;
        for (const word of node.textContent.split(/(\s+)/)) {
          if (word.trim()) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + word.length);
            if (range.getClientRects().length > 1) split.push(word);
          }
          index += word.length;
        }
      }
    }
    return split;
  });

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

test("the seven tabs are one row that scrolls on its own below 1024px, keeps the chosen tab in view and is compact below 640px", async ({ page }) => {
  await openGame(page);

  await atWidths(page, [320, 390, 639], async () => {
    const state = await tabState(page);
    expect(state).toMatchObject({ rows: 1, height: 44, scrolls: true, font: "14px" });
    await expectNoPageOverflow(page);
  });

  await atWidths(page, [640, 768], async () => {
    expect(await tabState(page)).toMatchObject({ rows: 1, height: 44, font: "16px" });
    await expectNoPageOverflow(page);
  });

  await atWidths(page, [1024, 1280], async () => {
    expect(await tabState(page)).toMatchObject({ rows: 1, scrolls: false, font: "16px" });
  });

  // A tab reached by tapping stays in view, and so does the chosen tab when the strip changes width.
  await atWidths(page, [320], async () => {
    await page.getByRole("tab", { name: "Play-by-play" }).click();
    await expect(page.getByRole("tab", { name: "Play-by-play" })).toHaveAttribute("aria-selected", "true");
    await expect.poll(async () => (await tabState(page)).activeInView).toBe(true);
    await expectNoPageOverflow(page);
  });
  await atWidths(page, [390, 320], async () => {
    await expect.poll(async () => (await tabState(page)).activeInView).toBe(true);
  });
  await atWidths(page, [390], async () => {
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    await expect.poll(async () => (await tabState(page)).activeInView).toBe(true);
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Play-by-play" })).toBeFocused();
  });
});

test("the header is compact below 640px, keeps long names whole and is as before from 640px", async ({ page }) => {
  await openGame(page);
  const names = page.locator("main h1 > span > span:not(.muted)");
  const crests = page.locator("main h1 img");

  await atWidths(page, [320, 390, 639], async () => {
    await expect(crests.first()).toHaveJSProperty("clientWidth", 40);
    expect(await names.first().evaluate((el) => getComputedStyle(el).fontSize)).toBe("18px");
    expect(await splitWords(names)).toEqual([]);
    // The score sits under the names, not squeezed beside them.
    const [title, score] = await Promise.all([page.locator("main h1").boundingBox(), page.locator(".stat-callout").boundingBox()]);
    expect(score.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(score.x + score.width).toBeLessThanOrEqual(page.viewportSize().width);
    await expect(page.locator(".stat-callout .value")).toHaveText("112 - 101");
    await expectNoPageOverflow(page);
  });

  await atWidths(page, [640, 768, 1024], async () => {
    await expect(crests.first()).toHaveJSProperty("clientWidth", 48);
    expect(await names.first().evaluate((el) => getComputedStyle(el).fontSize)).toBe("24px");
  });
});

test("a team still to be set shows TBD, and a game to come shows the Scheduled badge, inside the screen at 320px", async ({ page }) => {
  await openGame(page, { game: { roadTeam: { clubCode: null, name: null, abbreviatedName: null, crestUrl: null } } });
  await atWidths(page, [320], async () => {
    await expect(page.locator("main h1")).toContainText("TBD");
    await expectNoPageOverflow(page);
  });

  await page.unroute(`**/api/seasons/${SEASON}/games/1`);
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({
      json: { game: { gameCode: 1, played: false, phaseName: "Regular season", roundNumber: 30, scheduledAt: "2025-06-01T18:00:00Z", gameStatus: null, localTeam: PAN, roadTeam: CZV, localScore: null, roadScore: null } },
    }),
  );
  await page.reload();
  await atWidths(page, [320], async () => {
    await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();
    // A game to come keeps its tip-off time in the date line.
    await expect(page.locator("main p.muted", { hasText: "Round 30" })).toHaveText(/\d:\d{2}/);
    await expect(page.getByText("Overview isn't available until this game is played.")).toBeVisible();
    await expectNoPageOverflow(page);
  });
});

test("the Overview holds long names, a long player name and three-digit scores at 320px, and shows the full names from 640px", async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole("heading", { name: "Score by period" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();
  const periodTable = page.locator("table").first();
  const shown = () =>
    periodTable.locator("tbody tr td:first-child [aria-hidden=true]").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => el.textContent));

  await atWidths(page, [320, 390], async () => {
    // A four-period game fits without scrolling, with the short names; the full names stay readable to a screen reader.
    expect(await periodTable.evaluate((el) => el.parentElement.scrollWidth - el.parentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await shown()).toEqual(["Panathinaikos", "Crvena Zvezda"]);
    await expect(page.getByRole("cell", { name: "Panathinaikos AKTOR Athens" }).first()).toBeAttached();
    await expect(periodTable.locator("tbody tr").first().locator("td").last()).toHaveText("80");

    const star = page.getByRole("article", { name: "Panathinaikos AKTOR Athens best player" });
    await expect(star).toContainText("MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI");
    expect(await holdsContent(page.getByRole("article"))).toBe(true);
    expect(await holdsContent(page.getByRole("group"))).toBe(true);
    const keyStats = page.locator("section", { has: page.getByRole("heading", { name: "How the teams compared" }) }).locator(".panel");
    expect(await holdsContent(keyStats)).toBe(true);
    expect(await splitWords(page.locator("main .panel .font-semibold"))).toEqual([]);

    // The chart fills its panel.
    const canvas = page.getByRole("img", { name: /Running score margin/ });
    await expect
      .poll(async () => {
        const [box, panel] = await Promise.all([canvas.boundingBox(), canvas.locator("xpath=ancestor::div[contains(@class,'panel')][1]").boundingBox()]);
        return box.width > panel.width - 70 && box.x + box.width <= panel.x + panel.width;
      })
      .toBe(true);
    await expectNoPageOverflow(page);
  });

  await atWidths(page, [640, 768, 1024], async () => {
    expect(await shown()).toEqual([]);
    await expect(periodTable.locator("tbody tr td:first-child").first()).toContainText("Panathinaikos AKTOR Athens");
    await expect(page.getByRole("article", { name: "Panathinaikos AKTOR Athens best player" })).toContainText("Panathinaikos AKTOR Athens");
  });
});

test("an overtime game's period table scrolls inside its panel at 320px, never the page", async ({ page }) => {
  await openGame(page, { overtime: true });
  await atWidths(page, [320], async () => {
    await expect(page.locator("table thead").first()).toContainText("Total");
    await expectNoPageOverflow(page);
  });
});

test("a played game's header shows the date without a time, the key stats are values without bars, and the lead tracker is not green and red", async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole("heading", { name: "How the teams compared" })).toBeVisible();
  await expect(page.locator("main p.muted", { hasText: "Round 12" })).not.toHaveText(/\d:\d{2}/);
  await expect(page.locator("main p.muted", { hasText: "Round 12" })).toContainText("2025");

  const keyStats = page.locator("section", { has: page.getByRole("heading", { name: "How the teams compared" }) });
  await expect(keyStats.getByText("30-55 (54.5%)")).toBeVisible();
  await expect(keyStats.locator('[class~="h-1.5"]')).toHaveCount(0);
  await expect(keyStats.locator('[class~="bg-primary/10"]').first()).toBeVisible();
  await expect(keyStats.getByText("Lower is better")).toHaveCount(1);

  // The lead bars use the theme's first and second colours, as the shot chart does, not success green and error red.
  const canvas = page.getByRole("img", { name: /Running score margin/ });
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate((el) => {
        const { data } = el.getContext("2d").getImageData(0, 0, el.width, el.height);
        let green = 0;
        let orange = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 200) continue;
          if (g > r + 40 && g > b + 40) green += 1;
          if (r > g + 60 && r > b + 100) orange += 1;
        }
        return { green, orange: orange > 0 };
      }),
    )
    .toEqual({ green: 0, orange: true });
});

