import { test, expect } from "@playwright/test";

test("Compare opens on the games of a round, and a game opens the comparison of its two clubs", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });

  // The current season has games still to play, so the coming round is on offer.
  await page.goto("/E2026/comparisons");
  // The games panel comes first, and the pickers for any two teams sit under it.
  await expect(page.getByText("UPCOMING GAMES")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible();
  const games = page.getByRole("button", { name: /^Compare .+ and .+/ });
  await expect(games.first()).toBeVisible();

  // Opening a game fills both pickers, home club first, and keeps the way back.
  await games.first().click();
  await expect(page).toHaveURL(/teamA=.+&teamB=.+&game=|game=.+/);
  // The clutter is gone: no pickers or type tabs, just the sections.
  const sections = page.getByRole("tablist", { name: "Comparison section" });
  await expect(sections.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Where each club is stronger")).toBeVisible();

  // The statistics put the two clubs side by side with their places in the league.
  await sections.getByRole("tab", { name: "Statistics" }).click();
  await expect(page.getByText(/Under each bar: the club/)).toBeVisible();
  await expect(page.getByText(/^#\d+ of \d+$/).first()).toBeVisible();
  await expect(page.getByLabel("Team A")).toHaveCount(0);
  await expect(page.getByRole("tablist", { name: "Comparison type" })).toHaveCount(0);

  // The rosters of the two clubs are compared in their own section.
  await sections.getByRole("tab", { name: "Rosters" }).click();
  await expect(page.getByText("Points of the top 3 scorers")).toBeVisible();
  // The most impactful players of each club, then both squads: four tables.
  await expect(page.getByRole("heading", { name: "Most impactful players" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(4);

  await page.getByRole("button", { name: "← Games" }).click();
  await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible();

  // Two clubs picked by hand open the same comparison.
  await page.getByLabel("Team A").selectOption({ index: 1 });
  await page.getByLabel("Team B").selectOption({ index: 2 });
  await expect(sections).toBeVisible();

  expect(errors).toEqual([]);
});

test("two players open a comparison with a profile, advanced numbers and the way back", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  const { players } = await (await page.request.get("http://localhost:3000/api/seasons/E2025/players?limit=2")).json();

  await page.goto(`/E2025/comparisons?view=players&playerA=${players[0].personKey}&playerB=${players[1].personKey}`);
  const sections = page.getByRole("tablist", { name: "Comparison section" });
  await expect(sections.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Season line" })).toBeVisible();

  await sections.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.getByText("Per 100 possessions", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "← Players" }).click();
  await expect(page.getByLabel("Player A")).toBeVisible();

  // The player page offers the way in.
  await page.goto(`/E2025/players/${players[0].personKey}`);
  await page.getByRole("link", { name: "Compare with another player" }).click();
  await expect(page).toHaveURL(/view=players&playerA=/);
  expect(errors).toEqual([]);
});
