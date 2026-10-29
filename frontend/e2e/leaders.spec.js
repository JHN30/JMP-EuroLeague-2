import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

test("the player cards rank one shared pool, in the order the API ranks each statistic", async ({ page, request }) => {
  const pages = [];
  page.on("request", (req) => {
    if (req.url().includes("/season-stats")) pages.push(req.url());
  });
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main ol").first().locator("li")).toHaveCount(5);
  // One pool for every card: a few pages of the qualified players, not a request per card.
  expect(pages.length).toBeGreaterThan(0);
  expect(pages.length).toBeLessThanOrEqual(3);

  // The API the page called, asked directly for each statistic's own ranking.
  const pool = new URL(pages[0]);
  const api = `${pool.origin}${pool.pathname}`;
  const phase = pool.searchParams.get("phase");
  const topOf = async (sort, order, limit) => {
    const response = await request.get(api, { params: { phase, mode: "perGame", sort, order, limit, qualified: "true" } });
    return (await response.json()).players;
  };
  // The players a card links to, in its order.
  const cardKeys = async (title) => {
    const card = page.getByRole("heading", { name: title, exact: true }).locator("xpath=ancestor::*[.//ol][1]");
    const hrefs = await card.locator("ol > li a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    return hrefs.map((href) => href.split("/").at(-1));
  };
  // Polled, since a card's rows can still be animating in under a busy test run.
  const expectSame = async (title, players) => expect.poll(() => cardKeys(title)).toEqual(players.map((player) => player.personKey));

  for (const [title, sort] of [["Points", "pointsScored"], ["Assists", "assists"], ["Turnovers", "turnovers"]]) {
    await expectSame(title, await topOf(sort, "desc", 5));
  }
  // 3-point %: the API's 60 best, then 1+ three-point attempt a game, as the cards read it before.
  const threes = (await topOf("threePointersPercentage", "desc", 60)).filter(
    (player) => player.traditional.threePointersPercentage !== null && Number(player.traditional.threePointersAttempted) >= 1,
  );
  await expectSame("3-point %", threes.slice(0, 5));
});

test("the player board sorts the shared league list as the API sorts each statistic, and a new statistic needs no request", async ({ page, request }) => {
  const calls = [];
  page.on("request", (req) => {
    if (req.url().includes("/season-stats")) calls.push(req.url());
  });
  const boardKeys = async () => {
    const hrefs = await page.locator("main ol a[href*='/players/']").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    return hrefs.map((href) => href.split("/").at(-1));
  };
  const open = async (query) => {
    await page.goto(`/2025/leaders?${query}`);
    await expect(page.getByText(/Showing 1-25 of \d+ players/)).toBeVisible({ timeout: 30_000 });
  };

  await open("metric=pointsScored");
  // The API the page called, asked directly for each statistic's own order.
  const list = new URL(calls[0]);
  const api = `${list.origin}${list.pathname}`;
  const phase = list.searchParams.get("phase");
  const sortedBy = async (sort, order, limit) => {
    const response = await request.get(api, { params: { phase, mode: "perGame", sort, order, limit, qualified: "true" } });
    return (await response.json()).players;
  };
  const keys = (players) => players.slice(0, 25).map((player) => player.personKey);

  expect(await boardKeys()).toEqual(keys(await sortedBy("pointsScored", "desc", 25)));

  // Changing the statistic re-sorts the same list: no request, and the API's order.
  const before = calls.length;
  await page.getByLabel("Statistic", { exact: true }).selectOption("assists");
  await expect(page).toHaveURL(/metric=assists/);
  await expect.poll(boardKeys).toEqual(keys(await sortedBy("assists", "desc", 25)));
  expect(calls.length).toBe(before);

  // The fewest turnovers first, where equal values are many: the ties keep the API's order.
  await open("metric=turnovers&direction=asc");
  expect(await boardKeys()).toEqual(keys(await sortedBy("turnovers", "asc", 25)));

  // 3-point %: among players with 1+ three-point attempt a game.
  await open("metric=threePointersPercentage");
  const threes = (await sortedBy("threePointersPercentage", "desc", 100)).filter(
    (player) => player.traditional.threePointersPercentage !== null && Number(player.traditional.threePointersAttempted) >= 1,
  );
  expect(await boardKeys()).toEqual(keys(threes));
});

test("on a slow CPU, two choices made back to back both stay in the address", async ({ page }) => {
  // 4x slower, about a mid-range phone: React re-renders well after the address changes, which is when a choice used to undo the one before.
  // The slowed page needs more than the usual time to load its board.
  test.slow();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("group", { name: "Player statistics mode" }).getByRole("button", { name: "Totals" }).click();
  await page.getByLabel("Stage", { exact: true }).selectOption({ label: "Playoffs" });
  await expect(page).toHaveURL(/[?&]phase=PO/);
  await expect(page).toHaveURL(/[?&]mode=accumulated/);

  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  await page.getByLabel("Statistic", { exact: true }).selectOption("assists");
  await expect(page).toHaveURL(/[?&]metric=assists/);
  await expect(page).toHaveURL(/[?&]phase=PO/);
  await expect(page).toHaveURL(/[?&]mode=accumulated/);
});

test("the cards ask the feed's CDN for small WebP photos and crests, loaded near the screen", async ({ page }) => {
  // Every CDN request is recorded and answered with a local picture, so the test needs no network.
  const requested = [];
  await page.route(/^https:\/\/media-cdn\.(cortextech\.io|incrowdsports\.com)\//, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ path: fileURLToPath(new URL("../public/logo-header.png", import.meta.url)) });
  });
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });

  const photos = page.locator("main img[src*='width=192&format=webp']");
  await expect(photos.first()).toBeVisible();
  await expect(photos.first()).toHaveAttribute("loading", "lazy");
  await expect(page.locator("main img[src*='width=128&format=webp']").first()).toBeVisible();
  // No picture is asked for at its full size. Polled, since lazy pictures are requested a moment after they are laid out.
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  expect(requested.filter((url) => !url.includes("format=webp"))).toEqual([]);
});

