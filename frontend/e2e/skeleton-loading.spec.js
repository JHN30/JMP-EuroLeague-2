import { test, expect } from "@playwright/test";

// Home's data requests (standings, games, leaders, team totals) held back until `release`, so the skeletons stay on screen.
const HOME_DATA = /\/api\/seasons\/[^/]+\/(phases\/[^/]+\/standings|games|season-stats|stats|teams|team-stats|league)/;

async function holdHomeData(page) {
  await page.route(HOME_DATA, () => {});
  // Removing the route lets the held requests through.
  return () => page.unroute(HOME_DATA);
}

const panel = (page, title) => page.locator("section", { has: page.getByRole("heading", { name: title, exact: true }) });

test("Home shows a skeleton in every panel while its data loads, then the content", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  const release = await holdHomeData(page);
  await page.goto("/2026/home");

  for (const title of ["Upcoming games", "League table", "Latest scores"]) {
    const busy = panel(page, title).locator('[aria-busy="true"]');
    await expect(busy).toHaveCount(1, { timeout: 30_000 });
    await expect(busy).toHaveAttribute("role", "status");
    await expect(busy.locator(".skeleton").first()).toBeVisible();
  }
  await expect(page.getByRole("status", { name: "Loading Leader in wins" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading the points per game leader" })).toBeVisible();
  await expect(page.locator("main .loading")).toHaveCount(0);

  await release();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("main .skeleton")).toHaveCount(0);
  await expect(panel(page, "Latest scores").locator("a.match-card").first()).toBeVisible();
});

// The names of the running animations on the skeletons.
const runningShimmers = (page) =>
  page
    .locator("main .skeleton")
    .evaluateAll((els) => els.flatMap((el) => el.getAnimations()).filter((animation) => animation.playState === "running").map((animation) => animation.animationName));

test("skeletons shimmer, and stay still under reduced motion", async ({ page }) => {
  await holdHomeData(page);
  await page.goto("/2026/home");
  await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => runningShimmers(page)).toContain("skeleton");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("main .skeleton").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(300);
  expect(await runningShimmers(page)).toEqual([]);
});

test("a page whose code is still loading shows a page skeleton inside the shell", async ({ page }) => {
  await page.goto("/2026/home");
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible({ timeout: 30_000 });

  await page.route(/\/src\/records\/RecordsPage\.jsx/, () => {});
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Records", exact: true }).click();

  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("aria-busy", "true");
  await expect(fallback.locator(".skeleton").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();

  await page.unroute(/\/src\/records\/RecordsPage\.jsx/);
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});

test("Home's own page skeleton shows while Home's code loads", async ({ page }) => {
  const DASHBOARD = /\/src\/dashboard\/Dashboard\.jsx/;
  await page.route(DASHBOARD, () => {});
  await page.goto("/2026/home");
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible({ timeout: 30_000 });
  // Laid out as Home: the games row, the scores list, the four team cards and the leader cards with their silhouettes.
  await expect(fallback.locator(".games-row")).toHaveCount(1);
  await expect(fallback.locator(".games-list")).toHaveCount(1);
  await expect(fallback.locator(".kpi-strip-4 .kpi-chip")).toHaveCount(4);
  await expect(fallback.locator(".leaders-row .kpi-chip")).toHaveCount(4);
  await page.unroute(DASHBOARD);
  await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible({ timeout: 30_000 });
  await expect(fallback).toHaveCount(0);
});


// Holds back the API requests matching `pattern` until `release`, so the skeleton they feed stays on screen.
async function hold(page, pattern) {
  const held = [];
  await page.route(pattern, (route) => held.push(route));
  return async () => {
    await page.unroute(pattern);
    await Promise.all(held.map((route) => route.continue().catch(() => {})));
  };
}

// A loading status showing a skeleton and no spinner.
async function expectSkeleton(page, label) {
  const status = page.getByRole("status", { name: label, exact: true });
  await expect(status).toBeVisible({ timeout: 30_000 });
  await expect(status).toHaveAttribute("aria-busy", "true");
  await expect(status.locator(".skeleton").first()).toBeVisible();
  await expect(page.locator("main .loading")).toHaveCount(0);
}

// Every skeleton gone once the data is in.
async function expectLoaded(page) {
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("main .skeleton")).toHaveCount(0);
}

