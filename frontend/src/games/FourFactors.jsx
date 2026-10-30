import AsyncState from "../lib/AsyncState";
import { PanelBlockSkeleton } from "./GamePageSkeleton";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import Panel from "../lib/Panel";
import TeamLabel from "./TeamLabel";

const pct = (value) => formatFractionPercent(value);
const one = (value) => formatDecimal(value);

// `field` is the game value on the team row, `seasonField` the matching season-average field. A defensive factor is
// the opponent's number: in a two-team game it repeats the other team's own value, and the season average is the
// point of showing it.
const BLOCKS = [
  {
    title: "Offense",
    rows: [
      { label: "eFG%", tip: "Effective field goal percentage: field goal percentage with threes weighted 1.5", direction: "higher", field: "efgPct", format: pct },
      { label: "TOV%", tip: "Turnover percentage: turnovers per 100 shooting and turnover possessions", direction: "lower", field: "tovPct", format: pct },
      { label: "ORB%", tip: "Offensive rebound percentage: the share of the team's own misses it rebounded", direction: "higher", field: "orbPct", format: pct },
      { label: "FT rate", tip: "Free throw rate: free throws made per field goal attempt", direction: "higher", field: "ftRate", format: pct },
    ],
  },
  {
    title: "Defense (what each team held its opponent to)",
    rows: [
      { label: "Opp eFG%", tip: "The opponent's effective field goal percentage against this team", direction: "lower", field: "oppEfgPct", format: pct },
      { label: "Opp TOV%", tip: "The opponent's turnover percentage: turnovers this team forced", direction: "higher", field: "oppTovPct", format: pct },
      { label: "DRB%", tip: "Defensive rebound percentage: the share of the opponent's misses this team rebounded", direction: "higher", field: "drbPct", format: pct },
      { label: "Opp FT rate", tip: "The opponent's free throw rate against this team", direction: "lower", field: "oppFtRate", format: pct },
      { label: "Steal %", tip: "Steal percentage: steals per 100 opponent possessions", direction: "higher", field: "stealPct", format: pct },
      { label: "Block %", tip: "Block percentage: the share of the opponent's two-point attempts this team blocked", direction: "higher", field: "blockPct", format: pct },
    ],
  },
  {
    title: "Pace and ratings",
    rows: [
      { label: "Possessions", tip: "The game's possessions, estimated from the box score: the average of the two teams' own estimates", direction: "neutral", field: "possessions", format: one },
      { label: "Own possessions", tip: "This team's own possession estimate from its box score, before the two teams are averaged", direction: "neutral", field: "ownPossessionsEstimate", format: one },
      { label: "Pace", tip: "Possessions per 40 minutes", direction: "neutral", field: "pace", format: one },
      { label: "Offensive rating", tip: "Points scored per 100 possessions", direction: "higher", field: "offensiveRating", format: one },
      { label: "Defensive rating", tip: "Points allowed per 100 possessions", direction: "lower", field: "defensiveRating", format: one },
      { label: "Net rating", tip: "Offensive rating minus defensive rating", direction: "higher", field: "netRating", format: (value) => formatSignedDecimal(value) },
    ],
  },
  {
    title: "Shooting and passing",
    rows: [
      { label: "TS%", tip: "True shooting: points per shooting possession, counting free throws and threes", direction: "higher", field: "trueShootingPct", format: pct },
      { label: "Assist ratio", tip: "Assist ratio: the share of made field goals that were assisted", direction: "higher", field: "assistRatio", format: pct },
    ],
  },
];

// The team's season average for a field, or null while the season block is missing or hidden.
function seasonValue(team, field) {
  const value = team?.season?.[field];
  return value === null || value === undefined ? null : value;
}

// A side with no value prints a dash, so neither side is highlighted: a missing value is not a 0 to beat.
const missing = (value) => value === null || value === undefined;

function averageText(value, format) {
  return value === null ? null : `Season avg ${format(value)}`;
}

// Steal and block percentages are not pipeline fields: they come from the box-score totals (`total`, `opponent`) over the
// game's possessions and the opponent's two-point attempts. Missing totals leave them null, a dash.
function withDefenseRates(team, total, opponent, possessions) {
  const rate = (count, base) => (Number.isFinite(count) && Number.isFinite(base) && base > 0 ? count / base : null);
  return {
    ...team,
    stealPct: rate(total?.steals, possessions),
    blockPct: rate(total?.blocksFavour, opponent?.fieldGoalsAttempted2),
  };
}

// The pipeline's per-game team stats against each team's season average through the game's round. Its own loading,
// error and unavailable states, so trouble here never hides the rest of the Team comparison tab. `localTotal` and
// `roadTotal` are the box-score totals for the steal and block rates.
export default function FourFactors({ advancedQuery, localTeam, roadTeam, localTotal = null, roadTotal = null }) {
  if (advancedQuery.isLoading) return <AsyncState status="loading" label="Loading the Four Factors" skeleton={<PanelBlockSkeleton className="h-[84rem] max-sm:h-[71rem]" />} />;
  if (advancedQuery.isError) {
    return <AsyncState status="error" message="Could not load the Four Factors." onRetry={() => advancedQuery.refetch()} />;
  }
  const advanced = advancedQuery.data;
  const localRow = advanced?.teams?.find((team) => team.side === "local");
  const roadRow = advanced?.teams?.find((team) => team.side === "road");
  if (!advanced?.available || !localRow || !roadRow) {
    return <EmptyText>Four Factors aren't available for this game yet.</EmptyText>;
  }
  const local = withDefenseRates(localRow, localTotal, roadTotal, localRow.possessions);
  const road = withDefenseRates(roadRow, roadTotal, localTotal, roadRow.possessions);
  const averagesHidden = !(local.season && !local.season.hidden) || !(road.season && !road.season.hidden);

  return (
    <Panel className="flex flex-1 flex-col p-4 max-sm:p-3">
      <div className="mb-2 grid grid-cols-2 gap-4 max-sm:gap-2">
        <div className="flex justify-end">
          <TeamLabel team={localTeam} />
        </div>
        <TeamLabel team={roadTeam} />
      </div>
      {BLOCKS.map((block) => (
        <section key={block.title} aria-label={block.title} className="mt-4 flex flex-1 flex-col first:mt-0">
          <h4 className="muted mb-1 text-center text-xs font-bold tracking-wide uppercase">{block.title}</h4>
          {block.rows.map(({ field, format, direction, ...row }) => {
            const markerA = seasonValue(local, field);
            const markerB = seasonValue(road, field);
            return (
              <ComparisonRow
                key={row.label}
                {...row}
                direction={missing(local[field]) || missing(road[field]) ? "neutral" : direction}
                inline
                rawA={local[field]}
                rawB={road[field]}
                displayA={format(local[field])}
                displayB={format(road[field])}
                markerA={markerA}
                markerB={markerB}
                avgA={averageText(markerA, format)}
                avgB={averageText(markerB, format)}
              />
            );
          })}
        </section>
      ))}
      {averagesHidden ? (
        <p className="muted mt-3 text-sm">
          Season averages need at least {advanced.minSeasonGames} games, so they are hidden for a team that has played fewer.
        </p>
      ) : (
        <p className="muted mt-3 text-sm">The tick on each bar marks the team's season average through round {advanced.round}.</p>
      )}
    </Panel>
  );
}
