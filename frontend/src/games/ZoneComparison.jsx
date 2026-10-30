import { formatPercentage } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { countWithoutLocation, summarizeZones } from "../lib/shotZones";
import { teamCode, teamName } from "./gameUtils";

const DASH = "—";

// Below this many attempts on either side a better FG% is luck, so neither side is highlighted (here and in the tables under it).
export const MIN_HIGHLIGHT_ATTEMPTS = 3;

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
export function TeamHeading({ team }) {
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

// The index of the team with the higher FG% in a zone or group, or -1 when a team has fewer than the highlight minimum of
// attempts there (one make in one shot says little) or they are level.
function betterTeam(lines) {
  if (lines.some((row) => !row || row.attempts < MIN_HIGHLIGHT_ATTEMPTS)) return -1;
  const [first, second] = lines.map((row) => row.made / row.attempts);
  if (first === second) return -1;
  return first > second ? 0 : 1;
}

// The zones in three groups, each closed by its subtotal. Backcourt heaves count with the threes.
const ZONE_GROUPS = [
  { title: "Paint", zones: ["Restricted area", "In the paint"] },
  {
    title: "Mid-range",
    zones: ["Left corner mid-range", "Left wing mid-range", "Central mid-range", "Right wing mid-range", "Right corner mid-range"],
  },
  { title: "Threes", zones: ["Left corner 3", "Left wing 3", "Top of the key 3", "Right wing 3", "Right corner 3", "Deep 3", "Backcourt"] },
];

const sumRows = (rows) => rows.reduce((sum, row) => ({ attempts: sum.attempts + row.attempts, made: sum.made + row.made }), { attempts: 0, made: 0 });

// One line of the table: a zone, or a group's subtotal.
function ZoneRow({ label, lines, teams, subtotal = false }) {
  const better = betterTeam(lines);
  return (
    <tr className={subtotal ? "border-t border-base-300 bg-base-200/40 font-semibold" : undefined}>
      <td>{label}</td>
      {teams.flatMap(({ team, located }, teamIndex) => {
        const line = shotLine(lines[teamIndex], located);
        const isBetter = better === teamIndex;
        return [
          <td key={`${team?.clubCode}-share`} className="text-center tabular-nums">{line.share}</td>,
          <td key={`${team?.clubCode}-fg`} className="text-center tabular-nums">
            <span className={isBetter ? `inline-block rounded px-1 font-bold ${TEAM_SHADES[teamIndex]}` : undefined}>
              {line.fg}
              {isBetter ? <span className="sr-only"> (higher)</span> : null}
            </span>
            {line.detail ? <span className="muted ml-2 text-xs max-sm:ml-0 max-sm:block">{line.detail}</span> : null}
          </td>,
        ];
      })}
    </tr>
  );
}

// Each team's share of its located shots and FG% in every zone, for the shots it is given, in three groups with their
// subtotals. A zone neither team shot from is left out, and so is a group with no shots at all; shots without a usable
// location only show in the last row, when there are any.
export default function ZoneComparison({ localTeam, roadTeam, shots }) {
  const teams = [localTeam, roadTeam].map((team) => {
    const own = shots.filter((shot) => shot.clubCode === team?.clubCode);
    const rows = new Map(summarizeZones(own).map((row) => [row.zone, row]));
    const located = [...rows.values()].reduce((sum, row) => sum + row.attempts, 0);
    return { team, rows, located, unlocated: countWithoutLocation(own) };
  });
  const groups = ZONE_GROUPS.map((group) => ({
    ...group,
    zones: group.zones.filter((zone) => teams.some(({ rows }) => rows.get(zone)?.attempts > 0)),
  })).filter((group) => group.zones.length > 0);
  const unlocated = teams.some((team) => team.unlocated > 0);

  return (
    <Panel className="p-3 sm:p-4">
      <PanelHeader kicker="ZONES" title="Zone comparison" compact />
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
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr>
                <th colSpan={5} scope="rowgroup" className="muted pt-3 text-xs font-bold tracking-wide uppercase">
                  {group.title}
                </th>
              </tr>
              {group.zones.map((zone) => (
                <ZoneRow key={zone} label={zone} lines={teams.map(({ rows }) => rows.get(zone))} teams={teams} />
              ))}
              <ZoneRow
                label={`${group.title} total`}
                lines={teams.map(({ rows }) => sumRows(group.zones.map((zone) => rows.get(zone))))}
                teams={teams}
                subtotal
              />
            </tbody>
          ))}
          {unlocated ? (
            <tbody>
              <tr>
                <td>Location unknown</td>
                {teams.flatMap(({ team, unlocated: count }) => [
                  <td key={`${team?.clubCode}-count`} colSpan={2} className="text-center tabular-nums">
                    {count === 0 ? DASH : count}
                  </td>,
                ])}
              </tr>
            </tbody>
          ) : null}
        </table>
      </div>
      <p className="muted mt-2 text-xs">
        Share is the zone's part of the team's shots with a known location. Where both teams took at least {MIN_HIGHLIGHT_ATTEMPTS} shots, the
        higher FG% is shaded in its team's colour. Zones neither team shot from are left out.
      </p>
    </Panel>
  );
}
