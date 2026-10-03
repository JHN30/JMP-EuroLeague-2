// Shared by the team Overview's league-aware panels (quick comparison and league profile), which both read the
// league-wide advanced standings.
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";

// Advanced standings only know the regular season ("RS"), the postseason ("PS") and both together ("all").
export function advancedScopeForPhase(phaseCode) {
  return phaseCode === "RS" ? "RS" : "PS";
}

export function ordinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: "st", 2: "nd", 3: "rd" }[number % 10] ?? "th"}`;
}

// A third of the league is "top", a third "bottom"; the colours for a rank's bar and its text.
export function rankTier({ rank, of }) {
  const third = Math.ceil(of / 3);
  if (rank <= third) return { bar: "bg-success", text: "text-success" };
  if (rank > of - third) return { bar: "bg-error", text: "text-error" };
  return { bar: "bg-base-content/40", text: "muted" };
}

// Competition ranking (1, 2, 2, 4): clubs on the same value share a rank. Null when the club has no value.
export function rankOf(rows, clubCode, field, higherIsBetter) {
  const own = rows.find((row) => row.clubCode === clubCode)?.[field];
  if (own === null || own === undefined) return null;
  const valued = rows.filter((row) => row[field] !== null && row[field] !== undefined);
  const ahead = valued.filter((row) => (higherIsBetter ? row[field] > own : row[field] < own)).length;
  return { rank: ahead + 1, of: valued.length };
}

const pct = (value) => formatFractionPercent(value);
const one = (value) => formatDecimal(value);

// The league profile: the same ten numbers the Four Factors use, split into the two ends of the floor.
export const PROFILE_GROUPS = [
  {
    title: "Offense",
    metrics: [
      { field: "offensiveRating", label: "Offensive rating", tip: "Points scored per 100 possessions", higherIsBetter: true, format: one },
      { field: "efgPct", label: "eFG%", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5", higherIsBetter: true, format: pct },
      { field: "tovPct", label: "Turnover %", tip: "Turnovers per 100 shooting and turnover possessions", higherIsBetter: false, format: pct },
      { field: "orbPct", label: "Off. rebound %", tip: "The share of the team's own misses it rebounded", higherIsBetter: true, format: pct },
      { field: "ftRate", label: "Free throw rate", tip: "Free throws made per field goal attempt", higherIsBetter: true, format: pct },
    ],
  },
  {
    title: "Defense",
    metrics: [
      { field: "defensiveRating", label: "Defensive rating", tip: "Points allowed per 100 possessions", higherIsBetter: false, format: one },
      { field: "oppEfgPct", label: "Opp. eFG%", tip: "The opponents' effective field goal percentage against this team", higherIsBetter: false, format: pct },
      { field: "oppTovPct", label: "Opp. turnover %", tip: "The opponents' turnover percentage: turnovers this team forces", higherIsBetter: true, format: pct },
      { field: "drbPct", label: "Def. rebound %", tip: "The share of the opponents' misses this team rebounded", higherIsBetter: true, format: pct },
      { field: "oppFtRate", label: "Opp. free throw rate", tip: "The opponents' free throw rate against this team", higherIsBetter: false, format: pct },
    ],
  },
];

// The quick comparison rows, in the order they are drawn.
export const COMPARE_ROWS = [
  { label: "Net rating", tip: "Offensive rating minus defensive rating", direction: "higher", field: "netRating", format: (value) => formatSignedDecimal(value) },
  { label: "Offensive rating", tip: "Points scored per 100 possessions", direction: "higher", field: "offensiveRating", format: one },
  { label: "Defensive rating", tip: "Points allowed per 100 possessions", direction: "lower", field: "defensiveRating", format: one },
  { label: "eFG%", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5", direction: "higher", field: "efgPct", format: pct },
  { label: "Turnover %", tip: "Turnovers per 100 shooting and turnover possessions", direction: "lower", field: "tovPct", format: pct },
];
