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

// Words of a shown name that the browser had to cut across two lines (a multi-word name may wrap at its spaces). Only the text
// that is shown counts: the hidden short or full label of a pair, and the screen-reader copy, are skipped.
const splitWords = (locator) =>
  locator.evaluateAll((els) => {
    const split = [];
    for (const el of els) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent.getBoundingClientRect().width <= 1 || parent.closest("[aria-hidden=true]") === null && parent.classList.contains("sr-only")) continue;
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
      // A played card carries a top-scorer line under each club (40b), an upcoming one each club's form and the arena (40c).
      expect(Math.max(...heights)).toBeLessThanOrEqual(170);
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

test("a round's games sit under one heading per day, in tip-off order, with undated games last", async ({ page }) => {
  const days = ["2026-11-05T12:00:00Z", "2026-11-05T13:30:00Z", "2026-11-06T12:00:00Z", null];
  await page.route(/\/api\/seasons\/[^/]+\/games\?.*round=\d+/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const base = body.games[0];
    body.games = days.map((scheduledAt, index) => ({ ...base, gameCode: 9100 + index, played: false, localScore: null, roadScore: null, scheduledAt }));
    await route.fulfill({ response, json: body });
  });
  await openGames(page);
  const expected = await page.evaluate(
    (dates) => dates.map((date) => new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })),
    days.slice(0, 3),
  );
  const headings = page.locator(".fixture-day-heading");
  await expect(headings).toHaveCount(3);
  await expect(headings.nth(0)).toHaveText(`${expected[0]}2 games`);
  await expect(headings.nth(1)).toHaveText(`${expected[2]}1 game`);
  await expect(headings.nth(2)).toHaveText("Date to be confirmed1 game");
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(expected[0]) })).toBeVisible();
  // Each day's cards, in order, under their own heading.
  const perDay = await page.locator(".fixture-days > section").evaluateAll((sections) => sections.map((section) => section.querySelectorAll(".fixture-card").length));
  expect(perDay).toEqual([2, 1, 1]);
});

for (const season of [undefined, "2013", "2019", "2000"]) {
  test(`${season ?? "live"} season: every game card sits under a day heading, and nothing overflows at 320px`, async ({ page }) => {
    await openGames(page, season);
    const orphans = await page.locator(".fixture-card").evaluateAll((cards) => cards.filter((card) => !card.closest("section")?.querySelector(":scope > h2.fixture-day-heading")).length);
    expect(orphans).toBe(0);
    await atWidths(page, [320, 1024], async () => {
      expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
    });
  });
}

// Feature 40b: the games list's opt-in `cards=true` fields, from the running backend and the local data.
const API = "http://localhost:3000/api/seasons";

test("cards=true adds top scorers and overtimes; without it the reply is as before; any other value is a 400", async ({ page }) => {
  const plain = await (await page.request.get(`${API}/2025/games?phase=RS&round=1`)).json();
  for (const game of plain.games) {
    expect(game).not.toHaveProperty("topScorers");
    expect(game).not.toHaveProperty("overtimes");
  }
  const bad = await page.request.get(`${API}/2025/games?phase=RS&round=1&cards=yes`);
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error.code).toBe("INVALID_CARDS");

  // A finished season's played games: each side's scorer is the side's real top scorer, and some game went to overtime.
  let overtimeGames = 0;
  for (let round = 1; round <= 34 && overtimeGames === 0; round += 1) {
    const { games } = await (await page.request.get(`${API}/2024/games?phase=RS&round=${round}&cards=true`)).json();
    for (const game of games) {
      expect(game.overtimes === null || Number.isInteger(game.overtimes)).toBe(true);
      if (game.overtimes >= 1) overtimeGames += 1;
    }
    if (round === 1) {
      const game = games.find((entry) => entry.played);
      const box = await (await page.request.get(`${API}/2024/games/${game.gameCode}/box-score`)).json();
      const best = Math.max(...box.playerStats.filter((row) => row.side === "local" && row.points !== null).map((row) => row.points));
      expect(game.topScorers.local.points).toBe(best);
      expect(game.overtimes).toBe(0);
    }
  }
  expect(overtimeGames).toBeGreaterThan(0);

  // A game still to play has no scorers.
  const { games: upcoming } = await (await page.request.get(`${API}/2026/games?status=scheduled&limit=1&cards=true`)).json();
  if (upcoming.length > 0) expect(upcoming[0].topScorers).toEqual({ local: null, road: null });
});

