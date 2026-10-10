import { test, expect } from "@playwright/test";

test("Compare opens on the games of a round, and a game opens the comparison of its two clubs", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });

  // The current season has games still to play, so the coming round is on offer.
  await page.goto("/2026/compare");
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
  // The pickers are comboboxes: the first option clears the pick, so the first club is option 1.
  await page.getByRole("combobox", { name: "Team A" }).click();
  await page.getByRole("listbox", { name: "Team A" }).getByRole("option").nth(1).click();
  await page.getByRole("combobox", { name: "Team B" }).click();
  await page.getByRole("listbox", { name: "Team B" }).getByRole("option").nth(2).click();
  await expect(sections).toBeVisible();

  expect(errors).toEqual([]);
});

test("two players open a comparison with a profile, advanced numbers and the way back", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  const { players } = await (await page.request.get("http://localhost:3000/api/seasons/2025/players?limit=2")).json();

  await page.goto(`/2025/compare?view=players&playerA=${players[0].personKey}&playerB=${players[1].personKey}`);
  const sections = page.getByRole("tablist", { name: "Comparison section" });
  await expect(sections.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Season line" })).toBeVisible();

  await sections.getByRole("tab", { name: "Advanced" }).click();
  await expect(page.getByText("Per 100 possessions", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "← Players" }).click();
  await expect(page.getByLabel("Player A")).toBeVisible();

  // The player page offers the way in.
  await page.goto(`/2025/players/${players[0].personKey}`);
  await page.getByRole("link", { name: "Compare with another player" }).click();
  await expect(page).toHaveURL(/view=players&playerA=/);
  expect(errors).toEqual([]);
});

test("the team and player pickers work from the keyboard", async ({ page }) => {
  await page.goto("/2025/compare");
  const teamA = page.getByRole("combobox", { name: "Team A" });
  const teamB = page.getByRole("combobox", { name: "Team B" });
  const activeOf = async (box) => (await page.locator(`[id="${await box.getAttribute("aria-activedescendant")}"]`).innerText()).trim();

  // Enter opens the list on the current pick; Escape closes it without choosing, and focus stays on the button.
  await teamA.focus();
  await page.keyboard.press("Enter");
  await expect(teamA).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox", { name: "Team A" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(teamA).toHaveAttribute("aria-expanded", "false");
  await expect(teamA).toContainText("Select a team");
  await expect(teamA).toBeFocused();

  // A letter jumps to the next club starting with it, and Enter chooses it.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("r");
  const jumped = await activeOf(teamA);
  expect(jumped.toLowerCase().startsWith("r")).toBe(true);
  await page.keyboard.press("Enter");
  await expect(teamA).toHaveAttribute("aria-expanded", "false");
  await expect(teamA).toBeFocused();
  await expect(teamA).not.toContainText("Select a team");

  // The club picked for Team A is not offered for Team B; End and Enter pick B and open the comparison.
  await teamB.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox", { name: "Team B" }).getByRole("option", { name: jumped })).toHaveCount(0);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tablist", { name: "Comparison section" })).toBeVisible();

  // The player search: the arrows move through the top scorers and Enter chooses; Escape closes the list.
  await page.goto("/2025/compare?view=players");
  const playerA = page.getByRole("combobox", { name: "Player A" });
  await playerA.focus();
  await expect(page.getByRole("listbox", { name: "Top scorers" }).getByRole("option").first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(playerA).toHaveAttribute("aria-activedescendant", /option-1$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Change" })).toBeVisible();
  await page.getByRole("combobox", { name: "Player B" }).fill("zzzzqq");
  await expect(page.getByText("No players match.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("No players match.")).toBeHidden();
});
