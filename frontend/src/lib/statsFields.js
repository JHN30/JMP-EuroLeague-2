import { formatMissing, formatPerGame, formatPercentage } from "./format";

export const PLAYER_METRIC_GROUPS = [
  {
    label: "Traditional",
    group: "traditional",
    options: [
      ["pointsScored", "PTS"],
      ["totalRebounds", "REB"],
      ["assists", "AST"],
      ["steals", "STL"],
      ["turnovers", "TO"],
      ["blocks", "BLK"],
      ["pir", "PIR"],
      ["minutesPlayed", "MIN"],
      ["gamesPlayed", "GP"],
    ],
  },
  {
    label: "Advanced",
    group: "advanced",
    options: [
      ["effectiveFieldGoalPercentage", "eFG%"],
      ["trueShootingPercentage", "TS%"],
      ["reboundsPercentage", "REB%"],
      ["assistsToTurnoversRatio", "AST/TO"],
      ["possessions", "POSS"],
    ],
  },
  {
    label: "Scoring",
    group: "scoring",
    options: [
      ["twoPointRate", "2PT rate"],
      ["threePointRate", "3PT rate"],
      ["pointsFromTwoPointersPercentage", "Pts from 2PT %"],
      ["pointsFromThreePointersPercentage", "Pts from 3PT %"],
      ["pointsFromFreeThrowsPercentage", "Pts from FT %"],
    ],
  },
  {
    label: "Misc",
    group: "misc",
    options: [
      ["wins", "W"],
      ["losses", "L"],
      ["doubleDoubles", "DD"],
      ["tripleDoubles", "TD"],
    ],
  },
];

export function metricGroupFor(metricKey) {
  return PLAYER_METRIC_GROUPS.find((group) => group.options.some(([key]) => key === metricKey))?.group;
}

export function metricLabelFor(metricKey) {
  for (const group of PLAYER_METRIC_GROUPS) {
    const match = group.options.find(([key]) => key === metricKey);
    if (match) return match[1];
  }
  return metricKey;
}

const PERCENTAGE_KEYS = new Set(
  PLAYER_METRIC_GROUPS.flatMap((group) => group.options)
    .filter(([, label]) => label.endsWith("%"))
    .map(([key]) => key),
);

export function formatStatValue(key, value) {
  if (value === null || value === undefined) return formatMissing(value);
  if (key === "minutesPlayed") return formatPerGame(value);
  if (PERCENTAGE_KEYS.has(key)) return formatPercentage(value);
  return value;
}
