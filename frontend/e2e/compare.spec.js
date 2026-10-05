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
  await expect(sections.getByRole("tab", { name: "Comparison" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Team A")).toHaveCount(0);
  await expect(page.getByRole("tablist", { name: "Comparison type" })).toHaveCount(0);

  // The rosters of the two clubs are compared in their own section.
  await sections.getByRole("tab", { name: "Rosters" }).click();
  await expect(page.getByText("Points of the top 3 scorers")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(2);

  await page.getByRole("button", { name: "← Games" }).click();
  await expect(page.getByRole("heading", { name: "Compare any two teams" })).toBeVisible();

  // Two clubs picked by hand open the same comparison.
  await page.getByLabel("Team A").selectOption({ index: 1 });
  await page.getByLabel("Team B").selectOption({ index: 2 });
  await expect(sections).toBeVisible();

  expect(errors).toEqual([]);
});
