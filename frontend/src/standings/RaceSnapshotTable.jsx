import { Link } from "react-router";

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

export default function RaceSnapshotTable({ seasonCode, rounds, standingsByRound, teamOrder, latestByCode, focusedClub, onFocusClub }) {
  const lastRound = rounds[rounds.length - 1];
  const previousRound = rounds[rounds.length - 2];

  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>W-L</th>
            <th>Move</th>
          </tr>
        </thead>
        <tbody>
          {teamOrder.map((team) => {
            const position = standingsByRound.get(lastRound)?.get(team.clubCode) ?? null;
            const previousPosition = previousRound ? standingsByRound.get(previousRound)?.get(team.clubCode) ?? null : null;
            const change = previousPosition != null && position != null ? previousPosition - position : null;
            const entry = latestByCode.get(team.clubCode);
            const isFocused = focusedClub === team.clubCode;

            return (
              <tr
                key={team.clubCode}
                className={`${tierClass(position)} ${isFocused ? "outline outline-2 outline-primary" : ""} cursor-pointer`}
                onClick={() => onFocusClub(isFocused ? null : team.clubCode)}
              >
                <td>{position ?? "-"}</td>
                <td>
                  <Link
                    to={`/${seasonCode}/teams/${team.clubCode}`}
                    className="link link-hover flex items-center gap-2 font-medium"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {entry?.crestUrl ? (
                      <img src={entry.crestUrl} alt="" className="h-5 w-5 flex-none object-contain" />
                    ) : null}
                    <span className="max-w-40 truncate" title={team.clubName ?? team.clubCode}>
                      {team.clubName ?? team.clubCode}
                    </span>
                  </Link>
                </td>
                <td>
                  {entry?.basic ? `${entry.basic.gamesWon}-${entry.basic.gamesLost}` : "-"}
                </td>
                <td>
                  <MovementIndicator change={change} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
