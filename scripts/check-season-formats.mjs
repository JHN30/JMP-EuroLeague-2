// Compares every season's competition format with its loaded data through the local API and fails when they disagree.
// Usage (with the backend running against the local database): node scripts/check-season-formats.mjs [api base]
// Read-only. Refuses to run unless /api/health reports the local target, so it never spends Neon's transfer.
// Exit code: 0 when every season matches, 1 when an issue is found, 2 when the check cannot run.

const base = (process.argv[2] ?? "http://localhost:3000/api").replace(/\/$/, "");

async function getJson(path) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.json();
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

  let issueCount = 0;
  for (let year = 2000; year <= 2026; year += 1) {
    const seasonCode = `E${year}`;
    const { format } = await getJson(`/seasons/${seasonCode}/format`);
    const stages = format.stages
      .map((stage) => `${stage.code} ${stage.dataState} ${stage.observed.gamesPlayed}/${stage.observed.gamesTotal}`)
      .join(", ");
    console.log(`${seasonCode}  ${format.family.padEnd(17)}  ${format.status.padEnd(10)}  ${stages}  issues: ${format.issues.length}`);
    for (const issue of format.issues) {
      console.log(`    ${issue.code}${issue.stage ? ` (${issue.stage})` : ""}: ${issue.message}`);
    }
    issueCount += format.issues.length;
  }

  console.log(issueCount === 0 ? "\nEvery season matches its format." : `\n${issueCount} issue(s) found.`);
  return issueCount === 0 ? 0 : 1;
}

process.exitCode = await main().catch((error) => {
  console.error(error.message);
  return 2;
});
