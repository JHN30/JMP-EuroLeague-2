import { test, expect } from "@playwright/test";
import { HEIGHT, seasonSlug } from "./support/layout";

// The team page's header, its two tab strips and the Overview tab at every width. Each test loads the page once and resizes the
// window: the layout depends on the viewport only. The games are mocked (known TV codes and names, a next game); the team,
// standings and league numbers are the live ones.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024];
const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";

async function liveTeam(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { teams } = await (await page.request.get(`${API}/${code}/teams`)).json();
  // The club with the longest name, to stretch the header, and another club for it to play.
  const byLength = [...teams].sort((a, b) => (b.name ?? "").length - (a.name ?? "").length);
  const [team, rival] = byLength;
  return { slug, team, rival };
}

// Three played games and three to come, the club at home in the first of each kind.
function gamesFor(team, opponent, { upcoming = 3, played = 3 } = {}) {
  opponent = { ...opponent, tvCode: opponent.tvCode ?? opponent.abbreviatedName };
  const club = { clubCode: team.clubCode, name: team.name, abbreviatedName: team.abbreviatedName, tvCode: team.tvCode ?? team.abbreviatedName, crestUrl: crest };
  const row = (index, isPlayed) => {
    const home = index % 2 === 0;
    return {
      gameCode: 9000 + index,
      played: isPlayed,
      phaseCode: "RS",
      phaseName: "Regular Season",
      roundNumber: index + 1,
      scheduledAt: new Date(Date.UTC(2026, isPlayed ? 0 : 11, 10 + index, 18, 30)).toISOString(),
      localTeam: home ? club : opponent,
      roadTeam: home ? opponent : club,
      localScore: isPlayed ? (home ? 90 : 70) : null,
      roadScore: isPlayed ? (home ? 70 : 90) : null,
    };
  };
  const games = [...Array.from({ length: played }, (_, i) => row(i, true)), ...Array.from({ length: upcoming }, (_, i) => row(played + i, false))];
  return { games, pagination: { hasMore: false } };
}

async function mockGames(page, payload) {
  await page.route((url) => /\/api\/seasons\/[^/]+\/teams\/[^/]+\/games$/.test(url.pathname), (route) => route.fulfill({ json: payload }));
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

const strip = (page, name) => page.getByRole("tablist", { name, exact: true });

// Whether the tabs of a strip share one row.
const oneRow = (locator) => locator.evaluate((el) => new Set([...el.querySelectorAll("[role=tab]")].map((tab) => Math.round(tab.getBoundingClientRect().top))).size === 1);

// Whether the selected tab lies inside the visible part of its strip.
const selectedVisible = (locator) =>
  locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const tab = el.querySelector("[role=tab][aria-selected=true]").getBoundingClientRect();
    return tab.left >= box.left - 1 && tab.right <= box.right + 1;
  });

test("the header and the two strips fit at every width: the chip under the names and one row of tabs below 640px", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(strip(page, "Phase")).toBeVisible({ timeout: 30_000 });
  const chip = page.locator(".next-chip");
  await expect(chip).toBeVisible();

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    const heading = page.getByRole("heading", { level: 1 });
    const headingBox = await heading.boundingBox();
    // The name has room: it is not squeezed to a sliver by the crest and the chip.
    expect(headingBox.width).toBeGreaterThan(Math.min(150, width / 2));
    const chipBox = await chip.boundingBox();
    if (phone) {
      // The header is centred: the crest, then the name, then the chip under it from edge to edge, its text centred.
      expect(chipBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height - 1);
      expect(await chip.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
      expect(await heading.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
      const section = await heading.locator("xpath=ancestor::section[1]").boundingBox();
      expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(section.x + section.width + 1);
      const middle = (box) => box.x + box.width / 2;
      const crestBox = await page.locator("section img").first().boundingBox();
      expect(Math.abs(middle(crestBox) - middle(section))).toBeLessThan(3);
      expect(Math.abs(middle(headingBox) - middle(section))).toBeLessThan(3);
      expect(crestBox.y + crestBox.height).toBeLessThanOrEqual(headingBox.y + 1);
    } else {
      expect(await chip.evaluate((el) => getComputedStyle(el).textAlign)).toBe("right");
    }
    // The crest keeps its size: 96px above the name on a phone, 64px beside it from 640px.
    expect(await page.locator("section img").first().evaluate((img) => img.offsetWidth)).toBe(phone ? 96 : 64);

    // The opponent: the TV code below 640px, the abbreviated name from 640px.
    const shown = await chip.locator("span[aria-hidden=true], .max-sm\\:sr-only").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));
    expect(shown).toEqual([phone ? (rival.tvCode ?? rival.abbreviatedName) : (rival.abbreviatedName ?? rival.name)]);
    await expect(chip).toContainText(rival.abbreviatedName ?? rival.name);

    // Each strip is one row, and the selected tab is on screen.
    for (const name of ["Section", "Phase"]) {
      expect(await oneRow(strip(page, name)), `${name} on one row`).toBe(true);
      expect(await selectedVisible(strip(page, name)), `${name} selected tab visible`).toBe(true);
    }
    await expectNoSidewaysScroll(page);
  });
});

