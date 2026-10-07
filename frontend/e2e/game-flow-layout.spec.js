import { test, expect } from "@playwright/test";
import { ADVANCED, SEASON, TEAM_FLOW, mockGameApi } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", crestUrl: crest };
const CZV = { name: "Crvena Zvezda Meridianbet Belgrade", abbreviatedName: "Crvena Zvezda", clubCode: "B", crestUrl: crest };

// 70 scoring plays with lead changes and runs; with `overtime` the last ones are in two overtime periods.
function playByPlay({ overtime = false, plays = 70 } = {}) {
  const events = [];
  let home = 0;
  let road = 0;
  for (let i = 0; i < plays; i++) {
    const scoredByHome = Math.sin(i / 6) + (i % 3 === 0 ? 0.4 : -0.2) > 0;
    if (scoredByHome) home += 2;
    else road += 3;
    const last = overtime ? 6 : 4;
    events.push({
      playType: scoredByHome ? "2FGM" : "3FGM",
      clubCode: scoredByHome ? "A" : "B",
      periodNumber: Math.min(last, 1 + Math.floor((i * last) / plays)),
      markerTime: `0${9 - (i % 9)}:00`,
      eventOrdinal: i,
      pointsA: home,
      pointsB: road,
    });
  }
  return { events };
}