test("Leaders opens on category cards, opens a full leaderboard and goes back", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });

  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rebounds", exact: true })).toBeVisible();

  // A card opens its full leaderboard, with the team and position filters.
  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  await expect(page).toHaveURL(/metric=pointsScored/);
  await expect(page.getByText(/Showing 1-25 of \d+ players/)).toBeVisible();
  await expect(page.getByLabel("Team", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Position", { exact: true })).toBeVisible();
  await page.getByLabel("Position", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByText(/Showing 1-\d+ of \d+ players/)).toBeVisible();

  await page.getByRole("link", { name: "Back to Categories" }).click();
  await expect(page.getByRole("heading", { name: "Rebounds", exact: true })).toBeVisible();
  // The cards have no way back to themselves.
  await expect(page.getByRole("link", { name: "Back to Categories" })).toHaveCount(0);

  // Teams and Advanced have their own cards.
  await page.getByRole("tab", { name: "Teams", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Net rating", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByRole("heading", { name: "PER", exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("one row of choices under the scope tabs: the stage, a board's statistic and per game or totals, all in the address", async ({ page }) => {
  await page.goto("/2025/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });
  // No strips under the scope tabs any more.
  for (const name of ["Statistics phase", "Player statistics mode", "Statistic family", "Advanced leaders scope"]) {
    await expect(page.getByRole("tablist", { name })).toHaveCount(0);
  }
  const stage = page.getByLabel("Stage", { exact: true });
  const mode = page.getByRole("group", { name: "Player statistics mode" });
  await expect(mode.getByRole("button", { name: "Per game" })).toHaveAttribute("aria-pressed", "true");
  // The stage and the mode share one row.
  const stageBox = await stage.boundingBox();
  const modeBox = await mode.boundingBox();
  expect(Math.abs(stageBox.y + stageBox.height - (modeBox.y + modeBox.height))).toBeLessThanOrEqual(2);

  // Totals on the cards is in the address, and so is a stage.
  await mode.getByRole("button", { name: "Totals" }).click();
  await expect(page).toHaveURL(/[?&]mode=accumulated/);
  await expect(mode.getByRole("button", { name: "Totals" })).toHaveAttribute("aria-pressed", "true");
  await stage.selectOption({ label: "Playoffs" });
  await expect(page).toHaveURL(/[?&]phase=PO/);
  await expect(page).toHaveURL(/[?&]mode=accumulated/);

  // A board adds its statistic to the row; another statistic opens its board.
  await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
  const statistic = page.getByLabel("Statistic", { exact: true });
  await expect(statistic).toBeVisible();
  await statistic.selectOption("assists");
  await expect(page).toHaveURL(/metric=assists/);
  await expect(page).toHaveURL(/[?&]phase=PO/);

  // A season with one stage has nothing to choose, so no Stage select.
  await page.goto("/2026/leaders");
  await expect(page.getByRole("heading", { name: "Points", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Stage", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Player statistics mode" })).toBeVisible();
});