test.describe("Standings", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
  });

  test("the table and its KPI chips show skeletons while they load", async ({ page }) => {
    const releaseStandings = await hold(page, /\/api\/seasons\/[^/]+\/phases\/[^/]+\/standings/);
    const releaseNet = await hold(page, /\/api\/seasons\/[^/]+\/advanced\/standings/);
    await page.goto("/2026/standings");
    await expectSkeleton(page, "Loading standings");
    await expect(page.getByRole("status", { name: "Loading standings" }).locator(".kpi-strip-5 .kpi-chip")).toHaveCount(5);

    await releaseStandings();
    await expect(page.locator("table").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("status", { name: "Loading Best net rating" })).toBeVisible();
    await expect(page.locator("main .loading")).toHaveCount(0);

    await releaseNet();
    await expectLoaded(page);
  });

  for (const { name, pattern, open, label } of [
    { name: "Advanced", pattern: /\/api\/seasons\/[^/]+\/advanced\/standings(?!\?scope)/, open: (page) => page.getByRole("tab", { name: "Advanced", exact: true }).click(), label: "Loading advanced standings" },
    { name: "Race", pattern: /\/api\/seasons\/[^/]+\/phases\/[^/]+\/rounds/, open: (page) => page.getByRole("tab", { name: "Race", exact: true }).click(), label: "Loading standings race" },
    { name: "Winning margins", pattern: /\/api\/seasons\/[^/]+\/phases\/[^/]+\/results/, open: (page) => page.getByLabel("Breakdown").selectOption("margins"), label: "Loading margins" },
    { name: "Ahead/behind", pattern: /\/api\/seasons\/[^/]+\/phases\/[^/]+\/results/, open: (page) => page.getByLabel("Breakdown").selectOption("aheadBehind"), label: "Loading the quarter scores" },
  ]) {
    test(`the ${name} view shows a skeleton while it loads`, async ({ page }) => {
      await page.goto("/2026/standings");
      await expectLoaded(page);
      await expect(page.locator("table").first()).toBeVisible();
      const release = await hold(page, pattern);
      await open(page);
      await expectSkeleton(page, label);
      await release();
      await expectLoaded(page);
    });
  }

  test("the whole page shows its skeleton while the phases load", async ({ page }) => {
    await hold(page, /\/api\/seasons\/[^/]+\/phases$/);
    await page.goto("/2026/standings");
    await expectSkeleton(page, "Loading phases");
  });
});

// A page whose data (matching `pattern`) is held back shows its skeleton under `label`, then the content with no skeleton left.
for (const { path, pattern, label, loaded } of [
  { path: "/2026/games", pattern: /\/api\/seasons\/[^/]+\/games(\?|$)/, label: "Loading games", loaded: (page) => page.locator(".fixture-card").first() },
  { path: "/2026/games", pattern: /\/api\/seasons\/[^/]+\/phases$/, label: "Loading phases", loaded: (page) => page.locator(".fixture-card").first() },
  { path: "/2026/teams", pattern: /\/api\/seasons\/[^/]+\/teams(\?|$)/, label: "Loading teams", loaded: (page) => page.locator("main ul a").first() },
  { path: "/2026/players", pattern: /\/api\/seasons\/[^/]+\/players(\?|$)/, label: "Loading players", loaded: (page) => page.locator("main ul a").first() },
]) {
  test(`${path} shows a skeleton for "${label}", then the content`, async ({ page }) => {
    const release = await hold(page, pattern);
    await page.goto(path);
    await expectSkeleton(page, label);
    await release();
    await expect(loaded(page)).toBeVisible({ timeout: 30_000 });
    await expectLoaded(page);
  });
}

test.describe("Leaders", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
  });

  test("the category cards and the form show skeleton rows while they load, then the leaders", async ({ page }) => {
    const releaseStats = await hold(page, /\/api\/seasons\/[^/]+\/season-stats/);
    const releaseForm = await hold(page, /\/api\/seasons\/[^/]+\/leaders\/form/);
    await page.goto("/2026/leaders");
    const cards = page.locator('main [role="status"][aria-busy="true"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => cards.count(), { timeout: 30_000 }).toBeGreaterThan(3);
    await expect(page.locator(".panel [aria-busy=\"true\"] li .skeleton").first()).toBeVisible();
    await expectSkeleton(page, "Loading player form");
    await releaseStats();
    await releaseForm();
    await expectLoaded(page);
  });

  test("a full leaderboard shows skeleton rows while it loads", async ({ page }) => {
    await page.goto("/2026/leaders");
    await expectLoaded(page);
    const release = await hold(page, /\/api\/seasons\/[^/]+\/season-stats/);
    await page.getByRole("button", { name: "See the full leaderboard" }).first().click();
    await expectSkeleton(page, "Loading the player leaderboard");
    await release();
    await expectLoaded(page);
  });

  test("the Advanced tab shows its cards' skeleton while its scopes load", async ({ page }) => {
    await page.goto("/2026/leaders");
    await expectLoaded(page);
    const release = await hold(page, /\/api\/seasons\/[^/]+\/advanced\/leaders/);
    await page.getByRole("tab", { name: "Advanced", exact: true }).click();
    await expectSkeleton(page, "Loading advanced leaders");
    await release();
    await expectLoaded(page);
  });
});

