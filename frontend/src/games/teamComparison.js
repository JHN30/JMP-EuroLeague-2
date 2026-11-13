import { formatCount, formatDecimal, formatFractionPercent } from "../lib/format";
import { benchPoints, paintPoints, shootingCell, shootingPercentage } from "./gameUtils";
import { flowRow } from "./teamFlow";

// The Team comparison tab's model: summary chips for the values the two teams share, then groups of mirrored rows in
// the shape ComparisonRow takes. Each row names its source (box, advanced, flow, shots), which loads on its own: a row
// whose source is loading is marked `loading`, and once the source has loaded a row with no value on either side is
// left out, so a game without play-by-play figures gets a shorter tab rather than rows of dashes.

const num = (value) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value));
const pct = (value) => formatFractionPercent(value);
const one = (value) => formatDecimal(value);
const ratio = (count, base) => (num(count) !== null && num(base) > 0 ? num(count) / num(base) : null);

export const SOURCE_LABELS = { advanced: "advanced stats", flow: "play-by-play figures", shots: "shots" };

// A row reused from the score flow and shot splits, read from the side's team-flow entry.
function fromFlow(key, overrides = {}) {
  const { value, display, ...row } = flowRow(key);
  return { ...row, source: "flow", value: (s) => (s.flow ? value(s.flow) : null), display: (s) => display(s.flow), ...overrides };
}

const boxCount = (key, label, field, extra = {}) => ({ key, label, source: "box", direction: "higher", value: (s) => num(s.total[field]), ...extra });

const shooting = (key, label, made, attempted, tip) => ({
  key,
  label,
  tip,
  source: "box",
  direction: "higher",
  value: (s) => shootingPercentage(s.total[made], s.total[attempted]),
  display: (s) => shootingCell(s.total[made], s.total[attempted]),
});

// A pipeline rate with the team's season average (`season.field`) as the bar's tick and, with `season.allows`, what the
// opponent gives up on average, read from the opponent's own season block.
const advancedRate = (key, label, field, tip, direction, format, allows = null) => ({
  key,
  label,
  tip,
  source: "advanced",
  direction,
  value: (s) => num(s.adv?.[field]),
  display: (s) => format(s.adv[field]),
  season: { field, format, allows },
});

const quarters = (s) => quartersWon(s.periodScores, s.side);

