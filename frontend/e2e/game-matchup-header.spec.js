import { test, expect } from "@playwright/test";
import { SEASON, mockGameApi } from "./support/game-fixtures";
import { HEIGHT, findPageOverflow } from "./support/layout";

const crest = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>";
const PAN = { name: "Panathinaikos AKTOR Athens", abbreviatedName: "Panathinaikos", clubCode: "A", tvCode: "PAO", crestUrl: crest };
const FBT = { name: "Fenerbahce Beko Istanbul", abbreviatedName: "Fenerbahce", clubCode: "B", tvCode: "FBT", crestUrl: crest };
const STANDINGS = { round: 38, standings: [{ clubCode: "A", clubTvCode: "PAO", basic: { position: 1 } }, { clubCode: "B", clubTvCode: "FBT", basic: { position: 2 } }] };

async function openGame(page, { game = {}, standings = STANDINGS, standingsStatus = 200 } = {}) {
  await mockGameApi(page);
  await page.route(`**/api/seasons/${SEASON}/phases/RS/standings**`, (route) =>
    route.fulfill({ status: standingsStatus, json: standingsStatus === 200 ? standings : { error: "Mocked failure" } }),
  );
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({
      json: {
        game: {
          gameCode: 1,
          played: true,
          phaseCode: "RS",
          phaseName: "Regular season",
          roundNumber: 12,
          scheduledAt: "2025-01-01T18:00:00Z",
          localTeam: PAN,
          roadTeam: FBT,
          localScore: 112,
          roadScore: 101,
          ...game,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  await page.goto(`/${SEASON}/games/1`);
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
  return page.locator("main h1").locator("xpath=ancestor::section[1]");
}

async function atWidths(page, widths, check) {
  for (const width of widths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: HEIGHT });
      await check(width);
    });
  }
}

const expectNoPageOverflow = (page) => expect.poll(async () => (await findPageOverflow(page)).offenders).toEqual([]);

// Everything inside the header sits inside its box.
const holdsContent = (header) =>
  header.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll("*")].every((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width === 0 || (rect.left >= box.left - 1 && rect.right <= box.right + 1);
    });
  });

test("a played regular-season game shows both TV codes and positions, the score and the round and date", async ({ page }) => {
  const header = await openGame(page);
  const codes = header.locator("p.font-bold");
  await expect(codes).toHaveCount(2);
  await expect(codes.nth(0)).toContainText("PAO");
  await expect(codes.nth(1)).toContainText("FBT");
  await expect(header.getByText("(1)")).toBeVisible();
  await expect(header.getByText("(2)")).toBeVisible();
  await expect(codes.nth(0).locator(".sr-only")).toHaveText(", league position 1");
  await expect(header.locator("p.tabular-nums")).toHaveText("112 - 101");
  await expect(header.getByText("Final", { exact: true })).toBeVisible();
  await expect(header.locator("p.muted").last()).toHaveText(/^Round 12 · .*2025$/);

  // The home club is on the left, the road club on the right, and the winner's code is in the primary colour.
  const [home, road] = await Promise.all([codes.nth(0).boundingBox(), codes.nth(1).boundingBox()]);
  expect(home.x).toBeLessThan(road.x);
  await expect(codes.nth(0)).toHaveClass(/text-primary/);
  await expect(codes.nth(1)).not.toHaveClass(/text-primary/);
  await expect(codes.nth(0)).toHaveAttribute("title", "Panathinaikos AKTOR Athens");
});

