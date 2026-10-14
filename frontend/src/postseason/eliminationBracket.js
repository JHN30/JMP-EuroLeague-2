import { clinchedWinner } from "./bracketModel";

// The original elimination tournament (E2000): sixteen clubs in a knockout of round of 16 and quarterfinal series (best of three),
// semifinal and final series (best of five). The source's round numbers mix these stages, so the stage of a game is read from its
// own group label ("Group First Round 3", "Group Quarterfinal 2", "Group Semifinal 1", "Group Final").
export const ELIMINATION_STAGES = [
  { id: "r16", name: "Round of 16", single: "Round of 16", round: "First round", size: 8, test: (label) => /first round/.test(label), label: (number) => `Round of 16 · ${number}` },
  { id: "qf", name: "Quarterfinals", single: "Quarterfinal", round: "Quarterfinals", size: 4, test: (label) => /quarterfinal/.test(label), label: (number) => `Quarterfinal ${number}` },
  { id: "sf", name: "Semifinals", single: "Semifinal", round: "Semifinals", size: 2, test: (label) => /semifinal/.test(label), label: (number) => `Semifinal ${number}` },
  { id: "final", name: "Final", single: "Final", round: "Final", size: 1, test: (label) => /^(group )?final$/.test(label), label: () => "Final" },
];

// The index of the stage a game belongs to, or -1 when its label names none (a label is never guessed from the round number).
export function eliminationStageOf(groupName) {
  const label = String(groupName ?? "").trim().toLowerCase();
  return ELIMINATION_STAGES.findIndex((stage) => stage.test(label));
}

// The stage name of a knockout game ("Round of 16", "Semifinal") in the elimination tournament, or null for any other game or season, so
// the source's round names ("Game 8") never stand in for it.
export function eliminationStageLabel(format, game) {
  if (format?.family !== "eliminationSeries" || game?.phaseCode !== "PO") return null;
  return ELIMINATION_STAGES[eliminationStageOf(game.groupName)]?.single ?? null;
}

const pairKey = (a, b) => [a, b].sort().join("|");
const PLACEHOLDER = { placeholder: "Matchup not verified" };

