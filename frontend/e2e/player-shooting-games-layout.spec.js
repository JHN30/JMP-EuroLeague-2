import { test, expect } from "@playwright/test";
import { HEIGHT } from "./support/layout";
import { veteranPlayer } from "./support/player";

// The player page's Games and Shooting tabs at every width. Each test loads the page once and resizes the window: the layout depends
// on the viewport only. The player is live; the game log (and the shot charts) are built from one of the player's real games so
// that each case has the shape it needs.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
// From 1280px the breakdown's right-hand column is only about 420px wide, the tightest the two tables get.
const WIDE = [...WIDTHS, 1280, 1440];
const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";

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

// Whether everything inside each box sits inside it. Text that a `truncate` element cuts with an ellipsis, a box that scrolls on its
// own, a tab strip (which scrolls) and a chart canvas are left to their own checks.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate, .overflow-x-auto, [role=region], [role=tablist], canvas")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);
const failing = (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } });

const LOG_URL = (url) => /\/api\/seasons\/[^/]+\/players\/[^/]+\/games$/.test(url.pathname);

// A log of `count` played games built from one of the player's real ones: they alternate home and away, every `lossEvery`th is lost
// and the stats and dates vary. `phases` gives the games phase names in turn.
async function logFor(page, { seasonCode, personKey }, { count = 40, lossEvery = 3, phases = [["RS", "Regular Season"]], rival } = {}) {
  const live = await (await page.request.get(`${API}/${seasonCode}/players/${personKey}/games?limit=100`)).json();
  const template = live.games.find((game) => game.played) ?? live.games[0];
  const tag = (club, name) => ({ ...club, abbreviatedName: name ?? club.abbreviatedName, name: name ?? club.name, tvCode: name ? "CZV" : club.tvCode, crestUrl: crest });
  const games = Array.from({ length: count }, (_, index) => {
    const home = index % 2 === 0;
    const won = lossEvery === 0 ? true : lossEvery === 1 ? false : (index + 1) % lossEvery !== 0;
    const mine = 70 + (index % 17);
    const theirs = won ? mine - 3 - (index % 9) : mine + 2 + (index % 11);
    const club = home ? template.localTeam : template.roadTeam;
    const other = tag(home ? template.roadTeam : template.localTeam, rival);
    const [phaseCode, phaseName] = phases[index % phases.length];
    return {
      ...template,
      gameCode: 9000 + index,
      played: true,
      side: home ? "local" : "road",
      phaseCode,
      phaseName,
      roundNumber: index + 1,
      roundName: null,
      scheduledAt: new Date(Date.UTC(2025, 9, 1 + index * 3, 18, 30)).toISOString(),
      localTeam: home ? tag(club) : other,
      roadTeam: home ? other : tag(club),
      localScore: home ? mine : theirs,
      roadScore: home ? theirs : mine,
      timePlayed: String(1500 + (index % 7) * 120),
      points: String(4 + ((index * 7) % 23)),
      totalRebounds: String(index % 9),
      assistances: String((index * 3) % 8),
      steals: String(index % 4),
      turnovers: String(index % 5),
      valuation: String(-2 + ((index * 5) % 31)),
      plusMinus: String((index % 21) - 10),
      fieldGoalsMade2: String(index % 6),
      fieldGoalsAttempted2: String((index % 6) + 3),
      fieldGoalsMade3: String(index % 4),
      fieldGoalsAttempted3: String((index % 4) + 2),
      freeThrowsMade: String(index % 5),
      freeThrowsAttempted: String((index % 5) + 1),
    };
  });
  return { games, pagination: { hasMore: false } };
}
const mockLog = async (page, payload) => {
  await page.unroute(LOG_URL).catch(() => {});
  await page.route(LOG_URL, (route) => route.fulfill({ json: payload }));
};

async function openTab(page, href, tab) {
  await page.goto(href);
  await page.getByRole("tab", { name: tab, exact: true }).click();
}

