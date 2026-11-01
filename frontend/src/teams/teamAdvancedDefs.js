import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";

// The Advanced tab's league comparisons: every row names a field of the club's advanced standings row (or of its game-flow
// row), how to read it and which way is better. `direction` is "higher", "lower" or "neutral" (ranked from the highest
// but never tinted: a fast pace or a hard schedule is neither good nor bad). `connected` marks the schedule-based figures,
// which mean nothing until every club is linked by the games played. `zeroSum` marks the figures that measure clubs against
// each other, so the league's own average is zero by definition.

const one = (value) => formatDecimal(value);
const signed = (value) => formatSignedDecimal(value);
const pct = (value) => formatFractionPercent(value);

// Derived fields, added to every standings row before ranking so the league ranks and averages cover them too.
export function withDerivedStrength(row) {
  return {
    ...row,
    winsAboveExpected: row.pythagoreanWins === null || row.pythagoreanWins === undefined ? null : row.wins - row.pythagoreanWins,
    possessionsPerGame: row.possessions === null || row.possessions === undefined || !row.gamesPlayed ? null : row.possessions / row.gamesPlayed,
  };
}

export const STRENGTH_TILES = [
  { field: "netRating", label: "Net rating", direction: "higher", format: signed, tip: "Offensive rating minus defensive rating: points per 100 possessions better than the opponents" },
  { field: "adjNetRating", label: "Adjusted net", direction: "higher", format: signed, connected: true, tip: "Net rating adjusted for the strength of the opponents faced" },
  { field: "srs", label: "SRS", direction: "higher", format: signed, connected: true, tip: "Simple Rating System: average margin adjusted for the schedule; points better than an average team" },
  { field: "sos", label: "Schedule", direction: "neutral", format: signed, connected: true, tip: "Strength of schedule: the average SRS of the opponents faced; ranked from the toughest" },
];

export const STRENGTH_GROUPS = [
  {
    title: "Ratings",
    rows: [
      { field: "offensiveRating", label: "Offensive rating", direction: "higher", format: one, tip: "Points scored per 100 possessions" },
      { field: "defensiveRating", label: "Defensive rating", direction: "lower", format: one, tip: "Points allowed per 100 possessions" },
      { field: "netRating", label: "Net rating", direction: "higher", format: signed, zeroSum: true, tip: "Offensive rating minus defensive rating" },
      { field: "adjOffensiveRating", label: "Adj. offensive rating", direction: "higher", format: one, connected: true, tip: "Offensive rating adjusted for the defenses faced" },
      { field: "adjDefensiveRating", label: "Adj. defensive rating", direction: "lower", format: one, connected: true, tip: "Defensive rating adjusted for the offenses faced" },
      { field: "adjNetRating", label: "Adj. net rating", direction: "higher", format: signed, zeroSum: true, connected: true, tip: "Adjusted offensive rating minus adjusted defensive rating" },
      { field: "relativeOffensiveRating", label: "Offense vs league", direction: "higher", format: signed, zeroSum: true, tip: "Offensive rating minus the league's" },
      { field: "relativeDefensiveRating", label: "Defense vs league", direction: "lower", format: signed, zeroSum: true, tip: "Defensive rating minus the league's offensive rating: below zero allows less than average" },
    ],
  },
  {
    title: "Schedule and luck",
    rows: [
      { field: "srs", label: "SRS", direction: "higher", format: signed, zeroSum: true, connected: true, tip: "Simple Rating System: average margin adjusted for the schedule" },
      { field: "sos", label: "Strength of schedule", direction: "neutral", format: signed, zeroSum: true, connected: true, tip: "The average SRS of the opponents faced; ranked from the toughest" },
      { field: "sov", label: "Strength of victory", direction: "neutral", format: signed, connected: true, tip: "The average SRS of the opponents beaten; ranked from the toughest" },
      { field: "pythagoreanWins", label: "Expected wins", direction: "higher", format: one, tip: "Pythagorean wins: the wins the points scored and allowed would give on average" },
      {
        field: "winsAboveExpected",
        label: "Wins above expected",
        direction: "neutral",
        format: signed,
        tip: "Actual wins minus Pythagorean wins: above zero means close games went the team's way",
      },
    ],
  },
  {
    title: "Tempo and margin",
    rows: [
      { field: "pace", label: "Pace", direction: "neutral", format: one, tip: "Possessions per 40 minutes; ranked from the fastest" },
      { field: "relativePace", label: "Pace vs league", direction: "neutral", format: signed, zeroSum: true, tip: "Pace minus the league's" },
      { field: "possessionsPerGame", label: "Possessions / game", direction: "neutral", format: one, tip: "The team's possessions per game played" },
      { field: "mov", label: "Margin", direction: "higher", format: signed, zeroSum: true, tip: "Average margin of victory: points scored minus allowed per game" },
    ],
  },
];

