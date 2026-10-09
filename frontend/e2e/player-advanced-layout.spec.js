import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Advanced tab at every width. Each test loads the page once and resizes the window: the layout depends on
// the viewport only. The advanced response is the live one with its on/off, RAPM and early-season fields set to known shapes.
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
const ADVANCED = /\/api\/seasons\/[^/]+\/players\/[^/]+\/advanced(\?|$)/;

// Answers the advanced request with the live response after `patch` has changed its JSON.
async function patchAdvanced(page, patch) {
  await page.route(ADVANCED, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    patch(json);
    await route.fulfill({ response, json });
  });
}

const club = (clubCode, clubName) => ({
  clubCode,
  clubName,
  crestUrl: null,
  onSeconds: 600 * 60,
  offSeconds: 1400 * 60,
  onOrtg: 112.4,
  offOrtg: 108.1,
  onDrtg: 103.2,
  offDrtg: 106.9,
  ortgDiff: 4.3,
  drtgDiff: -3.7,
  netRatingDiff: 8.0,
});

// A traded player with a long club name, enough minutes for on/off and RAPM, and the early-season note.
const full = (json) => {
  json.onOff = [club("AAA", "Panathinaikos AKTOR Athens"), club("BBB", "Kosner Baskonia Vitoria-Gasteiz")];
  json.rapm = { ...(json.rapm ?? {}), rapm: 0.6, offense: 1.0, defense: -0.4, seconds: 900 * 60, possessionsOffense: 1200, possessionsDefense: 1190 };
  json.earlySeason = true;
  json.roundsPlayed = 4;
};

async function openAdvanced(page, href) {
  await page.goto(href);
  await page.getByRole("tab", { name: "Advanced" }).click();
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each box sits inside it. A box that scrolls on its own and a chart canvas that is still redrawing after a
// resize are left to their own checks.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.closest("[role=tablist]") || child.parentElement.closest("[role=region], canvas, .overflow-x-auto")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

// The early-season note appears once, under the scope strip and above the scorecard, and not inside the on/off or RAPM sections.
async function expectOneNoteAboveScorecard(page) {
  await expect(page.getByText(/Small sample of data/)).toHaveCount(1);
  const note = page.getByText(/Small sample of data/);
  await expect(note).toBeVisible();
  const above = await page.evaluate(() => {
    const note = [...document.querySelectorAll("p")].find((p) => p.textContent.includes("Small sample of data"));
    const heading = [...document.querySelectorAll("#player-advanced-panel section")].find((section) => section.textContent.includes("SCORECARD"));
    const strip = document.querySelector("[aria-label='Advanced stats scope']");
    return {
      belowStrip: note.getBoundingClientRect().top >= strip.getBoundingClientRect().bottom - 1,
      aboveScorecard: note.getBoundingClientRect().bottom <= heading.getBoundingClientRect().top + 1,
      outsideSections: !note.closest("#player-advanced-panel section"),
    };
  });
  expect(above).toEqual({ belowStrip: true, aboveScorecard: true, outsideSections: true });
}

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);

// Whether a strip is one row with its selected tab inside it.
const stripState = (strip) =>
  strip.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const tabs = [...el.querySelectorAll("[role=tab]")];
    const selected = el.querySelector("[aria-selected=true]").getBoundingClientRect();
    return {
      oneRow: new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1,
      visible: selected.left >= box.left - 1 && selected.right <= box.right + 1,
      inWindow: box.right <= window.innerWidth + 1,
    };
  });

