import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The team page's Statistics and Roster tabs at every width. Each test loads the page once and resizes the window: the layout
// depends on the viewport only. The numbers are the live ones; a case that needs a particular shape mocks only that request.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];

async function liveTeam(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  // The club with the longest abbreviated name, whose heading is the one that does not fit.
  const team = [...teams].sort((a, b) => (b.abbreviatedName ?? "").length - (a.abbreviatedName ?? "").length)[0];
  return { slug, code, team };
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

// Whether everything inside each matching box sits inside that box.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
      });
    }),
  );

async function openTab(page, slug, clubCode, tab) {
  await page.goto(`/${slug}/teams/${clubCode}`);
  await page.getByRole("tab", { name: tab, exact: true }).click();
}

const SUMMARY = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/team-stats$/.test(url.pathname);
const LEAGUE = (url) => /\/api\/seasons\/[^/]+\/team-stats$/.test(url.pathname);
const failing = (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } });

test("the Statistics heading is the club's TV code below 640px and its name from 640px, and nothing sticks out", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openTab(page, slug, team.clubCode, "Statistics");
  const panel = page.locator("#team-panel > section");
  await expect(panel.locator("section[aria-label=Traditional]")).toBeVisible({ timeout: 30_000 });
  const name = team.abbreviatedName ?? team.name;
  const tag = team.tvCode ?? name;

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // The rank column carries no "Rank" heading.
    await expect(panel.getByText("Rank", { exact: true })).toHaveCount(0);
    // The headings over the club's numbers: one per group, each showing one of the two labels.
    const shown = await panel.locator("section[aria-label] [aria-hidden=true] > span.truncate").evaluateAll((els) =>
      els
        .filter((el) => el.querySelector(".relative"))
        .map((el) => [...el.querySelectorAll(".relative > span")].filter((s) => s.getBoundingClientRect().width > 1).map((s) => s.textContent.trim()).join("")),
    );
    expect(shown).toHaveLength(3);
    for (const text of shown) expect(text).toBe(phone ? tag : name);
    // The heading is whole, not cut with an ellipsis.
    const cut = await panel.locator("span.truncate").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    expect(cut).toBe(0);
    expect(await holdsContent(panel)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("the Statistics states fit a phone: failing, no games, and no league ranks", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await page.route(SUMMARY, failing);
  await openTab(page, slug, team.clubCode, "Statistics");
  await expect(page.getByText("Could not load team statistics.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(SUMMARY);
  await page.route(SUMMARY, (route) => route.fulfill({ json: { phaseCode: "RS", gamesPlayed: 0, own: {}, opponent: {} } }));
  await openTab(page, slug, team.clubCode, "Statistics");
  await expect(page.getByText("This club did not play any games in the selected phase.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  // The ranks failing to load leave the numbers, bars and a shorter footnote.
  await page.unroute(SUMMARY);
  await page.route(LEAGUE, failing);
  await openTab(page, slug, team.clubCode, "Statistics");
  await expect(page.getByText(/^Left is .*own number/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("section[aria-label=Traditional] li").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
});

// The Roster tab's parts, live data: the facts panel, a player card, a coach card.
const rosterParts = (page) => ({
  facts: page.locator("#team-panel .panel").first(),
  cards: page.locator("section[aria-label=Guard] a, section[aria-label=Forward] a, section[aria-label=Center] a"),
  coaches: page.locator("section[aria-label='Coaching staff'] .rounded-box"),
});

test("the roster facts are two columns, the cards narrower and the coaches compact below 640px, and as before from 640px", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openTab(page, slug, team.clubCode, "Roster");
  const { facts, cards, coaches } = rosterParts(page);
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await expect(coaches.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("section[aria-label='Coaching staff'] .rounded-box")).not.toHaveCount(0);

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // Facts: the four of them hold their content; on a phone they are a tidy two by two (the left column and the right column each
    // start at the same x), from 640px a wrapping row.
    expect(await holdsContent(facts)).toBe(true);
    const items = await facts.locator("> div").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    expect(items).toHaveLength(4);
    if (phone) {
      expect(Math.round(items[0].left)).toBe(Math.round(items[2].left));
      expect(Math.round(items[1].left)).toBe(Math.round(items[3].left));
      expect(Math.round(items[0].top)).toBe(Math.round(items[1].top));
      expect(Math.round(items[2].top)).toBe(Math.round(items[3].top));
      expect(items[2].top).toBeGreaterThan(items[0].top + 20);
    } else {
      // As before: a wrapping row (one line from about 1024px, two before).
      expect(await facts.evaluate((el) => getComputedStyle(el).display)).toBe("flex");
    }

    // Cards: an 80px portrait and a shorter card on a phone, 112px from 640px; text inside the card either way.
    expect(await holdsContent(cards)).toBe(true);
    const portraits = await cards.evaluateAll((els) => [...new Set(els.map((el) => Math.round(el.firstElementChild.getBoundingClientRect().width)))]);
    expect(portraits).toEqual([phone ? 80 : 112]);
    const tallest = await cards.evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().height)));
    if (phone) expect(tallest).toBeLessThan(130);
    else expect(tallest).toBeGreaterThan(130);

    // Coaches: no portrait and about half as tall on a phone; the empty portrait and the card as before from 640px.
    expect(await holdsContent(coaches)).toBe(true);
    const portraitWidths = await coaches.evaluateAll((els) => [...new Set(els.map((el) => Math.round(el.firstElementChild.getBoundingClientRect().width)))]);
    expect(portraitWidths).toEqual([phone ? 0 : 112]);
    const coachHeight = await coaches.evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().height)));
    if (phone) expect(coachHeight).toBeLessThan(100);
    else expect(coachHeight).toBeGreaterThan(130);
    // The country shows once: after the role on a phone, on its own line from 640px.
    const countryLines = await coaches.first().locator("p").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0 && el.textContent.trim().length === 3).length);
    expect(countryLines).toBe(phone ? 0 : 1);
    await expectNoSidewaysScroll(page);
  });
});