test.describe("Records", () => {
  const RECORDS = /\/api\/seasons\/[^/]+\/records\/(player-seasons|single-games|team-seasons|team-games)/;

  test("the record book shows skeleton cards while it loads", async ({ page }) => {
    const release = await hold(page, /\/api\/seasons\/[^/]+\/records\/book/);
    await page.goto("/2026/records");
    await expectSkeleton(page, "Loading the record book");
    await release();
    await expectLoaded(page);
  });

  test("a record shows a skeleton on its first load, and dims its rows on a metric change", async ({ page }) => {
    await page.goto("/2026/records");
    await expectLoaded(page);
    let release = await hold(page, RECORDS);
    await page.locator("main ol a").first().click();
    await expectSkeleton(page, "Loading archive records");
    await release();
    await expectLoaded(page);

    release = await hold(page, RECORDS);
    await page.getByLabel("Metric").selectOption({ index: 1 });
    await expect(page.locator("#records-panel")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("main .skeleton")).toHaveCount(0);
    await release();
  });
});

test("the Postseason page shows its skeleton while it loads, then the bracket", async ({ page }) => {
  const release = await hold(page, /\/api\/seasons\/[^/]+\/format/);
  await page.goto("/2026/postseason");
  await expectSkeleton(page, "Loading the postseason");
  await release();
  await expect(page.getByRole("heading", { name: "Postseason" })).toBeVisible({ timeout: 30_000 });
  await expectLoaded(page);
});

test.describe("Season overview", () => {
  test("the whole page shows its skeleton, not a full-screen spinner, while the phases load", async ({ page }) => {
    const release = await hold(page, /\/api\/seasons\/[^/]+\/phases$/);
    await page.goto("/2026/overview");
    await expectSkeleton(page, "Loading phases");
    await expect(page.locator("main .min-h-screen")).toHaveCount(0);
    await release();
    await expectLoaded(page);
  });

  test("the summary and the leader cards show skeletons while they load", async ({ page }) => {
    const releaseSummary = await hold(page, /\/api\/seasons\/[^/]+\/games(\?|$)/);
    const releaseLeaders = await hold(page, /\/api\/seasons\/[^/]+\/season-stats/);
    await page.goto("/2026/overview");
    await expectSkeleton(page, "Loading season summary");
    const chip = page.getByRole("status", { name: "Loading Points per game" }).first();
    await expect(chip).toBeVisible();
    await expect(chip.locator(".skeleton").first()).toBeVisible();
    await releaseSummary();
    await releaseLeaders();
    await expectLoaded(page);
  });
});

test.describe("Compare", () => {
  test("the whole landing shows its skeleton while the phases load: the games as compact rows, then the pickers", async ({ page }) => {
    const release = await hold(page, /\/api\/seasons\/[^/]+\/phases$/);
    await page.goto("/2026/compare");
    await expectSkeleton(page, "Loading phases");
    await expect(page.getByRole("status", { name: "Loading phases" }).locator("li.rounded-field")).toHaveCount(10);
    await release();
    await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible({ timeout: 30_000 });
  });

  test("the upcoming games show skeleton rows while they load, then the games", async ({ page }) => {
    const release = await hold(page, /\/api\/seasons\/[^/]+\/games(\?|$)/);
    await page.goto("/2026/compare");
    await expectSkeleton(page, "Loading games");
    await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible();
    await release();
    await expect(page.getByRole("button", { name: /^Compare / }).first()).toBeVisible({ timeout: 30_000 });
    await expectLoaded(page);
  });

  test("the players view shows the pickers' skeleton without the games, and an opened comparison the generic one", async ({ page }) => {
    const release = await hold(page, /\/api\/seasons\/[^/]+\/phases$/);
    await page.goto("/2026/compare?view=players");
    await expectSkeleton(page, "Loading phases");
    await expect(page.getByRole("status", { name: "Loading phases" }).locator("li")).toHaveCount(0);
    await page.goto("/2026/compare?teamA=PAN&teamB=OLY");
    await expectSkeleton(page, "Loading phases");
    await expect(page.getByRole("status", { name: "Loading phases" }).locator("li")).toHaveCount(0);
    await release();
  });
});