test("the scope strip, the scorecard and the reading guide fit at every width", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await openAdvanced(page, href);
  const scope = page.getByRole("tablist", { name: "Advanced stats scope" });
  const scorecard = page.locator("#player-advanced-panel section", { hasText: "SCORECARD" }).first();
  const cards = scorecard.locator("div.grid > div");
  await expect(cards).toHaveCount(6, { timeout: 60_000 });

  await atWidths(page, WIDTHS, async (width) => {
    expect(await stripState(scope)).toEqual({ oneRow: true, visible: true, inWindow: true });
    // One card to a row below 640px, two from 640px.
    expect(await columns(cards)).toBe(width < 640 ? 1 : 2);
    expect(await holdsContent(cards)).toBe(true);

    // The gauge captions stay inside their card and do not sit on top of each other.
    const captions = await cards.evaluateAll((items) =>
      items.map((card) => {
        const box = card.getBoundingClientRect();
        const spans = [...card.querySelectorAll("div.h-7 > span.absolute")].map((span) => span.getBoundingClientRect()).sort((a, b) => a.left - b.left);
        const inside = spans.every((rect) => rect.left >= box.left - 1 && rect.right <= box.right + 1);
        const apart = spans.every((rect, index) => index === 0 || rect.left >= spans[index - 1].right - 1);
        return { inside, apart };
      }),
    );
    for (const caption of captions) expect(caption).toEqual({ inside: true, apart: true });

    // No word of a label or a verdict line is cut in the middle.
    expect(await findBrokenWords(cards.locator("p"))).toEqual([]);
    await expectNoSidewaysScroll(page);
  });

  // The reading guide: its definitions are one column below 640px and two from 640px.
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const guide = page.locator("#player-advanced-panel details", { hasText: "How to read these numbers" });
  await guide.locator("summary").click();
  await atWidths(page, [320, 639, 640, 1024], async (width) => {
    expect(await holdsContent(guide)).toBe(true);
    expect(await columns(guide.locator("dl > div"))).toBe(width < 640 ? 1 : 2);
    await expectNoSidewaysScroll(page);
  });
});

