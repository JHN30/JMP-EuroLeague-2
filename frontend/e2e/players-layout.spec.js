import { test, expect } from "@playwright/test";
import { HEIGHT, findBrokenWords, seasonSlug, mockLayoutImages } from "./support/layout";

test.beforeEach(async ({ page }) => { await mockLayoutImages(page); });

// The Players directory at every width. Each test loads the page once and resizes the window: the layout depends on the viewport only.
const API = "http://localhost:3000/api/seasons";
const WIDTHS = [320, 390, 639, 640, 768, 1023, 1024, 1280, 1536];
// Cards per row: two up to 1023px, three from lg, four from xl, five from 2xl; a page of 60 fills every row.
const perRowAt = (width) => (width >= 1536 ? 5 : width >= 1280 ? 4 : width >= 1024 ? 3 : 2);
const PAGE_SIZE = 60;

async function liveSeason(page) {
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const slug = await seasonSlug(page);
  const { seasons } = await (await page.request.get(API)).json();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { players } = await (await page.request.get(`${API}/${code}/players?limit=${PAGE_SIZE}&offset=0`)).json();
  return { slug, players };
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const cards = (page) => page.locator("main ul > li > a");
const expectNoSidewaysScroll = (page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

// Whether everything inside each card sits inside its box. Text that a `truncate` element cuts with an ellipsis is clipped, so it is left out.
const holdsContent = (locator) =>
  locator.evaluateAll((els) =>
    els.every((el) => {
      const box = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        if (child.parentElement.closest(".truncate")) return true;
        const rect = child.getBoundingClientRect();
        return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.bottom <= box.bottom + 1);
      });
    }),
  );

const columns = (locator) => locator.evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);
const shown = (locator) => locator.evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 1).map((el) => el.textContent.trim()));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The portrait sits above the text below 640px and beside it from 640px.
const portraitPlacement = (card) =>
  card.evaluate((el) => {
    const portrait = el.firstElementChild.getBoundingClientRect();
    const text = el.lastElementChild.getBoundingClientRect();
    return portrait.bottom <= text.top + 1 ? "above" : portrait.right <= text.left + 1 ? "beside" : "overlapping";
  });

// The search field and the page buttons inside the window.
async function expectControlsInWindow(page, width) {
  for (const control of [page.getByRole("searchbox", { name: "Search players" }), page.getByRole("button", { name: "Next page" })]) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
}

test("the cards are two to five per row, stacked below 640px, with the TV code below 640px and full rows", async ({ page }) => {
  const { slug, players } = await liveSeason(page);
  await page.goto(`/${slug}/players`);
  await expect(cards(page).first()).toBeVisible({ timeout: 30_000 });
  await expect(cards(page)).toHaveCount(players.length);
  const withClub = players.filter((player) => player.clubCode);
  expect(withClub.length).toBeGreaterThan(10);
  const tvCodes = new Set(withClub.map((player) => player.clubTvCode ?? player.clubCode));
  const clubNames = new Set(withClub.map((player) => player.clubName ?? player.clubCode));

  await atWidths(page, WIDTHS, async (width) => {
    expect(await columns(cards(page))).toBe(perRowAt(width));
    // A full page leaves no gap in its last row.
    if (players.length === PAGE_SIZE) expect(PAGE_SIZE % perRowAt(width)).toBe(0);
    expect(await portraitPlacement(cards(page).first())).toBe(width < 640 ? "above" : "beside");
    expect(await holdsContent(cards(page))).toBe(true);

    // The club crest and the shirt number keep their size.
    const crests = await cards(page).locator("img.flex-none").evaluateAll((imgs) => imgs.map((img) => img.offsetWidth));
    expect(crests.length).toBeGreaterThan(5);
    for (const size of crests) expect(size).toBe(16);
    const numbers = await cards(page).locator("p.flex-none").evaluateAll((els) => els.map((el) => el.scrollWidth <= el.clientWidth));
    expect(numbers.length).toBeGreaterThan(5);
    expect(numbers.every(Boolean)).toBe(true);

    // Below 640px the shirt number is a badge on the portrait; from 640px it is beside the name.
    const badge = await cards(page).first().locator("p.flex-none").evaluate((number) => {
      const portrait = number.closest("a").firstElementChild.getBoundingClientRect();
      const box = number.getBoundingClientRect();
      return box.left >= portrait.left && box.right <= portrait.right && box.top >= portrait.top && box.bottom <= portrait.bottom;
    });
    expect(badge).toBe(width < 640);

    // The club line is the TV code below 640px and the full name from 640px.
    const label = width < 640 ? cards(page).locator("span[aria-hidden=true]") : cards(page).locator(".relative > span:not([aria-hidden=true])");
    const texts = await shown(label);
    expect(texts.length).toBe(withClub.length);
    for (const text of texts) expect((width < 640 ? tvCodes : clubNames).has(text), text).toBe(true);

    // Phone names wrap in full; the tablet/desktop card intentionally uses ellipsis.
    if (width < 640) {
      expect(await findBrokenWords(cards(page).locator("p.font-extrabold"))).toEqual([]);
      expect(await findBrokenWords(cards(page).locator("p.muted.uppercase"))).toEqual([]);
    }

    // The link is named by the player and the full club name at every width.
    const first = withClub[0];
    const link = cards(page).filter({ hasText: first.name.split(",")[0].trim() }).first();
    await expect(link).toHaveAccessibleName(new RegExp(escape(first.clubName ?? first.clubCode)));
    await expectControlsInWindow(page, width);
    await expectNoSidewaysScroll(page);
  });
});

