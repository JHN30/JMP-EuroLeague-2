import { test, expect } from "@playwright/test";
import { HEIGHT, WIDTHS, findPageOverflow, seasonSlug } from "./support/layout";

const staticPage = (name, path) => ({ name, route: async (_page, season) => `/${season}/${path}` });

// A detail page has no fixed address, so it is reached through the first link on its list page.
const detailPage = (name, listPath, linkSelector) => ({
  name,
  route: async (page, season) => {
    await page.goto(`/${season}/${listPath}`);
    return page.locator(linkSelector).first().getAttribute("href");
  },
});

// Every page here is checked for sideways page scroll at all four widths. A page that still overflows
// at 320px is added when its own mobile layout lands (the player page is the one left today).
const PAGES = [
  { name: "Page not found", route: async () => "/not-a/page" },
  staticPage("Home", "home"),
  staticPage("Overview", "overview"),
  staticPage("Standings", "standings"),
  staticPage("Games", "games"),
  staticPage("Teams", "teams"),
  staticPage("Players", "players"),
  staticPage("Leaders", "leaders"),
  staticPage("Compare", "compare"),
  staticPage("Head-to-head", "compare/head-to-head"),
  staticPage("Records", "records"),
  staticPage("Postseason", "postseason"),
  detailPage("Game detail", "games", 'a[href*="/games/"]'),
  detailPage("Team page", "teams", 'a[href*="/teams/"]'),
];

const MOBILE_WIDTHS = [320, 390, 639];
const TABLET_AND_UP_WIDTHS = [640, 768, 1024];

test("the page list is not empty", () => {
  expect(PAGES.length).toBeGreaterThan(0);
});

test("the overflow check reports an element wider than the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: HEIGHT });
  await page.goto("/not-a/page");
  await page.evaluate(() => {
    const wide = document.createElement("div");
    wide.style.width = "900px";
    wide.style.height = "10px";
    document.body.appendChild(wide);
  });
  const overflow = await findPageOverflow(page);
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  expect(overflow.offenders.length).toBeGreaterThan(0);
});

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    for (const { name, route } of PAGES) {
      test(`${name} does not scroll sideways`, async ({ page }) => {
        const season = await seasonSlug(page);
        await page.goto(await route(page, season));
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator(".loading")).toHaveCount(0);
        const overflow = await findPageOverflow(page);
        expect(overflow.scrollWidth, `wider than the screen: ${overflow.offenders.join("; ")}`).toBeLessThanOrEqual(
          overflow.clientWidth,
        );
      });
    }
  });
}

for (const width of MOBILE_WIDTHS) {
  test.describe(`${width}px header`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test("is a 48px bar whose menu holds the tabs, the season picker and the theme switch", async ({ page }) => {
      await seasonSlug(page);
      const header = page.getByRole("banner");
      const menu = page.getByRole("button", { name: "Menu" });
      const sections = page.getByRole("navigation", { name: "Sections" });

      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(sections).toHaveCount(0);
      expect((await header.boundingBox()).height).toBe(48);

      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(sections.getByRole("link")).toHaveCount(9);
      await expect(page.getByRole("combobox", { name: "Selected season" })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Switch to/ })).toBeVisible();
      expect((await header.boundingBox()).height).toBe(48);
    });

    test("closes on a tab, a season change, Escape and a tap outside, and the bar names the page", async ({ page }) => {
      const season = await seasonSlug(page);
      const menu = page.getByRole("button", { name: "Menu" });
      const sections = page.getByRole("navigation", { name: "Sections" });
      await expect(page.getByTestId("page-name")).toHaveText("Home");

      await menu.click();
      await sections.getByRole("link", { name: "Teams", exact: true }).click();
      await expect(page).toHaveURL(/\/teams$/);
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByTestId("page-name")).toHaveText("Teams");

      await menu.click();
      const picker = page.getByRole("combobox", { name: "Selected season" });
      const values = await picker.locator("option").evaluateAll((options) => options.map((option) => option.value));
      await picker.selectOption(values.find((value) => value !== season));
      await expect(page).not.toHaveURL(new RegExp(`/${season}/`));
      await expect(menu).toHaveAttribute("aria-expanded", "false");

      await menu.click();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");

      await menu.click();
      await page.mouse.click(width / 2, HEIGHT - 20);
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    });

    test("closes when the screen grows to the tablet layout", async ({ page }) => {
      await seasonSlug(page);
      const menu = page.getByRole("button", { name: "Menu" });
      await menu.click();
      await page.setViewportSize({ width: 640, height: HEIGHT });
      await expect(menu).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link")).toHaveCount(9);
    });
  });
}

test.describe("the bar names the section of a deeper page", () => {
  test.use({ viewport: { width: 390, height: HEIGHT } });

  const cases = [
    { path: "records", label: "Records" },
    { path: "compare/head-to-head", label: "Compare" },
  ];
  for (const { path, label } of cases) {
    test(`/${path} reads ${label}`, async ({ page }) => {
      const season = await seasonSlug(page);
      await page.goto(`/${season}/${path}`);
      await expect(page.getByTestId("page-name")).toHaveText(label);
    });
  }

  for (const { name, listPath, linkSelector, label } of [
    { name: "a game", listPath: "games", linkSelector: 'a[href*="/games/"]', label: "Games" },
    { name: "a team", listPath: "teams", linkSelector: 'a[href*="/teams/"]', label: "Teams" },
  ]) {
    test(`${name} page reads ${label}`, async ({ page }) => {
      const season = await seasonSlug(page);
      await page.goto(await detailPage(name, listPath, linkSelector).route(page, season));
      await expect(page.getByTestId("page-name")).toHaveText(label);
    });
  }
});

for (const width of TABLET_AND_UP_WIDTHS) {
  test.describe(`${width}px header`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    test("keeps the nine tabs on one row under the season picker and theme switch", async ({ page }) => {
      await seasonSlug(page);
      const sections = page.getByRole("navigation", { name: "Sections" });
      const links = sections.getByRole("link");

      await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
      await expect(sections).toHaveCount(1);
      await expect(links).toHaveCount(9);
      const tops = await links.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      expect((await page.getByRole("banner").boundingBox()).height).toBe(88);

      const picker = await page.getByRole("combobox", { name: "Selected season" }).boundingBox();
      const tabsRow = await sections.boundingBox();
      expect(picker.y + picker.height).toBeLessThanOrEqual(tabsRow.y + 1);
    });
  });
}

for (const { width, header } of [
  { width: 320, header: 48 },
  { width: 640, header: 88 },
]) {
  test(`at ${width}px a tab panel scrolls to ${header + 16}px below the top`, async ({ page }) => {
    await page.setViewportSize({ width, height: HEIGHT });
    await seasonSlug(page);
    await expect(page.getByRole("banner")).toBeVisible();
    const { margin, height } = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "tab-panel";
      document.body.appendChild(probe);
      const margin = parseFloat(getComputedStyle(probe).scrollMarginTop);
      probe.remove();
      return { margin, height: document.querySelector("header").getBoundingClientRect().height };
    });
    expect(height).toBe(header);
    expect(margin).toBe(height + 16);
  });
}