test("the Games tab fits every width: scrolling strips, badges under the title, one-column splits, a compact table with a narrow pinned opponent", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  const rival = "Meridianbet Crvena Zvezda Belgrade";
  await mockLog(page, await logFor(page, player, { count: 40, phases: [["RS", "Regular Season"], ["RS", "Regular Season"], ["PO", "Play-offs"], ["F4", "Final Four"]], rival }));
  await openTab(page, player.href, "Games");
  const bars = page.locator("section.panel", { has: page.getByRole("heading", { name: "How each game went" }) });
  await expect(bars).toBeVisible({ timeout: 60_000 });
  const table = page.getByRole("region", { name: "Every game, box scores" });
  const strips = ["Phase", "Stat to chart", "Games to show"].map((name) => page.getByRole("tablist", { name }));
  const splits = page.locator("#player-games-panel > div.grid > div");
  await expect(splits).toHaveCount(4);

  await atWidths(page, WIDE, async (width) => {
    const phone = width < 640;
    await expectNoSidewaysScroll(page);
    expect(await holdsContent(page.locator("#player-games-panel section.panel"))).toBe(true);

    // The chart's two badges: under the title below 640px, beside it from 640px; two are drawn (the other pair is display: none).
    await expect
      .poll(() =>
        bars.evaluate((el) => {
          const title = el.querySelector("h2").getBoundingClientRect();
          const shown = [...el.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
          return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
        }),
      )
      .toEqual({ count: 2, under: phone, beside: !phone });
    // The bars scroll inside their own box; the page does not.
    if (width <= 390) expect(await bars.locator("#player-games-bars").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

    // Each strip is one row, inside the window, with the selected tab on screen.
    for (const strip of strips) {
      const state = await strip.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const tabs = [...el.querySelectorAll("[role=tab]")];
        const selected = el.querySelector("[aria-selected=true]").getBoundingClientRect();
        return {
          oneRow: new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1,
          visible: selected.left >= box.left - 1 && selected.right <= box.right + 1,
          inWindow: box.right <= window.innerWidth + 1,
        };
      });
      expect(state).toEqual({ oneRow: true, visible: true, inWindow: true });
    }

    // The splits: one card to a row below 640px, two from 640px, four from 1280px; each card's four stats whole and in one row.
    expect(await columns(splits)).toBe(phone ? 1 : width >= 1280 ? 4 : 2);
    expect(await holdsContent(splits)).toBe(true);
    const rows = await splits.evaluateAll((cards) => cards.map((card) => new Set([...card.querySelectorAll("dl > div")].map((stat) => Math.round(stat.getBoundingClientRect().top))).size));
    expect(rows).toEqual([1, 1, 1, 1]);

    // The game table scrolls in its own region (a keyboard can reach it) with the opponent pinned.
    await expect(table).toHaveAttribute("tabindex", "0");
    const scrolls = await table.evaluate((el) => el.scrollWidth > el.clientWidth);
    if (width <= 390) expect(scrolls).toBe(true);
    const pinned = await table.evaluate((el) => {
      el.scrollLeft = 0;
      const cell = el.querySelector("tbody td:first-child");
      const before = cell.getBoundingClientRect();
      el.scrollLeft = 80;
      const after = cell.getBoundingClientRect();
      el.scrollLeft = 0;
      return { moved: Math.abs(after.left - before.left), width: before.width, panel: el.getBoundingClientRect().width };
    });
    if (scrolls) expect(pinned.moved).toBeLessThan(1);
    if (phone) expect(pinned.width).toBeLessThan(pinned.panel * 0.4);

    // Scrolled cells never show beside or over the pinned column (the PTS and PIR numbers sit above their bars, which must not
    // lift them above it): at several scroll positions, every point across the pinned cell belongs to it.
    if (scrolls) {
      const leaks = await table.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
        const box = el.getBoundingClientRect();
        const found = [];
        for (const left of [60, 120, 200, 300, 400]) {
          el.scrollLeft = left;
          const row = [...el.querySelectorAll("tbody tr")].map((tr) => tr.getBoundingClientRect()).find((rect) => rect.top > 120 && rect.bottom < window.innerHeight - 10);
          const cell = el.querySelector("tbody td:first-child").getBoundingClientRect();
          for (let x = box.left + 2; x < cell.right - 2; x += 6) {
            const hit = document.elementFromPoint(x, row.top + row.height / 2);
            if (!hit?.closest("td:first-child, th:first-child")) found.push(left + ":" + Math.round(x));
          }
        }
        el.scrollLeft = 0;
        return found;
      });
      expect(leaks).toEqual([]);
    }

    // The opponent: its TV code below 640px, the abbreviated name from 640px (never cut); the crest only from 640px.
    const labels = await table.locator("tbody td:first-child a").first().evaluate((link) =>
      [...link.querySelectorAll(".relative > span")].filter((s) => s.getBoundingClientRect().width > 1).map((s) => s.textContent.trim()).join(""),
    );
    expect(labels.length).toBeGreaterThan(0);
    if (!phone) expect(labels).toBe(rival);
    else expect(labels).not.toBe(rival);
    const crestShown = await table.locator("tbody td:first-child img").first().evaluate((img) => img.getBoundingClientRect().width > 0).catch(() => false);
    if (phone) expect(crestShown).toBe(false);

    // The PTS and PIR bars are drawn from 640px only.
    const bars2 = await table.locator(".stat-bar-cell .bar").first().evaluate((el) => getComputedStyle(el).display);
    expect(bars2 === "none").toBe(phone);
    expect(await page.getByText("The bars in the PTS and PIR columns compare the games shown.").isVisible()).toBe(!phone);
  });

  // Arrow keys move between the phase tabs.
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const phase = page.getByRole("tablist", { name: "Phase" });
  await phase.getByRole("tab").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(phase.getByRole("tab").nth(1)).toBeFocused();
});