const PATTERN = /\/api\/seasons\/[^/]+\/players(\?|$)/;
const pagination = (total) => ({ limit: PAGE_SIZE, offset: 0, total, hasMore: total > PAGE_SIZE });
const player = (personKey, overrides = {}) => ({
  personKey,
  name: `PLAYER, ${personKey}`,
  jerseyName: null,
  imageUrl: null,
  clubCode: "AAA",
  clubName: "Club AAA",
  clubTvCode: "AAA",
  crestUrl: null,
  dorsal: "7",
  positionName: "Guard",
  countryCode: "GRE",
  heightCm: 190,
  weightKg: 90,
  birthDate: "1995-12-15",
  ...overrides,
});

test("a very long name, a missing portrait, club, number or height and a failing portrait keep the cards tidy", async ({ page }) => {
  const { slug } = await liveSeason(page);
  const players = [
    player("P1", { name: "LARENTZAKIS-PAPADOPOULOS, KONSTANTINOS", clubName: "Panathinaikos AKTOR Athens", clubTvCode: "PAO", positionName: "Point Guard / Shooting Guard" }),
    player("P2", { clubCode: null, clubName: null, clubTvCode: null, dorsal: null, heightCm: null, weightKg: null, birthDate: null }),
    player("P3", { imageUrl: "http://localhost:9/missing.png", dorsal: "0" }),
    player("P4", { name: "SANLI, SERTAC", clubTvCode: null }),
  ];
  await page.route(PATTERN, (route) => route.fulfill({ json: { players, pagination: pagination(players.length) } }));
  await page.goto(`/${slug}/players`);
  await expect(cards(page)).toHaveCount(4);

  await atWidths(page, [320, 390, 640, 768, 1024, 1280], async (width) => {
    expect(await holdsContent(cards(page))).toBe(true);
    // A very long surname takes at most two lines below 640px.
    const lines = await cards(page).nth(0).locator("p.font-extrabold").evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    expect(lines).toBeLessThanOrEqual(width < 640 ? 2 : 1);
    // A player without a club, a number or a height shows none of them, and a number of 0 is shown.
    await expect(cards(page).nth(1)).not.toContainText("#");
    await expect(cards(page).nth(1)).not.toContainText("cm");
    await expect(cards(page).nth(1)).not.toContainText("kg");
    await expect(cards(page).nth(1)).not.toContainText(" y");
    // The body line: height, weight and the age when the season started (1 October of its first year).
    const startYear = Number(slug.replace(/\D/g, ""));
    await expect(cards(page).nth(2)).toContainText(`190 cm · 90 kg · ${startYear - 1996} y`);
    await expect(cards(page).nth(2)).toContainText("0");
    // Without a TV code the club code stands in for it below 640px.
    if (width < 640) expect(await shown(cards(page).nth(3).locator("span[aria-hidden=true]"))).toEqual(["AAA"]);
    // A card without a portrait still has one box of the same size as the others.
    const sizes = await cards(page).evaluateAll((els) => els.map((el) => Math.round(el.firstElementChild.getBoundingClientRect().width)));
    expect(new Set(sizes).size).toBe(1);
    await expectNoSidewaysScroll(page);
  });
});