test("a strip with more tabs than the screen holds scrolls inside its own box", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await expect(strip(page, "Section")).toBeVisible({ timeout: 30_000 });

  await page.setViewportSize({ width: 320, height: HEIGHT });
  const sectionStrip = strip(page, "Section");
  expect(await sectionStrip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  // Choosing the last tab brings it into view (the other tabs' own layouts are 31h-ii to 31h-iv).
  await page.getByRole("tab", { name: "Games", exact: true }).click();
  await expect.poll(() => selectedVisible(sectionStrip)).toBe(true);

  // From 1024px every tab shows without scrolling.
  await page.setViewportSize({ width: 1024, height: HEIGHT });
  expect(await sectionStrip.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

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

test("the snapshot holds its content and the leaders are a swipe row below 640px and a grid from 640px", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  const snapshot = page.getByLabel("Phase snapshot");
  const leaders = page.getByRole("group", { name: "Team leaders" });
  await expect(snapshot).toBeVisible({ timeout: 30_000 });
  await expect(leaders.locator("a")).toHaveCount(4, { timeout: 30_000 });
  // The players' names are written without the feed's comma, at every width.
  const names = await leaders.locator(".name").allTextContents();
  expect(names).toHaveLength(4);
  for (const name of names) expect(name).not.toContain(",");

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    expect(await holdsContent(snapshot)).toBe(true);
    // The panel's padding follows the gutter scale: 16px on a phone, 20px from 640px.
    expect(await snapshot.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBe(phone ? 16 : 20);
    // The facts: League position on a row of its own on a phone, so the other four pair up.
    const facts = await snapshot.locator("div.border-t > div").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(facts).toHaveLength(5);
    if (phone) expect(new Set(facts).size).toBe(3);

    const cards = await leaders.locator("a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    if (phone) {
      // One row inside its own box that reaches the screen's edges, with the first card about 85% of the row's width.
      expect(await leaders.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      // (The page's own width: the scrollbar gutter takes a few pixels of the window.)
      const pageWidth = await page.evaluate(() => Math.round(document.body.getBoundingClientRect().width));
      await expect.poll(() => leaders.boundingBox().then((rect) => [Math.round(rect.x), Math.round(rect.width)])).toEqual([0, pageWidth]);
      // (The cards slide in, so their tops are compared once they have settled.)
      await expect.poll(() => leaders.locator("a").evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().top))).size)).toBe(1);
      // 85% of the row's width inside its 12px gutters.
      expect(cards[0].width / (pageWidth - 24)).toBeGreaterThan(0.83);
      expect(cards[0].width / (pageWidth - 24)).toBeLessThan(0.87);
      await expect(leaders).toHaveAttribute("tabindex", "0");
    } else {
      // Two columns, and nothing scrolls sideways.
      expect(new Set(cards.map((card) => Math.round(card.left))).size).toBe(2);
      expect(await leaders.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(leaders).not.toHaveAttribute("tabindex");
    }
    await expectNoSidewaysScroll(page);
  });
});

