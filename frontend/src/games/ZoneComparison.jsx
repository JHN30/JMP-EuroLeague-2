import { formatPercentage } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { countWithoutLocation, summarizeZones } from "../lib/shotZones";
import { teamCode, teamName } from "./gameUtils";

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

// A team's column heading: its TV code below sm, where there is little room (the full name stays for screen readers), and the
// full name from sm.
function TeamHeading({ team }) {
  const full = teamName(team);
  const code = teamCode(team);
  if (code === full) return full;
  return (
    <>
      <span aria-hidden="true" title={full} className="sm:hidden">
        {code}
      </span>
      <span className="max-sm:sr-only">{full}</span>
    </>
  );
}

// The two teams' own colours, as on the shot map: the first team's FG% is shaded in the primary colour, the second's in the secondary.
const TEAM_SHADES = ["bg-primary/15 text-primary", "bg-secondary/15 text-secondary"];

// The index of the team with the higher FG% in a zone, or -1 when a team has no attempts there or they are level.
function betterTeam(lines) {
  const [first, second] = lines.map((row) => (row && row.attempts > 0 ? row.made / row.attempts : null));
  if (first === null || second === null || first === second) return -1;
  return first > second ? 0 : 1;
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
    <Panel className="p-3 sm:p-4">
      <PanelHeader kicker="ZONES" title="Zone comparison" />
      <div className="overflow-x-auto">
        <table className="table table-sm w-full max-sm:[&_td]:px-1 max-sm:[&_th]:px-1 max-sm:[&_td]:text-xs [&_td]:py-1.5 [&_th]:py-1.5">
          <thead>
            <tr>
              <th rowSpan={2} className="w-1/3">Zone</th>
              {teams.map(({ team }) => (
                <th key={team?.clubCode ?? "tbd"} colSpan={2} className="text-center">
                  <TeamHeading team={team} />
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
                {teams.flatMap(({ team, rows, located }, teamIndex) => {
                  const line = shotLine(rows[index], located);
                  const better = betterTeam(teams.map(({ rows: teamRows }) => teamRows[index])) === teamIndex;
                  return [
                    <td key={`${team?.clubCode}-share`} className="text-center tabular-nums">{line.share}</td>,
                    <td key={`${team?.clubCode}-fg`} className="text-center tabular-nums">
                      <span className={better ? `inline-block rounded px-1 font-bold ${TEAM_SHADES[teamIndex]}` : undefined}>
                        {line.fg}
                        {better ? <span className="sr-only"> (higher)</span> : null}
                      </span>
                      {line.detail ? <span className="muted ml-2 text-xs max-sm:ml-0 max-sm:block">{line.detail}</span> : null}
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
      <p className="muted mt-2 text-xs">Share is the zone's part of the team's shots with a known location. In each zone the higher FG% is shaded in its team's colour.</p>
    </Panel>
  );
}
