export const TEAM_METRICS = [
  { key: "gamesPlayed", label: "GP" },
  { key: "gamesWon", label: "W" },
  { key: "gamesLost", label: "L" },
  { key: "winPercentage", label: "PCT" },
  { key: "pointsFor", label: "PF" },
  { key: "pointsAgainst", label: "PA" },
  { key: "pointsDifference", label: "DIFF" },
];

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

export function formatStatValue(key, value) {
  if (value === null || value === undefined) return "-";
  if (key === "minutesPlayed") {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(1) : value;
  }
  return value;
}