test("the chart, the on/off cards and the RAPM rows fit at every width", async ({ page }) => {
  const { href } = await veteranPlayer(page);
  await patchAdvanced(page, full);
  await openAdvanced(page, href);
  const trend = page.locator("#player-advanced-panel section", { hasText: "ROUND BY ROUND" }).first();
  const onOff = page.locator("#player-advanced-panel section", { hasText: "ON / OFF" }).last();
  const rapm = page.locator("#player-advanced-panel section", { hasText: "RAPM" }).last();
  const ratings = page.getByRole("tablist", { name: "Rating to chart" });
  await expect(onOff.locator(".panel")).toHaveCount(2, { timeout: 60_000 });
  await expect(trend.locator("canvas")).toBeVisible();
  await expectOneNoteAboveScorecard(page);
  await expect(page.getByText(/Based on only/)).toHaveCount(0);
  await trend.locator("details summary").click();

  await atWidths(page, WIDTHS, async (width) => {
    expect(await stripState(ratings)).toEqual({ oneRow: true, visible: true, inWindow: true });

    // The chart stays inside its panel (it redraws a moment after a resize) and the round-by-round table scrolls in its own box.
    await expect
      .poll(() =>
        trend.locator("canvas").evaluate((canvas) => {
          const panel = canvas.closest(".panel").getBoundingClientRect();
          const box = canvas.getBoundingClientRect();
          return box.left >= panel.left - 1 && box.right <= panel.right + 1;
        }),
      )
      .toBe(true);

    // The on/off cards: one to a row, the net rating under the club name below 640px and beside it from 640px.
    const cards = onOff.locator(".panel");
    expect(await columns(cards)).toBe(1);
    await expect.poll(() => holdsContent(cards)).toBe(true);
    const header = await cards.first().evaluate((card) => {
      const name = card.querySelector("h3").getBoundingClientRect();
      const net = [...card.querySelectorAll("span")].find((span) => span.textContent.trim().startsWith("+8")).getBoundingClientRect();
      return net.top >= name.bottom - 1 ? "under" : "beside";
    });
    // On a phone the net rating is under the club name; at 639px there is room for it beside the name, from 640px it is beside it.
    if (width <= 390) expect(header).toBe("under");
    if (width >= 640) expect(header).toBe("beside");
    const stacked = await cards.evaluateAll((items) => items[1].getBoundingClientRect().top >= items[0].getBoundingClientRect().bottom - 1);
    expect(stacked).toBe(true);

    // The RAPM rows keep a readable bar, and the scale caption under them is whole and inside the panel.
    const rapmState = await rapm.locator(".panel").evaluate((panel) => {
      const box = panel.getBoundingClientRect();
      const bar = panel.querySelector("div.relative.h-2\\.5").getBoundingClientRect();
      const caption = [...panel.querySelectorAll("span")].find((span) => span.textContent.includes("0") && span.children.length >= 2 && span.querySelectorAll("span").length >= 3);
      const rect = caption?.getBoundingClientRect();
      return { bar: bar.width, inside: Boolean(rect) && rect.left >= box.left - 1 && rect.right <= box.right + 1 };
    });
    expect(rapmState.bar).toBeGreaterThanOrEqual(width < 640 ? 100 : 160);
    expect(rapmState.inside).toBe(true);
    await expect.poll(() => holdsContent(rapm.locator(".panel"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the empty, small-sample, unranked and failing states fit a phone", async ({ page }) => {
  test.setTimeout(120_000);
  const { href } = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const panel = page.locator("#player-advanced-panel");
  const check = async () => {
    expect(await holdsContent(panel)).toBe(true);
    await expectNoSidewaysScroll(page);
  };

  // No on/off, a too-small RAPM sample, an unranked player, and only one round (no trend).
  await patchAdvanced(page, (json) => {
    json.onOff = [];
    json.rapm = { ...(json.rapm ?? {}), rapm: 0.1, offense: 0.1, defense: 0, seconds: 5 * 60, possessionsOffense: 5, possessionsDefense: 5 };
    json.rounds = json.rounds.slice(0, 1);
    json.ranks = { ...json.ranks, per: { rank: null, of: 0, percentile: null, spread: null, minMinutes: 100 } };
    json.earlySeason = true;
    json.roundsPlayed = 1;
  });
  await openAdvanced(page, href);
  await expect(page.getByText("No on/off data for this scope.").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Not enough rounds yet to chart a trend.")).toBeVisible();
  await expect(page.getByText(/Sample too small to show: 5 minutes tracked/)).toBeVisible();
  await expect(page.getByText("Not ranked: under 100 minutes played.")).toBeVisible();
  await expectOneNoteAboveScorecard(page);
  await check();
  await page.unroute(ADVANCED);

  // A too-small on/off sample and no RAPM.
  await patchAdvanced(page, (json) => {
    json.onOff = [{ ...club("AAA", "Panathinaikos AKTOR Athens"), onSeconds: 55 * 60 }];
    json.rapm = null;
  });
  await page.reload();
  await page.getByRole("tab", { name: "Advanced" }).click();
  // A small on-court sample is shown, with a line saying how small: on the scorecard card and on the on/off card.
  await expect(page.getByText("Based on only 55 of 300 minutes on court.")).toHaveCount(2, { timeout: 60_000 });
  await expect(page.getByText(/Sample too small to show: 55 minutes on court/)).toHaveCount(0);
  await expect(page.locator("#player-advanced-panel section", { hasText: "SCORECARD" }).locator("div.grid > div").nth(5)).toContainText("+8.0");
  await expect(page.getByText("No RAPM estimate for this player.")).toBeVisible();
  await check();
  await page.unroute(ADVANCED);

  // No rounds: only the message (and the RAPM section when there is one).
  await patchAdvanced(page, (json) => {
    json.rounds = [];
    json.earlySeason = true;
    json.roundsPlayed = 4;
  });
  await page.reload();
  await page.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.getByText("Advanced stats are not available yet for this player.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Small sample of data/)).toHaveCount(1);
  await expectNoSidewaysScroll(page);
  await page.unroute(ADVANCED);

  // A failing request.
  await page.route(ADVANCED, (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.reload();
  await page.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.getByText("Could not load advanced player stats.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
