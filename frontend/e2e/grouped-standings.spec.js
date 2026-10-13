import { test, expect } from "@playwright/test";
import { groupStandings, selectedGroup } from "../src/standings/standingsGroups.js";
import { tableTiers } from "../src/lib/seasonFormat.js";
import { findPageOverflow, findBrokenWords, mockLayoutImages, WIDTHS } from "./support/layout";

const API = "http://localhost:3000/api";
const SEASONS = [2012, 2013, 2014, 2015];
const get = async (request, season, path) => {
  const response = await request.get(`${API}/seasons/${season}${path}`);
  expect(response.ok(), `${season}${path}`).toBe(true);
  return response.json();
};
const groupRegion = (page, name) => page.getByRole("region", { name: `Group ${name}`, exact: true });
const clubLinks = (region) => region.locator("table tbody a[href*='/teams/']");

test.beforeAll(async ({ request }) => {
  expect((await (await request.get(`${API}/health`)).json()).target).toBe("local");
});

test("group partitioning and selection preserve exact names without synthesizing ranks", () => {
  const groups = groupStandings([
    { clubCode: "A1", groupName: "A", basic: { position: 1 } },
    { clubCode: "B1", groupName: "B", basic: { position: 1 } },
    { clubCode: "A2", groupName: "A", basic: { position: 2 } },
    { clubCode: "U", groupName: null },
  ]);
  expect(groups.map((group) => [group.name, group.standings.map((row) => row.clubCode)])).toEqual([
    ["A", ["A1", "A2"]], ["B", ["B1"]], [null, ["U"]],
  ]);
  expect(selectedGroup(new URLSearchParams("group=A"), groups)).toBe("A");
  for (const query of ["", "group=unknown", "group=A&group=B", "group=a", "group="]) {
    expect(selectedGroup(new URLSearchParams(query), groups)).toBeNull();
  }
});