test("the roster table pins a narrow player column below 640px, swipes inside its panel, and writes names without the comma", async ({ page }) => {
  const { slug, code, team } = await liveTeam(page);
  await openTab(page, slug, team.clubCode, "Roster");
  await expect(rosterParts(page).cards.first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  const box = page.locator("#team-roster-panel .panel");
  const links = box.locator("tbody td:first-child a");
  await expect(links.first()).toBeVisible({ timeout: 30_000 });

  // The names as the feed has them ("LAST, FIRST"), to compare with.
  const { registrations } = await (await page.request.get(`${API}/${code}/teams/${team.clubCode}/roster?limit=100`)).json();
  const feedNames = registrations.filter((entry) => entry.player?.name).map((entry) => entry.player.name);
  expect(feedNames.length).toBeGreaterThan(5);
  // The last name is what the feed has before the comma ("ALSTON JR., ALAN" is ALSTON JR.).
  const lastNames = new Map(feedNames.map((name) => [name.replace(/\s*,\s*/g, " "), name.split(",")[0].trim()]));

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    // Every player's link is titled by the full name without a comma, and shows the last name only on a phone.
    const names = await links.evaluateAll((els) => els.map((el) => el.getAttribute("title")));
    for (const name of names) expect(name).not.toContain(",");
    expect(new Set(names)).toEqual(new Set(feedNames.map((name) => name.replace(/\s*,\s*/g, " "))));
    const shown = await links.evaluateAll((els) =>
      els.map((el) =>
        [...el.querySelectorAll(".relative > span")]
          .filter((s) => s.getBoundingClientRect().width > 1)
          .map((s) => s.textContent.trim())
          .join(""),
      ),
    );
    for (const [index, text] of shown.entries()) {
      expect(text, names[index]).toBe(phone ? lastNames.get(names[index]) : names[index]);
    }
    // No thumbnail on a phone.
    const thumbs = await box.locator("tbody td:first-child img").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).length);
    if (phone) expect(thumbs).toBe(0);

    // The table's text is 12px on a phone and 14px from 640px; games played is a whole number ("3", not "3.0").
    expect(await box.locator("tbody td").first().evaluate((el) => getComputedStyle(el).fontSize)).toBe(phone ? "12px" : "14px");
    const gamesPlayed = await box.evaluate((el) => {
      const column = [...el.querySelectorAll("thead th")].findIndex((th) => th.textContent.trim() === "GP");
      return [...el.querySelectorAll("tbody tr")].map((row) => row.children[column].textContent.trim());
    });
    expect(gamesPlayed.length).toBeGreaterThan(5);
    for (const value of gamesPlayed) expect(value).toMatch(/^(\d+|-)$/);

    // Scrolled up under the sticky bar, the pinned names go under it, not over it (a short window, so that the table is taller
    // than the screen at every width and the page can be scrolled until its first rows are behind the bar).
    await page.setViewportSize({ width, height: 400 });
    const underBar = await box.evaluate(async (el) => {
      const bar = document.querySelector(".app-nav").getBoundingClientRect();
      const table = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + table.top + 120 - bar.bottom, behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const cell = el.querySelector("tbody tr td:first-child").getBoundingClientRect();
      const hit = document.elementFromPoint(cell.left + cell.width / 2, bar.bottom - 6);
      return { covered: Boolean(hit?.closest(".app-nav")), rowsUnderBar: [...el.querySelectorAll("tbody td:first-child")].filter((td) => td.getBoundingClientRect().top < bar.bottom).length };
    });
    expect(underBar.rowsUnderBar).toBeGreaterThan(0);
    expect(underBar.covered).toBe(true);
    await page.setViewportSize({ width, height: HEIGHT });

    const geometry = await box.evaluate((el) => {
      const table = el.querySelector("table");
      const first = [...table.querySelectorAll("tbody td:first-child")].map((td) => td.getBoundingClientRect().width);
      return { boxWidth: el.clientWidth, tableWidth: table.scrollWidth, firstColumn: Math.max(...first) };
    });
    if (phone) {
      // The player column is under half of the panel, so the stats start in view; the rest is reached by swiping the panel.
      expect(geometry.firstColumn / geometry.boxWidth).toBeLessThan(0.46);
      // On the narrowest phones the table is wider than its panel; near 640px it fits and there is nothing to swipe.
      if (width <= 390) expect(geometry.tableWidth).toBeGreaterThan(geometry.boxWidth);
      await box.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      const reached = await box.evaluate((el) => {
        const last = el.querySelector("thead th:last-child").getBoundingClientRect();
        const first = el.querySelector("thead th:first-child").getBoundingClientRect();
        const panel = el.getBoundingClientRect();
        return { lastVisible: last.right <= panel.right + 1 && last.left >= panel.left, pinned: Math.abs(first.left - panel.left) < 12 };
      });
      expect(reached).toEqual({ lastVisible: true, pinned: true });
      // Nothing scrolls past on the pinned column's left: the point just inside the panel's left edge belongs to the pinned cell.
      const edge = await box.evaluate((el) => {
        el.scrollIntoView({ block: "center" });
        const panel = el.getBoundingClientRect();
        const row = el.querySelector("tbody tr:nth-child(2) td:first-child").getBoundingClientRect();
        const hit = document.elementFromPoint(panel.left + 2, row.top + row.height / 2);
        return Boolean(hit?.closest("td:first-child"));
      });
      expect(edge).toBe(true);
      // Swiping the points bar's number under the pinned column does not show it through: the pinned cell is what is hit there.
      const covered = await box.evaluate(async (el) => {
        const results = [];
        for (const left of [60, 120, 180, 240, 300]) {
          el.scrollLeft = left;
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const panel = el.getBoundingClientRect();
          for (const row of el.querySelectorAll("tbody tr")) {
            const cell = row.children[0].getBoundingClientRect();
            const hit = document.elementFromPoint(cell.right - 8, cell.top + cell.height / 2);
            results.push(Boolean(hit?.closest("td:first-child")) || cell.top < 48 || cell.bottom > innerHeight || panel.top > innerHeight);
          }
        }
        return results.every(Boolean);
      });
      expect(covered).toBe(true);
      await box.evaluate((el) => {
        el.scrollLeft = 0;
      });
    }
    await expectNoSidewaysScroll(page);
  });
});