test("the league profile puts its badges under the title below 640px and keeps value and rank on one line", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  const profile = page.locator("section", { has: page.getByRole("heading", { name: /ranks in the league/ }) });
  await expect(profile.locator("li").first()).toBeVisible({ timeout: 30_000 });
  await expect(profile.locator(".stat-badge")).toHaveCount(4);

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    expect(await holdsContent(profile)).toBe(true);
    // Two badges are drawn (the other pair is display: none, so a screen reader reads each once): under the title on a phone,
    // to the right of it from 640px. Measured together, in one go.
    await expect
      .poll(() =>
        profile.evaluate((el) => {
          const title = el.querySelector("h2").getBoundingClientRect();
          const shown = [...el.querySelectorAll(".stat-badge")].map((badge) => badge.getBoundingClientRect()).filter((rect) => rect.width > 0);
          return { count: shown.length, under: shown.every((rect) => rect.top >= title.bottom - 1), beside: shown.every((rect) => rect.left >= title.right - 1) };
        }),
      )
      .toEqual({ count: 2, under: phone, beside: !phone });

    // The two groups sit one under the other on a phone and side by side from 640px.
    const groups = await profile.locator("section[aria-label]").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(groups).size).toBe(phone ? 1 : 2);
    // On every row the value and the rank share a line (their boxes overlap vertically; their baselines differ by a pixel or two).
    const rows = await profile.locator("li > div").evaluateAll((els) =>
      els.filter((el) => el.querySelector("span")).map((el) => [...el.querySelectorAll(":scope > span:last-child > span")].map((s) => s.getBoundingClientRect().toJSON())),
    );
    expect(rows.length).toBe(10);
    for (const [value, rank] of rows) expect(Math.min(value.bottom, rank.bottom) - Math.max(value.top, rank.top)).toBeGreaterThan(6);
    await expectNoSidewaysScroll(page);
  });
});

test("the quick comparison names the clubs by TV code below 640px and keeps its strip on one row", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  const compare = page.locator("section", { has: page.getByRole("heading", { name: "Quick comparison" }) });
  await expect(compare.locator("img").first()).toBeVisible({ timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    expect(await holdsContent(compare)).toBe(true);
    // The two club labels above the rows: the TV codes below 640px, the abbreviated names from 640px.
    const labels = await compare.locator("span.truncate").evaluateAll((els) =>
      els.map((el) => [...el.querySelectorAll("span")].filter((s) => s.getBoundingClientRect().width > 1 && !s.classList.contains("relative")).map((s) => s.textContent.trim()).join("") || el.textContent.trim()),
    );
    expect(labels).toEqual(
      phone
        ? [team.tvCode ?? team.abbreviatedName ?? team.name, rival.tvCode ?? rival.abbreviatedName]
        : [team.abbreviatedName ?? team.name, rival.abbreviatedName ?? rival.name],
    );
    // The "Compare against" strip, when there is one, is one row.
    const against = compare.getByRole("tablist", { name: "Compare against" });
    if (await against.count()) expect(await oneRow(against)).toBe(true);
    // The link beside the title does not wrap.
    const link = compare.getByRole("link", { name: /Full comparison/ });
    expect(await link.evaluate((el) => el.getBoundingClientRect().height < 24)).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});

test("a recent-form or upcoming row names its opponent by TV code below 640px and never cuts it", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await mockGames(page, gamesFor(team, rival));
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  const rows = page.locator("#team-panel ul > li > a");
  await expect(rows).toHaveCount(6, { timeout: 30_000 });

  await atWidths(page, WIDTHS, async (width) => {
    const phone = width < 640;
    expect(await holdsContent(rows)).toBe(true);
    // The opponent's text is whole (not cut with an ellipsis).
    const cut = await rows.locator("span.truncate").evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    expect(cut).toBe(0);
    const shown = await rows.locator("span.truncate span.relative > span").evaluateAll((els) => [...new Set(els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()))]);
    expect(shown).toEqual([phone ? (rival.tvCode ?? rival.abbreviatedName) : (rival.abbreviatedName ?? rival.name)]);
    // On a phone the round is under the opponent and the result or date is at the right-hand end.
    const first = await rows.first().evaluate((el) => {
      const [round, opponent] = [el.children[0], el.children[1]].map((node) => node.getBoundingClientRect());
      return { roundBelow: round.top >= opponent.bottom - 1, rowHeight: el.getBoundingClientRect().height };
    });
    expect(first.roundBelow).toBe(phone);
    await expectNoSidewaysScroll(page);
  });
});