// Column 1 holds the traditional box-score numbers most fans know, column 2 the advanced and derived ones.
const GROUPS = [
  {
    key: "shooting",
    title: "Shooting",
    column: 1,
    rows: [
      shooting("fieldGoals", "Field goals", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal", "All shots from the field, twos and threes: made-attempted"),
      shooting("twos", "2PT", "fieldGoalsMade2", "fieldGoalsAttempted2"),
      shooting("threes", "3PT", "fieldGoalsMade3", "fieldGoalsAttempted3"),
      shooting("freeThrows", "FT", "freeThrowsMade", "freeThrowsAttempted"),
    ],
  },
  {
    key: "rebounds",
    title: "Rebounds",
    column: 1,
    rows: [
      boxCount("offensiveRebounds", "Offensive rebounds", "offensiveRebounds"),
      boxCount("defensiveRebounds", "Defensive rebounds", "defensiveRebounds"),
      boxCount("rebounds", "Rebounds", "totalRebounds"),
    ],
  },
  {
    key: "ballAndDefense",
    title: "Ball and defense",
    column: 1,
    rows: [
      boxCount("assists", "Assists", "assistances"),
      boxCount("turnovers", "Turnovers", "turnovers", {
        direction: "lower",
        display: (s) => {
          const team = num(s.teamLine?.turnovers);
          return team > 0 ? `${formatCount(s.total.turnovers)} (${team} team)` : formatCount(s.total.turnovers);
        },
      }),
      boxCount("steals", "Steals", "steals"),
      boxCount("blocks", "Blocks", "blocksFavour"),
      boxCount("fouls", "Fouls committed", "foulsCommited", { direction: "lower" }),
    ],
  },
  {
    key: "points",
    title: "Where the points came from",
    column: 1,
    mix: true,
    rows: [
      { key: "paint", label: "Points in the paint", source: "shots", direction: "higher", value: (s) => (s.shots ? paintPoints(s.shots, s.team?.clubCode) : null) },
      fromFlow("fastBreak"),
      fromFlow("secondChance"),
      fromFlow("pointsOffTurnovers"),
      { key: "bench", label: "Bench points", tip: "Points scored by the players who did not start", source: "box", direction: "higher", value: (s) => benchPoints(s.playerStats, s.side) },
    ],
  },
  {
    key: "efficiency",
    title: "Efficiency",
    column: 2,
    rows: [
      advancedRate("offensiveRating", "Points per 100 possessions", "offensiveRating", "Offensive rating: points scored per 100 possessions", "higher", one, (season) => season.defensiveRating),
      advancedRate("trueShooting", "TS%", "trueShootingPct", "True shooting: points per shooting possession, counting free throws and threes", "higher", pct),
    ],
  },
  {
    key: "fourFactors",
    title: "Four factors",
    column: 2,
    extraChances: true,
    rows: [
      advancedRate("efg", "eFG%", "efgPct", "Effective field goal percentage: field goal percentage with threes weighted 1.5", "higher", pct, (season) => season.oppEfgPct),
      advancedRate("tovPct", "TOV%", "tovPct", "Turnover percentage: turnovers per 100 shooting and turnover possessions", "lower", pct, (season) => season.oppTovPct),
      advancedRate("orbPct", "ORB%", "orbPct", "Offensive rebound percentage: the share of the team's own misses it rebounded", "higher", pct, (season) => (num(season.drbPct) === null ? null : 1 - season.drbPct)),
      advancedRate("ftRate", "FT rate", "ftRate", "Free throw rate: free throws made per field goal attempt", "higher", pct, (season) => season.oppFtRate),
    ],
  },
  {
    key: "rates",
    title: "Rates and style",
    column: 2,
    rows: [
      {
        key: "threeRate",
        label: "3PT attempt rate",
        tip: "The share of field goal attempts that were threes: a measure of style, not of success",
        source: "box",
        direction: "neutral",
        value: (s) => ratio(s.total.fieldGoalsAttempted3, s.total.fieldGoalsAttemptedTotal),
        display: (s) => pct(ratio(s.total.fieldGoalsAttempted3, s.total.fieldGoalsAttemptedTotal)),
      },
      fromFlow("assisted"),
      {
        key: "assistTurnover",
        label: "Assist to turnover",
        tip: "Assists per turnover",
        source: "box",
        direction: "higher",
        value: (s) => ratio(s.total.assistances, s.total.turnovers),
        display: (s) => formatDecimal(ratio(s.total.assistances, s.total.turnovers), 2),
      },
      {
        key: "stealPct",
        label: "Steal %",
        tip: "Steal percentage: steals per 100 opponent possessions",
        source: "advanced",
        direction: "higher",
        value: (s) => ratio(s.total.steals, s.adv?.possessions),
        display: (s) => pct(ratio(s.total.steals, s.adv?.possessions)),
      },
      {
        key: "blockPct",
        label: "Block %",
        tip: "Block percentage: the share of the opponent's two-point attempts this team blocked",
        source: "box",
        direction: "higher",
        value: (s) => ratio(s.total.blocksFavour, s.opponent.fieldGoalsAttempted2),
        display: (s) => pct(ratio(s.total.blocksFavour, s.opponent.fieldGoalsAttempted2)),
      },
      fromFlow("avgPossession"),
    ],
  },
  {
    key: "flow",
    title: "Game flow",
    column: 2,
    rows: [
      fromFlow("timeInFront"),
      fromFlow("largestLead"),
      fromFlow("longestRun"),
      fromFlow("runs6Plus"),
      fromFlow("clutchPoints"),
      {
        key: "quartersWon",
        label: "Quarters won",
        tip: "Periods in which the team outscored its opponent, overtimes included. A tied period counts for neither",
        source: "box",
        direction: "higher",
        value: (s) => quarters(s)?.won ?? null,
        display: (s) => `${quarters(s).won} of ${quarters(s).played}`,
      },
    ],
  },
];

// One value per game: the same for both teams, so read from the local side.
const STRIP = [
  { key: "pace", label: "Pace", tip: "Possessions per 40 minutes", source: "advanced", value: (s) => num(s.adv?.pace), display: (s) => one(s.adv.pace) },
  {
    key: "possessions",
    label: "Possessions",
    tip: "The game's possessions, estimated from the box score",
    source: "advanced",
    value: (s) => num(s.adv?.possessions),
    display: (s) => one(s.adv.possessions),
  },
  fromFlow("leadChanges"),
  fromFlow("ties"),
  fromFlow("timeTied"),
  fromFlow("clutchTime"),
];

// The periods (overtimes included) a side outscored the other in, of the periods with both scores; null without any.
export function quartersWon(periodScores, side) {
  const byPeriod = new Map();
  for (const row of periodScores ?? []) {
    const entry = byPeriod.get(row.periodNumber) ?? {};
    entry[row.side] = num(row.score);
    byPeriod.set(row.periodNumber, entry);
  }
  const other = side === "local" ? "road" : "local";
  const scored = [...byPeriod.values()].filter((entry) => entry[side] !== null && entry[side] !== undefined && entry[other] !== null && entry[other] !== undefined);
  if (scored.length === 0) return null;
  return { won: scored.filter((entry) => entry[side] > entry[other]).length, played: scored.length };
}

// A team's points from twos, threes and free throws, or null without all three counts.
export function pointsMix(total) {
  const [made2, made3, freeThrows] = [num(total?.fieldGoalsMade2), num(total?.fieldGoalsMade3), num(total?.freeThrowsMade)];
  if (made2 === null || made3 === null || freeThrows === null) return null;
  const parts = { twos: 2 * made2, threes: 3 * made3, freeThrows };
  return { ...parts, total: parts.twos + parts.threes + parts.freeThrows };
}

// Shots a team earned beyond its opponent: (own offensive rebounds + turnovers forced) - (own turnovers + offensive
// rebounds allowed). One number for the game: `side` is the team ahead (null when even), `margin` its lead.
export function extraChances(localTotal, roadTotal) {
  const values = [localTotal?.offensiveRebounds, localTotal?.turnovers, roadTotal?.offensiveRebounds, roadTotal?.turnovers].map(num);
  if (values.includes(null)) return null;
  const [localOrb, localTov, roadOrb, roadTov] = values;
  const local = localOrb + roadTov - (localTov + roadOrb);
  return { side: local > 0 ? "local" : local < 0 ? "road" : null, margin: Math.abs(local) };
}

function seasonOf(adv) {
  return adv?.season && !adv.season.hidden ? adv.season : null;
}

function seasonLines(row, s) {
  if (!row.season) return { marker: null, avg: null, note: null };
  const own = seasonOf(s.adv);
  const marker = own ? num(own[row.season.field]) : null;
  const opponentSeason = seasonOf(s.oppAdv);
  const allows = opponentSeason && row.season.allows ? num(row.season.allows(opponentSeason)) : null;
  return {
    marker,
    avg: marker === null ? null : `Season avg ${row.season.format(marker)}`,
    note: allows === null ? null : `Opp allows ${row.season.format(allows)}`,
  };
}

function buildRow(row, local, road, state) {
  const [rawA, rawB] = [row.value(local), row.value(road)];
  if (state === "success" && rawA === null && rawB === null) return null;
  const display = (s, raw) => (raw === null ? formatCount(null) : row.display ? row.display(s) : formatCount(raw));
  const [a, b] = [seasonLines(row, local), seasonLines(row, road)];
  return {
    key: row.key,
    label: row.label,
    tip: row.tip,
    direction: rawA === null || rawB === null ? "neutral" : row.direction,
    rawA,
    rawB,
    displayA: display(local, rawA),
    displayB: display(road, rawB),
    bars: Boolean(row.season),
    markerA: a.marker,
    markerB: b.marker,
    avgA: a.avg,
    avgB: b.avg,
    noteA: a.note,
    noteB: b.note,
    loading: state === "loading",
  };
}

function sideContext(side, sources) {
  const other = side === "local" ? "road" : "local";
  const { boxScore, advanced, teamFlow, shots, teams } = sources;
  const statsFor = (which, kind) => boxScore.teamStats.find((row) => row.side === which && row.statsKind === kind);
  const advancedFor = (which) => {
    if (!advanced?.available) return null;
    return advanced.teams.find((row) => row.side === which) ?? null;
  };
  return {
    side,
    team: teams[side],
    total: statsFor(side, "total"),
    opponent: statsFor(other, "total"),
    teamLine: statsFor(side, "team"),
    playerStats: boxScore.playerStats,
    periodScores: boxScore.periodScores,
    adv: advancedFor(side),
    oppAdv: advancedFor(other),
    flow: teamFlow?.available ? teamFlow.teams.find((row) => row.side === side) ?? null : null,
    shots: shots ?? null,
  };
}

function seasonNote(advanced, local, road, state) {
  if (state !== "success" || !local.adv || !road.adv) return null;
  return { hidden: !seasonOf(local.adv) || !seasonOf(road.adv), round: advanced.round, minGames: advanced.minSeasonGames };
}

// `sources`: { boxScore, advanced, teamFlow, shots (the shots array), teams: { local, road } }. `states`: each of
// advanced, flow and shots as "loading", "error" or "success". Null when the box score has no team totals.
export function buildTeamComparison(sources, states) {
  const local = sideContext("local", sources);
  const road = sideContext("road", sources);
  if (!local.total || !road.total) return null;
  const stateOf = (source) => (source === "box" ? "success" : states[source]);

  const strip = STRIP.flatMap((item) => {
    const state = stateOf(item.source);
    const value = item.value(local);
    if (state === "success" && value === null) return [];
    return [{ key: item.key, label: item.label, tip: item.tip, display: value === null ? formatCount(null) : item.display(local), loading: state === "loading" }];
  });

  const groups = GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    column: group.column,
    rows: group.rows.map((row) => buildRow(row, local, road, stateOf(row.source))).filter(Boolean),
    mix: group.mix ? { local: pointsMix(local.total), road: pointsMix(road.total) } : null,
    extraChances: group.extraChances ? extraChances(local.total, road.total) : null,
  })).filter((group) => group.rows.length > 0 || group.mix?.local || group.extraChances);

  return {
    strip,
    groups,
    failed: ["advanced", "flow", "shots"].filter((source) => states[source] === "error"),
    seasonNote: seasonNote(sources.advanced, local, road, states.advanced),
  };
}
