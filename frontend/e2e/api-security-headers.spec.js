import { test, expect } from "@playwright/test";

// The API's hardening (see blueprint/history/fixes/harden-the-api-dependencies-headers-and-cors.md), read from the running
// backend: the frame and referrer headers on every answer, cached ones included; no `X-Powered-By`; CORS for the dev frontend
// without credentials; and no request body ever parsed. The order of the middleware in backend/src/index.ts is what keeps these
// true, so moving the headers below the response cache or adding a body parser back fails here.
const API = "http://localhost:3000/api";
const DEV_ORIGIN = "http://localhost:5173";

function expectHardenedHeaders(headers, label) {
  expect(headers["x-frame-options"], label).toBe("DENY");
  expect(headers["referrer-policy"], label).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"], label).toBeUndefined();
  expect(headers["access-control-allow-credentials"], label).toBeUndefined();
}

test("a season answer carries the security headers both uncached and from the response cache", async ({ page }) => {
  // The routes ignore a query parameter they don't know, and the cache keys on the full address, so this address is new to it.
  const path = `/seasons/2025/teams?headersProbe=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const options = { headers: { Origin: DEV_ORIGIN } };

  const first = await page.request.get(`${API}${path}`, options);
  expect(first.status()).toBe(200);
  expect(first.headers()["x-cache"]).toBe("MISS");
  expectHardenedHeaders(first.headers(), "MISS");
  expect(first.headers()["access-control-allow-origin"]).toBe(DEV_ORIGIN);

  const second = await page.request.get(`${API}${path}`, options);
  expect(second.status()).toBe(200);
  expect(second.headers()["x-cache"]).toBe("HIT");
  expectHardenedHeaders(second.headers(), "HIT");
  expect(second.headers()["access-control-allow-origin"]).toBe(DEV_ORIGIN);
});

test("the health check carries the security headers", async ({ page }) => {
  const response = await page.request.get(`${API}/health`);
  expect(response.status()).toBe(200);
  expectHardenedHeaders(response.headers(), "health");
});

test("a request body is never parsed: broken JSON is a 404, not a 400", async ({ page }) => {
  for (const path of ["/nothing", "/seasons/2025/teams"]) {
    const response = await page.request.post(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      data: "{bad",
    });
    expect(response.status(), path).toBe(404);
  }
});