test("the error, empty and no-match states fit a phone", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.route(PATTERN, (route) => route.fulfill({ status: 500, json: { error: "Mocked failure" } }));
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.goto(`/${slug}/players`);
  await expect(page.getByText("Could not load players.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.unroute(PATTERN);
  await page.route(PATTERN, (route) => route.fulfill({ json: { players: [], pagination: pagination(0) } }));
  await page.reload();
  await expect(page.getByText("No players available for this season.")).toBeVisible({ timeout: 30_000 });
  await expectNoSidewaysScroll(page);

  await page.unroute(PATTERN);
  await page.route(PATTERN, (route) => {
    const searching = new URL(route.request().url()).searchParams.has("search");
    return route.fulfill({ json: { players: searching ? [] : [player("P1")], pagination: pagination(searching ? 0 : 1) } });
  });
  await page.reload();
  await expect(cards(page)).toHaveCount(1, { timeout: 30_000 });
  await page.getByRole("searchbox", { name: "Search players" }).fill("zzzz");
  await expect(page.getByText("No players match your search. Try a different name.")).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("the summary line and the page buttons fit at 320px and Next page brings the top of the page into view", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.goto(`/${slug}/players`);
  await expect(cards(page).first()).toBeVisible({ timeout: 30_000 });
  await expectControlsInWindow(page, 320);
  const summary = page.getByText(/^Showing 1-/);
  await expect(summary).toBeVisible();

  const first = await cards(page).first().innerText();
  await page.getByRole("button", { name: "Next page" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(new RegExp(`^Showing ${PAGE_SIZE + 1}-`))).toBeVisible();
  await expect.poll(() => cards(page).first().innerText()).not.toBe(first);
  // The new page's summary line ends up just below the 48px header, not under it.
  await expect
    .poll(async () => {
      const top = (await page.getByText(new RegExp(`^Showing ${PAGE_SIZE + 1}-`)).boundingBox()).y;
      return top >= 48 && top < 120;
    })
    .toBe(true);
});

// ---- Club and position filters ----

test("the club and position filters ask for what they say, combine with the search and go back to the first page", async ({ page }) => {
  const { slug } = await liveSeason(page);
  const calls = [];
  await page.route(PATTERN, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const call = Object.fromEntries(params.entries());
    calls.push(call);
    const offset = Number(call.offset ?? 0);
    const players = Array.from({ length: PAGE_SIZE }, (_, index) => player(`P${offset + index}`));
    return route.fulfill({ json: { players, pagination: { limit: PAGE_SIZE, offset, total: 200, hasMore: offset + PAGE_SIZE < 200 } } });
  });
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${slug}/players`);
  await expect(cards(page)).toHaveCount(PAGE_SIZE, { timeout: 30_000 });

  // The club list is the season's clubs, by name.
  const club = page.getByRole("combobox", { name: "Club" });
  const options = await club.locator("option").allTextContents();
  expect(options[0]).toBe("All clubs");
  expect(options.length).toBeGreaterThan(10);
  expect(options.slice(1)).toEqual([...options.slice(1)].sort((a, b) => a.localeCompare(b)));
  await expect(page.getByRole("combobox", { name: "Position" }).locator("option")).toHaveText(["All positions", "Guard", "Forward", "Center"]);

  // On the second page, a filter starts again from the first.
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText(new RegExp(`^Showing ${PAGE_SIZE + 1}-`))).toBeVisible();
  await club.selectOption({ index: 1 });
  const clubCode = await club.inputValue();
  await expect(page.getByText(/^Showing 1-/)).toBeVisible();
  await expect.poll(() => calls.at(-1)).toMatchObject({ club: clubCode, offset: "0" });
  await page.getByRole("combobox", { name: "Position" }).selectOption("Center");
  await expect.poll(() => calls.at(-1)).toMatchObject({ club: clubCode, position: "Center" });
  await page.getByRole("searchbox", { name: "Search players" }).fill("smith");
  await expect.poll(() => calls.at(-1)).toMatchObject({ club: clubCode, position: "Center", search: "smith" });

  // Without a filter none is sent, and going back to everyone shows the whole list again.
  expect(calls[0]).toEqual({ limit: String(PAGE_SIZE), offset: "0" });
  await club.selectOption("");
  await page.getByRole("combobox", { name: "Position" }).selectOption("");
  await page.getByRole("searchbox", { name: "Search players" }).fill("");
  await expect(page.getByText(/^Showing 1-60 of 200 players/)).toBeVisible();
});

test("the filters fit every width and their empty messages say what found nothing", async ({ page }) => {
  const { slug } = await liveSeason(page);
  await page.route(PATTERN, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const filtered = params.has("club") || params.has("position") || params.has("search");
    return route.fulfill({ json: { players: filtered ? [] : [player("P1")], pagination: pagination(filtered ? 0 : 1) } });
  });
  await page.goto(`/${slug}/players`);
  await expect(cards(page)).toHaveCount(1, { timeout: 30_000 });

  await atWidths(page, [320, 390, 640, 1024, 1536], async (width) => {
    // Below 640px the search has the row and the two filters share the next; from 640px all three are one row.
    const [search, club, position] = await Promise.all(
      [page.getByRole("searchbox", { name: "Search players" }), page.getByRole("combobox", { name: "Club" }), page.getByRole("combobox", { name: "Position" })].map((control) => control.boundingBox()),
    );
    for (const box of [search, club, position]) expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(Math.abs(club.y - position.y)).toBeLessThan(2);
    if (width < 640) expect(club.y).toBeGreaterThan(search.y + search.height - 1);
    else expect(Math.abs(search.y - club.y)).toBeLessThan(2);
    await expectNoSidewaysScroll(page);
  });

  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.getByRole("combobox", { name: "Position" }).selectOption("Center");
  await expect(page.getByText("No players match these filters.")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search players" }).fill("zzzz");
  await expect(page.getByText("No players match your search and filters.")).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("the players endpoint filters by club and position and refuses a bad filter", async ({ page }) => {
  const { seasons } = await (await page.request.get(API)).json();
  const slug = await (async () => {
    await page.setViewportSize({ width: 1280, height: HEIGHT });
    return seasonSlug(page);
  })();
  const code = seasons.map((season) => season.seasonCode).find((seasonCode) => seasonCode.endsWith(slug));
  const { players } = await (await page.request.get(`${API}/${code}/players?limit=100`)).json();
  const clubCode = players.find((entry) => entry.clubCode)?.clubCode;

  const body = await (await page.request.get(`${API}/${code}/players?club=${clubCode}&position=Guard&limit=100`)).json();
  expect(body.players.length).toBeGreaterThan(0);
  for (const entry of body.players) {
    expect(entry).toHaveProperty("weightKg");
    expect(entry).toHaveProperty("birthDate");
    if (entry.birthDate !== null) expect(entry.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }

  const badPosition = await page.request.get(`${API}/${code}/players?position=Pivot`);
  expect(badPosition.status()).toBe(400);
  expect((await badPosition.json()).error.code).toBe("INVALID_POSITION_FILTER");
  const badClub = await page.request.get(`${API}/${code}/players?club=PA-R`);
  expect(badClub.status()).toBe(400);
  expect((await badClub.json()).error.code).toBe("INVALID_CLUB_FILTER");
});