for (const season of SEASONS) {
  test(`${season}: actual RS and TS groups, rules, snapshots and labelled tables`, async ({ request, page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const { format } = await get(request, season, "/format");
    for (const [phase, names, size, games] of [["RS", ["A", "B", "C", "D"], 6, 10], ["TS", ["E", "F"], 8, 14]]) {
      const stage = format.stages.find((entry) => entry.code === phase);
      expect(tableTiers(format, phase)).toBeNull();
      expect(tableTiers(format, phase, "group")).toEqual([{ tier: "postseason", from: 1, to: 4 }]);
      const { standings, round } = await get(request, season, `/phases/${phase}/standings`);
      if (season < 2015) expect(standings.every((row) => row.basic.qualified === false)).toBe(true);
      const groups = groupStandings(standings);
      expect(groups.map((group) => group.name)).toEqual(names);
      for (const group of groups) {
        expect(group.standings).toHaveLength(size);
        expect(group.standings.map((row) => row.basic.position)).toEqual(Array.from({ length: size }, (_, index) => index + 1));
        expect(group.standings.every((row) => row.basic.gamesPlayed === games)).toBe(true);
      }
      const { rounds } = await get(request, season, `/phases/${phase}/rounds`);
      expect(rounds).toHaveLength(games);
      expect(rounds[0].name).toBe("Round 1");
      expect(rounds.at(-1).number).toBe(round);
      for (const entry of rounds) {
        const snapshot = await get(request, season, `/phases/${phase}/standings?round=${entry.number}`);
        expect(groupStandings(snapshot.standings).map((group) => [group.name, group.standings.length])).toEqual(names.map((name) => [name, size]));
        for (const row of snapshot.standings) expect(row.basic.position).toBeLessThanOrEqual(size);
      }
      await page.goto(`/${season}/standings?phase=${phase}`);
      await expect(page.getByLabel("Group", { exact: true })).toBeVisible({ timeout: 30_000 });
      for (const name of names) {
        const region = groupRegion(page, name);
        await expect(region.getByRole("heading", { name: `Group ${name}`, exact: true })).toBeVisible();
        await expect(clubLinks(region)).toHaveCount(size);
        await expect(region.locator(".tier-row-postseason")).toHaveText(phase === "RS" ? "Top 16 places" : "Playoff places");
        await expect(region.locator('[title="Qualified"]')).toHaveCount(4);
      }
      await page.getByLabel("Group", { exact: true }).selectOption(names[1]);
      await expect(page).toHaveURL(new RegExp(`phase=${phase}&group=${names[1]}$`));
      await expect(page.getByRole("region", { name: /^Group / })).toHaveCount(1);
      const selected = groupRegion(page, names[1]);
      const expected = groups[1].standings.map((row) => row.clubCode);
      expect(await clubLinks(selected).evaluateAll((links) => links.map((link) => link.getAttribute("href").split("/").at(-1)))).toEqual(expected);
      await expect(selected.locator('[data-testid="standings-kpi-strip"]')).toContainText(expected.length === 6 ? "Top 16 cutoff" : "Playoff cutoff");
      for (const view of ["Home", "Away", "Last 10", "Overall"]) {
        await page.getByRole("tab", { name: view, exact: true }).click();
        await expect(clubLinks(selected)).toHaveCount(size);
      }
      for (const breakdown of ["streaks", "margins", "aheadBehind"]) {
        await page.getByRole("combobox", { name: "Breakdown", exact: true }).selectOption(breakdown);
        await expect(selected.locator(".loading")).toHaveCount(0);
        const shown = await clubLinks(selected).evaluateAll((links) => links.map((link) => link.getAttribute("href").split("/").at(-1)));
        expect([...new Set(shown)].sort()).toEqual([...expected].sort());
      }
      await page.getByRole("combobox", { name: "Breakdown", exact: true }).selectOption("overview");
      await page.getByRole("tab", { name: "Race", exact: true }).click();
      const slider = selected.getByRole("slider", { name: "Round shown in the race" });
      await expect(slider).toHaveValue(String(games));
      await expect(clubLinks(selected)).toHaveCount(size);
      await expect(selected.locator(".badge-primary")).toHaveText(`${stage.name}: Round ${games}`);
      await slider.press("Home");
      await expect(selected.getByText(`${stage.name} start`).first()).toBeVisible();
      await slider.press("ArrowRight");
      await expect(selected.locator(".badge-primary")).toHaveText(`${stage.name}: Round 1`);
      const first = await get(request, season, `/phases/${phase}/standings?round=${rounds[0].number}`);
      for (const row of first.standings.filter((row) => row.groupName === names[1])) {
        const tableRow = selected.locator("tbody tr", { has: page.locator(`a[href='/${season}/teams/${row.clubCode}']`) });
        await expect(tableRow).toContainText(`${row.basic.gamesWon}-${row.basic.gamesLost}`);
      }
      await slider.press("End");
      await expect(selected.locator(".badge-primary")).toHaveText(`${stage.name}: Round ${games}`);
    }
  });
}

test("phase/group links, invalid values, history and season switching stay canonical", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/2012/standings?phase=RS&group=A");
  await expect(groupRegion(page, "A")).toBeVisible();
  await page.getByLabel("Group", { exact: true }).focus();
  await expect(page.getByLabel("Group", { exact: true })).toBeFocused();
  await page.getByLabel("Group", { exact: true }).pressSequentially("Group B");
  await page.getByLabel("Group", { exact: true }).press("Tab");
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("B");
  await page.reload();
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("B");
  await page.goBack();
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("A");
  await page.goForward();
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("B");
  await page.getByRole("tab", { name: "Top 16", exact: true }).click();
  await expect(page).toHaveURL(/phase=TS$/);
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("");
  await expect(groupRegion(page, "E")).toBeVisible();
  await expect(groupRegion(page, "F")).toBeVisible();
  await page.getByLabel("Group", { exact: true }).selectOption("E");
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByLabel("Group", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(page.getByLabel("Group", { exact: true })).toHaveValue("E");
  await page.getByLabel("Selected season").first().selectOption("2025");
  await expect(page).toHaveURL(/\/2025\/standings$/);
  await expect(page.getByLabel("Group", { exact: true })).toHaveCount(0);
  for (const query of ["group=invalid", "group=A&group=B"]) {
    await page.goto(`/2012/standings?phase=RS&${query}&keep=yes`);
    await expect(page).toHaveURL(/phase=RS&keep=yes$/);
    await expect(page.getByRole("region", { name: /^Group / })).toHaveCount(4);
  }
});

test("table-stage empty/error/loading states do not fabricate groups or discard valid links", async ({ page }) => {
  await page.route("**/api/seasons/2012/phases/TS/standings*", (route) => route.fulfill({ json: { round: null, standings: [] } }));
  await page.goto("/2012/standings?phase=TS");
  await expect(page.getByText("Standings not available yet for this phase.")).toBeVisible();
  await expect(page.getByText(/This phase is a knockout/)).toHaveCount(0);
  await page.unrouteAll();
  let fail = true;
  await page.route("**/api/seasons/2012/phases/RS/standings*", (route) => fail
    ? route.fulfill({ status: 500, json: { error: "Unavailable" } }) : route.continue());
  await page.goto("/2012/standings?phase=RS&group=A");
  await expect(page.getByText("Could not load standings.")).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/group=A$/);
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(groupRegion(page, "A")).toBeVisible();
  await expect(page).toHaveURL(/group=A$/);
});

test("grouped races reset independently and fetch Top 16 snapshots only inside that phase", async ({ page }) => {
  const wrongRounds = [];
  page.on("request", (request) => {
    if (/\/phases\/TS\/standings\?round=(?:[1-9]|10)$/.test(request.url())) wrongRounds.push(request.url());
  });
  await page.goto("/2012/standings?phase=TS");
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  const e = groupRegion(page, "E");
  const f = groupRegion(page, "F");
  await expect(e.getByRole("slider")).toHaveValue("14");
  await expect(f.getByRole("slider")).toHaveValue("14");
  await e.getByRole("slider").press("Home");
  await expect(e.getByRole("slider")).toHaveValue("0");
  await expect(f.getByRole("slider")).toHaveValue("14");
  await page.getByLabel("Group", { exact: true }).selectOption("E");
  await expect(e.getByRole("slider")).toHaveValue("14");
  expect(wrongRounds).toEqual([]);
});

