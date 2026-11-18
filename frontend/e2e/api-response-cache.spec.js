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