test("a game still to come shows the tip-off time and its status instead of a score", async ({ page }) => {
  const header = await openGame(page, { game: { played: false, localScore: null, roadScore: null, gameStatus: null } });
  await expect(header.locator("p.tabular-nums")).toHaveText(/\d{1,2}[:.]\d{2}/);
  await expect(header.getByText("Scheduled", { exact: true })).toBeVisible();
  await expect(header.getByText("Final", { exact: true })).toHaveCount(0);
  await expect(header.locator("p.muted").last()).not.toHaveText(/\d{1,2}:\d{2}/);
  await atWidths(page, [320, 390], async () => {
    expect(await holdsContent(header)).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("the header fits a phone with a high round, a long date and a three-digit score, and is larger from 640px", async ({ page }) => {
  const header = await openGame(page, { game: { roundNumber: 38, scheduledAt: "2026-11-30T20:00:00Z" } });
  const date = header.locator("p.muted").last();
  const crestWidth = () => header.locator("img").first().evaluate((el) => Math.round(el.getBoundingClientRect().width));
  const scoreSize = () => header.locator("p.tabular-nums").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  await atWidths(page, [320, 390, 639], async () => {
    expect(await crestWidth()).toBe(48);
    expect(await scoreSize()).toBeLessThan(36);
    expect(await holdsContent(header)).toBe(true);
    expect(await date.evaluate((el) => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 1.2)).toBe(true);
    await expect(header.locator("p.tabular-nums")).toHaveText("112 - 101");
    await expectNoPageOverflow(page);
  });
  await atWidths(page, [640, 768, 1024], async () => {
    expect(await crestWidth()).toBe(80);
    expect(await scoreSize()).toBeGreaterThanOrEqual(48);
    expect(await date.evaluate((el) => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 1.2)).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("a club without a TV code shows its abbreviated name then its club code, and a side to be set shows TBD", async ({ page }) => {
  let header = await openGame(page, {
    game: { localTeam: { ...PAN, tvCode: undefined }, roadTeam: { name: null, abbreviatedName: null, clubCode: "ZZZ", crestUrl: null } },
  });
  const codes = header.locator("p.font-bold");
  await expect(codes.nth(0)).toContainText("Panathinaikos");
  await expect(codes.nth(1)).toContainText("ZZZ");

  await page.unroute(`**/api/seasons/${SEASON}/games/1`);
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({ json: { game: { gameCode: 1, played: false, phaseCode: "RS", phaseName: "Regular season", roundNumber: 5, scheduledAt: null, localTeam: PAN, roadTeam: null, localScore: null, roadScore: null } } }),
  );
  await page.reload();
  header = page.locator("main h1").locator("xpath=ancestor::section[1]");
  await expect(header.locator("p.font-bold").nth(1)).toHaveText("TBD");
  await expect(header.locator("p.tabular-nums")).toHaveText("TBD");
  await expect(header.locator("p.muted").last()).toHaveText("Round 5 · TBD");
  await atWidths(page, [320], async () => {
    expect(await holdsContent(header)).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("a crest that fails to load leaves its slot, and the header still fits", async ({ page }) => {
  const header = await openGame(page, { game: { localTeam: { ...PAN, crestUrl: "http://localhost:9/missing.png" } } });
  await expect(header.locator("img")).toHaveCount(1);
  await atWidths(page, [320], async () => {
    expect(await holdsContent(header)).toBe(true);
    await expectNoPageOverflow(page);
  });
});

test("no brackets and no alert when the standings fail, list no such club, or the game is not a regular-season game", async ({ page }) => {
  let header = await openGame(page, { standingsStatus: 500 });
  await expect(header.locator("p.font-bold").first()).toContainText("PAO");
  await expect(header.getByText(/^\(\d+\)$/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.unroute(`**/api/seasons/${SEASON}/phases/RS/standings**`);
  await page.route(`**/api/seasons/${SEASON}/phases/RS/standings**`, (route) => route.fulfill({ json: { round: 38, standings: [{ clubCode: "Z", basic: { position: 3 } }] } }));
  await page.reload();
  header = page.locator("main h1").locator("xpath=ancestor::section[1]");
  await expect(header.locator("p.font-bold").first()).toContainText("PAO");
  await expect(header.getByText(/^\(\d+\)$/)).toHaveCount(0);

  await page.unroute(`**/api/seasons/${SEASON}/games/1`);
  await page.route(`**/api/seasons/${SEASON}/games/1`, (route) =>
    route.fulfill({ json: { game: { gameCode: 1, played: true, phaseCode: "PO", phaseName: "Playoffs", roundNumber: 2, scheduledAt: "2025-05-01T18:00:00Z", localTeam: PAN, roadTeam: FBT, localScore: 80, roadScore: 70 } } }),
  );
  await page.route(`**/api/seasons/${SEASON}/phases/RS/standings**`, (route) => route.fulfill({ json: STANDINGS }));
  await page.reload();
  header = page.locator("main h1").locator("xpath=ancestor::section[1]");
  await expect(header.locator("p.font-bold").first()).toContainText("PAO");
  await expect(header.getByText(/^\(\d+\)$/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the page keeps one heading that names both clubs in full", async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panathinaikos AKTOR Athens vs Fenerbahce Beko Istanbul");
});