test("missing format and group assignments never fabricate qualification or a combined table", async ({ page, request }) => {
  const data = await get(request, 2012, "/phases/RS/standings");
  await page.route("**/api/seasons/2012/format", (route) => route.fulfill({ status: 500, json: { error: "Unavailable" } }));
  await page.goto("/2012/standings?group=A");
  await expect(clubLinks(groupRegion(page, "A"))).toHaveCount(6);
  await expect(groupRegion(page, "A").locator(".tier-row")).toHaveCount(0);
  await expect(groupRegion(page, "A").locator('[title="Qualified"]')).toHaveCount(0);
  await page.unrouteAll();
  await page.route("**/api/seasons/2012/phases/RS/standings*", (route) => route.fulfill({ json: { ...data, standings: data.standings.map((row) => ({ ...row, groupName: null })) } }));
  await page.goto("/2012/standings");
  await expect(page.getByRole("region", { name: "Group unavailable", exact: true })).toBeVisible();
  await expect(page.getByText("Group assignments are unavailable for 24 clubs.")).toBeVisible();
  await expect(page.locator("main table")).toHaveCount(0);
});

test("the first loaded Top 16 round has no preceding-phase KPI or completed-stage badges", async ({ page, request }) => {
  const first = await get(request, 2012, "/phases/TS/standings?round=11");
  await page.route("**/api/seasons/2012/phases/TS/standings", (route) => route.fulfill({ json: first }));
  await page.goto("/2012/standings?phase=TS&group=E");
  await expect(clubLinks(groupRegion(page, "E"))).toHaveCount(8);
  await expect(groupRegion(page, "E").getByText("Biggest riser", { exact: true })).toHaveCount(0);
  await expect(groupRegion(page, "E").locator('[title="Qualified"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  await expect(page.getByText("Not enough rounds played yet to replay the standings race.")).toBeVisible();
});

test("missing round names use a compact unavailable cue without inventing phase numbers", async ({ page, request }) => {
  const data = await get(request, 2012, "/phases/TS/rounds");
  await page.route("**/api/seasons/2012/phases/TS/rounds", (route) => route.fulfill({ json: { rounds: data.rounds.map((round) => ({ ...round, name: null })) } }));
  await page.goto("/2012/standings?phase=TS&group=E");
  await page.getByRole("tab", { name: "Race", exact: true }).click();
  await expect(groupRegion(page, "E").locator(".badge-primary")).toHaveText("Top 16: Round name unavailable");
  const labels = await groupRegion(page, "E").locator("svg[role=img] text").allTextContents();
  expect(labels).toContain("?");
  expect(labels.some((label) => /^R\d+$/.test(label))).toBe(false);
});

for (const theme of ["light-euroleague", "dark-euroleague"]) {
  test(`grouped tables, breakdowns and races fit every width in ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await mockLayoutImages(page);
    await page.addInitScript((value) => localStorage.setItem("euroleague-theme", value), theme);
    for (const phase of ["RS", "TS"]) {
      await page.goto(`/2012/standings?phase=${phase}`);
      await expect(page.getByLabel("Group", { exact: true })).toBeVisible({ timeout: 30_000 });
      for (const selected of ["", phase === "RS" ? "A" : "E"]) {
        await page.getByLabel("Group", { exact: true }).selectOption(selected);
        await expect(page.getByRole("region", { name: /^Group / })).toHaveCount(selected ? 1 : phase === "RS" ? 4 : 2);
        for (const mode of ["Table", "Race"]) {
          await page.getByRole("tab", { name: mode, exact: true }).click();
          await expect(page.locator("main .loading")).toHaveCount(0, { timeout: 30_000 });
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 });
            await expect.poll(async () => {
              const overflow = await findPageOverflow(page);
              return overflow.scrollWidth - overflow.clientWidth;
            }).toBeLessThanOrEqual(0);
            await expect.poll(() => findBrokenWords(page.getByRole("heading", { level: 2 }))).toEqual([]);
            if (mode === "Race") {
              await expect.poll(async () => page.locator("main svg[role=img]").evaluateAll((charts) => charts.every((chart) => {
                const labels = [...chart.querySelectorAll("text")].filter((label) => /^R\d+$/.test(label.textContent));
                return labels.length >= 2 && labels.every((label, index) => index === 0 || labels[index - 1].getBoundingClientRect().right + 2 <= label.getBoundingClientRect().left);
              }))).toBe(true);
              const charts = page.locator("main svg[role=img]");
              await expect(charts.first()).toBeVisible();
              const labels = await charts.first().locator("text").allTextContents();
              expect(labels).toContain("R1");
              expect(labels).toContain(phase === "RS" ? "R10" : "R14");
              expect(labels.some((label) => /^Round\s/.test(label))).toBe(false);
            }
          }
        }
      }
    }
  });
}