// Each list page's own skeleton (and Compare's) while its code loads (`marker` is a part only that page's skeleton has); a
// detail page keeps the generic one.
for (const { name, module, marker } of [
  { name: "Overview", module: /\/src\/season\/SeasonOverviewPage\.jsx/, marker: ".season-leaders-grid" },
  { name: "Standings", module: /\/src\/standings\/StandingsPage\.jsx/, marker: ".kpi-strip-5" },
  { name: "Games", module: /\/src\/games\/FixturesPage\.jsx/, marker: ".fixture-grid" },
  { name: "Teams", module: /\/src\/teams\/TeamsPage\.jsx/, marker: "li.card" },
  { name: "Players", module: /\/src\/players\/PlayersPage\.jsx/, marker: "li.rounded-box" },
  { name: "Leaders", module: /\/src\/leaders\/LeadersPage\.jsx/, marker: ".panel ol" },
  { name: "Records", module: /\/src\/records\/RecordsPage\.jsx/, marker: ".panel.p-5" },
  { name: "Postseason", module: /\/src\/postseason\/PostseasonPage\.jsx/, marker: ".h-28" },
  { name: "Compare", module: /\/src\/comparisons\/ComparisonsPage\.jsx/, marker: "li.rounded-field" },
]) {
  test(`${name} shows its own page skeleton while its code loads`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/2026/home");
    await expect(page.getByRole("heading", { name: "Upcoming games" })).toBeVisible({ timeout: 30_000 });
    const release = await hold(page, module);
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name, exact: true }).click();
    const fallback = page.getByRole("status", { name: "Loading page" });
    await expect(fallback).toBeVisible();
    await expect(fallback.locator(marker).first()).toBeVisible();
    await release();
    await expect(fallback).toHaveCount(0, { timeout: 30_000 });
  });
}

test("a team page shows its own page skeleton while its code loads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2026/teams");
  await expect(page.locator("main ul a").first()).toBeVisible({ timeout: 30_000 });
  const release = await hold(page, /\/src\/teams\/TeamPage\.jsx/);
  await page.locator("main ul a").first().click();
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  // Laid out as a team page on its Overview: the leader cards, not the Teams list's cards.
  await expect(fallback.locator(".team-leaders-grid")).toHaveCount(1);
  await expect(fallback.locator("li.card")).toHaveCount(0);
  await release();
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});

// A part only the player page's skeleton has: the hero's portrait column.
const PLAYER_HERO = "[class*='grid-cols-[11rem_1fr]']";

test("a player page shows its own page skeleton while its code loads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2026/players");
  await expect(page.locator("main a[href*='/players/']").first()).toBeVisible({ timeout: 30_000 });
  const release = await hold(page, /\/src\/players\/PlayerPage\.jsx/);
  await page.locator("main a[href*='/players/']").first().click();
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  await expect(fallback.locator(PLAYER_HERO)).toHaveCount(1);
  await expect(fallback.locator("li.rounded-box")).toHaveCount(0);
  await release();
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});

test("a game page keeps the generic page skeleton while its code loads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2026/games");
  await expect(page.locator("main a[href*='/games/']").first()).toBeVisible({ timeout: 30_000 });
  const release = await hold(page, /\/src\/games\/GameDetailPage\.jsx/);
  await page.locator("main a[href*='/games/']").first().click();
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  await expect(fallback.locator(`${PLAYER_HERO}, .team-leaders-grid, .fixture-grid`)).toHaveCount(0);
  await release();
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});

