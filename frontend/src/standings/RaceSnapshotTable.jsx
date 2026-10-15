import { motion } from "motion/react";
import { Link } from "react-router";
import HeaderTip from "../lib/HeaderTip";
import { tierForPosition } from "../lib/seasonFormat";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

// The row tint follows the season's qualification lines; with none, rows are not tinted.
function tierClass(position, tiers) {
  const tier = tierForPosition(position, tiers);
  if (tier === "postseason") return "bg-success/10";
  if (tier === "playin") return "bg-warning/10";
  return "";
}

function MovementIndicator({ change }) {
  if (change == null || change === 0) {
    return <span className="text-base-content/30">-</span>;
  }
  if (change > 0) {
    return <span className="font-semibold text-success">{"↑"}{change}</span>;
  }
  return <span className="font-semibold text-error">{"↓"}{Math.abs(change)}</span>;
}

function teamName(team) {
  return team.clubName ?? team.clubCode;
}

// The standings as they were after `round` (null is the season start, when everyone is 0-0), so the table follows
// whatever point of the race the chart is showing. Movement is against the round before. From lg, beside the chart, each
// row takes the chart's `rowHeight` so it sits level with its team's lane, and shows the club's abbreviated name.
export default function RaceSnapshotTable({
  seasonCode,
  round,
  previousRound,
  positionsByRound,
  recordsByRound,
  teamOrder,
  shortNames,
  abbreviatedNames,
  focusedClub,
  onFocusClub,
  tiers = null,
  roundLabel,
  startLabel = "Season start",
  rowHeight,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const positions = round != null ? positionsByRound.get(round) : null;
  const records = round != null ? recordsByRound.get(round) : null;
  const previousPositions = previousRound != null ? positionsByRound.get(previousRound) : null;

  const rows = teamOrder
    .map((team) => {
      const position = positions?.get(team.clubCode) ?? null;
      const previousPosition = previousPositions?.get(team.clubCode) ?? null;
      const record = round == null ? { won: 0, lost: 0 } : (records?.get(team.clubCode) ?? null);
      return {
        team,
        position,
        record,
        change: previousPosition != null && position != null ? previousPosition - position : null,
      };
    })
    .sort((a, b) => {
      if (a.position != null && b.position != null) return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      return teamName(a.team).localeCompare(teamName(b.team));
    });

  return (
    <div className="panel overflow-x-auto p-2" style={{ "--race-row": `${rowHeight}px` }}>
      <p className="race-table-title px-2 pb-1 text-xs font-semibold text-base-content/70">
        {round == null ? startLabel : roundLabel ? `Standings after ${roundLabel}` : `Standings after round ${round}`}
      </p>
      <table className="table race-table">
        <thead>
          <tr>
            <th><HeaderTip tip="Position after this round">#</HeaderTip></th>
            <th>Team</th>
            <th><HeaderTip tip="Record after this round: wins and losses">W-L</HeaderTip></th>
            <th><HeaderTip tip="Move: places gained (↑) or lost (↓) since the previous round">Move</HeaderTip></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, position, record, change }) => {
            const isFocused = focusedClub === team.clubCode;

            return (
              <motion.tr
                key={team.clubCode}
                layout={reducedMotion ? false : "position"}
                transition={{ duration: 0.4 }}
                className={`${tierClass(position, tiers)} ${isFocused ? "outline outline-2 outline-primary" : ""} cursor-pointer`}
                onClick={() => onFocusClub(isFocused ? null : team.clubCode)}
              >
                <td>{position ?? "-"}</td>
                <td>
                  <Link
                    to={`/${seasonCode}/teams/${team.clubCode}`}
                    aria-label={shortNames?.get(team.clubCode) || abbreviatedNames?.get(team.clubCode) ? teamName(team) : undefined}
                    className="link link-hover flex items-center gap-2 font-medium"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {team.crestUrl ? (
                      <img src={team.crestUrl} alt="" className="h-5 w-5 flex-none object-contain" />
                    ) : null}
                    {shortNames?.get(team.clubCode) ? (
                      <span className="hidden text-xs leading-tight max-sm:inline">{shortNames.get(team.clubCode)}</span>
                    ) : null}
                    {abbreviatedNames?.get(team.clubCode) ? (
                      <span className="hidden max-w-40 truncate lg:inline" title={teamName(team)}>{abbreviatedNames.get(team.clubCode)}</span>
                    ) : null}
                    <span
                      className={`max-w-40 truncate ${shortNames?.get(team.clubCode) ? "max-sm:hidden" : ""} ${abbreviatedNames?.get(team.clubCode) ? "lg:hidden" : ""}`}
                      title={teamName(team)}
                    >
                      {teamName(team)}
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap tabular-nums">{record ? `${record.won}-${record.lost}` : "-"}</td>
                <td>
                  <MovementIndicator change={change} />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
