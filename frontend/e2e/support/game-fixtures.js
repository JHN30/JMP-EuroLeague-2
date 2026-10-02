import { expect } from "@playwright/test";

export const SEASON = "2025";

export function player(side, personKey, personName, overrides) {
  return {
    side,
    personKey,
    clubCode: side === "local" ? "A" : "B",
    personName,
    positionName: "Guard",
    dorsal: "1",
    headshotUrl: null,
    started: false,
    startedAlt: false,
    points: 0,
    timePlayed: 0,
    valuation: 0,
    fieldGoalsMade2: 0,
    fieldGoalsAttempted2: 0,
    fieldGoalsMade3: 0,
    fieldGoalsAttempted3: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    totalRebounds: 0,
    defensiveRebounds: 0,
    offensiveRebounds: 0,
    assistances: 0,
    steals: 0,
    turnovers: 0,
    blocksFavour: 0,
    blocksAgainst: 0,
    foulsCommited: 0,
    foulsReceived: 0,
    plusMinus: 0,
    ...overrides,
  };
}

export function teamTotal(side, overrides) {
  return {
    side,
    statsKind: "total",
    coachName: side === "local" ? "COACH, ALPHA" : "COACH, BRAVO",
    points: 0,
    timePlayed: 2400,
    valuation: 0,
    fieldGoalsMade2: 0,
    fieldGoalsAttempted2: 0,
    fieldGoalsMade3: 0,
    fieldGoalsAttempted3: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    fieldGoalsMadeTotal: 0,
    fieldGoalsAttemptedTotal: 0,
    totalRebounds: 0,
    defensiveRebounds: 0,
    offensiveRebounds: 0,
    assistances: 0,
    steals: 0,
    turnovers: 0,
    blocksFavour: 0,
    blocksAgainst: 0,
    foulsCommited: 0,
    foulsReceived: 0,
    plusMinus: 0,
    ...overrides,
  };
}

const LOCAL_PERIODS = [20, 25, 15, 20];
const ROAD_PERIODS = [18, 15, 22, 15];

// Team A won 80-70. Team A: a starter with few minutes, a bench player with more minutes, and a player who
// did not play. Team B: a starter who ties Team A's best scorer, and a bench player.
export const BOX_SCORE = {
  periodScores: [
    ...LOCAL_PERIODS.map((score, index) => ({ side: "local", periodNumber: index + 1, score })),
    ...ROAD_PERIODS.map((score, index) => ({ side: "road", periodNumber: index + 1, score })),
  ],
  teamStats: [
    teamTotal("local", {
      points: 80, fieldGoalsMade2: 20, fieldGoalsAttempted2: 30, fieldGoalsMade3: 10, fieldGoalsAttempted3: 25,
      freeThrowsMade: 9, freeThrowsAttempted: 9, fieldGoalsMadeTotal: 30, fieldGoalsAttemptedTotal: 55,
      totalRebounds: 40, assistances: 18, steals: 7, turnovers: 10,
    }),
    teamTotal("road", {
      points: 70, fieldGoalsMade2: 18, fieldGoalsAttempted2: 28, fieldGoalsMade3: 6, fieldGoalsAttempted3: 20,
      freeThrowsMade: 6, freeThrowsAttempted: 8, fieldGoalsMadeTotal: 24, fieldGoalsAttemptedTotal: 48,
      totalRebounds: 35, assistances: 12, steals: 9, turnovers: 14,
    }),
  ],
  playerStats: [
    player("local", "A-STARTER", "STARTER, SAM", {
      started: true, timePlayed: 900, points: 30, fieldGoalsMade2: 10, fieldGoalsAttempted2: 12, freeThrowsMade: 9, freeThrowsAttempted: 9,
      totalRebounds: 4, assistances: 7, valuation: 25, plusMinus: 6,
    }),
    player("local", "A-BENCH", "BENCH, BO", {
      timePlayed: 1500, points: 12, fieldGoalsMade2: 6, fieldGoalsAttempted2: 9, totalRebounds: 9, assistances: 2, valuation: 14, plusMinus: -3,
    }),
    player("local", "A-DNP", "SITTER, SID", {}),
    player("road", "B-STARTER", "RIVAL, ROY", {
      started: true, timePlayed: 1700, points: 30, fieldGoalsMade2: 11, fieldGoalsAttempted2: 14, freeThrowsMade: 6, freeThrowsAttempted: 8,
      totalRebounds: 5, assistances: 3, valuation: 22, plusMinus: -4,
    }),
    player("road", "B-BENCH", "RESERVE, RAY", {
      timePlayed: 600, points: 8, fieldGoalsMade2: 3, fieldGoalsAttempted2: 6, totalRebounds: 2, assistances: 1, valuation: 5, plusMinus: 2,
    }),
  ],
};

