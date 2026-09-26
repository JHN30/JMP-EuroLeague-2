import { formatDate } from "./format";

export const PHASE_ORDER = ["RS", "PI", "PO", "FF"];

export const PHASE_NAMES = {
  RS: "Regular Season",
  PI: "Play-In",
  PO: "Playoffs",
  FF: "Final Four",
};

export function phaseSortIndex(code) {
  const index = PHASE_ORDER.indexOf(code);
  return index === -1 ? PHASE_ORDER.length : index;
}

export function teamCountFromGames(games) {
  const codes = new Set();
  for (const game of games) {
    if (game.localTeam?.clubCode) codes.add(game.localTeam.clubCode);
    if (game.roadTeam?.clubCode) codes.add(game.roadTeam.clubCode);
  }
  return codes.size;
}

export function dateRangeLabel(firstDate, lastDate) {
  if (!firstDate) return null;
  const start = formatDate(firstDate);
  const end = lastDate ? formatDate(lastDate) : start;
  return start === end ? start : `${start} - ${end}`;
}

// "semifinal" contains the substring "final", so it must be excluded
// explicitly before falling back to the plain "final" match.
export function isChampionshipLabel(label) {
  const text = label.toLowerCase();
  if (text.includes("championship")) return true;
  if (text.includes("semifinal") || text.includes("semi-final") || text.includes("semi final")) return false;
  if (text.includes("3rd") || text.includes("third") || text.includes("placement")) return false;
  return text.includes("final");
}

export function isPlacementLabel(label) {
  const text = label.toLowerCase();
  return text.includes("3rd") || text.includes("third") || text.includes("placement");
}
