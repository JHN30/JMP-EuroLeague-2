import { formatCount, formatMissing, formatPercentage, formatPeriod } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { shotZone } from "../lib/shotZones";
import { periodNumberForMinute } from "./gameUtils";
import { MIN_HIGHLIGHT_ATTEMPTS, TeamHeading } from "./ZoneComparison";

// The Shooting tab's tables under the zone comparison: by quarter, by play context and by player. Each is given the shots
// the tab's filters leave, except the filter that is its own dimension (the quarter table ignores the period, and so on).

const isMade = (shot) => shot.actionCode.endsWith("M");
const isThree = (shot) => shot.actionCode.startsWith("3");

// The two teams' own colours, as on the shot map and the zone comparison.
const TEAM_SHADES = ["bg-primary/15 text-primary", "bg-secondary/15 text-secondary"];

function shotCounts(shots) {
  const made = shots.filter(isMade);
  return { attempts: shots.length, made: made.length, points: made.reduce((sum, shot) => sum + Number(shot.points ?? (isThree(shot) ? 3 : 2)), 0) };
}

const fgPct = (counts) => (counts.attempts > 0 ? (counts.made / counts.attempts) * 100 : null);

// The index of the side with the higher FG%, or -1 when either side is below the attempts minimum or they are level.
function betterShooter(sides) {
  if (sides.some((counts) => counts.attempts < MIN_HIGHLIGHT_ATTEMPTS)) return -1;
  const [first, second] = sides.map(fgPct);
  if (first === second) return -1;
  return first > second ? 0 : 1;
}

// "9-17" over "52.9%", the percentage shaded in the team's colour when it is the better one.
function FgCell({ counts, better, teamIndex }) {
  if (counts.attempts === 0) return <td className="text-center tabular-nums">{formatMissing(null)}</td>;
  return (
    <td className="text-center tabular-nums">
      <span className={better ? `inline-block rounded px-1 font-bold ${TEAM_SHADES[teamIndex]}` : undefined}>
        {formatPercentage(fgPct(counts))}
        {better ? <span className="sr-only"> (higher)</span> : null}
      </span>
      <span className="muted ml-2 text-xs max-sm:ml-0 max-sm:block">
        {counts.made}-{counts.attempts}
      </span>
    </td>
  );
}

const TABLE = "table table-sm w-full max-sm:[&_td]:px-1 max-sm:[&_th]:px-1 max-sm:[&_td]:text-xs [&_td]:py-1.5 [&_th]:py-1.5";

function TeamHeaderRow({ teams, columns }) {
  return (
    <>
      <tr>
        <th rowSpan={2}>{columns.first}</th>
        {teams.map((team) => (
          <th key={team?.clubCode ?? "tbd"} colSpan={columns.each.length} className="text-center">
            <TeamHeading team={team} />
          </th>
        ))}
      </tr>
      <tr>
        {teams.flatMap((team) =>
          columns.each.map((label) => (
            <th key={`${team?.clubCode}-${label}`} className="text-center">
              {label}
            </th>
          )),
        )}
      </tr>
    </>
  );
}