// The advanced response for a game without advanced rows (the default, so older tests keep their PIR best player).
export const NO_ADVANCED = { available: false, scope: "all", round: 2, minSeasonMinutes: 20, teams: [], players: [] };

// The team-flow response for a game without those tables (the default, so older tests see no extra rows).
export const NO_TEAM_FLOW = { available: false, teams: [] };

// One field-goal attempt for the Shooting tab. `club` is "A" (local) or "B" (road); coordinates are centimetres from the
// hoop, +y toward the half-court line and +x toward the shooter's right.
export function shot(shotOrdinal, club, actionCode, coordX, coordY, overrides = {}) {
  return {
    shotOrdinal,
    clubCode: club,
    personCode: `${club}-STARTER`,
    playerName: club === "A" ? "ONE, AL" : "UNO, BO",
    actionCode,
    points: actionCode.startsWith("3") ? 3 : 2,
    coordX,
    coordY,
    fastbreak: false,
    secondChance: false,
    pointsOffTurnover: false,
    minute: 3,
    markerTime: "07:00",
    pointsA: null,
    pointsB: null,
    ...overrides,
  };
}

// The lineups response for a game without on-court rows (the default, so older tests see the empty states).
export const NO_LINEUPS = { available: false, gameSeconds: 2400, onCourt: [], units: [] };

// Box score for the rotation and lineup tests: five starters per team, a bench player, and (Team A) one player who
// did not play. `overrides` changes the box-score minutes of A1 and A6 to test reconciliation.
export function rosterBox(overrides = {}) {
  const starter = (side, key, name, timePlayed) => player(side, key, name, { started: true, timePlayed });
  return {
    periodScores: BOX_SCORE.periodScores,
    teamStats: BOX_SCORE.teamStats,
    playerStats: [
      starter("local", "A1", "ONE, AL", overrides.A1 ?? 2340),
      starter("local", "A2", "TWO, ABE", 2700),
      starter("local", "A3", "THREE, ART", 2700),
      starter("local", "A4", "FOUR, ARI", 2700),
      starter("local", "A5", "FIVE, ABBY", 2700),
      player("local", "A6", "SIX, ABEL", { timePlayed: overrides.A6 ?? 360 }),
      player("local", "A7", "SEVEN, AMY", { timePlayed: 0 }),
      starter("road", "B1", "UNO, BO", 1500),
      starter("road", "B2", "DOS, BEN", 2700),
      starter("road", "B3", "TRES, BAZ", 2700),
      starter("road", "B4", "CUATRO, BEA", 2700),
      starter("road", "B5", "CINCO, BIA", 2700),
      player("road", "B6", "SEIS, BRI", { timePlayed: 1200 }),
    ],
  };
}

const onCourtOf = (side, clubCode, personKey, ...intervals) => ({
  side,
  clubCode,
  personKey,
  intervals: intervals.map(([startSeconds, endSeconds]) => ({ startSeconds, endSeconds })),
});

const unitOf = (side, clubCode, players, seconds, stints, totals) => {
  const { possessionsFor, possessionsAgainst, pointsFor, pointsAgainst, netRating } = totals;
  return { side, clubCode, players, seconds, stints, possessionsFor, possessionsAgainst, pointsFor, pointsAgainst, plusMinus: pointsFor - pointsAgainst, netRating };
};

// Pipeline lineups matching `rosterBox()`: a game with one overtime (2,700 seconds). A1 sits from Q1 06:00 to the start
// of Q2 and A6 takes that spot; B1 is replaced by B6 at Q3 05:00. Team A's third unit has no possessions, so its ratings
// are null; the units do not add up to the whole game and are not sorted, as the API returns them.
export const LINEUPS = {
  available: true,
  gameSeconds: 2700,
  onCourt: [
    onCourtOf("local", "A", "A1", [0, 240], [600, 2700]),
    onCourtOf("local", "A", "A2", [0, 2700]),
    onCourtOf("local", "A", "A3", [0, 2700]),
    onCourtOf("local", "A", "A4", [0, 2700]),
    onCourtOf("local", "A", "A5", [0, 2700]),
    onCourtOf("local", "A", "A6", [240, 600]),
    onCourtOf("road", "B", "B1", [0, 1500]),
    onCourtOf("road", "B", "B2", [0, 2700]),
    onCourtOf("road", "B", "B3", [0, 2700]),
    onCourtOf("road", "B", "B4", [0, 2700]),
    onCourtOf("road", "B", "B5", [0, 2700]),
    onCourtOf("road", "B", "B6", [1500, 2700]),
  ],
  units: [
    unitOf("local", "A", ["A1", "A2", "A3", "A4", "A5"], 1500, 4, { possessionsFor: 60, possessionsAgainst: 58, pointsFor: 50, pointsAgainst: 40, netRating: 14.37 }),
    unitOf("local", "A", ["A2", "A3", "A4", "A5", "A6"], 180, 1, { possessionsFor: 14, possessionsAgainst: 14, pointsFor: 12, pointsAgainst: 15, netRating: -21.43 }),
    unitOf("local", "A", ["A1", "A2", "A3", "A5", "A6"], 30, 1, { possessionsFor: 0, possessionsAgainst: 0, pointsFor: 0, pointsAgainst: 0, netRating: null }),
    unitOf("road", "B", ["B1", "B2", "B3", "B4", "B5"], 1500, 3, { possessionsFor: 58, possessionsAgainst: 60, pointsFor: 40, pointsAgainst: 50, netRating: -14.37 }),
    unitOf("road", "B", ["B2", "B3", "B4", "B5", "B6"], 1200, 2, { possessionsFor: 40, possessionsAgainst: 40, pointsFor: 30, pointsAgainst: 30, netRating: 0 }),
  ],
};

