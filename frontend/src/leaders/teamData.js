import { useQuery } from "@tanstack/react-query";
import { getAdvancedStandings, getLeagueTeamStats, getSeasonStandings, getSeasonTeams } from "../lib/api";
import { advancedScopeForPhase } from "../teams/teamLeague";

// ---- What a team can be ranked on ----
// Every stat reads one team row: its season totals for and against (the pipeline's team totals, which count overtime), its
// advanced ratings (the advanced standings) and its record (the standings). `get(row, mode)` is the value; a count is per game
// or a season total.

const perGameOf = (row, mode, total) => (total == null ? null : mode === "perGame" ? (row.gp ? Number(total) / row.gp : null) : Number(total));
const own = (field) => (row, mode) => perGameOf(row, mode, row.stats?.own?.[field]);
const against = (field) => (row, mode) => perGameOf(row, mode, row.stats?.opponent?.[field]);
const share = (side, made, attempted) => (row) => {
  const made_ = Number(row.stats?.[side]?.[made]);
  const attempted_ = Number(row.stats?.[side]?.[attempted]);
  return attempted_ > 0 ? (made_ / attempted_) * 100 : null;
};
const advanced = (field, scale = 1) => (row) => (row.advanced?.[field] == null ? null : Number(row.advanced[field]) * scale);

export const TEAM_FAMILIES = ["Record", "Scoring", "Shooting", "Rebounding", "Playmaking", "Defense", "Efficiency"];

