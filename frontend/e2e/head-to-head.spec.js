import { test, expect } from "@playwright/test";

test("renders a cross-season head-to-head history", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/seasons") return route.fulfill({ json: { seasons: [{ seasonCode: "2025", name: "2024-25", startYear: 2024 }, { seasonCode: "2026", name: "2025-26", startYear: 2025 }] } });
    if (/\/teams$/.test(url.pathname)) return route.fulfill({ json: { teams: [{ clubCode: "A", name: "Team A" }, { clubCode: "B", name: "Team B" }] } });
    if (/\/teams\/A\/games$/.test(url.pathname)) return route.fulfill({ json: { games: [{ gameCode: 1, played: true, localTeam: { clubCode: "A" }, roadTeam: { clubCode: "B" }, localScore: 80, roadScore: 70, roundNumber: 1, phaseCode: "RS", scheduledAt: "2025-01-01T18:00:00Z" }] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/2026/comparisons/head-to-head?teamA=A&teamB=B");
  await expect(page.getByRole("heading", { name: "Head-to-head" })).toBeVisible();
  await expect(page.getByText("2 completed meetings")).toBeVisible();
  await expect(page.getByRole("img", { name: "Meeting margin timeline from Team A perspective" })).toBeVisible();
});
