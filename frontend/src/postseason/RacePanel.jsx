import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { ordinal } from "../teams/teamLeague";
import { raceMargin } from "./bracketModel";

// `short` is the label below sm, where the table has little room. A club still only "in the race" gets no badge.
const CHIPS = {
  playoffs: { label: "In the Playoffs", short: "Playoffs", tone: "badge-success" },
  playin: { label: "Play-In or better", short: "Play-In", tone: "badge-info" },
  "playin-race": { label: "Play-In race", short: "Race", tone: "badge-warning" },
};

const games = (count) => count + (count === 1 ? " game" : " games");

// The reference club's own games in hand are told once for the zone, not on every row.
function Margin({ wins, inHand }) {
  return (
    <>
      {wins === 0 ? (
        "Level"
      ) : (
        <>
          {(wins > 0 ? "+" : "-") + Math.abs(wins)} <span aria-hidden="true">W</span>
          <span className="sr-only">{Math.abs(wins) === 1 ? " win" : " wins"}</span>
        </>
      )}
      {inHand > 0 ? <span className="muted block text-xs font-normal whitespace-normal">{games(inHand) + " in hand"}</span> : null}
    </>
  );
}

// Each zone's clubs are measured against the club on the other side of its line: the first club below it, or for the
// chasers the last club above it.
function raceZones(stillIn, directSeeds, playInLast) {
  const zones = [
    { title: "Playoffs", from: 1, to: directSeeds, reference: directSeeds + 1 },
    ...(playInLast > directSeeds ? [{ title: "Play-In", from: directSeeds + 1, to: playInLast, reference: playInLast + 1 }] : []),
    { title: "Chasing", from: playInLast + 1, to: Infinity, reference: playInLast },
  ];
  return zones
    .map((zone) => ({ ...zone, clubs: stillIn.filter((entry) => entry.basic.position >= zone.from && entry.basic.position <= zone.to) }))
    .filter((zone) => zone.clubs.length > 0);
}

function ZoneTable({ zone, standings, race, info, nameOf }) {
  const reference = standings.find((entry) => entry.basic.position === zone.reference);
  const margins = reference ? zone.clubs.map((entry) => raceMargin(entry, reference)) : [];
  const first = zone.clubs[0].basic.position;
  const last = zone.clubs.at(-1).basic.position;
  return (
    <section className="min-w-0">
      <h4 className="flex items-baseline gap-2 font-bold">
        {zone.title}{" "}
        <span className="muted text-xs font-semibold tabular-nums">{first === last ? first : first + "-" + last}</span>
      </h4>
      <table className="table table-xs mt-1 w-full max-sm:[&_td]:px-1.5 max-sm:[&_th]:px-1.5">
        <thead>
          <tr className="muted text-xs uppercase">
            <th className="w-6 text-right sm:w-8">#</th>
            <th>Club</th>
            <th className="text-right">W-L</th>
            {reference ? (
              <th
                className="whitespace-nowrap text-right normal-case"
                title={"Wins against " + nameOf(reference) + ", " + ordinal(zone.reference) + " (" + reference.basic.gamesWon + "-" + reference.basic.gamesLost + ")"}
              >
                vs {ordinal(zone.reference)}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {zone.clubs.map((entry, index) => {
            const chip = CHIPS[race.get(entry.clubCode)?.status];
            const team = info.get(entry.clubCode);
            const crestUrl = team?.crestUrl ?? entry.crestUrl;
            return (
              <tr key={entry.clubCode}>
                <td className="muted text-right tabular-nums">{entry.basic.position}</td>
                <td>
                  <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    {crestUrl ? <RevealImage src={crestUrl} className="h-5 w-5 flex-none object-contain" /> : <span className="h-5 w-5 flex-none" />}
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="min-w-0 font-semibold max-sm:wrap-break-word sm:truncate">{team?.abbreviatedName ?? entry.clubName}</span>
                      {chip ? (
                        <span className={"badge badge-sm whitespace-nowrap " + chip.tone}>
                          <span className="sm:hidden" aria-hidden="true">
                            {chip.short}
                          </span>
                          <span className="max-sm:sr-only">{chip.label}</span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="text-right tabular-nums">
                  {entry.basic.gamesWon}-{entry.basic.gamesLost}
                </td>
                {reference ? (
                  <td className="whitespace-nowrap text-right tabular-nums">
                    <Margin {...margins[index]} />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// Clinch/out claims stay conservative: tied wins can still change the qualifying clubs.
export default function RacePanel({ standings, teams, race, directSeeds, playInLast }) {
  const info = new Map(teams.map((team) => [team.clubCode, team]));
  const stillIn = standings.filter((entry) => race.get(entry.clubCode)?.status !== "out");
  const out = standings.filter((entry) => race.get(entry.clubCode)?.status === "out");
  const nameOf = (entry) => info.get(entry.clubCode)?.abbreviatedName ?? entry.clubName;
  const zones = raceZones(stillIn, directSeeds, playInLast);
  const anyBadge = stillIn.some((entry) => CHIPS[race.get(entry.clubCode)?.status]);
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">THE RACE</p>
      <h3 className="mb-3 text-lg font-bold">Race for the bracket</h3>
      <div className={"grid gap-6 " + (zones.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {zones.map((zone) => (
          <ZoneTable key={zone.title} zone={zone} standings={standings} race={race} info={info} nameOf={nameOf} />
        ))}
      </div>
      {anyBadge ? null : <p className="muted mt-3 text-sm">{out.length ? "No club has clinched yet." : "No club has clinched or been knocked out yet."}</p>}
      {out.length > 0 ? (
        <p className="muted mt-3 text-sm">
          <span className="font-semibold">Out of the race ({out.length}):</span> {out.map(nameOf).join(", ")}
        </p>
      ) : null}
    </Panel>
  );
}