export const TEAM_STATS = [
  { key: "wins", family: "Record", label: "Wins", short: "W", kind: "int", needs: "standings", get: (row) => row.standing?.basic?.gamesWon ?? null },
  { key: "winPct", family: "Record", label: "Win %", short: "PCT", kind: "percent", needs: "standings",
    get: (row) => (row.standing?.basic?.gamesPlayed ? (row.standing.basic.gamesWon / row.standing.basic.gamesPlayed) * 100 : null) },
  { key: "pointDiff", family: "Record", label: "Point differential", short: "DIFF", kind: "signed", get: (row, mode) => {
    const scored = own("points")(row, mode);
    const allowed = against("points")(row, mode);
    return scored == null || allowed == null ? null : scored - allowed;
  }, tip: "Points scored minus points allowed, overtime included" },

  { key: "points", family: "Scoring", label: "Points", short: "PTS", kind: "count", get: own("points") },
  { key: "twoPointersMade", family: "Scoring", label: "2-pointers made", short: "2PM", kind: "count", get: own("fieldGoalsMade2") },
  { key: "threePointersMade", family: "Scoring", label: "3-pointers made", short: "3PM", kind: "count", get: own("fieldGoalsMade3") },
  { key: "freeThrowsMade", family: "Scoring", label: "Free throws made", short: "FTM", kind: "count", get: own("freeThrowsMade") },
  { key: "ortg", family: "Scoring", label: "Offensive rating", short: "ORtg", kind: "decimal", needs: "advanced", get: advanced("offensiveRating"), tip: "Points scored per 100 possessions" },

  { key: "fieldGoalPct", family: "Shooting", label: "Field goal %", short: "FG%", kind: "percent", get: share("own", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal") },
  { key: "twoPct", family: "Shooting", label: "2-point %", short: "2P%", kind: "percent", get: share("own", "fieldGoalsMade2", "fieldGoalsAttempted2") },
  { key: "threePct", family: "Shooting", label: "3-point %", short: "3P%", kind: "percent", get: share("own", "fieldGoalsMade3", "fieldGoalsAttempted3") },
  { key: "freeThrowPct", family: "Shooting", label: "Free throw %", short: "FT%", kind: "percent", get: share("own", "freeThrowsMade", "freeThrowsAttempted") },
  { key: "efgPct", family: "Shooting", label: "Effective FG%", short: "eFG%", kind: "percent", needs: "advanced", get: advanced("efgPct", 100), tip: "Field goal percentage with threes weighted 1.5" },
  { key: "tsPct", family: "Shooting", label: "True shooting %", short: "TS%", kind: "percent", needs: "advanced", get: advanced("trueShootingPct", 100) },

  { key: "rebounds", family: "Rebounding", label: "Rebounds", short: "REB", kind: "count", get: own("totalRebounds") },
  { key: "offensiveRebounds", family: "Rebounding", label: "Offensive rebounds", short: "OREB", kind: "count", get: own("offensiveRebounds") },
  { key: "defensiveRebounds", family: "Rebounding", label: "Defensive rebounds", short: "DREB", kind: "count", get: own("defensiveRebounds") },
  { key: "orbPct", family: "Rebounding", label: "Offensive rebound %", short: "ORB%", kind: "percent", needs: "advanced", get: advanced("orbPct", 100) },
  { key: "drbPct", family: "Rebounding", label: "Defensive rebound %", short: "DRB%", kind: "percent", needs: "advanced", get: advanced("drbPct", 100) },

  { key: "assists", family: "Playmaking", label: "Assists", short: "AST", kind: "count", get: own("assistances") },
  { key: "turnovers", family: "Playmaking", label: "Turnovers", short: "TO", kind: "count", lowerIsBetter: true, get: own("turnovers") },
  { key: "tovPct", family: "Playmaking", label: "Turnover %", short: "TOV%", kind: "percent", lowerIsBetter: true, needs: "advanced", get: advanced("tovPct", 100) },
  { key: "pace", family: "Playmaking", label: "Pace", short: "PACE", kind: "decimal", needs: "advanced", get: advanced("pace"), tip: "Possessions per 40 minutes" },

  { key: "oppPoints", family: "Defense", label: "Points allowed", short: "OPP", kind: "count", lowerIsBetter: true, get: against("points") },
  { key: "drtg", family: "Defense", label: "Defensive rating", short: "DRtg", kind: "decimal", lowerIsBetter: true, needs: "advanced", get: advanced("defensiveRating"), tip: "Points allowed per 100 possessions" },
  { key: "oppFieldGoalPct", family: "Defense", label: "Opponents' FG%", short: "OPP FG%", kind: "percent", lowerIsBetter: true, get: share("opponent", "fieldGoalsMadeTotal", "fieldGoalsAttemptedTotal") },
  { key: "oppThreePct", family: "Defense", label: "Opponents' 3-point %", short: "OPP 3P%", kind: "percent", lowerIsBetter: true, get: share("opponent", "fieldGoalsMade3", "fieldGoalsAttempted3") },
  { key: "oppEfgPct", family: "Defense", label: "Opponents' eFG%", short: "OPP eFG%", kind: "percent", lowerIsBetter: true, needs: "advanced", get: advanced("oppEfgPct", 100) },
  { key: "steals", family: "Defense", label: "Steals", short: "STL", kind: "count", get: own("steals") },
  { key: "blocks", family: "Defense", label: "Blocks", short: "BLK", kind: "count", get: own("blocksFavour") },
  { key: "fouls", family: "Defense", label: "Fouls committed", short: "FC", kind: "count", lowerIsBetter: true, get: own("foulsCommited") },

  { key: "net", family: "Efficiency", label: "Net rating", short: "NET", kind: "signed", needs: "advanced", get: advanced("netRating"), tip: "Offensive minus defensive rating, per 100 possessions" },
  { key: "srs", family: "Efficiency", label: "Simple rating (SRS)", short: "SRS", kind: "signed", needs: "advanced", get: advanced("srs"), tip: "Average margin adjusted for the strength of the schedule" },
  { key: "mov", family: "Efficiency", label: "Margin of victory", short: "MOV", kind: "signed", needs: "advanced", get: advanced("mov") },
];

export const TEAM_CARDS = ["points", "oppPoints", "net", "ortg", "drtg", "threePct", "rebounds", "assists", "steals"];
export const statByKey = (key) => TEAM_STATS.find((stat) => stat.key === key);

export function formatTeamValue(stat, value, mode) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (stat.kind === "percent") return `${value.toFixed(1)}%`;
  if (stat.kind === "int") return String(Math.round(value));
  if (stat.kind === "signed") return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
  if (stat.kind === "count" && mode === "accumulated") return Math.round(value).toLocaleString();
  return value.toFixed(1);
}

// One row per club for the phase: totals, advanced ratings and record, joined on the club code. A source that does not have
// the phase (there is no knockout standings table) just leaves its stats empty.
export function useTeamRows(seasonCode, phaseCode) {
  const scope = advancedScopeForPhase(phaseCode);
  const statsQuery = useQuery({ queryKey: ["league-team-stats", seasonCode, phaseCode], queryFn: () => getLeagueTeamStats(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const advancedQuery = useQuery({ queryKey: ["advanced-standings-team-overview", seasonCode, scope], queryFn: () => getAdvancedStandings(seasonCode, { scope }), enabled: Boolean(phaseCode) });
  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, phaseCode], queryFn: () => getSeasonStandings(seasonCode, phaseCode), enabled: Boolean(phaseCode) });
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });

  const teamInfo = new Map((teamsQuery.data?.teams ?? []).map((team) => [team.clubCode, team]));
  const advancedRows = new Map((advancedQuery.data?.standings ?? []).map((row) => [row.clubCode, row]));
  const standingRows = new Map((standingsQuery.data?.standings ?? []).map((row) => [row.clubCode, row]));
  const rows = (statsQuery.data?.teams ?? []).map((stats) => {
    const info = teamInfo.get(stats.clubCode);
    return {
      clubCode: stats.clubCode,
      name: info?.name ?? info?.abbreviatedName ?? stats.clubCode,
      crestUrl: info?.crestUrl ?? null,
      gp: Number(stats.gamesPlayed) || 0,
      stats,
      advanced: advancedRows.get(stats.clubCode) ?? null,
      standing: standingRows.get(stats.clubCode) ?? null,
    };
  });
  return {
    rows,
    isLoading: statsQuery.isLoading || teamsQuery.isLoading,
    isError: statsQuery.isError,
    refetch: () => statsQuery.refetch(),
    hasStandings: standingRows.size > 0,
    hasAdvanced: advancedRows.size > 0,
  };
}

export function usable(stat, source) {
  return !(stat.needs === "standings" && !source.hasStandings) && !(stat.needs === "advanced" && !source.hasAdvanced);
}

