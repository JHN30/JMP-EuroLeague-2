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

test("a team page keeps the generic page skeleton while its code loads", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2026/teams");
  await expect(page.locator("main ul a").first()).toBeVisible({ timeout: 30_000 });
  const release = await hold(page, /\/src\/teams\/TeamPage\.jsx/);
  await page.locator("main ul a").first().click();
  const fallback = page.getByRole("status", { name: "Loading page" });
  await expect(fallback).toBeVisible();
  await expect(fallback.locator("li.card")).toHaveCount(0);
  await release();
  await expect(fallback).toHaveCount(0, { timeout: 30_000 });
});