// Score flow, shot splits and counted possessions for Team A (local) and Team B (road); the clutch numbers are real.
export const TEAM_FLOW = {
  available: true,
  teams: [
    {
      side: "local",
      clubCode: "A",
      flow: {
        pointsFor: 80, pointsAgainst: 70, leadChanges: 5, ties: 5, timeLeadingSeconds: 1931, timeTrailingSeconds: 258,
        timeTiedSeconds: 211, largestLead: 20, longestRun: 12, runs6Plus: 5, clutchSeconds: 90, clutchPointsFor: 6, clutchPointsAgainst: 4,
      },
      splits: { fastBreakPoints: 12, secondChancePoints: 8, pointsOffTurnoverPoints: 10, fieldGoalsMade: 30, assistedFieldGoals: 19, assistedFgPct: 0.633333 },
      possessions: { countedPossessions: 73, possessionSeconds: 1249, avgPossessionSeconds: 17.109589, estimatedPossessions: 72.92 },
    },
    {
      side: "road",
      clubCode: "B",
      flow: {
        pointsFor: 70, pointsAgainst: 80, leadChanges: 5, ties: 5, timeLeadingSeconds: 258, timeTrailingSeconds: 1931,
        timeTiedSeconds: 211, largestLead: 6, longestRun: 8, runs6Plus: 2, clutchSeconds: 90, clutchPointsFor: 4, clutchPointsAgainst: 6,
      },
      splits: { fastBreakPoints: 10, secondChancePoints: 17, pointsOffTurnoverPoints: 15, fieldGoalsMade: 35, assistedFieldGoals: 15, assistedFgPct: 0.428571 },
      possessions: { countedPossessions: 72, possessionSeconds: 1151, avgPossessionSeconds: 15.986111, estimatedPossessions: 72.92 },
    },
  ],
};

function advancedPlayer(side, personKey, secondsPlayed, gamePer, overrides) {
  return {
    side, personKey, clubCode: side === "local" ? "A" : "B", secondsPlayed, gameScore: 10, usagePct: 0.2, assistPct: 0.1,
    orbPct: 0.05, drbPct: 0.15, trbPct: 0.1, stealPct: 0.02, blockPct: 0.01, tovPct: 0.1, efgPct: 0.5, trueShootingPct: 0.55,
    gameUper: 0.6, gameAper: 0.6, gamePer, season: { secondsPlayed: 12000, hidden: false, per: 15, usgPct: 0.2, winShares: 1 },
    ...overrides,
  };
}