test("the Games tab states fit a phone: a few games, none, no match for the filter, show all, failing", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // Three games, all lost: no Phase strip, and "Wins" matches nothing.
  await mockLog(page, await logFor(page, player, { count: 3, lossEvery: 1 }));
  await openTab(page, player.href, "Games");
  await expect(page.getByRole("heading", { name: "How each game went" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("tablist", { name: "Phase" })).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  expect(await holdsContent(page.locator("#player-games-panel section.panel, #player-games-panel > div.grid > div"))).toBe(true);
  await page.getByRole("tab", { name: "Wins", exact: true }).click();
  await expect(page.getByText("No games match this filter.")).toBeVisible();
  await expect(page.getByText("No games.").first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  // A long log: "Show all" and "Show fewer".
  await mockLog(page, await logFor(page, player, { count: 40 }));
  await openTab(page, player.href, "Games");
  await expect(page.getByRole("button", { name: /^Show all/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /^Show all/ }).click();
  await expect(page.getByRole("button", { name: "Show fewer" })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // No game log.
  await mockLog(page, { games: [], pagination: { hasMore: false } });
  await openTab(page, player.href, "Games");
  await expect(page.getByText("No game log available yet.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // A failing request.
  await page.unroute(LOG_URL);
  await page.route(LOG_URL, failing);
  await openTab(page, player.href, "Games");
  await expect(page.getByText("Could not load the game log.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

// ---- The Shooting tab ----

const SHOTS_URL = (url) => /\/api\/seasons\/[^/]+\/games\/\d+\/shots$/.test(url.pathname);

// One field-goal attempt by `personCode`; coordinates are centimetres from the hoop.
const shot = (ordinal, personCode, actionCode, coordX, coordY, overrides = {}) => ({
  shotOrdinal: ordinal,
  clubCode: "AAA",
  personCode,
  playerName: "ONE, AL",
  actionCode,
  points: actionCode.startsWith("3") ? 3 : 2,
  coordX,
  coordY,
  fastbreak: false,
  secondChance: false,
  pointsOffTurnover: false,
  minute: 3,
  markerTime: "07:00",
  pointsA: null,
  pointsB: null,
  ...overrides,
});

// Attempts in every quarter and one overtime, from the zones of the court, some made in a situation.
function shotsFor(personCode, { located = true } = {}) {
  const spots = [[0, 50, "2FGM"], [200, 300, "2FGA"], [-500, 480, "3FGM"], [100, 700, "3FGA"], [-400, 100, "2FGA"], [350, 350, "2FGM"], [650, 150, "3FGM"]];
  const rows = [];
  let ordinal = 1;
  for (const minute of [3, 15, 25, 35, 45]) {
    for (const [index, [x, y, action]] of spots.entries()) {
      rows.push(shot(ordinal++, personCode, action, located ? x : null, located ? y : null, { minute, fastbreak: index === 0, secondChance: index === 5 }));
    }
  }
  return { shots: rows };
}

const mockShots = async (page, payload) => {
  await page.unroute(SHOTS_URL).catch(() => {});
  await page.route(SHOTS_URL, (route) => route.fulfill({ json: payload }));
};

async function openShooting(page, player, { payload = shotsFor(player.personKey), log } = {}) {
  await mockLog(page, log ?? (await logFor(page, player, { count: 3 })));
  await mockShots(page, payload);
  await openTab(page, player.href, "Shooting");
}

const panelOf = (page, title) => page.locator("#player-shooting-panel section.panel", { has: page.getByRole("heading", { name: title }) });

test("the Shooting tab fits every width: the zones badges under their title, one control visible and two behind Filters below 640px", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await openShooting(page, player);
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 60_000 });
  const zones = panelOf(page, "Where the shots come from");
  const filters = page.getByRole("button", { name: /^Filters/ });
  const segment = page.getByLabel("Game segment");

  // Which of a panel's badges are drawn, and whether they are under its title or beside it.
  const badgesOf = (locator, selector) =>
    locator.evaluate((el, sel) => {
      const title = el.querySelector("h2").getBoundingClientRect();
      const shown = [...el.querySelectorAll(sel)].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
      return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
    }, selector);

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // There is no "games mapped" badge (the attempts are counted in the cards); the zones' badges are under their title on a phone and
    // beside it from 640px (one copy is drawn).
    await expect(page.getByText(/games mapped/)).toHaveCount(0);
    await expect.poll(() => badgesOf(zones, ".stat-badge-positive, .stat-badge-negative")).toEqual({ count: 2, under: phone, beside: !phone });

    // Presentation is always there; the segment select is behind the button below 640px and in the row from 640px.
    await expect(page.getByRole("tab", { name: "Every attempt", exact: true })).toBeVisible();
    if (phone) {
      await expect(filters).toBeVisible();
      await expect(segment).toBeHidden();
    } else {
      await expect(filters).toBeHidden();
      await expect(segment).toBeVisible();
    }
    expect(await holdsContent(page.locator("#player-detail-panel section.panel"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the Filters button counts the segment and the result, opens the controls and filtering still works", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await openShooting(page, player);
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 60_000 });
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const filters = page.getByRole("button", { name: /^Filters/ });
  const segment = page.getByLabel("Game segment");
  const fieldGoals = page.locator("p.eyebrow", { hasText: "Field goals" }).locator("xpath=following-sibling::p[1]");

  await expect(filters).toHaveText(/^Filters\s*▾$/);
  await expect(filters).toHaveAttribute("aria-expanded", "false");
  const before = await fieldGoals.textContent();
  await filters.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await expect(segment).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Result" })).toHaveCount(0);
  await segment.selectOption({ label: "Q1" });
  await expect(filters).toContainText("Filters · 1 active");
  await expect.poll(() => fieldGoals.textContent()).not.toBe(before);

  // The result strip exists only on "Every attempt"; both count.
  await page.getByRole("tab", { name: "Every attempt", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "Result" })).toBeVisible();
  await page.getByRole("tab", { name: "Made", exact: true }).click();
  await expect(filters).toContainText("Filters · 2 active");
  // Closing the button does not reset a filter.
  await filters.click();
  await expect(segment).toBeHidden();
  await expect(filters).toContainText("Filters · 2 active");
  await expectNoSidewaysScroll(page);
});

test("the Shooting court and tables hold their content, with percentage-only chips on a narrow court and the plain table wording", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await openShooting(page, player);
  await expect(page.getByText("Where the shots come from")).toBeVisible({ timeout: 60_000 });
  const court = page.getByRole("img", { name: /shot locations/ });
  await expect(court).toBeVisible();
  const zones = panelOf(page, "Where the shots come from");
  const style = panelOf(page, /^How .* scores$/);

  // The notes under the tables and the rows: the three situations the feed marks; no "Half court".
  await expect(zones.locator("p.muted")).toHaveText("Hottest and coldest only count zones with a fair number of attempts.");
  await expect(style.locator("p.muted")).toHaveText("A basket can be in more than one situation (a fast break off a turnover counts in both).");
  await expect(style.locator("li")).toHaveCount(3);
  await expect(style.getByText("Half court")).toHaveCount(0);

  await atWidths(page, WIDE, async (width) => {
    expect(await holdsContent(page.locator("#player-detail-panel section.panel"))).toBe(true);
    expect(await holdsContent(page.locator("#player-detail-panel .rounded-field"))).toBe(true);
    // The court's chips: "made/attempts" and a percentage, or the percentage alone when the court is drawn under 420px wide.
    const narrow = width <= 390;
    await expect
      .poll(async () => {
        const chips = await court.locator("text").allTextContents();
        return { percentages: chips.some((text) => /%/.test(text)), fractions: chips.some((text) => /^\d+\/\d+$/.test(text.trim())) };
      })
      .toEqual({ percentages: true, fractions: !narrow });
    // Every heading of the two tables is drawn over its column.
    for (const [panel, headings] of [[zones, ["Share", "Made", "FG%"]], [style, ["Of att.", "Baskets", "Points"]]]) {
      const shown = await panel.locator("div[aria-hidden=true].border-b > span").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0 && el.textContent.trim()).map((el) => [el.textContent.trim(), el.getBoundingClientRect().right]));
      for (const heading of headings) expect(shown.map(([text]) => text), heading).toContain(heading);
      const rights = await panel.locator("li").first().evaluate((li) => [...li.children].slice(-3).map((el) => el.getBoundingClientRect().right));
      headings.map((heading) => shown.find(([text]) => text === heading)[1]).forEach((right, index) => expect(Math.abs(right - rights[index])).toBeLessThan(3));
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the Shooting states fit a phone: no games in the phase, a failing request, no attempts, nothing located", async ({ page }) => {
  test.setTimeout(120_000);
  const player = await veteranPlayer(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // Every game is in a phase the page is not on.
  await openShooting(page, player, { log: await logFor(page, player, { count: 3, phases: [["ZZ", "Another phase"]] }) });
  await expect(page.getByText("No played games yet this phase to map shot locations from.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // A failing shot request, with its retry.
  await mockLog(page, await logFor(page, player, { count: 3 }));
  await page.unroute(SHOTS_URL).catch(() => {});
  await page.route(SHOTS_URL, failing);
  await openTab(page, player.href, "Shooting");
  await expect(page.getByText("Could not load this player's shot locations.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The mocked attempts all belong to someone else: nothing to show for this player.
  await mockShots(page, shotsFor("SOMEONE-ELSE"));
  await openTab(page, player.href, "Shooting");
  await expect(page.getByText("No attempts match these filters.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);

  // Attempts without a location: counted, but there is nothing to place on the court or in the zones.
  await mockShots(page, shotsFor(player.personKey, { located: false }));
  await openTab(page, player.href, "Shooting");
  await expect(page.getByText("No located attempts.")).toBeVisible({ timeout: 60_000 });
  await expectNoSidewaysScroll(page);
});