test("played cards show each side's top scorer and an overtime marker; a forfeit and a missing scorer show nothing", async ({ page }) => {
  const scorer = (name, points) => ({ personKey: `P${points}`, personName: name, headshotUrl: null, points });
  await page.route(/\/api\/seasons\/[^/]+\/games\?.*round=\d+/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const base = { ...body.games[0], played: true, gameStatus: "Result", scheduledAt: "2026-11-05T19:00:00Z" };
    body.games = [
      { ...base, gameCode: 9201, localScore: 88, roadScore: 76, overtimes: 0, topScorers: { local: scorer("VEZENKOV, SASHA", 24), road: scorer("NUNN, KENDRICK", 19) } },
      { ...base, gameCode: 9202, localScore: 95, roadScore: 93, overtimes: 1, topScorers: { local: scorer("ANTETOKOUNMPO-SPRINGFIELD, ALEXANDROS", 31), road: null } },
      { ...base, gameCode: 9203, localScore: 101, roadScore: 104, overtimes: 2, topScorers: { local: scorer("HEZONJA, MARIO", 28), road: scorer("LESSORT, MATHIAS", 26) } },
      { ...base, gameCode: 9204, gameStatus: "Walkover", localScore: 20, roadScore: 0, overtimes: null, topScorers: { local: null, road: null } },
    ];
    await route.fulfill({ response, json: body });
  });
  await openGames(page);
  const cards = page.locator(".fixture-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0).locator(".fixture-scorer")).toHaveCount(2);
  await expect(cards.nth(0).locator(".fixture-date")).not.toContainText("OT");
  await expect(cards.nth(0).locator(".score-pill")).toHaveAttribute("aria-label", "Final score 88 to 76");
  await expect(cards.nth(1).locator(".fixture-scorer")).toHaveCount(1);
  await expect(cards.nth(1).locator(".fixture-date")).toContainText("Final · OT ·");
  await expect(cards.nth(2).locator(".fixture-date")).toContainText("Final · 2OT ·");
  await expect(cards.nth(3).locator(".fixture-scorer")).toHaveCount(0);
  await expect(cards.nth(3).locator(".fixture-date")).toContainText("Forfeit");
  // The card stays one link: nothing inside it is another link.
  expect(await cards.locator("a").count()).toBe(0);
  await atWidths(page, [320, 390, 768, 1024], async () => {
    expect(await cardsHoldTheirContent(page)).toBe(true);
    const clipped = await page.locator(".fixture-scorer").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().right > el.closest(".fixture-team").getBoundingClientRect().right + 1).length);
    expect(clipped).toBe(0);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
  });
});

// Feature 40c: upcoming cards carry both clubs' recent form (from the standings the page loads) and the arena.
test("cards=true carries the arena; without it there is none", async ({ page }) => {
  const plain = await (await page.request.get(`${API}/2025/games?phase=RS&round=1`)).json();
  for (const game of plain.games) expect(game).not.toHaveProperty("venueName");
  const { games } = await (await page.request.get(`${API}/2025/games?phase=RS&round=1&cards=true`)).json();
  expect(games.length).toBeGreaterThan(0);
  for (const game of games) expect(game.venueName === null || (typeof game.venueName === "string" && game.venueName.trim() !== "")).toBe(true);
  expect(games.some((game) => typeof game.venueName === "string")).toBe(true);
});

test("upcoming cards show both clubs' last five results and the arena; a missing form or arena shows nothing", async ({ page }) => {
  const club = (code, name) => ({ clubCode: code, name, abbreviatedName: name, tvCode: code, crestUrl: null });
  const form = (results) => results.map((result, index) => ({ resultOrdinal: index + 1, result }));
  await page.route(/\/api\/seasons\/[^/]+\/phases\/[^/]+\/standings/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const base = body.standings[0];
    body.standings = [
      { ...base, clubCode: "AAA", groupName: null, form: form(["L", "W", "W", "L", "W", "W", "W"]) },
      { ...base, clubCode: "BBB", groupName: null, form: form(["W", "L"]) },
      { ...base, clubCode: "CCC", groupName: null, form: [] },
    ];
    await route.fulfill({ response, json: body });
  });
  await page.route(/\/api\/seasons\/[^/]+\/games\?.*round=\d+/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const base = { ...body.games[0], played: false, localScore: null, roadScore: null, gameStatus: null, scheduledAt: "2026-11-05T19:00:00Z", topScorers: { local: null, road: null }, overtimes: null };
    body.games = [
      { ...base, gameCode: 9301, localTeam: club("AAA", "Alpha"), roadTeam: club("BBB", "Beta"), venueName: "Palacio de los Deportes Bilbao Arena Miribilla Long Name" },
      { ...base, gameCode: 9302, localTeam: club("CCC", "Gamma"), roadTeam: club("DDD", "Delta"), venueName: null },
    ];
    await route.fulfill({ response, json: body });
  });
  await openGames(page);
  const cards = page.locator(".fixture-card");
  await expect(cards).toHaveCount(2);
  // The last five of seven, oldest first, with the standings table's label; two results when that is all there is.
  await expect(cards.nth(0).locator(".fixture-form")).toHaveCount(2);
  await expect(cards.nth(0).locator(".fixture-form").nth(0).locator(".badge")).toHaveText(["W", "L", "W", "W", "W"]);
  await expect(cards.nth(0).locator(".fixture-form").nth(0).locator("[aria-label]")).toHaveAttribute("aria-label", "Last 5: win, loss, win, win, win");
  await expect(cards.nth(0).locator(".fixture-form").nth(1).locator(".badge")).toHaveCount(2);
  await expect(cards.nth(0).locator(".fixture-venue")).toHaveAttribute("title", "Palacio de los Deportes Bilbao Arena Miribilla Long Name");
  // No form (an empty one, a club without a standings row) and no arena: nothing at all.
  await expect(cards.nth(1).locator(".fixture-form")).toHaveCount(0);
  await expect(cards.nth(1).locator(".fixture-venue")).toHaveCount(0);
  expect(await cards.locator("a").count()).toBe(0);
  await atWidths(page, [320, 390, 768, 1024], async () => {
    expect(await cardsHoldTheirContent(page)).toBe(true);
    const outside = await page.locator(".fixture-form, .fixture-venue").evaluateAll((els) =>
      els.filter((el) => {
        const box = el.getBoundingClientRect();
        const card = el.closest(".fixture-card").getBoundingClientRect();
        return box.left < card.left - 1 || box.right > card.right + 1;
      }).length);
    expect(outside).toBe(0);
    expect(await findPageOverflow(page)).toMatchObject({ offenders: [] });
  });
});
