import { formatCount, formatDecimal, formatFractionPercent, formatMinutes } from "../lib/format";

// Rows for the mirrored bars, in the shape ComparisonRow takes, from the team-flow endpoint (score flow, shot splits
// and counted possessions of each side). `value` sizes the bars and picks the winner; `display` is the printed text.
// A missing value (null) makes the row's raw value null, which ComparisonRow shows as an em dash, never as zero.

const number = (value) => (Number.isFinite(value) ? value : null);

function share(flow) {
  const parts = [flow?.timeLeadingSeconds, flow?.timeTrailingSeconds, flow?.timeTiedSeconds];
  if (!parts.every(Number.isFinite)) return null;
  const total = parts[0] + parts[1] + parts[2];
  return total > 0 ? parts[0] / total : null;
}

const ROWS = [
  {
    key: "timeInFront",
    label: "Time in front",
    tip: "Game time spent leading; the rest is tied or trailing",
    direction: "higher",
    value: (team) => number(team.flow?.timeLeadingSeconds),
    display: (team) => `${formatMinutes(team.flow?.timeLeadingSeconds)} (${formatFractionPercent(share(team.flow), 0)})`,
  },
  {
    key: "largestLead",
    label: "Biggest lead",
    tip: "The team's largest lead during the game, in points",
    direction: "higher",
    value: (team) => number(team.flow?.largestLead),
    display: (team) => formatCount(team.flow?.largestLead),
  },
  {
    key: "longestRun",
    label: "Longest run",
    tip: "The largest unanswered scoring streak, in points",
    direction: "higher",
    value: (team) => number(team.flow?.longestRun),
    display: (team) => formatCount(team.flow?.longestRun),
  },
  {
    key: "runs6Plus",
    label: "Runs of 6+",
    tip: "Unanswered scoring streaks that reached 6 points",
    direction: "higher",
    value: (team) => number(team.flow?.runs6Plus),
    display: (team) => formatCount(team.flow?.runs6Plus),
  },
  {
    key: "leadChanges",
    label: "Lead changes",
    tip: "Times the lead swapped; the same for both teams",
    direction: "neutral",
    value: (team) => number(team.flow?.leadChanges),
    display: (team) => formatCount(team.flow?.leadChanges),
  },
  {
    key: "ties",
    label: "Ties",
    tip: "Times the score became level; the same for both teams",
    direction: "neutral",
    value: (team) => number(team.flow?.ties),
    display: (team) => formatCount(team.flow?.ties),
  },
  {
    key: "clutchPoints",
    label: "Clutch points",
    tip: "Points scored in the last five minutes of regulation and in overtime while the margin was 5 or less. A game with no such time has none",
    direction: "higher",
    // No clutch time is not a zero: 0 points would read as a real result.
    value: (team) => (team.flow?.clutchSeconds > 0 ? number(team.flow.clutchPointsFor) : null),
    display: (team) => formatCount(team.flow?.clutchPointsFor),
  },
  {
    key: "fastBreak",
    label: "Fast-break points",
    tip: "Points from made shots flagged as fast breaks",
    direction: "higher",
    value: (team) => number(team.splits?.fastBreakPoints),
    display: (team) => formatCount(team.splits?.fastBreakPoints),
  },
  {
    key: "secondChance",
    label: "Second-chance points",
    tip: "Points from made shots after an offensive rebound",
    direction: "higher",
    value: (team) => number(team.splits?.secondChancePoints),
    display: (team) => formatCount(team.splits?.secondChancePoints),
  },
  {
    key: "pointsOffTurnovers",
    label: "Points off turnovers",
    tip: "Points scored after the opponent turned the ball over",
    direction: "higher",
    value: (team) => number(team.splits?.pointsOffTurnoverPoints),
    display: (team) => formatCount(team.splits?.pointsOffTurnoverPoints),
  },
  {
    key: "assisted",
    label: "Assisted baskets",
    tip: "Field goals made off an assist, out of all field goals made",
    direction: "higher",
    value: (team) => number(team.splits?.assistedFgPct),
    display: (team) => {
      const splits = team.splits;
      if (!Number.isFinite(splits?.assistedFieldGoals) || !Number.isFinite(splits?.fieldGoalsMade)) return formatCount(null);
      return `${splits.assistedFieldGoals} of ${splits.fieldGoalsMade} (${formatFractionPercent(splits.assistedFgPct)})`;
    },
  },
  {
    key: "possessions",
    label: "Possessions counted",
    tip: "Possessions counted from play-by-play. The Four Factors use the box-score estimate",
    direction: "neutral",
    value: (team) => number(team.possessions?.countedPossessions),
    display: (team) => formatCount(team.possessions?.countedPossessions),
  },
  {
    key: "avgPossession",
    label: "Average possession",
    tip: "Average length of a possession, in seconds",
    direction: "neutral",
    value: (team) => number(team.possessions?.avgPossessionSeconds),
    display: (team) => `${formatDecimal(team.possessions?.avgPossessionSeconds)} s`,
  },
];

// The rows that tell the story of the game on the Overview; the rest stay on the Team comparison tab.
const OVERVIEW_KEYS = ["timeInFront", "largestLead", "fastBreak", "secondChance"];

function buildRows(definitions, local, road) {
  return definitions.map(({ value, display, ...row }) => {
    const rawA = value(local);
    const rawB = value(road);
    return {
      ...row,
      rawA,
      rawB,
      displayA: rawA === null ? formatCount(null) : display(local),
      displayB: rawB === null ? formatCount(null) : display(road),
    };
  });
}

// `teams` is the endpoint's `teams` array. Both sides are needed to mirror a row.
function sides(teams) {
  const local = teams?.find((team) => team.side === "local");
  const road = teams?.find((team) => team.side === "road");
  return local && road ? { local, road } : null;
}

export function scoringProfileRows(teams) {
  const pair = sides(teams);
  return pair ? buildRows(ROWS, pair.local, pair.road) : [];
}

export function overviewFlowRows(teams) {
  const pair = sides(teams);
  return pair ? buildRows(ROWS.filter((row) => OVERVIEW_KEYS.includes(row.key)), pair.local, pair.road) : [];
}
