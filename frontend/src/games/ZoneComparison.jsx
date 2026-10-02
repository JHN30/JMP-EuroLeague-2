import { formatPercentage } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { countWithoutLocation, summarizeZones } from "../lib/shotZones";
import { teamName } from "./gameUtils";

const DASH = "—";

function shotLine(row, located) {
  if (!row || row.attempts === 0) {
    return { share: DASH, fg: DASH, detail: null };
  }
  return {
    share: formatPercentage((row.attempts / located) * 100),
    fg: formatPercentage((row.made / row.attempts) * 100),
    detail: `${row.made}-${row.attempts}`,
  };
}

// Each team's share of its located shots and FG% in every zone, for the shots it is given. Shots without a usable
// location only show in the last row.
export default function ZoneComparison({ localTeam, roadTeam, shots }) {
  const teams = [localTeam, roadTeam].map((team) => {
    const own = shots.filter((shot) => shot.clubCode === team?.clubCode);
    const rows = summarizeZones(own);
    return { team, rows, located: rows.reduce((sum, row) => sum + row.attempts, 0), unlocated: countWithoutLocation(own) };
  });

  return (
    <Panel className="p-4">
      <PanelHeader kicker="ZONES" title="Zone comparison" />
      <div className="overflow-x-auto">
        <table className="table table-sm w-full [&_td]:py-1.5 [&_th]:py-1.5">
          <thead>
            <tr>
              <th rowSpan={2} className="w-1/3">Zone</th>
              {teams.map(({ team }) => (
                <th key={team?.clubCode ?? "tbd"} colSpan={2} className="text-center">
                  {teamName(team)}
                </th>
              ))}
            </tr>
            <tr>
              {teams.flatMap(({ team }) => [
                <th key={`${team?.clubCode}-share`} className="text-center">Share</th>,
                <th key={`${team?.clubCode}-fg`} className="text-center">FG%</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {teams[0].rows.map((row, index) => (
              <tr key={row.zone}>
                <td>{row.zone}</td>
                {teams.flatMap(({ team, rows, located }) => {
                  const line = shotLine(rows[index], located);
                  return [
                    <td key={`${team?.clubCode}-share`} className="text-center tabular-nums">{line.share}</td>,
                    <td key={`${team?.clubCode}-fg`} className="text-center tabular-nums">
                      {line.fg}
                      {line.detail ? <span className="muted ml-2 text-xs">{line.detail}</span> : null}
                    </td>,
                  ];
                })}
              </tr>
            ))}
            <tr>
              <td>Location unknown</td>
              {teams.flatMap(({ team, unlocated }) => [
                <td key={`${team?.clubCode}-count`} colSpan={2} className="text-center tabular-nums">
                  {unlocated === 0 ? DASH : unlocated}
                </td>,
              ])}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted mt-2 text-xs">Share is the zone's part of the team's shots with a known location.</p>
    </Panel>
  );
}