// Mocked rosters: the shape of the real answers, with the awkward cases in them.
const player = (personKey, name, extra = {}) => ({
  registrationKey: `k-${personKey}`,
  personKey,
  roleCode: "J",
  active: true,
  dorsal: "7",
  positionName: "Forward",
  player: { personKey, name, countryCode: "GRE", heightCm: 201 },
  ...extra,
});
const ROSTER = (list) => (route) => route.fulfill({ json: { registrations: list, pagination: { hasMore: false } } });
const ROSTER_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/roster$/.test(url.pathname);
const STATS_URL = (url) => /\/api\/seasons\/[^/]+\/season-stats$/.test(url.pathname);
const COACHES_URL = (url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/coaches$/.test(url.pathname);

test("awkward rosters keep their cards and table tidy at 320px: a long name, no number, no photo, no games, a former player", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const LONG = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI-JEREMIAH";
  await page.route(
    ROSTER_URL,
    ROSTER([
      player("p1", LONG),
      player("p2", "NO NUMBER, NED", { dorsal: null }),
      player("p3", "BENCH, BEN"),
      player("p4", "FORMER, FRANK", { active: false }),
      player("p5", "ONENAME"),
    ]),
  );
  await page.route(STATS_URL, (route) =>
    route.fulfill({
      json: {
        players: [
          { clubCode: team.clubCode, personKey: "p1", playerName: LONG, qualified: true, playerAge: 25, traditional: { gamesPlayed: 10, minutesPlayed: 1500, pointsScored: 12.5, totalRebounds: 4, assists: 3, pir: 11 } },
          { clubCode: team.clubCode, personKey: "p2", playerName: "NO NUMBER, NED", qualified: true, traditional: { gamesPlayed: 3, minutesPlayed: 300, pointsScored: 2, totalRebounds: 1, assists: 0, pir: 1 } },
        ],
        pagination: { hasMore: false },
      },
    }),
  );
  await page.route(COACHES_URL, failing);
  await openTab(page, slug, team.clubCode, "Roster");
  const { cards } = rosterParts(page);
  await expect(cards).toHaveCount(5, { timeout: 30_000 });
  // The coaches failing leaves the players, and no coaching section.
  await expect(page.locator("section[aria-label='Coaching staff']")).toHaveCount(0);
  expect(await holdsContent(cards)).toBe(true);
  await expect(page.getByText("Has not played yet")).toHaveCount(3);
  await expectNoSidewaysScroll(page);

  await page.getByRole("tab", { name: "Table", exact: true }).click();
  const rows = page.locator("#team-roster-panel tbody tr");
  await expect(rows).toHaveCount(5);
  await expect(page.locator("#team-roster-panel .badge", { hasText: "Former" })).toBeVisible();
  await expect(page.getByRole("link", { name: "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS CODI-JEREMIAH" })).toHaveCount(1);
  // The pinned column does not grow with a long name.
  const widest = await page.locator("#team-roster-panel tbody td:first-child").evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().width)));
  const panelWidth = (await page.locator("#team-roster-panel .panel").boundingBox()).width;
  expect(widest / panelWidth).toBeLessThan(0.5);
  await expectNoSidewaysScroll(page);
});