export const FOUR_FACTOR_GROUPS = [
  {
    title: "Offense",
    rows: [
      { field: "efgPct", label: "eFG%", direction: "higher", format: pct, tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5" },
      { field: "tovPct", label: "Turnover %", direction: "lower", format: pct, tip: "Turnovers per 100 shooting and turnover possessions" },
      { field: "orbPct", label: "Off. rebound %", direction: "higher", format: pct, tip: "The share of the team's own misses it rebounded" },
      { field: "ftRate", label: "Free throw rate", direction: "higher", format: pct, tip: "Free throws made per field goal attempt" },
    ],
  },
  {
    title: "Defense",
    rows: [
      { field: "oppEfgPct", label: "Opp. eFG%", direction: "lower", format: pct, tip: "The opponents' effective field goal percentage against this team" },
      { field: "oppTovPct", label: "Opp. turnover %", direction: "higher", format: pct, tip: "The opponents' turnover percentage: turnovers this team forces" },
      { field: "drbPct", label: "Def. rebound %", direction: "higher", format: pct, tip: "The share of the opponents' misses this team rebounded" },
      { field: "oppFtRate", label: "Opp. free throw rate", direction: "lower", format: pct, tip: "The opponents' free throw rate against this team" },
    ],
  },
];

export const SHOOTING_PASSING_ROWS = [
  { field: "trueShootingPct", label: "True shooting %", direction: "higher", format: pct, tip: "Points per shooting possession, counting free throws and threes" },
  { field: "assistRatio", label: "Assist ratio", direction: "higher", format: pct, tip: "Assist ratio: the share of made field goals that were assisted" },
];

// Derived game-flow fields, added to every club's game-flow row before ranking.
export function withDerivedFlow(row) {
  const timed = [row.timeLeadingSeconds, row.timeTiedSeconds, row.timeTrailingSeconds];
  const total = timed.every((value) => value !== null && value !== undefined) ? timed.reduce((sum, value) => sum + value, 0) : 0;
  return {
    ...row,
    timeLeadingShare: total > 0 ? row.timeLeadingSeconds / total : null,
    runs6PlusPerGame: row.runs6Plus === null || row.runs6Plus === undefined || !row.games ? null : row.runs6Plus / row.games,
    clutchMargin:
      row.clutchPointsFor === null || row.clutchPointsFor === undefined || row.clutchPointsAgainst === null || row.clutchPointsAgainst === undefined || !row.clutchSeconds
        ? null
        : row.clutchPointsFor - row.clutchPointsAgainst,
  };
}

// The game-flow facts' ranks, by the fact they sit under.
export const FLOW_RANKS = {
  timeLeading: { field: "timeLeadingShare", direction: "higher" },
  clutchMargin: { field: "clutchMargin", direction: "higher" },
  leadChangesPerGame: { field: "leadChangesPerGame", direction: "neutral" },
  tiesPerGame: { field: "tiesPerGame", direction: "neutral" },
  largestLead: { field: "largestLead", direction: "higher" },
  longestRun: { field: "longestRun", direction: "higher" },
  runs6Plus: { field: "runs6PlusPerGame", direction: "higher" },
  assistedFgPct: { field: "assistedFgPct", direction: "neutral" },
  avgPossessionSeconds: { field: "avgPossessionSeconds", direction: "neutral" },
};

// The league average of a field over the clubs that have it, or null.
export function leagueAverage(rows, field) {
  const values = rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The league's best value of a field (the lowest where lower is better; the highest for a neutral one), or null.
export function leagueBest(rows, field, direction) {
  const values = rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined);
  if (values.length === 0) return null;
  return direction === "lower" ? Math.min(...values) : Math.max(...values);
}

// Where the club's value sits between the league's worst and best (0 to 1), best on the right; null without a spread.
export function leaguePosition(rows, clubCode, field, direction) {
  const own = rows.find((row) => row.clubCode === clubCode)?.[field];
  const values = rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined);
  if (own === null || own === undefined || values.length < 2) return null;
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return null;
  const share = (own - low) / (high - low);
  return direction === "lower" ? 1 - share : share;
}
