import { formatDecimal, formatFractionPercent, formatMinutes } from "../lib/format";
import { MIN_BEST_PLAYER_SECONDS } from "./overview";

// The advanced view reuses the box score table: each player row (and team total) carries the pipeline's advanced
// row as `advanced`, and these columns read from it. A missing value is an em dash, never a computed zero.

const ADVANCED_TIPS = {
  GmSc: "Game Score: Hollinger's single-game productivity score, a weighted sum of the box score line",
  PER: "Player Efficiency Rating for this game only, scaled so the league average is 15. Shown from 10 minutes played",
  "TS%": "True shooting: points per shooting possession, counting free throws and threes",
  "eFG%": "Effective field goal percentage: field goal percentage with threes weighted 1.5",
  "USG%": "Usage: the share of the team's possessions this player used while on the court",
  "AST%": "Assist percentage: the share of teammates' baskets this player assisted while on the court",
  "TOV%": "Turnover percentage: turnovers per 100 shooting and turnover possessions",
  "ORB%": "Offensive rebound percentage: the share of available offensive rebounds taken while on the court",
  "DRB%": "Defensive rebound percentage: the share of available defensive rebounds taken while on the court",
  "TRB%": "Total rebound percentage: the share of all available rebounds taken while on the court",
  "STL%": "Steal percentage: steals per 100 opponent possessions while on the court",
  "BLK%": "Block percentage: the share of opponent two-point attempts blocked while on the court",
  "S-PER": "Player Efficiency Rating over the season through this round, league average 15",
  "S-USG%": "Usage over the season through this round",
  WS: "Win Shares: the wins a player is credited with over the season through this round",
};

const pct = (key) => (row) => formatFractionPercent(row.advanced?.[key]);

function gamePer(row) {
  const advanced = row.advanced;
  if (!advanced || advanced.gamePer == null) return null;
  return advanced.secondsPlayed >= MIN_BEST_PLAYER_SECONDS ? advanced.gamePer : null;
}

function seasonCell(row, pick, format, minSeasonMinutes) {
  const season = row.advanced?.season;
  if (row.advanced && season === null) {
    return <span title="No season record through this round">{format(null)}</span>;
  }
  if (!season) return format(null);
  if (season.hidden) {
    const minutes = season.secondsPlayed == null ? 0 : Math.floor(season.secondsPlayed / 60);
    return (
      <span title={`Sample too small: ${minutes} minutes through this round, at least ${minSeasonMinutes} needed`}>
        {format(null)}
      </span>
    );
  }
  return format(pick(season));
}

// `highValue` marks the columns where the game's best value is bolded (the game PER only counts from 10 minutes).
export function advancedColumns({ round, minSeasonMinutes }) {
  const columns = [
    { key: "min", label: "MIN", render: (row) => formatMinutes(row.timePlayed) },
    { key: "gmsc", label: "GmSc", render: (row) => formatDecimal(row.advanced?.gameScore), highValue: (row) => row.advanced?.gameScore },
    {
      key: "per",
      label: "PER",
      render: (row) => {
        const value = gamePer(row);
        if (value === null && row.advanced?.gamePer != null) {
          return <span title="Game PER is shown from 10 minutes played">{formatDecimal(null)}</span>;
        }
        return formatDecimal(value);
      },
      highValue: gamePer,
    },
    { key: "ts", label: "TS%", render: pct("trueShootingPct") },
    { key: "efg", label: "eFG%", render: pct("efgPct") },
    { key: "usg", label: "USG%", render: pct("usagePct") },
    { key: "ast", label: "AST%", render: pct("assistPct") },
    { key: "tov", label: "TOV%", render: pct("tovPct") },
    { key: "orb", label: "ORB%", render: pct("orbPct") },
    { key: "drb", label: "DRB%", render: pct("drbPct") },
    { key: "trb", label: "TRB%", render: pct("trbPct") },
    { key: "stl", label: "STL%", render: pct("stealPct") },
    { key: "blk", label: "BLK%", render: pct("blockPct") },
    {
      key: "s-per",
      groupStart: true,
      label: "PER",
      tipKey: "S-PER",
      render: (row) => seasonCell(row, (season) => season.per, (value) => formatDecimal(value), minSeasonMinutes),
    },
    {
      key: "s-usg",
      label: "USG%",
      tipKey: "S-USG%",
      render: (row) => seasonCell(row, (season) => season.usgPct, formatFractionPercent, minSeasonMinutes),
    },
    {
      key: "s-ws",
      label: "WS",
      render: (row) => seasonCell(row, (season) => season.winShares, (value) => formatDecimal(value, 2), minSeasonMinutes),
    },
  ];
  const groups = [
    { label: "This game", span: columns.length - 3 },
    { label: round == null ? "Season to date" : `Season through round ${round}`, span: 3, groupStart: true },
  ];
  return { columns: columns.map((column) => ({ ...column, tip: ADVANCED_TIPS[column.tipKey ?? column.label] })), groups };
}

// Attaches the pipeline's advanced rows to the box score rows by side and player (team totals by side).
export function attachAdvanced(boxScore, advanced) {
  const players = new Map(advanced.players.map((row) => [`${row.side}:${row.personKey}`, row]));
  const teams = new Map(advanced.teams.map((row) => [row.side, row]));
  return {
    ...boxScore,
    playerStats: boxScore.playerStats.map((row) => ({ ...row, advanced: players.get(`${row.side}:${row.personKey}`) })),
    teamStats: boxScore.teamStats.map((row) => ({ ...row, advanced: teams.get(row.side) })),
  };
}