test("the Roster states fit a phone: failing, empty, and the statistics failing", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  await page.route(ROSTER_URL, failing);
  await openTab(page, slug, team.clubCode, "Roster");
  await expect(page.getByText("Could not load the roster.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(ROSTER_URL);
  await page.route(ROSTER_URL, ROSTER([]));
  await openTab(page, slug, team.clubCode, "Roster");
  await expect(page.getByText("Roster not available yet.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  await page.unroute(ROSTER_URL);
  await page.route(ROSTER_URL, ROSTER([player("p1", "ONE, PLAYER")]));
  await page.route(STATS_URL, failing);
  await openTab(page, slug, team.clubCode, "Roster");
  await expect(page.getByText("Could not load roster statistics.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);
});

test("on a phone a Statistics row is the stat name centred over the row with the rank at its left, then the numbers and bars", async ({ page }) => {
  const { slug, team } = await liveTeam(page);
  await openTab(page, slug, team.clubCode, "Statistics");
  const group = page.locator("section[aria-label=Traditional]");
  const rows = group.locator("li");
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => rows.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size)).toBe(1);

  await atWidths(page, [320, 390, 639], async () => {
    const geometry = await rows.first().evaluate((row) => {
      const [label, rank, teamValue, teamBar, opponentBar, opponentValue] = [...row.children].map((el) => el.getBoundingClientRect());
      const box = row.getBoundingClientRect();
      return { box, label, rank, teamValue, teamBar, opponentBar, opponentValue };
    });
    const { box, label, rank, teamValue, teamBar, opponentBar, opponentValue } = geometry;
    const middle = (rect) => rect.left + rect.width / 2;
    // The name is centred over the row, with the rank at the row's left edge on the same line.
    expect(Math.abs(middle(label) - middle(box))).toBeLessThan(3);
    expect(Math.abs(rank.left - box.left)).toBeLessThan(2);
    expect(Math.abs(rank.top - label.top)).toBeLessThan(12);
    // The second line spans the row: the club's number first, a bar each, the opponents' number last.
    expect(teamValue.top).toBeGreaterThan(label.bottom - 2);
    for (const rect of [teamBar, opponentBar, opponentValue]) expect(Math.abs(rect.top + rect.height / 2 - (teamValue.top + teamValue.height / 2))).toBeLessThan(8);
    expect(teamValue.left).toBeLessThan(teamBar.left);
    expect(teamBar.right).toBeLessThanOrEqual(opponentBar.left + 1);
    expect(opponentBar.right).toBeLessThanOrEqual(opponentValue.left + 1);
    expect(Math.abs(opponentValue.right - box.right)).toBeLessThan(3);
    // The bars are the same width and sit either side of the middle.
    expect(Math.abs(teamBar.width - opponentBar.width)).toBeLessThan(2);
    expect(Math.abs((teamBar.right + opponentBar.left) / 2 - middle(box))).toBeLessThan(3);
    // The headings over a group follow the same columns: Rank at the left, the club over its bar, Opp. over the other.
    const heads = await group.locator("div[aria-hidden=true] > span").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => el.getBoundingClientRect().toJSON()));
    expect(heads).toHaveLength(3);
    expect(await group.getByText("Rank", { exact: true }).count()).toBe(0);
    expect(Math.abs(middle(heads[1]) - middle(teamBar))).toBeLessThan(3);
    expect(Math.abs(middle(heads[2]) - middle(opponentBar))).toBeLessThan(3);
    await expectNoSidewaysScroll(page);
  });

  // From 640px the row is the single line it was.
  await page.setViewportSize({ width: 1024, height: HEIGHT });
  const single = await rows.first().evaluate((row) => new Set([...row.children].map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))).size);
  expect(single).toBe(1);
});
