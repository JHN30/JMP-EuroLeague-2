// Checks every season E2000-E2026 against its competition format through the local API: phases, groups and clubs, final positions,
// qualifiers, game counts per stage, series thresholds, champion or cancellation, and coverage. The expected champions and statuses are the
// 34a inventory's season matrix (blueprint/reference/historical-season-inventory.md, section 3); everything else is read from each season's
// own format, so a new season needs a line in EXPECTED and nothing more.
// Usage (with the backend running against the local database): node scripts/check-season-matrix.mjs [api base]
// Read-only. Refuses to run unless /api/health reports the local target, so it never spends Neon's transfer.
// Exit code: 0 when every season matches, 1 when a mismatch is found, 2 when the check cannot run.

const base = (process.argv[2] ?? "http://localhost:3000/api").replace(/\/$/, "");

// Winner of each season's final (null where none), and its status, from the inventory.
const EXPECTED = {
  E2000: ["completed", "VIR"], E2001: ["completed", "PAN"], E2002: ["completed", "BAR"], E2003: ["completed", "TEL"], E2004: ["completed", "TEL"],
  E2005: ["completed", "CSK"], E2006: ["completed", "PAN"], E2007: ["completed", "CSK"], E2008: ["completed", "PAN"], E2009: ["completed", "BAR"],
  E2010: ["completed", "PAN"], E2011: ["completed", "OLY"], E2012: ["completed", "OLY"], E2013: ["completed", "TEL"], E2014: ["completed", "MAD"],
  E2015: ["completed", "CSK"], E2016: ["completed", "ULK"], E2017: ["completed", "MAD"], E2018: ["completed", "CSK"], E2019: ["cancelled", null],
  E2020: ["completed", "IST"], E2021: ["completed", "IST"], E2022: ["completed", "MAD"], E2023: ["completed", "PAN"], E2024: ["completed", "ULK"],
  E2025: ["completed", "OLY"], E2026: ["inProgress", null],
};

async function getJson(path) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.json();
}

async function allGames(season) {
  const games = [];
  for (let offset = 0; ; offset += 100) {
    const page = await getJson(`/seasons/${season}/games?limit=100&offset=${offset}`);
    games.push(...page.games);
    if (!page.pagination.hasMore) return games;
  }
}

const pair = (a, b) => [a, b].sort().join("|");

