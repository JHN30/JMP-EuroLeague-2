import { clinchedWinner, stageWinTarget } from "./bracketModel";
import { isChampionshipLabel } from "../lib/phaseSummary";

const pairKey = (a, b) => [a, b].sort().join("|");

export function finalFourKind(game) {
  if (game.phaseCode !== "FF" || !game.groupName) return null;
  const label = game.groupName.toLowerCase();
  if (/semi[ -]?final/.test(label)) return "semi";
  if (/3rd|third|placement/.test(label)) return "third";
  return isChampionshipLabel(label) ? "final" : null;
}

// The formats whose Top 16 is played in groups and feeds the quarterfinals: two groups of eight (E2012-E2015, best-of-five), four
// groups of four (E2008-E2011, best-of-five) and four groups of four with best-of-three series (E2004-E2007). In E2002-E2003 only the
// winner of each Top 16 group advances, straight to the Final Four (no quarterfinals).
export const GROUPED_POSTSEASON_FAMILIES = ["top16TwoGroups", "top16Bo5Playoffs", "top16Bo3Playoffs", "top16ToFinalFour"];

// How many clubs per Top 16 group reach the Playoffs (four of eight, two of four), from the stage's own qualification rule.
function qualifiersPerGroup(stage) {
  const rule = stage?.qualification?.find((entry) => entry.within === "group" && "positions" in entry);
  return rule ? rule.positions[1] : null;
}

function finalGroupRanks(standings, stage) {
  const groups = new Map();
  for (const row of standings) {
    if (!groups.has(row.groupName)) groups.set(row.groupName, []);
    groups.get(row.groupName).push(row);
  }
  const complete = Boolean(stage?.plannedGroups) && groups.size === stage.plannedGroups && !groups.has(null) && !groups.has(undefined) && [...groups.values()].every((rows) => {
    return rows.length === stage?.plannedClubsPerGroup && rows.every((row) => row.basic?.gamesPlayed === stage.gamesPerClub)
      && new Set(rows.map((row) => row.basic?.position)).size === rows.length
      && rows.every((row) => row.basic.position >= 1 && row.basic.position <= rows.length);
  });
  return complete ? new Map(standings.map((row) => [row.clubCode, row])) : new Map();
}

function uniqueSeries(series, stage) {
  const rows = series.filter((entry) => entry.phaseCode === stage);
  return rows.filter((entry) => rows.filter((other) => pairKey(other.clubA.clubCode, other.clubB.clubCode) === pairKey(entry.clubA.clubCode, entry.clubB.clubCode)).length === 1);
}

