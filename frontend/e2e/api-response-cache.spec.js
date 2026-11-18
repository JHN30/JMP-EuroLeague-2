import { test, expect } from "@playwright/test";

// The response cache only takes canonical addresses (backend/src/response-cache.ts, finding F-01): an address that differs
// in spelling but not in meaning must neither skip the cache nor add another copy of a large answer to it.
const API = "http://localhost:3000/api";

// A search no one has made before is an address new to the cache.
const freshSearch = () => `probe${Date.now()}${Math.random().toString(36).slice(2)}`;

test("query parameters no route reads, given twice, or a % in the path are refused with a 400", async ({ page }) => {
  for (const path of [
    "/seasons/E2025/shots?phase=RS&x=1",
    "/seasons/E2025/teams?headersProbe=1",
    "/seasons/E2025/shots?phase=RS&phase=RS",
    "/seasons/%452025/teams",
    "/seasons/E2025/teams/%4FLY",
  ]) {
    const response = await page.request.get(`${API}${path}`);
    expect(response.status(), path).toBe(400);
    expect((await response.json()).error.code, path).toBe("INVALID_QUERY");
  }
});

test("a parameter another route reads, but this one does not, is refused with a 400", async ({ page }) => {
  // `search`, `limit` and `teamA` are real parameters of other routes. On /shots they would be ignored, so each new value
  // would be a fresh 1.5 MB database read that skips the cache.
  for (const query of [`phase=RS&search=${freshSearch()}`, "phase=RS&limit=5", "phase=RS&teamA=OLY", "search=x"]) {
    const response = await page.request.get(`${API}/seasons/E2025/shots?${query}`);
    expect(response.status(), query).toBe(400);
    expect((await response.json()).error.code, query).toBe("INVALID_QUERY");
  }
  // The same names are still fine where they are read.
  expect((await page.request.get(`${API}/seasons/E2025/players?search=${freshSearch()}&limit=5`)).status()).toBe(200);
});

test("a team's stage shots need a valid phase and a club of the season", async ({ page }) => {
  for (const [query, status] of [["", 400], ["?phase=XX", 400], ["?phase=RS&limit=5", 400]]) {
    expect((await page.request.get(`${API}/seasons/E2025/teams/OLY/shots${query}`)).status(), query || "no phase").toBe(status);
  }
  expect((await page.request.get(`${API}/seasons/E2025/teams/ZZZ/shots?phase=RS`)).status()).toBe(404);
  const ok = await page.request.get(`${API}/seasons/E2025/teams/OLY/shots?phase=RS`);
  expect(ok.status()).toBe(200);
  // Both sides of every game: the club's own shots and its opponents'.
  const clubs = new Set((await ok.json()).shots.map((shot) => shot.clubCode));
  expect(clubs.has("OLY")).toBe(true);
  expect(clubs.size).toBeGreaterThan(1);
});

test("the leaders' games filter takes only its own values, not inherited property names", async ({ page }) => {
  for (const games of ["constructor", "toString", "__proto__"]) {
    expect((await page.request.get(`${API}/seasons/E2025/advanced/leaders?games=${games}`)).status(), games).toBe(400);
  }
  expect((await page.request.get(`${API}/seasons/E2025/advanced/leaders?games=50`)).status()).toBe(200);
});

test("player search matches % and _ literally, not as wildcards", async ({ page }) => {
  const count = async (search) => {
    const response = await page.request.get(`${API}/seasons/E2025/players?search=${encodeURIComponent(search)}&limit=5`);
    expect(response.status(), search).toBe(200);
    return (await response.json()).players.length;
  };
  expect(await count("_")).toBe(0);
  expect(await count("%")).toBe(0);
  expect(await count("a")).toBeGreaterThan(0);
});

test("player search refuses control characters with a 400, not a database error", async ({ page }) => {
  const search = (text) => page.request.get(`${API}/seasons/E2025/players?search=${encodeURIComponent(text)}&limit=5`);
  for (const text of ["ab\u0000c", "ab\u0001c", "ab\u007fc"]) {
    const response = await search(text);
    expect(response.status(), JSON.stringify(text)).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_QUERY");
  }
  // Accents, commas and spaces are ordinary search text.
  expect((await search("Bogdanović")).status()).toBe(200);
  const named = await search("Abalde, Alberto");
  expect(named.status()).toBe(200);
  expect((await named.json()).players.length).toBe(1);
});

test("the season leaders take their stats list sorted, so one set of stats has one address", async ({ page }) => {
  const leaders = (stats) => page.request.get(`${API}/seasons/E2025/season-stats/leaders?phase=RS&mode=perGame&stats=${stats}`);
  expect((await leaders("assists,pointsScored")).status()).toBe(200);
  for (const stats of ["pointsScored,assists", "assists,assists"]) expect((await leaders(stats)).status(), stats).toBe(400);
});

test("a HEAD request is answered from the response cache like a GET", async ({ page }) => {
  const path = `${API}/seasons/2025/players?search=${freshSearch()}`;
  expect((await page.request.head(path)).headers()["x-cache"]).toBe("MISS");
  expect((await page.request.head(path)).headers()["x-cache"]).toBe("HIT");
  expect((await page.request.get(path)).headers()["x-cache"]).toBe("HIT");
});

test("the league list can be read in one request of up to 500 players, and other lists stay at 100", async ({ page }) => {
  const stats = (limit) => page.request.get(`${API}/seasons/E2025/season-stats?phase=RS&mode=perGame&limit=${limit}`);
  expect((await stats(500)).status()).toBe(200);
  expect((await stats(501)).status()).toBe(400);
  expect((await page.request.get(`${API}/seasons/E2025/players?limit=101`)).status()).toBe(400);
});

test("another spelling of a route word, the mount or a trailing slash is a 404", async ({ page }) => {
  for (const path of ["/SEASONS/E2025/teams", "/Seasons/E2025/teams", "/seasons/E2025/TEAMS", "/seasons/E2025/teams/"]) {
    const response = await page.request.get(`${API}${path}`);
    expect(response.status(), path).toBe(404);
  }
});

test("the canonical addresses still answer, and the season list answers with or without its slash", async ({ page }) => {
  for (const path of ["/seasons", "/seasons/", "/seasons/E2025/teams", "/seasons/2025/teams/OLY", "/seasons/E2025/shots?phase=RS&position=Guard"]) {
    const response = await page.request.get(`${API}${path}`);
    expect(response.status(), path).toBe(200);
  }
});

test("the same parameters in another order, or with a stray &, share one cache entry", async ({ page }) => {
  const search = freshSearch();
  const first = await page.request.get(`${API}/seasons/2025/players?search=${search}&limit=5&offset=0`);
  expect(first.status()).toBe(200);
  expect(first.headers()["x-cache"]).toBe("MISS");

  for (const query of [`offset=0&limit=5&search=${search}`, `limit=5&&search=${search}&offset=0&`]) {
    const again = await page.request.get(`${API}/seasons/2025/players?${query}`);
    expect(again.status(), query).toBe(200);
    expect(again.headers()["x-cache"], query).toBe("HIT");
  }
});