test("the Overview's states fit a phone: no games, a missing record, no leaders, no profile and no comparison", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });

  // No games: no Next game chip, no upcoming list, and an empty recent form.
  await mockGames(page, { games: [], pagination: { hasMore: false } });
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  await expect(page.getByText("No played games yet.")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".next-chip")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toHaveCount(0);
  await expectNoSidewaysScroll(page);

  // Every league-wide and per-club source failing: each panel says so and fits.
  await mockGames(page, gamesFor(team, rival));
  await page.route((url) => /\/phases\/[^/]+\/standings$/.test(url.pathname), (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.route("**/api/seasons/*/advanced/standings**", (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.route("**/api/seasons/*/season-stats**", (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.reload();
  for (const message of ["Could not load the phase record.", "Could not load team leaders.", "Could not load the league profile.", "Could not load the comparison."]) {
    await expect(page.getByText(message)).toBeVisible({ timeout: 30_000 });
  }
  await expectNoSidewaysScroll(page);

  // Empty answers: the empty texts.
  await page.route((url) => /\/phases\/[^/]+\/standings$/.test(url.pathname), (route) => route.fulfill({ json: { round: 1, standings: [] } }));
  await page.route("**/api/seasons/*/advanced/standings**", (route) => route.fulfill({ json: { standings: [] } }));
  await page.route("**/api/seasons/*/season-stats**", (route) => route.fulfill({ json: { players: [], pagination: { hasMore: false } } }));
  await page.reload();
  for (const message of ["No record yet for this phase.", "No statistics recorded yet for this phase.", "No league rankings yet for this phase."]) {
    await expect(page.getByText(message)).toBeVisible({ timeout: 30_000 });
  }
  await expectNoSidewaysScroll(page);
});

test("a club without a crest or a TV code, with a long name, keeps its header tidy, and a long leader name wraps in its card", async ({ page }) => {
  const { slug, team, rival } = await liveTeam(page);
  const long = "Meridianbet Crvena Zvezda Beograd Basketball Club";
  await page.route((url) => url.pathname === `/api/seasons/${(url.pathname.split("/")[3])}/teams/${team.clubCode}`, (route) =>
    route.fulfill({ json: { team: { clubCode: team.clubCode, name: long, abbreviatedName: "Crvena Zvezda", countryCode: "SRB", crestUrl: null } } }),
  );
  await mockGames(page, gamesFor({ ...team, tvCode: undefined }, rival));
  const LONG_PLAYER = "MILLER-MCINTYRE-WHITAKER-ALEXANDROPOULOS, CODI";
  await page.route("**/api/seasons/*/season-stats**", (route) =>
    route.fulfill({
      json: {
        players: [{ clubCode: team.clubCode, personKey: "p1", playerName: LONG_PLAYER, qualified: true, traditional: { pointsScored: 20, totalRebounds: 9, assistances: 5, assists: 5, pir: 22 } }],
        pagination: { hasMore: false },
      },
    }),
  );
  await page.goto(`/${slug}/teams/${team.clubCode}`);
  const leaders = page.getByRole("group", { name: "Team leaders" });
  await expect(leaders.locator("a")).toHaveCount(4, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(long);
  await expect(leaders.locator(".name").first()).toHaveText(LONG_PLAYER.replace(", ", " "));

  await atWidths(page, [320, 390, 639, 640, 1024], async () => {
    const heading = page.getByRole("heading", { level: 1 });
    expect((await heading.boundingBox()).width).toBeGreaterThan(120);
    expect(await holdsContent(heading.locator("xpath=ancestor::section[1]"))).toBe(true);
    // A card keeps the long name inside itself.
    expect(await holdsContent(leaders.locator("a"))).toBe(true);
    await expectNoSidewaysScroll(page);
  });
});
