import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";

// `short` is the label below sm, where the table has little room.
const CHIPS = {
  playoffs: { label: "In the Playoffs", short: "Playoffs", tone: "badge-success" },
  playin: { label: "Play-In or better", short: "Play-In", tone: "badge-info" },
  "playin-race": { label: "Play-In race", short: "Race", tone: "badge-warning" },
  alive: { label: "In the race", short: "In", tone: "badge-ghost" },
  out: { label: "Out", short: "Out", tone: "badge-error" },
};

// Clinch/out claims stay conservative: tied wins can still change the qualifying clubs.
export default function RacePanel({ standings, teams, race, directSeeds, playInLast }) {
  const info = new Map(teams.map((team) => [team.clubCode, team]));
  const stillIn = standings.filter((entry) => race.get(entry.clubCode)?.status !== "out");
  const out = standings.filter((entry) => race.get(entry.clubCode)?.status === "out");
  const nameOf = (entry) => info.get(entry.clubCode)?.abbreviatedName ?? entry.clubName;
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">THE RACE</p>
      <h3 className="text-lg font-bold">Race for the bracket</h3>
      <p className="muted mb-3 mt-1 text-sm">
        Top {directSeeds}: straight to the Playoffs. {playInLast > directSeeds ? `Ranks ${directSeeds + 1} to ${playInLast}: the Play-In. ` : ""}Every club that can still get a place is listed ({stillIn.length} of {standings.length}). A club is called in or
        out only when no tiebreaker could change it.
      </p>
      <div className="max-w-3xl overflow-x-auto overscroll-x-contain">
        <table className="table table-sm w-full max-sm:[&_td]:px-1.5 max-sm:[&_th]:px-1.5">
          <thead>
            <tr className="muted text-xs uppercase">
              <th className="w-6 text-right sm:w-10">#</th>
              <th>Club</th>
              <th className="text-right">W-L</th>
              <th className="hidden text-right sm:table-cell">Left</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {stillIn.map((entry, index) => {
              const state = race.get(entry.clubCode);
              const chip = CHIPS[state?.status ?? "alive"];
              const team = info.get(entry.clubCode);
              const position = entry.basic.position;
              const next = stillIn[index + 1]?.basic.position ?? Infinity;
              const lineAfter = (position <= directSeeds && next > directSeeds) || (position <= playInLast && next > playInLast);
              return (
                <tr key={entry.clubCode} className={lineAfter ? "[&>td]:border-b-2 [&>td]:border-b-primary/50" : ""}>
                  <td className="muted text-right tabular-nums">{position}</td>
                  <td>
                    <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      {(team?.crestUrl ?? entry.crestUrl) ? <RevealImage src={team?.crestUrl ?? entry.crestUrl} className="h-6 w-6 flex-none object-contain" /> : <span className="h-6 w-6 flex-none" />}
                      <span className="min-w-0 font-semibold max-sm:wrap-break-word sm:truncate">{nameOf(entry)}</span>
                    </span>
                  </td>
                  <td className="text-right tabular-nums">
                    {entry.basic.gamesWon}-{entry.basic.gamesLost}
                  </td>
                  <td className="muted hidden text-right tabular-nums sm:table-cell">{state?.remaining ?? ""}</td>
                  <td className="text-right">
                    <span className={"badge badge-sm whitespace-nowrap " + chip.tone}>
                      <span className="sm:hidden" aria-hidden="true">
                        {chip.short}
                      </span>
                      <span className="max-sm:sr-only">{chip.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {out.length > 0 ? (
        <p className="muted mt-3 text-sm">
          <span className="font-semibold">Out of the race ({out.length}):</span> {out.map(nameOf).join(", ")}
        </p>
      ) : null}
    </Panel>
  );
}
