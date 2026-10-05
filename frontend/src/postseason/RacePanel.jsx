import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";

const CHIPS = {
  top6: { label: "In the Playoffs", tone: "badge-success" },
  playin: { label: "Play-In or better", tone: "badge-info" },
  "playin-race": { label: "Play-In race", tone: "badge-warning" },
  alive: { label: "In the race", tone: "badge-ghost" },
  out: { label: "Out", tone: "badge-error" },
};

// The table around the lines while the regular season is on: the top six go straight to the Playoffs, seven to ten play the
// Play-In. Every club that can still get a place is listed, so early in the season that is all of them; a club drops off once it
// is out, and the clubs that are out are named underneath. A club is only called in or out when no tiebreaker could change it.
export default function RacePanel({ standings, teams, race }) {
  const info = new Map(teams.map((team) => [team.clubCode, team]));
  const stillIn = standings.filter((entry) => race.get(entry.clubCode)?.status !== "out");
  const out = standings.filter((entry) => race.get(entry.clubCode)?.status === "out");
  const nameOf = (entry) => info.get(entry.clubCode)?.abbreviatedName ?? entry.clubName;
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">THE RACE</p>
      <h3 className="text-lg font-bold">Race for the bracket</h3>
      <p className="muted mb-3 mt-1 text-sm">
        Top six: straight to the Playoffs. Seventh to tenth: the Play-In. Every club that can still get a place is listed ({stillIn.length} of {standings.length}). A club is called in or
        out only when no tiebreaker could change it.
      </p>
      <div className="max-w-3xl overflow-x-auto overscroll-x-contain">
        <table className="table table-sm w-full">
          <thead>
            <tr className="muted text-xs uppercase">
              <th className="w-10 text-right">#</th>
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
              // The line under the last club in the top six, and under the last in the top ten.
              const lineAfter = (position <= 6 && next > 6) || (position <= 10 && next > 10);
              return (
                <tr key={entry.clubCode} className={lineAfter ? "[&>td]:border-b-2 [&>td]:border-b-primary/50" : ""}>
                  <td className="muted text-right tabular-nums">{position}</td>
                  <td>
                    <span className="flex min-w-0 items-center gap-2">
                      {(team?.crestUrl ?? entry.crestUrl) ? <RevealImage src={team?.crestUrl ?? entry.crestUrl} className="h-6 w-6 flex-none object-contain" /> : <span className="h-6 w-6 flex-none" />}
                      <span className="truncate font-semibold">{nameOf(entry)}</span>
                    </span>
                  </td>
                  <td className="text-right tabular-nums">
                    {entry.basic.gamesWon}-{entry.basic.gamesLost}
                  </td>
                  <td className="muted hidden text-right tabular-nums sm:table-cell">{state?.remaining ?? ""}</td>
                  <td className="text-right">
                    <span className={"badge badge-sm whitespace-nowrap " + chip.tone}>{chip.label}</span>
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
