import { test, expect } from "@playwright/test";

const TABS = [
  { name: "Home", path: "home" },
  { name: "Overview", path: "overview" },
  { name: "Standings", path: "standings" },
  { name: "Games", path: "games" },
  { name: "Teams", path: "teams" },
  { name: "Players", path: "players" },
  { name: "Leaders", path: "leaders" },
  { name: "Compare", path: "compare" },
  { name: "Postseason", path: "postseason" },
];

test("every section has its own address and a tab title of the form 'Page | JMP EuroLeague'", async ({ page }) => {
  await page.goto("/2025/home");
  const sections = page.getByRole("navigation", { name: "Sections" });
  for (const tab of TABS) {
    await sections.getByRole("link", { name: tab.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/2025/" + tab.path + "$"));
    await expect(page).toHaveTitle(tab.name + " | JMP EuroLeague");
  }
});

test("the season root and the old addresses lead to the new ones, keeping the query", async ({ page }) => {
  await page.goto("/2025");
  await expect(page).toHaveURL(/\/2025\/home$/);

  await page.goto("/2025/statistics?scope=teams&metric=points");
  await expect(page).toHaveURL(/\/2025\/leaders\?scope=teams&metric=points$/);

  await page.goto("/2025/comparisons?view=players");
  await expect(page).toHaveURL(/\/2025\/compare\?view=players$/);

  await page.goto("/2025/comparisons/head-to-head?teamA=OLY&teamB=MAD");
  await expect(page).toHaveURL(/\/2025\/compare\/head-to-head\?teamA=OLY&teamB=MAD$/);
});

test("an address with the season code in it ('E2025') shows the year only, whatever page it names", async ({ page }) => {
  await page.goto("/E2025/standings?phase=PO");
  await expect(page).toHaveURL(/\/2025\/standings\?phase=PO$/);

  // Both an old page name and the old season form at once.
  await page.goto("/E2025/playoffs");
  await expect(page).toHaveURL(/\/2025\/postseason$/);

  // The site root lands on a current season's Home, written as a year.
  await page.goto("/");
  await expect(page).toHaveURL(/\/20\d\d\/home$/);
  await expect(page.getByRole("combobox", { name: "Selected season" })).toBeVisible();
});

test("a player's tab title reads like a name, not 'LAST, FIRST'", async ({ page }) => {
  const { players } = await (await page.request.get("http://localhost:3000/api/seasons/2025/players?search=Jones%2C%20Carlik&limit=1")).json();
  test.skip(players.length === 0, "the player is not in this season's data");
  await page.goto("/2025/players/" + players[0].personKey);
  await expect(page).toHaveTitle("Carlik Jones | JMP EuroLeague");
});