// The elimination bracket from the recorded series and the stage of each game. A tie's winner is the club that reaches its stage's win
// target; a later tie counts only when it is played by the winners of two earlier ties, so an unrecorded or inconsistent tie stays
// unverified and nothing is carried forward from it.
export function buildEliminationBracket({ series = [], games = [], teams = [], format }) {
  if (format?.family !== "eliminationSeries") return null;
  const knockout = format.stages.find((stage) => stage.code === "PO");
  const identities = new Map(teams.map((team) => [team.clubCode, team]));
  for (const entry of series) for (const side of [entry.clubA, entry.clubB]) if (!identities.has(side.clubCode)) identities.set(side.clubCode, side);
  const club = (code) => {
    const info = identities.get(code);
    return { clubCode: code, name: info?.name ?? code, short: info?.tvCode ?? info?.abbreviatedName ?? info?.name ?? code, crestUrl: info?.crestUrl ?? null, seed: null, seedLabel: null, record: null };
  };
  const stageOfGame = new Map(games.map((game) => [game.gameCode, eliminationStageOf(game.groupName)]));
  const issues = [];
  const entries = ELIMINATION_STAGES.map(() => []);
  let unclassified = 0;
  for (const entry of series.filter((row) => row.phaseCode === "PO")) {
    const stages = new Set(entry.games.map((game) => stageOfGame.get(game.gameCode) ?? -1));
    if (entry.games.length === 0 || stages.size !== 1 || stages.has(-1)) unclassified += 1;
    else entries[[...stages][0]].push(entry);
  }
  if (unclassified > 0) issues.push({ message: "Some recorded series could not be placed in a stage and are not shown in the bracket." });
  const replays = (format.exceptions ?? []).filter((exception) => exception.kind === "replay" && exception.stage === "PO");

  const rounds = ELIMINATION_STAGES.map((stage, stageIndex) => {
    const winTarget = knockout?.knockoutRounds?.find((round) => round.name === stage.round)?.winTarget ?? null;
    const recorded = [...entries[stageIndex]].sort((a, b) => Math.min(...a.games.map((game) => game.gameCode)) - Math.min(...b.games.map((game) => game.gameCode)));
    if (recorded.length !== stage.size) issues.push({ message: `${stage.name}: ${recorded.length} of ${stage.size} series are recorded.` });
    const slots = Array.from({ length: stage.size }, (_, index) => {
      const entry = recorded[index] ?? null;
      let winnerClubCode = entry ? clinchedWinner(entry, winTarget) : null;
      if (entry && winTarget && (entry.clubAWins ?? 0) >= winTarget && (entry.clubBWins ?? 0) >= winTarget) winnerClubCode = null;
      const participants = entry ? [club(entry.clubA.clubCode), club(entry.clubB.clubCode)] : [PLACEHOLDER, PLACEHOLDER];
      const hasResult = Boolean(entry?.games.some((game) => game.localScore != null && game.roadScore != null));
      const resultUnavailable = Boolean(entry && !hasResult && format.status === "completed");
      const note = entry ? replays.find((replay) => pairKey(...replay.clubs) === pairKey(entry.clubA.clubCode, entry.clubB.clubCode))?.note ?? null : null;
      return {
        id: `${stage.id}-${index + 1}`, stage: "PO", stageName: stage.name, label: entry ? stage.label(index + 1) : `${stage.name} ${index + 1}`,
        participants, series: entry, winTarget, winnerClubCode, grouped: true, resultUnavailable, note, sourceSlotIds: [], unverified: false,
        state: winnerClubCode ? "done" : entry ? (hasResult ? "live" : resultUnavailable ? "pending" : "upcoming") : "pending",
      };
    });
    return { id: stage.id, title: stage.name, winTarget, slots };
  });

  // Each later tie must be played by the winners of two different earlier ties; otherwise it is unverified and carries no winner.
  for (let stageIndex = 1; stageIndex < rounds.length; stageIndex += 1) {
    for (const slot of rounds[stageIndex].slots) {
      if (!slot.series) continue;
      const clubs = slot.participants.map((side) => side.clubCode);
      const sources = rounds[stageIndex - 1].slots.filter((earlier) => earlier.winnerClubCode && clubs.includes(earlier.winnerClubCode));
      if (sources.length === 2 && new Set(sources.map((earlier) => earlier.winnerClubCode)).size === 2) {
        slot.sourceSlotIds = sources.map((earlier) => earlier.id);
      } else {
        slot.unverified = true;
        slot.winnerClubCode = null;
        slot.state = "pending";
        issues.push({ message: `${slot.label} is not connected to the winners of two ${rounds[stageIndex - 1].title.toLowerCase()} series, so its result is not carried forward.` });
      }
    }
  }

  const final = rounds[rounds.length - 1].slots[0];
  const connected = issues.length === 0 && rounds.slice(1).every((round) => round.slots.every((slot) => slot.sourceSlotIds.length === 2));
  // A connected bracket is drawn so the two ties feeding a later tie sit next to it, working back from the final.
  if (connected) {
    const byId = new Map(rounds.flatMap((round) => round.slots).map((slot) => [slot.id, slot]));
    for (let stageIndex = rounds.length - 1; stageIndex > 0; stageIndex -= 1) {
      rounds[stageIndex - 1].slots = rounds[stageIndex].slots.flatMap((slot) => slot.sourceSlotIds.map((id) => byId.get(id)));
    }
  }
  // Labels number the ties in the order they are drawn.
  rounds.forEach((round, stageIndex) => round.slots.forEach((slot, index) => { if (slot.series) slot.label = ELIMINATION_STAGES[stageIndex].label(index + 1); }));
  const all = rounds.flatMap((round) => round.slots);
  const champion = final.winnerClubCode && final.sourceSlotIds.length === 2 ? final.participants.find((side) => side.clubCode === final.winnerClubCode) ?? null : null;
  return { elimination: true, projected: false, direct: false, rounds, all, final, champion, connected, issues, playIn: [], playoffs: [], semis: [], third: null };
}
