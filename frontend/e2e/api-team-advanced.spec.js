import { test, expect } from "@playwright/test";

// The Advanced tab's trend: every round carries what the club did in that round alone (`round...` fields) beside the cumulative
// season-to-date values. Read from the running backend and the live data: the per-round figures are checked against the cumulative
// ones, which they must add back up to.
const API = "http://localhost:3000/api/seasons";

async function get(page, path) {
  const response = await page.request.get(`${API}${path}`);
  expect(response.status(), path).toBe(200);
  return response.json();
}

const close = (a, b, tolerance) => Math.abs(a - b) <= tolerance;

for (const season of ["2025", "2026"]) {
  test(`${season}: each round's own ratings add back up to the season's cumulative ones`, async ({ page }) => {
    const { teams } = await get(page, `/${season}/teams`);
    expect(teams.length).toBeGreaterThan(10);
    let checked = 0;

    for (const team of teams.slice(0, 6)) {
      const first = await get(page, `/${season}/teams/${team.clubCode}/advanced`);
      for (const scope of first.scopes) {
        const { trend } = scope === first.scope ? first : await get(page, `/${season}/teams/${team.clubCode}/advanced?scope=${scope}`);
        if (trend.length === 0) continue;
        const label = `${team.clubCode} ${scope}`;
        checked += 1;

        for (const row of trend) {
          for (const key of ["roundGames", "roundPossessions", "roundOffensiveRating", "roundDefensiveRating", "roundNetRating"]) {
            expect(Object.hasOwn(row, key), `${label} round ${row.round} has ${key}`).toBe(true);
          }
          if (row.roundPossessions === null) {
            // A round the club did not play: no ratings, no games.
            expect(row.roundGames, `${label} round ${row.round}`).toBe(0);
            expect([row.roundOffensiveRating, row.roundDefensiveRating, row.roundNetRating]).toEqual([null, null, null]);
          } else {
            expect(row.roundGames, `${label} round ${row.round}`).toBeGreaterThan(0);
            expect(row.roundOffensiveRating).toBeGreaterThan(40);
            expect(row.roundOffensiveRating).toBeLessThan(200);
            expect(row.roundDefensiveRating).toBeGreaterThan(40);
            expect(row.roundDefensiveRating).toBeLessThan(200);
            // The net rating is the offense minus the defense (each is rounded to two places).
            expect(close(row.roundNetRating, row.roundOffensiveRating - row.roundDefensiveRating, 0.02), `${label} round ${row.round} net`).toBe(true);
          }
        }

        // The first round stands alone: its own figures are its cumulative ones.
        const [firstRound] = trend;
        expect(firstRound.roundGames, label).toBe(firstRound.gamesPlayed);
        expect(close(firstRound.roundOffensiveRating, firstRound.offensiveRating, 0.05), `${label} round 1 offense`).toBe(true);
        expect(close(firstRound.roundDefensiveRating, firstRound.defensiveRating, 0.05), `${label} round 1 defense`).toBe(true);

        // The rounds add back up: the games to the games played, and the possession-weighted mean of the rounds' ratings to the
        // cumulative rating after the last round (a rating is points per possession, so this is exact up to rounding).
        const last = trend.at(-1);
        expect(trend.reduce((sum, row) => sum + row.roundGames, 0), `${label} games`).toBe(last.gamesPlayed);
        const played = trend.filter((row) => row.roundPossessions !== null);
        const possessions = played.reduce((sum, row) => sum + row.roundPossessions, 0);
        const weighted = (key) => played.reduce((sum, row) => sum + row[key] * row.roundPossessions, 0) / possessions;
        expect(close(weighted("roundOffensiveRating"), last.offensiveRating, 0.05), `${label} weighted offense ${weighted("roundOffensiveRating")} vs ${last.offensiveRating}`).toBe(true);
        expect(close(weighted("roundDefensiveRating"), last.defensiveRating, 0.05), `${label} weighted defense ${weighted("roundDefensiveRating")} vs ${last.defensiveRating}`).toBe(true);

        // The cumulative values are still there and unchanged in kind: games played never goes down.
        for (let index = 1; index < trend.length; index += 1) expect(trend[index].gamesPlayed).toBeGreaterThanOrEqual(trend[index - 1].gamesPlayed);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
}