export function buildGroupedBracket({ standings = [], teams = [], series = [], games = [], format }) {
  if (!GROUPED_POSTSEASON_FAMILIES.includes(format?.family)) return null;
  const top16 = format.stages.find((stage) => stage.code === "TS");
  const qualifiers = qualifiersPerGroup(top16);
  const ranks = finalGroupRanks(standings, top16);
  const direct = format.family === "top16ToFinalFour";
  const identities = new Map(teams.map((team) => [team.clubCode, team]));
  for (const entry of series) for (const side of [entry.clubA, entry.clubB]) if (!identities.has(side.clubCode)) identities.set(side.clubCode, side);
  const club = (code) => {
    const row = ranks.get(code);
    const info = identities.get(code);
    return { clubCode: code, name: info?.name ?? row?.clubName ?? code, short: info?.tvCode ?? info?.abbreviatedName ?? info?.name ?? code,
      crestUrl: info?.crestUrl ?? row?.crestUrl ?? null, seed: null, seedLabel: row ? `${row.groupName}${row.basic.position}` : null,
      record: row ? `${row.basic.gamesWon}-${row.basic.gamesLost}` : null };
  };
  const issues = [];
  function slot(id, stage, label, entry, game = null) {
    const winTarget = stageWinTarget(format, stage);
    let winnerClubCode = clinchedWinner(entry, winTarget);
    if (entry && (entry.clubAWins ?? 0) >= winTarget && (entry.clubBWins ?? 0) >= winTarget) winnerClubCode = null;
    let displaySeries = entry;
    if (stage === "FF") {
      const scoreWinner = game?.played && game.gameStatus !== "Cancelled" && game.localScore != null && game.roadScore != null && game.localScore !== game.roadScore
        ? (game.localScore > game.roadScore ? game.localTeam?.clubCode : game.roadTeam?.clubCode) : null;
      if (!scoreWinner || winnerClubCode !== scoreWinner || entry?.games.length !== 1) winnerClubCode = null;
      if (entry && game) displaySeries = { ...entry, games: entry.games.map((row) => ({ ...row, localScore: game.played ? game.localScore : null, roadScore: game.played ? game.roadScore : null, winnerClubCode: scoreWinner })) };
    }
    const participants = entry ? [club(entry.clubA.clubCode), club(entry.clubB.clubCode)] : [{ placeholder: "Matchup not verified" }, { placeholder: "Matchup not verified" }];
    if (stage === "PO") participants.sort((a, b) => (ranks.get(a.clubCode)?.basic.position ?? 99) - (ranks.get(b.clubCode)?.basic.position ?? 99));
    const hasResult = stage === "FF" ? game?.played === true : entry?.games.some((row) => row.localScore != null && row.roadScore != null);
    const resultUnavailable = Boolean(entry && !hasResult && format.status === "completed");
    return { id, stage, label, participants, series: displaySeries, winTarget, winnerClubCode, grouped: true, resultUnavailable,
      state: winnerClubCode ? "done" : entry ? hasResult ? "live" : resultUnavailable ? "pending" : "upcoming" : "pending", sourceSlotIds: [] };
  }
  const po = uniqueSeries(series, "PO");
  const accepted = po.filter((entry) => po.every((other) => other === entry || ![other.clubA.clubCode, other.clubB.clubCode].some((code) => [entry.clubA.clubCode, entry.clubB.clubCode].includes(code))));
  const labelOf = (entry) => {
    const a = ranks.get(entry.clubA.clubCode);
    const b = ranks.get(entry.clubB.clubCode);
    // A quarterfinal joins a group's place n with another group's place (qualifiers + 1 - n): 1-4 and 2-3 of eight, 1-2 of four.
    if (!qualifiers || !a || !b || a.groupName === b.groupName || a.basic.position + b.basic.position !== qualifiers + 1 || a.basic.position > qualifiers || b.basic.position > qualifiers) return null;
    const first = a.basic.position < b.basic.position ? a : b;
    const second = first === a ? b : a;
    return `${first.groupName}${first.basic.position} v ${second.groupName}${second.basic.position}`;
  };
  accepted.sort((a, b) => (labelOf(a) ?? pairKey(a.clubA.clubCode, a.clubB.clubCode)).localeCompare(labelOf(b) ?? pairKey(b.clubA.clubCode, b.clubB.clubCode)));
  const playoffs = direct ? [] : Array.from({ length: 4 }, (_, index) => {
    const entry = accepted[index] ?? null;
    const result = slot(`po${index + 1}`, "PO", entry ? labelOf(entry) ?? `Recorded quarterfinal ${index + 1}` : `Quarterfinal ${index + 1}`, entry);
    if (entry && ranks.has(entry.clubA.clubCode) && ranks.has(entry.clubB.clubCode) && !labelOf(entry)) {
      result.winnerClubCode = null;
      result.state = "pending";
    }
    return result;
  });
  if (!direct && (accepted.length !== 4 || accepted.some((entry) => !labelOf(entry)))) issues.push({ stage: "PO", message: "Some quarterfinal pairings or final Top 16 group places are unavailable or inconsistent." });
  const ff = uniqueSeries(series, "FF");
  const ffGames = games.filter((game) => game.phaseCode === "FF");
  const findSeries = (game) => ff.find((entry) => pairKey(entry.clubA.clubCode, entry.clubB.clubCode) === pairKey(game.localTeam?.clubCode, game.roadTeam?.clubCode)
    && entry.games.some((row) => row.gameCode === game.gameCode)) ?? null;
  const classified = (kind) => ffGames.filter((game) => finalFourKind(game) === kind).sort((a, b) => a.groupName.localeCompare(b.groupName) || a.gameCode - b.gameCode);
  const semiGames = classified("semi");
  const semis = [0, 1].map((index) => {
    const game = semiGames.length === 2 ? semiGames[index] : null;
    const result = slot(`sf${index + 1}`, "FF", `Semifinal ${index + 1}`, game ? findSeries(game) : null, game);
    result.sourceSlotIds = result.participants.flatMap((side) => playoffs.filter((entry) => entry.winnerClubCode === side.clubCode).map((entry) => entry.id));
    return result;
  });
  const finals = classified("final");
  const finalGame = finals.length === 1 ? finals[0] : null;
  const final = slot("final", "FF", "Final", finalGame ? findSeries(finalGame) : null, finalGame);
  final.sourceSlotIds = final.participants.flatMap((side) => semis.filter((entry) => entry.winnerClubCode === side.clubCode).map((entry) => entry.id));
  const thirds = classified("third");
  const placementAllowed = format.stages.find((stage) => stage.code === "FF")?.thirdPlaceGame === true;
  const third = placementAllowed && thirds.length === 1 ? slot("third", "FF", "Third place", findSeries(thirds[0]), thirds[0]) : null;
  // Directly from the Top 16 the semifinal pairs are confirmed by the clubs' own group places: all four must be group winners.
  const connected = direct
    ? semis.every((entry) => entry.participants.every((side) => ranks.get(side.clubCode)?.basic.position === 1)) && new Set(semis.flatMap((entry) => entry.participants.map((side) => side.clubCode))).size === 4
    : semis.every((entry) => entry.sourceSlotIds.length === 2) && new Set(semis.flatMap((entry) => entry.sourceSlotIds)).size === 4;
  if (!connected || final.sourceSlotIds.length !== 2 || ffGames.some((game) => !finalFourKind(game))) issues.push({ stage: "FF", message: "Some Final Four results or bracket connections are unavailable or unverified. Recorded games remain available under Games." });
  const champion = final.participants.find((side) => side.clubCode === final.winnerClubCode) ?? null;
  return { grouped: true, direct, projected: false, directSeeds: null, playInLast: null, playIn: [], playoffs, semis, final, third, champion, connected, issues,
    all: [...playoffs, ...semis, final, ...(third ? [third] : [])] };
}