// The game route registered last wins over the one `mockGameApi` registers, so the page gets these clubs and this score.
async function openTab(page, tab, { game = {}, pbp = playByPlay(), mock = {} } = {}) {
  await mockGameApi(page, { playByPlay: pbp, advanced: ADVANCED, teamFlow: TEAM_FLOW, ...mock });
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
  await page.getByRole("tab", { name: tab, exact: true }).click();
  await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

// A chart redraws a frame after the window is resized, so the page may be wider than the screen for that frame.
const expectNoPageOverflow = (page) => expect.poll(async () => (await findPageOverflow(page)).offenders).toEqual([]);

// Words of a shown text that the browser had to cut across two lines (a multi-word text may wrap at its spaces).
const splitWords = (locator) =>
  locator.evaluateAll((elements) => {
    const split = [];
    for (const el of elements) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.parentElement.getClientRects().length || node.parentElement.closest("[aria-hidden=true]")?.getBoundingClientRect().width === 0) continue;
        if (node.parentElement.closest(".sr-only")) continue;
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

const insideScreen = (locator, width) =>
  locator.evaluateAll(
    (elements, screen) => elements.every((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= screen;
    }),
    width,
  );

const panelOf = (canvas) => canvas.locator("xpath=ancestor::div[contains(@class,'panel')][1]");
const canvasFits = async (page) => {
  const canvas = page.getByRole("img", { name: /Running score margin/ });
  const [box, panel] = await Promise.all([canvas.boundingBox(), panelOf(canvas).boundingBox()]);
  return box.width > panel.width - 72 && box.x + box.width <= panel.x + panel.width && box.x >= panel.x;
};

test("the Game flow tab is compact below 640px, keeps its clubs' names whole and fits the chart to its panel", async ({ page }) => {
  await openTab(page, "Game flow");
  const tab = page.locator("#game-detail-panel");
  await expect(tab.getByRole("heading", { name: "Turning points" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();
  const canvas = page.getByRole("img", { name: /Running score margin/ });
  const shown = () => tab.locator(".eyebrow [aria-hidden=true], .font-medium [aria-hidden=true]").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => el.textContent));

  await atWidths(page, [320, 390, 639], async (width) => {
    await expectNoPageOverflow(page);
    expect(await insideScreen(tab.locator(".panel"), width)).toBe(true);
    expect(await holdsContent(tab.locator(".panel"))).toBe(true);
    // The short club names are shown in the cards, the full names stay for screen readers.
    expect(new Set(await shown())).toEqual(new Set(["Panathinaikos", "Crvena Zvezda"]));
    await expect(tab.getByText("Panathinaikos AKTOR Athens biggest lead")).toBeAttached();
    expect(await splitWords(tab.locator(".eyebrow, p.font-medium, .muted"))).toEqual([]);
    // Compact: the cards' padding is 12px and the chart is no taller than 256px.
    expect(await tab.locator(".panel").first().evaluate((el) => getComputedStyle(el).paddingTop)).toBe("12px");
    await expect.poll(async () => Math.round((await canvas.boundingBox()).height)).toBeLessThanOrEqual(256);
    await expect.poll(() => canvasFits(page)).toBe(true);
  });

  // The chart follows its panel when the window changes width.
  await atWidths(page, [390, 320], async () => {
    await expect.poll(() => canvasFits(page)).toBe(true);
    await expectNoPageOverflow(page);
  });

  // From 640px: today's sizes, the full names, two cards to a row.
  await atWidths(page, [640, 768, 1024], async (width) => {
    await expectNoPageOverflow(page);
    expect(await shown()).toEqual([]);
    expect(await tab.locator(".panel").first().evaluate((el) => getComputedStyle(el).paddingTop)).toBe("16px");
    await expect.poll(async () => Math.round((await canvas.boundingBox()).height)).toBeGreaterThanOrEqual(300);
    await expect.poll(() => canvasFits(page)).toBe(true);
    const lefts = await tab.locator(".grid").first().locator("> .panel").evaluateAll((cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size);
    expect(lefts).toBe(2);
    expect(width).toBeGreaterThan(0);
  });
});

test("an overtime game's lead tracker and a game with too few scoring plays fit at 320px", async ({ page }) => {
  await openTab(page, "Game flow", { pbp: playByPlay({ overtime: true }) });
  await expect(page.getByRole("img", { name: /Running score margin/ })).toBeVisible();
  await atWidths(page, [320], async () => {
    await expect.poll(() => canvasFits(page)).toBe(true);
    await expectNoPageOverflow(page);
  });

  await page.unroute(`**/api/seasons/${SEASON}/games/1/play-by-play`);
  await page.route(`**/api/seasons/${SEASON}/games/1/play-by-play`, (route) => route.fulfill({ json: playByPlay({ plays: 1 }) }));
  await page.reload();
  await page.getByRole("tab", { name: "Game flow", exact: true }).click();
  await atWidths(page, [320], async (width) => {
    const note = page.getByText("Not enough play-by-play yet to chart game flow.");
    await expect(note).toBeVisible();
    expect(await insideScreen(note, width)).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("the Team comparison tab is compact below 640px and every value and average line stays in its half", async ({ page }) => {
  await openTab(page, "Team comparison");
  const tab = page.locator("#game-detail-panel");
  await expect(tab.getByText("Head to head")).toBeVisible();
  await expect(tab.getByText("Each team against its season average")).toBeVisible();
  await expect(tab.getByText("How each team scored and how the game was led")).toBeVisible();
  const halves = tab.locator(".grid-cols-2 > .rounded-field");
  const rowPadding = () => tab.locator("section .border-b.border-base-300").first().evaluate((el) => getComputedStyle(el).paddingTop);

  await atWidths(page, [320, 390, 639], async (width) => {
    await expectNoPageOverflow(page);
    expect(await insideScreen(tab.locator(".panel"), width)).toBe(true);
    expect(await holdsContent(halves)).toBe(true);
    expect(await splitWords(tab.locator(".text-xs.font-bold, h4, .muted"))).toEqual([]);
    expect(await rowPadding()).toBe("8px");
    expect(await tab.locator(".panel").first().evaluate((el) => getComputedStyle(el).paddingTop)).toBe("12px");
    // The assisted-baskets line and the season-average lines, the "Lower is better" marker and the hidden-average note are in view.
    await expect(tab.getByText("19 of 30 (63.3%)")).toBeVisible();
    await expect(tab.getByText("Lower is better").first()).toBeVisible();
    await expect(tab.getByText(/Season averages need at least 3 games/)).toBeVisible();
    expect(await holdsContent(tab.locator(".panel"))).toBe(true);
  });

  // Head to head and Scoring profile show the values and the highlight without bars; Four Factors keeps its bars and ticks.
  const bars = (name) => tab.locator("section", { has: page.getByText(name) }).locator('[class~="h-1.5"]');
  await expect(bars("Head to head")).toHaveCount(0);
  await expect(bars("How each team scored and how the game was led")).toHaveCount(0);
  expect(await bars("Each team against its season average").count()).toBeGreaterThan(0);

  await atWidths(page, [640, 768, 1024], async () => {
    await expectNoPageOverflow(page);
    expect(await rowPadding()).toBe("12px");
    expect(await tab.locator(".panel").first().evaluate((el) => getComputedStyle(el).paddingTop)).toBe("16px");
  });
  // The three sections stack below lg and the first two sit side by side from it, as before.
  await atWidths(page, [768], async () => {
    const lefts = await tab.locator(".gap-6 > section").evaluateAll((sections) => sections.map((section) => Math.round(section.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
  });
  await atWidths(page, [1024], async () => {
    const lefts = await tab.locator(".gap-6 > section").evaluateAll((sections) => sections.map((section) => Math.round(section.getBoundingClientRect().left)));
    expect(lefts[0]).not.toBe(lefts[1]);
  });
});

test("each tab's note for a game that is not played stays inside the panel at 320px", async ({ page }) => {
  await openTab(page, "Game flow", { game: { played: false, localScore: null, roadScore: null }, mock: { played: false } });
  await atWidths(page, [320], async (width) => {
    const note = page.getByText("Game flow isn't available until this game is played.");
    await expect(note).toBeVisible();
    expect(await insideScreen(note, width)).toBe(true);
    await expectNoPageOverflow(page);
  });
  await page.getByRole("tab", { name: "Team comparison", exact: true }).click();
  await atWidths(page, [320], async (width) => {
    const note = page.getByText("Team comparison isn't available until this game is played.");
    await expect(note).toBeVisible();
    expect(await insideScreen(note, width)).toBe(true);
    await expectNoPageOverflow(page);
  });
});
