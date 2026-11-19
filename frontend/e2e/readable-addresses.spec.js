import { test, expect } from "@playwright/test";

// Game, player and team pages are addressed by readable words with the code at the end (lib/pagePaths.js). Only the
// code finds the page; any other form of the address is replaced by the canonical one without a new history entry.

test("an old bare-code address opens the page and moves to the readable one", async ({ page }) => {
  for (const [from, to] of [
    ["/2026/games/122", "/2026/games/maccabi-vs-dubai-122"],
    ["/2025/players/003733", "/2025/players/alberto-abalde-003733"],
    ["/2025/teams/MAD", "/2025/teams/real-madrid-mad"],
  ]) {
    await page.goto(from);
    await expect(page, from).toHaveURL(new RegExp(`${to}$`));
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Real Madrid");
});

test("only the code finds the page: other words or letter case still land on the canonical address", async ({ page }) => {
  for (const [from, to] of [
    ["/2026/games/some-old-words-122", "/2026/games/maccabi-vs-dubai-122"],
    ["/2025/players/someone-else-003733", "/2025/players/alberto-abalde-003733"],
    ["/2025/teams/mad", "/2025/teams/real-madrid-mad"],
  ]) {
    await page.goto(from);
    await expect(page, from).toHaveURL(new RegExp(`${to}$`));
  }
});

test("the redirect keeps the query string and replaces the history entry", async ({ page }) => {
  await page.goto("/2025/teams");
  await page.goto("/2025/teams/MAD?phase=RS");
  await expect(page).toHaveURL(/\/2025\/teams\/real-madrid-mad\?phase=RS$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/2025\/teams$/);
});

test("links across the site point straight at the readable addresses", async ({ page }) => {
  // Standings rows carry only the club's full name, the form team addresses use.
  for (const listing of ["/2025/teams", "/2025/standings"]) {
    await page.goto(listing);
    await expect(page.locator('a[href="/2025/teams/real-madrid-mad"]').first(), listing).toBeVisible();
  }
  await page.goto("/2025/games");
  await expect(page.locator('a[href^="/2025/games/"][href*="-vs-"]').first()).toBeVisible();
  await page.goto("/2025/teams/real-madrid-mad");
  await page.getByRole("tab", { name: "Roster" }).click();
  await expect(page.locator('a[href="/2025/players/alberto-abalde-003733"]').first()).toBeVisible();
});

test("an unknown code still shows the not-found state and keeps its address", async ({ page }) => {
  await page.goto("/2025/games/nobody-vs-nobody-999999");
  await expect(page.getByText("Game not found.")).toBeVisible();
  await expect(page).toHaveURL(/\/2025\/games\/nobody-vs-nobody-999999$/);
});
