import { test, expect } from "@playwright/test";
import { HEIGHT, findPageOverflow, seasonSlug } from "./support/layout";

// Each test loads the page once and resizes the window through its widths: the layout depends on the viewport only.
async function openGames(page, season) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const live = await seasonSlug(page);
  await page.goto(`/${season ?? live}/games`);
  await expect(page.locator(".fixture-card").first()).toBeVisible({ timeout: 30_000 });
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const roundTab = (page) => page.locator(".round-strip .tab").first();
const activeVisible = (page) =>
  page.locator(".round-strip").evaluate((strip) => {
    const active = strip.querySelector("[aria-selected=true]").getBoundingClientRect();
    const box = strip.getBoundingClientRect();
    return active.left >= box.left - 1 && active.right <= box.right + 1;
  });

// Words of a shown name that the browser had to cut across two lines (a multi-word name may wrap at its spaces).
const splitWords = (locator) =>
  locator.evaluateAll((els) => {
    const split = [];
    for (const el of els) {
      const node = el.firstChild;
      if (!node) continue;
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
    return split;
  });

// Whether every card's content sits inside the card, and the cards' team and centre columns do not overlap.
const cardsHoldTheirContent = (page) =>
  page.locator(".fixture-card").evaluateAll((cards) =>
    cards.every((card) => {
      const box = card.getBoundingClientRect();
      const parts = [...card.querySelectorAll(".fixture-team, .fixture-center, .fixture-cta")].map((el) => el.getBoundingClientRect());
      const inside = parts.every((part) => part.left >= box.left - 1 && part.right <= box.right + 1);
      const [home, centre, road] = [...card.querySelectorAll(".fixture-card-body > *")].map((el) => el.getBoundingClientRect());
      return inside && home.right <= centre.left + 1 && centre.right <= road.left + 1;
    }),
  );

for (const season of [undefined, "2025"]) {
  test(`${season ? "finished" : "live"} season: the round strip and the cards are compact below 640px and as before from it`, async ({ page }) => {
    await openGames(page, season);

    await atWidths(page, [320, 390, 639], async () => {
      await page.waitForTimeout(400);
      const padding = await roundTab(page).evaluate((el) => getComputedStyle(el).paddingLeft);
      expect(padding).toBe("8px");
      const heights = await page.locator(".fixture-card").evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
      expect(Math.max(...heights)).toBeLessThanOrEqual(130);
      const crest = await page.locator(".fixture-crest").first().evaluate((el) => Math.round(el.getBoundingClientRect().width));
      expect(crest).toBe(32);
      // One column, and the margin under the round row is the small one.
      const lefts = await page.locator(".fixture-card").evaluateAll((cards) => new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size);
      expect(lefts).toBe(1);
      expect(await splitWords(page.locator(".fixture-team-name"))).toEqual([]);
      expect(await cardsHoldTheirContent(page)).toBe(true);
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });

    await atWidths(page, [640, 768, 1024], async () => {
      const padding = await roundTab(page).evaluate((el) => getComputedStyle(el).paddingLeft);
      expect(padding).toBe("12px");
      const heights = await page.locator(".fixture-card").evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().height)));
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(160);
      const crest = await page.locator(".fixture-crest").first().evaluate((el) => Math.round(el.getBoundingClientRect().width));
      expect(crest).toBe(44);
    });
  });
}

test("the selected round stays in view, and the buttons move between rounds, on a phone", async ({ page }) => {
  await openGames(page);
  await atWidths(page, [320, 390], async () => {
    await expect.poll(() => activeVisible(page)).toBe(true);
    const before = await page.locator('.round-strip [aria-selected="true"]').textContent();
    await page.getByRole("button", { name: "Next round" }).click();
    await expect(page.locator('.round-strip [aria-selected="true"]')).not.toHaveText(before);
    await expect.poll(() => activeVisible(page)).toBe(true);
    await page.getByRole("button", { name: "Previous round" }).click();
    await expect(page.locator('.round-strip [aria-selected="true"]')).toHaveText(before);
    await expect.poll(() => activeVisible(page)).toBe(true);
  });
});

test("cards with long names, three-digit scores and a club still to be set hold their content at 320px", async ({ page }) => {
  const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
  const team = (name, abbreviatedName, code) => ({ clubCode: code, name, abbreviatedName, crestUrl: crest });
  await page.route(/\/api\/seasons\/[^/]+\/games\?.*round=\d+/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const base = body.games[0];
    body.games = [
      { ...base, gameCode: 9001, played: true, localScore: 112, roadScore: 101, localTeam: team("Panathinaikos AKTOR Athens", "Panathinaikos", "PAN"), roadTeam: team("Crvena Zvezda Meridianbet Belgrade", "Crvena Zvezda", "CZV") },
      { ...base, gameCode: 9002, played: true, localScore: 100, roadScore: 99, localTeam: team("Fenerbahce Beko Istanbul", "Fenerbahce", "ULK"), roadTeam: team("Olympiacos Piraeus", "Olympiacos", "OLY") },
      { ...base, gameCode: 9003, played: false, localScore: null, roadScore: null, localTeam: team("Real Madrid", "Real", "MAD"), roadTeam: { clubCode: null, name: null, abbreviatedName: null, crestUrl: null } },
    ];
    await route.fulfill({ response, json: body });
  });
  await openGames(page);
  await atWidths(page, [320], async () => {
    await expect(page.locator(".fixture-card")).toHaveCount(3);
    expect(await cardsHoldTheirContent(page)).toBe(true);
    expect(await splitWords(page.locator(".fixture-team-name"))).toEqual([]);
    await expect(page.locator(".fixture-card").nth(2)).toContainText("TBD");
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
  });
});
