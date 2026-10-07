import { motion } from "motion/react";
import { Link } from "react-router";
import HeaderTip from "../lib/HeaderTip";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";

function tierClass(position) {
  if (position == null) return "";
  if (position <= 6) return "bg-success/10";
  if (position <= 10) return "bg-warning/10";
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
// whatever point of the race the chart is showing. Movement is against the round before.
export default function RaceSnapshotTable({
  seasonCode,
  round,
  previousRound,
  positionsByRound,
  recordsByRound,
  teamOrder,
  shortNames,
  focusedClub,
  onFocusClub,
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
    <div className="panel overflow-x-auto p-2">
      <p className="px-2 pb-1 text-xs font-semibold text-base-content/70">
        {round == null ? "Season start" : `Standings after round ${round}`}
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
                className={`${tierClass(position)} ${isFocused ? "outline outline-2 outline-primary" : ""} cursor-pointer`}
                onClick={() => onFocusClub(isFocused ? null : team.clubCode)}
              >
                <td>{position ?? "-"}</td>
                <td>
                  <Link
                    to={`/${seasonCode}/teams/${team.clubCode}`}
                    aria-label={shortNames?.get(team.clubCode) ? teamName(team) : undefined}
                    className="link link-hover flex items-center gap-2 font-medium"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {team.crestUrl ? (
                      <img src={team.crestUrl} alt="" className="h-5 w-5 flex-none object-contain" />
                    ) : null}
                    {shortNames?.get(team.clubCode) ? (
                      <span className="hidden text-xs leading-tight max-sm:inline lg:max-xl:inline">{shortNames.get(team.clubCode)}</span>
                    ) : null}
                    <span
                      className={`max-w-40 truncate ${shortNames?.get(team.clubCode) ? "max-sm:hidden lg:max-xl:hidden" : ""}`}
                      title={teamName(team)}
                    >
                      {teamName(team)}
                    </span>
                  </Link>
                </td>
                <td className="tabular-nums">{record ? `${record.won}-${record.lost}` : "-"}</td>
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