// FG% and 3PT per period for each team, over the shots the other filters leave.
export function ShootingByQuarter({ shots, localTeam, roadTeam }) {
  const teams = [localTeam, roadTeam];
  const periods = [...new Set(shots.map((shot) => periodNumberForMinute(shot.minute)))].sort((a, b) => a - b);
  const countsFor = (team, period, test = () => true) =>
    shotCounts(shots.filter((shot) => shot.clubCode === team?.clubCode && periodNumberForMinute(shot.minute) === period && test(shot)));

  return (
    <Panel className="p-3 sm:p-4">
      <PanelHeader kicker="BY QUARTER" title="Shooting by quarter" compact />
      {periods.length === 0 ? (
        <p className="muted text-sm">No shots match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <TeamHeaderRow teams={teams} columns={{ first: "Period", each: ["FG%", "3PT"] }} />
            </thead>
            <tbody>
              {periods.map((period) => {
                const fg = teams.map((team) => countsFor(team, period));
                const better = betterShooter(fg);
                return (
                  <tr key={period}>
                    <td>{formatPeriod(period)}</td>
                    {teams.flatMap((team, teamIndex) => {
                      const threes = countsFor(team, period, isThree);
                      return [
                        <FgCell key={`${team?.clubCode}-fg`} counts={fg[teamIndex]} better={better === teamIndex} teamIndex={teamIndex} />,
                        <td key={`${team?.clubCode}-3`} className="text-center tabular-nums">
                          {threes.attempts === 0 ? formatMissing(null) : `${threes.made}-${threes.attempts}`}
                        </td>,
                      ];
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const PLAY_CONTEXTS = [
  { key: "fastbreak", label: "Fast breaks", test: (shot) => shot.fastbreak },
  { key: "secondChance", label: "Second chances", test: (shot) => shot.secondChance },
  { key: "offTurnover", label: "Off turnovers", test: (shot) => shot.pointsOffTurnover },
];

// How each team scored on fast breaks, second chances and after the opponent's turnovers: the baskets and the points they
// were worth, over the shots the other filters leave. The feed marks only made baskets with their context, so a miss is
// never in one and an FG% here would always be 100%.
export function PlayContextComparison({ shots, localTeam, roadTeam }) {
  const teams = [localTeam, roadTeam];
  return (
    <Panel className="p-3 sm:p-4">
      <PanelHeader kicker="PLAY CONTEXT" title="Fast breaks, second chances and turnovers" compact />
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <TeamHeaderRow teams={teams} columns={{ first: "Context", each: ["Baskets", "Pts"] }} />
          </thead>
          <tbody>
            {PLAY_CONTEXTS.map((context) => {
              const counts = teams.map((team) => shotCounts(shots.filter((shot) => shot.clubCode === team?.clubCode && context.test(shot) && isMade(shot))));
              const morePoints = counts[0].points === counts[1].points ? -1 : counts[0].points > counts[1].points ? 0 : 1;
              return (
                <tr key={context.key}>
                  <td>{context.label}</td>
                  {teams.flatMap((team, teamIndex) => [
                    <td key={`${team?.clubCode}-made`} className="text-center tabular-nums">
                      {formatCount(counts[teamIndex].made)}
                    </td>,
                    <td key={`${team?.clubCode}-pts`} className="text-center tabular-nums">
                      <span className={morePoints === teamIndex ? `inline-block rounded px-1 font-bold ${TEAM_SHADES[teamIndex]}` : undefined}>
                        {formatCount(counts[teamIndex].points)}
                        {morePoints === teamIndex ? <span className="sr-only"> (more)</span> : null}
                      </span>
                    </td>,
                  ])}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted mt-2 text-xs">Made field goals only: free throws aren't counted. The more points in each context are shaded in the team's colour.</p>
    </Panel>
  );
}

// The zone a player made the most shots from; a tie goes to the better FG% there, then to the zone list's order.
function mostMadeZone(shots) {
  const byZone = new Map();
  for (const shot of shots) {
    const zone = shotZone(shot);
    if (!zone) continue;
    const entry = byZone.get(zone) ?? { zone, made: 0, attempts: 0 };
    entry.attempts += 1;
    if (isMade(shot)) entry.made += 1;
    byZone.set(zone, entry);
  }
  const best = [...byZone.values()].filter((entry) => entry.made > 0).sort((a, b) => b.made - a.made || b.made / b.attempts - a.made / a.attempts)[0];
  return best ? `${best.zone} (${best.made}-${best.attempts})` : formatMissing(null);
}

function TeamPlayers({ team, shots, activePlayer, onSelectPlayer }) {
  const players = [...new Map(shots.map((shot) => [shot.personCode, shot.playerName])).entries()]
    .filter(([code]) => code)
    .map(([code, name]) => {
      const own = shots.filter((shot) => shot.personCode === code);
      const all = shotCounts(own);
      const threes = shotCounts(own.filter(isThree));
      const efg = all.attempts > 0 ? ((all.made + 0.5 * threes.made) / all.attempts) * 100 : null;
      return { code, name, own, all, threes, efg };
    })
    .sort((a, b) => b.all.attempts - a.all.attempts || b.all.made - a.all.made || (a.name ?? "").localeCompare(b.name ?? ""));

  return (
    <Panel className="p-3 sm:p-4">
      <div className="mb-2 font-semibold">
        <TeamHeading team={team} />
      </div>
      {players.length === 0 ? (
        <p className="muted text-sm">No shots match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th>Player</th>
                <th className="text-center">FG</th>
                <th className="text-center">FG%</th>
                <th className="text-center">3PT</th>
                <th className="text-center">eFG%</th>
                <th className="max-md:hidden">Most made from</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const active = player.code === activePlayer;
                return (
                  <tr key={player.code} className={active ? "bg-primary/10" : undefined}>
                    <td>
                      <button
                        type="button"
                        aria-pressed={active}
                        className={`link text-left link-hover ${active ? "font-bold text-primary" : ""}`}
                        onClick={() => onSelectPlayer(active ? "all" : player.code)}
                      >
                        {player.name}
                      </button>
                    </td>
                    <td className="text-center tabular-nums">
                      {player.all.made}-{player.all.attempts}
                    </td>
                    <td className="text-center tabular-nums">{formatPercentage(fgPct(player.all))}</td>
                    <td className="text-center tabular-nums">{player.threes.attempts === 0 ? formatMissing(null) : `${player.threes.made}-${player.threes.attempts}`}</td>
                    <td className="text-center tabular-nums">{formatPercentage(player.efg)}</td>
                    <td className="text-xs max-md:hidden">{mostMadeZone(player.own)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// Every player who took a shot, by team, most attempts first. A name picks that player in their team's player filter
// (again: the whole team); `activePlayers` and `onSelectPlayer(teamIndex, code)` are per team, home first.
export function PlayerShooting({ shots, localTeam, roadTeam, activePlayers, onSelectPlayer }) {
  return (
    <section>
      <PanelHeader kicker="PLAYERS" title="Each player's shooting" compact />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {[localTeam, roadTeam].map((team, index) => (
          <TeamPlayers
            key={team?.clubCode ?? index}
            team={team}
            shots={shots.filter((shot) => shot.clubCode === team?.clubCode)}
            activePlayer={activePlayers[index]}
            onSelectPlayer={(code) => onSelectPlayer(index, code)}
          />
        ))}
      </div>
      <p className="muted mt-2 text-xs">Choose a player to show only their shots on their team's court above; choose them again for the whole team.</p>
    </section>
  );
}
