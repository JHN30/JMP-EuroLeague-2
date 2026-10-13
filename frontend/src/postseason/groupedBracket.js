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

function finalGroupRanks(standings, stage) {
  const groups = new Map();
  for (const row of standings) {
    if (!groups.has(row.groupName)) groups.set(row.groupName, []);
    groups.get(row.groupName).push(row);
  }
  const complete = groups.size === 2 && ["E", "F"].every((name) => {
    const rows = groups.get(name) ?? [];
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
  if (format?.family !== "top16TwoGroups") return null;
  const ranks = finalGroupRanks(standings, format.stages.find((stage) => stage.code === "TS"));
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
    if (!a || !b || a.groupName === b.groupName || a.basic.position + b.basic.position !== 5 || a.basic.position > 4 || b.basic.position > 4) return null;
    const first = a.basic.position < b.basic.position ? a : b;
    const second = first === a ? b : a;
    return `${first.groupName}${first.basic.position} v ${second.groupName}${second.basic.position}`;
  };
  accepted.sort((a, b) => (labelOf(a) ?? pairKey(a.clubA.clubCode, a.clubB.clubCode)).localeCompare(labelOf(b) ?? pairKey(b.clubA.clubCode, b.clubB.clubCode)));
  const playoffs = Array.from({ length: 4 }, (_, index) => {
    const entry = accepted[index] ?? null;
    const result = slot(`po${index + 1}`, "PO", entry ? labelOf(entry) ?? `Recorded quarterfinal ${index + 1}` : `Quarterfinal ${index + 1}`, entry);
    if (entry && ranks.has(entry.clubA.clubCode) && ranks.has(entry.clubB.clubCode) && !labelOf(entry)) {
      result.winnerClubCode = null;
      result.state = "pending";
    }
    return result;
  });
  if (accepted.length !== 4 || accepted.some((entry) => !labelOf(entry))) issues.push({ stage: "PO", message: "Some quarterfinal pairings or final Top 16 group places are unavailable or inconsistent." });
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
  const connected = semis.every((entry) => entry.sourceSlotIds.length === 2) && new Set(semis.flatMap((entry) => entry.sourceSlotIds)).size === 4;
  if (!connected || final.sourceSlotIds.length !== 2 || ffGames.some((game) => !finalFourKind(game))) issues.push({ stage: "FF", message: "Some Final Four results or bracket connections are unavailable or unverified. Recorded games remain available under Games." });
  const champion = final.participants.find((side) => side.clubCode === final.winnerClubCode) ?? null;
  return { grouped: true, projected: false, directSeeds: null, playInLast: null, playIn: [], playoffs, semis, final, third, champion, connected, issues,
    all: [...playoffs, ...semis, final, ...(third ? [third] : [])] };
}