test.describe("Player page", () => {
  const api = (rest) => new RegExp(`/api/seasons/[^/]+/${rest}`);
  let playerPath;

  // A player with games this season: the first on a club's roster.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/2026/teams/PAN");
    await page.getByRole("tab", { name: "Roster", exact: true }).click();
    playerPath = await page.locator("main a[href*='/players/']").first().getAttribute("href", { timeout: 30_000 });
    await page.close();
  });

  test("the whole page shows its skeleton while the player loads, then the page", async ({ page }) => {
    const release = await hold(page, api("players/\\d+(\\?|$)"));
    await page.goto(playerPath);
    await expectSkeleton(page, "Loading the player");
    await expect(page.getByRole("status", { name: "Loading the player" }).locator(PLAYER_HERO)).toHaveCount(1);
    await release();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expectLoaded(page);
  });

  test("the Overview shows its skeleton while the rankings load, and the form panel its own", async ({ page }) => {
    const releaseRankings = await hold(page, api("season-stats"));
    const releaseGames = await hold(page, api("players/[^/]+/games"));
    await page.goto(playerPath);
    await expectSkeleton(page, "Loading league rankings");
    await releaseRankings();
    await expectSkeleton(page, "Loading recent games");
    await releaseGames();
    await expectLoaded(page);
  });

  for (const { tab, pattern, label, early = false } of [
    { tab: "Season by season", pattern: "season-stats", label: "Loading season history" },
    { tab: "Statistics", pattern: "season-stats", label: "Loading season statistics" },
    { tab: "Advanced", pattern: "players/[^/]+/advanced", label: "Loading advanced player stats" },
    { tab: "Shooting", pattern: "players/[^/]+/shots", label: /^Aggregating \d+ shooting charts$/ },
    // The Overview already loads the game log, so it is held from the start.
    { tab: "Games", pattern: "players/[^/]+/games", label: "Loading the game log", early: true },
  ]) {
    test(`the ${tab} tab shows its skeleton while it loads, then its content`, async ({ page }) => {
      let release = early ? await hold(page, api(pattern)) : null;
      await page.goto(playerPath);
      if (!early) {
        await expectLoaded(page);
        release = await hold(page, api(pattern));
      }
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expectSkeleton(page, label);
      await release();
      await expectLoaded(page);
    });
  }

  test("the Shooting tab shows the shooting skeleton while the game log loads", async ({ page }) => {
    const release = await hold(page, api("players/[^/]+/games"));
    await page.goto(playerPath);
    await page.getByRole("tab", { name: "Shooting", exact: true }).click();
    await expectSkeleton(page, "Loading this player's shot locations");
    await release();
    await expectLoaded(page);
  });

  test("the profile by season shows a radar block while every season's rankings load", async ({ page }) => {
    await page.goto(playerPath);
    await expectLoaded(page);
    await page.getByRole("tab", { name: "Season by season", exact: true }).click();
    await expectLoaded(page);
    const release = await hold(page, api("season-stats"));
    await page.getByRole("button", { name: "Compare the profile by season" }).click();
    await expectSkeleton(page, "Loading league rankings for every season");
    await release();
    await expectLoaded(page);
  });
});

test.describe("Team page", () => {
  const TEAM = "/2026/teams/PAN";
  const api = (rest) => new RegExp(`/api/seasons/[^/]+/${rest}`);

  test("the whole page shows its skeleton while the team loads, then the page", async ({ page }) => {
    const release = await hold(page, api("teams/PAN(\\?|$)"));
    await page.goto(TEAM);
    await expectSkeleton(page, "Loading the team");
    await expect(page.getByRole("status", { name: "Loading the team" }).locator(".team-leaders-grid")).toHaveCount(1);
    await release();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expectLoaded(page);
  });

  test("the Overview shows its skeleton while the games load, and each panel its own", async ({ page }) => {
    const releaseGames = await hold(page, api("teams/PAN/games"));
    const releasePanels = await hold(page, api("(phases/[^/]+/standings|season-stats|advanced/standings)"));
    await page.goto(TEAM);
    await expectSkeleton(page, "Loading this team's games");
    await releaseGames();
    for (const label of ["Loading the record", "Loading team leaders", "Loading the league profile", "Loading the comparison"]) {
      await expectSkeleton(page, label);
    }
    await releasePanels();
    await expectLoaded(page);
  });

  for (const { tab, pattern, label } of [
    { tab: "Statistics", pattern: "teams/PAN/team-stats", label: "Loading team statistics" },
    { tab: "Roster", pattern: "teams/PAN/roster", label: "Loading the roster" },
    { tab: "Games", pattern: "teams/PAN/games", label: "Loading the games" },
    { tab: "Shooting", pattern: "games/[^/]+/shots", label: /^Aggregating \d+ shooting charts$/ },
    { tab: "Advanced", pattern: "teams/PAN/advanced", label: "Loading advanced team stats" },
  ]) {
    test(`the ${tab} tab shows its skeleton while it loads, then its content`, async ({ page }) => {
      const release = await hold(page, api(pattern));
      await page.goto(TEAM);
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expectSkeleton(page, label);
      await release();
      await expectLoaded(page);
    });
  }

  test("a lineup size with no data yet shows lineup rows, not a spinner", async ({ page }) => {
    const release = await hold(page, api("teams/PAN/lineups"));
    await page.goto(TEAM);
    await page.getByRole("tab", { name: "Advanced", exact: true }).click();
    await expectSkeleton(page, "Loading lineups");
    await release();
    await expectLoaded(page);
  });
});
