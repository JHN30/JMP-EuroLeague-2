import { Link } from "react-router";

function formBadge(result, key) {
  const variant = result === "W" ? "badge-success" : result === "L" ? "badge-error" : "badge-ghost";
  return (
    <span key={key} className={`badge badge-xs ${variant}`} title={result ?? "Unknown"}>
      {result ?? "-"}
    </span>
  );
}

export default function StandingsTable({ standings, seasonCode }) {
  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>L</th>
            <th>PCT</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>Home</th>
            <th>Away</th>
            <th>L10</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((entry, index) => {
            const previous = standings[index - 1];
            const qualifiedDivider =
              previous !== undefined && previous.basic?.qualified !== entry.basic?.qualified;
            const tieBreak =
              entry.basic && entry.calendar && entry.basic.position !== entry.calendar.position;
            const form = [...entry.form].sort((a, b) => a.resultOrdinal - b.resultOrdinal);
            const position = entry.basic?.position;

            return (
              <tr
                key={entry.clubCode}
                className={qualifiedDivider ? "border-t-2 border-dashed border-primary/50" : undefined}
              >
                <td>
                  <span className={`rank ${position === 1 ? "rank-1" : ""}`}>{position ?? "-"}</span>
                  {tieBreak ? (
                    <span
                      className="tooltip ml-1"
                      data-tip={`Calendar ranking places this team #${entry.calendar.position}`}
                    >
                      <span className="badge badge-xs badge-warning">*</span>
                    </span>
                  ) : null}
                </td>
                <td>
                  <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link link-hover font-medium">
                    {entry.clubName ?? entry.clubCode}
                  </Link>
                </td>
                <td>{entry.basic?.gamesPlayed ?? "-"}</td>
                <td>{entry.basic?.gamesWon ?? "-"}</td>
                <td>{entry.basic?.gamesLost ?? "-"}</td>
                <td>{entry.basic?.winPercentage ?? "-"}</td>
                <td>{entry.basic?.pointsFor ?? "-"}</td>
                <td>{entry.basic?.pointsAgainst ?? "-"}</td>
                <td className="font-semibold">{entry.basic?.pointsDifference ?? "-"}</td>
                <td>{entry.basic?.homeRecord ?? "-"}</td>
                <td>{entry.basic?.awayRecord ?? "-"}</td>
                <td>{entry.basic?.lastTenRecord ?? "-"}</td>
                <td>
                  <div className="flex gap-1">{form.map((f) => formBadge(f.result, f.resultOrdinal))}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