// Advanced rows for the four players of BOX_SCORE who played. A-BENCH has the best game PER (the box score's best
// PIR is A-STARTER), A-STARTER has a season PER, A-BENCH a season sample that is too small, B-STARTER no season row.
export const ADVANCED = {
  available: true,
  scope: "all",
  round: 2,
  minSeasonMinutes: 20,
  minSeasonGames: 3,
  // Team A (local) has a season average to compare with; Team B has played too few games, so its block is hidden.
  teams: [
    {
      side: "local", clubCode: "A", possessions: 70, pace: 70, offensiveRating: 114, defensiveRating: 100, netRating: 14,
      efgPct: 0.59, oppEfgPct: 0.5, tovPct: 0.12, oppTovPct: 0.16, orbPct: 0.3, drbPct: 0.7, ftRate: 0.2, oppFtRate: 0.2,
      trueShootingPct: 0.62, assistRatio: 0.5, gameMinutes: 40, ownPossessionsEstimate: 70,
      season: {
        gamesPlayed: 10, hidden: false, pace: 71.2, offensiveRating: 110, defensiveRating: 105, netRating: 5, efgPct: 0.55,
        tovPct: 0.14, orbPct: 0.3, drbPct: 0.7, ftRate: 0.18, oppEfgPct: 0.52, oppTovPct: 0.15, oppFtRate: 0.2,
      },
    },
    {
      side: "road", clubCode: "B", possessions: 70, pace: 70, offensiveRating: 100, defensiveRating: 114, netRating: -14,
      efgPct: 0.5, oppEfgPct: 0.59, tovPct: 0.16, oppTovPct: 0.12, orbPct: 0.28, drbPct: 0.66, ftRate: 0.15, oppFtRate: 0.2,
      trueShootingPct: 0.55, assistRatio: 0.5, gameMinutes: 40, ownPossessionsEstimate: 70,
      season: {
        gamesPlayed: 2, hidden: true, pace: null, offensiveRating: null, defensiveRating: null, netRating: null, efgPct: null,
        tovPct: null, orbPct: null, drbPct: null, ftRate: null, oppEfgPct: null, oppTovPct: null, oppFtRate: null,
      },
    },
  ],
  players: [
    advancedPlayer("local", "A-STARTER", 900, 20.1, {
      gameScore: 21.4, trueShootingPct: 0.6, efgPct: 0.65, usagePct: 0.3,
      season: { secondsPlayed: 12000, hidden: false, per: 17.34, usgPct: 0.221, winShares: 1.25 },
    }),
    advancedPlayer("local", "A-BENCH", 1500, 24, {
      gameScore: 9.2, season: { secondsPlayed: 600, hidden: true, per: null, usgPct: null, winShares: null },
    }),
    advancedPlayer("road", "B-STARTER", 1700, 31.5, { gameScore: 28.1, usagePct: null, season: null }),
    advancedPlayer("road", "B-BENCH", 600, 12, { gameScore: 4.3 }),
  ],
};

const UNPLAYED_BOX_SCORE = { periodScores: [], teamStats: [], playerStats: [] };

// Mocks every API request the game page makes. Options: `requests` (collects requested paths), `played`,
// `boxScore`, `boxScoreStatus`, `playByPlay` (response body), `playByPlayStatus` (use 500 to simulate a failure), and
// `advanced` / `advancedStatus` for the game's advanced stats (default: none available), and `teamFlow` /
// `teamFlowStatus` for its score flow, shot splits and possessions (default: none available), and `lineups` /
// `lineupsStatus` for its on-court intervals and five-man units (default: none available), and `shots` /
// `shotsStatus` for the Shooting tab (an array of `shot(...)` rows, default: none).
export async function mockGameApi(page, options = {}) {
  const { requests = [], played = true, boxScore = BOX_SCORE, boxScoreStatus = 200, playByPlay = { events: [] }, playByPlayStatus = 200, advanced = NO_ADVANCED, advancedStatus = 200, teamFlow = NO_TEAM_FLOW, teamFlowStatus = 200, lineups = NO_LINEUPS, lineupsStatus = 200, shots = [], shotsStatus = 200 } = options;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname === "/api/seasons") {
      await route.fulfill({ json: { seasons: [{ seasonCode: SEASON, name: "2024-25" }] } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1`) {
      await route.fulfill({
        json: {
          game: {
            gameCode: 1,
            played,
            phaseName: "Regular season",
            scheduledAt: "2025-01-01T18:00:00Z",
            localTeam: { name: "Team A", clubCode: "A" },
            roadTeam: { name: "Team B", clubCode: "B" },
            localScore: played ? 80 : null,
            roadScore: played ? 70 : null,
          },
        },
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/box-score`) {
      await route.fulfill({
        status: boxScoreStatus,
        json: boxScoreStatus !== 200 ? { error: "Mocked failure" } : played ? boxScore : UNPLAYED_BOX_SCORE,
      });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/advanced`) {
      await route.fulfill({ status: advancedStatus, json: advancedStatus === 200 ? advanced : { error: "Mocked failure" } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/team-flow`) {
      await route.fulfill({ status: teamFlowStatus, json: teamFlowStatus === 200 ? teamFlow : { error: "Mocked failure" } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/shots`) {
      await route.fulfill({ status: shotsStatus, json: shotsStatus === 200 ? { shots } : { error: "Mocked failure" } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/lineups`) {
      await route.fulfill({ status: lineupsStatus, json: lineupsStatus === 200 ? lineups : { error: "Mocked failure" } });
      return;
    }
    if (pathname === `/api/seasons/${SEASON}/games/1/play-by-play`) {
      await route.fulfill({ status: playByPlayStatus, json: playByPlayStatus === 200 ? playByPlay : { error: "Mocked failure" } });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "Unexpected test request" } });
  });
}

// The game page opens on the Overview tab; box score assertions start from here.
export async function openBoxScore(page) {
  await page.getByRole("tab", { name: "Box score", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Box score", exact: true })).toHaveAttribute("aria-selected", "true");
}
