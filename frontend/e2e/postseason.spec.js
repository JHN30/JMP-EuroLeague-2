import { test, expect } from "@playwright/test";

function watchErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  return errors;
}

test("a finished season shows its champion and the whole bracket, and a matchup opens its games", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/E2025");
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Postseason", exact: true }).click();
  await expect(page).toHaveURL(/\/E2025\/postseason$/);
  await expect(page.getByRole("heading", { name: "Postseason", exact: true })).toBeVisible();
  await expect(page.getByText(/are the champions/)).toBeVisible();

  // The bracket has every stage.
  for (const stage of ["Play-In", "Playoffs", "Final Four", "Final"]) {
    await expect(page.getByRole("heading", { name: stage, exact: true })).toBeVisible();
  }

  // A matchup opens its games.
  await page.getByRole("group", { name: "1 v 8" }).getByRole("button").first().click();
  await expect(page.getByText("Game 1")).toBeVisible();

  // The old address still works.
  await page.goto("/E2025/playoffs");
  await expect(page).toHaveURL(/\/E2025\/postseason$/);
  expect(errors).toEqual([]);
});

test("a season in progress shows a projected bracket and the race for it", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/E2026/postseason");
  await expect(page.getByText(/the bracket is a projection/)).toBeVisible();
  await expect(page.getByText("Projected").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Race for the bracket" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("seasons with a third-place game and a smaller league render too", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/E2024/postseason");
  await expect(page.getByRole("group", { name: "Third place" })).toBeVisible();
  await page.goto("/E2023/postseason");
  await expect(page.getByText(/are the champions/)).toBeVisible();
  expect(errors).toEqual([]);
});