async function checkSeason(season) {
  const problems = [];
  const bad = (field, expected, found) => problems.push(`${field}: expected ${expected}, found ${found}`);
  await getJson(`/seasons/${season}`);
  const { format } = await getJson(`/seasons/${season}/format`);
  const { phases } = await getJson(`/seasons/${season}/phases`);
  const games = await allGames(season);
  const { series } = await getJson(`/seasons/${season}/postseason-series`);
  const coverage = await getJson(`/seasons/${season}/coverage`);
  const [status, champion] = EXPECTED[season];

  if (format.status !== status) bad("status", status, format.status);
  if (format.issues.length > 0) bad("format issues", 0, format.issues.map((issue) => issue.code).join(","));
  // A season lists the phases that have games (an in-progress season has not reached its later stages).
  const codes = format.stages.filter((stage) => stage.observed.gamesTotal > 0).map((stage) => stage.code);
  if (phases.map((phase) => phase.code).join() !== codes.join()) bad("phases", codes.join(), phases.map((phase) => phase.code).join());
  if (!Array.isArray(coverage.items) || coverage.items.length === 0) bad("coverage items", ">0", coverage.items?.length);

  const excluded = format.exceptions.filter((entry) => entry.kind === "excludedClubs").flatMap((entry) => entry.clubs);
  const clubsByStage = new Map(format.stages.map((stage) => [stage.code, new Set(stage.observed.clubs ?? [])]));
  const rankedFields = new Map();

  for (const stage of format.stages) {
    const inStage = games.filter((game) => game.phaseCode === stage.code);
    const played = inStage.filter((game) => game.played).length;
    if (inStage.length !== stage.observed.gamesTotal) bad(`${stage.code} games total`, stage.observed.gamesTotal, inStage.length);
    if (played !== stage.observed.gamesPlayed) bad(`${stage.code} games played`, stage.observed.gamesPlayed, played);
    if (stage.type !== "table" || stage.observed.gamesPlayed === 0) continue;

    const { standings } = await getJson(`/seasons/${season}/phases/${stage.code}/standings`);
    const groups = new Map();
    for (const row of standings) {
      const key = row.groupName ?? "table";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const expectedGroups = stage.plannedGroups === 1 ? 1 : stage.plannedGroups;
    if (groups.size !== expectedGroups) bad(`${stage.code} groups`, expectedGroups, groups.size);
    const expectedClubs = stage.plannedClubsPerGroup - (stage.plannedGroups === 1 ? excluded.length : 0);
    for (const [name, rows] of groups) {
      if (rows.length !== expectedClubs) bad(`${stage.code} ${name} clubs`, expectedClubs, rows.length);
      const positions = rows.map((row) => row.basic.position).sort((a, b) => a - b);
      if (positions.some((position, index) => position !== index + 1)) bad(`${stage.code} ${name} positions`, "1..n", positions.join(","));
      if (stage.dataState === "loaded" && !format.cancelled && !excluded.length) {
        const wrong = rows.filter((row) => row.basic.gamesPlayed !== stage.gamesPerClub);
        if (wrong.length) bad(`${stage.code} ${name} games per club`, stage.gamesPerClub, wrong.map((row) => `${row.clubCode}:${row.basic.gamesPlayed}`).join(","));
      }
    }
    rankedFields.set(stage.code, groups);
  }

  // Qualifiers: the clubs placed in a rule's ranks are in the next stage's field; when every rule into a stage is within a group, the field is
  // exactly those clubs (plus the best-sixth places).
  for (const stage of format.stages) {
    const groups = rankedFields.get(stage.code);
    if (!groups || stage.dataState !== "loaded") continue;
    for (const rule of stage.qualification) {
      if (!("positions" in rule) || !clubsByStage.get(rule.to)?.size) continue;
      const placed = [...groups.values()].flat().filter((row) => row.basic.position >= rule.positions[0] && row.basic.position <= rule.positions[1]).map((row) => row.clubCode);
      const target = clubsByStage.get(rule.kind === "playIn" ? "PI" : rule.to) ?? new Set();
      const missing = placed.filter((code) => !target.has(code));
      if (missing.length) bad(`${stage.code} qualifiers into ${rule.to}`, "all in the next field", `missing ${missing.join(",")}`);
    }
    const rules = stage.qualification.filter((rule) => "positions" in rule);
    if (rules.length && rules.every((rule) => rule.within === "group" && rule.kind === "direct") && !stage.qualification.some((rule) => "bestOfPosition" in rule)) {
      const next = clubsByStage.get(rules[0].to);
      const total = [...groups.values()].flat().filter((row) => rules.some((rule) => row.basic.position >= rule.positions[0] && row.basic.position <= rule.positions[1])).length;
      if (next && next.size !== total) bad(`${stage.code} qualifiers count`, total, next.size);
    }
  }

  // Series: one per pairing of a knockout stage, decided at the stage's win target (a leader is not a winner).
  for (const stage of format.stages.filter((entry) => entry.type !== "table")) {
    const rows = series.filter((entry) => entry.phaseCode === stage.code);
    const pairs = new Set(games.filter((game) => game.phaseCode === stage.code).map((game) => pair(game.localTeam.clubCode, game.roadTeam.clubCode)));
    if (rows.length !== pairs.size) bad(`${stage.code} series`, pairs.size, rows.length);
    const targets = [stage.winTarget, ...stage.knockoutRounds.map((round) => round.winTarget)].filter((target) => target != null);
    const minTarget = Math.min(...targets);
    const maxTarget = Math.max(...targets);
    for (const entry of rows) {
      const lead = Math.max(entry.clubAWins, entry.clubBWins);
      if (stage.dataState === "loaded" && lead < minTarget) bad(`${stage.code} ${entry.clubA.clubCode}-${entry.clubB.clubCode} wins`, `>= ${minTarget}`, lead);
      if (entry.games.length > 2 * maxTarget - 1) bad(`${stage.code} ${entry.clubA.clubCode}-${entry.clubB.clubCode} games`, `<= ${2 * maxTarget - 1}`, entry.games.length);
    }
  }

  // Champion: the winner of the championship game, or of the last series for the elimination tournament.
  let found = null;
  const final = games.find((game) => game.phaseCode === "FF" && /championship/i.test(game.groupName ?? "") && game.played);
  if (final) found = final.localScore > final.roadScore ? final.localTeam.clubCode : final.roadTeam.clubCode;
  else if (format.family === "eliminationSeries") {
    const wins = new Map();
    for (const game of games.filter((entry) => entry.phaseCode === "PO" && /^group final$/i.test(entry.groupName ?? "") && entry.played)) {
      const winner = game.localScore > game.roadScore ? game.localTeam.clubCode : game.roadTeam.clubCode;
      wins.set(winner, (wins.get(winner) ?? 0) + 1);
    }
    const best = [...wins].sort((a, b) => b[1] - a[1])[0];
    found = best && best[1] >= 3 ? best[0] : null;
  }
  if (found !== champion) bad("champion", champion ?? "none", found ?? "none");

  const stages = format.stages.map((stage) => `${stage.code} ${stage.observed.gamesPlayed}/${stage.observed.gamesTotal}`).join(", ");
  return { line: `${season}  ${format.family.padEnd(17)}  ${format.status.padEnd(10)}  champion ${(found ?? "none").padEnd(4)}  ${stages}`, problems };
}

// Sets the exit code instead of calling process.exit, which can abort Node on Windows while fetch connections close.
async function main() {
  let health;
  try {
    health = await getJson("/health");
  } catch (error) {
    console.error(`Cannot reach ${base}/health: ${error.message}`);
    return 2;
  }
  if (health.target !== "local") {
    console.error(`Refusing to run: the API reports target "${health.target}", not "local".`);
    return 2;
  }
  let mismatches = 0;
  for (const season of Object.keys(EXPECTED)) {
    const { line, problems } = await checkSeason(season);
    console.log(`${problems.length ? "MISMATCH" : "ok      "}  ${line}`);
    for (const problem of problems) console.log(`    ${problem}`);
    mismatches += problems.length;
  }
  console.log(mismatches === 0 ? "\nEvery season matches its format and the inventory." : `\n${mismatches} mismatch(es) found.`);
  return mismatches === 0 ? 0 : 1;
}

process.exitCode = await main().catch((error) => {
  console.error(error.message);
  return 2;
});
