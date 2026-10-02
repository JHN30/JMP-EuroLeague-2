import { useMemo, useState } from "react";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatMinutes, formatSignedDecimal, formatSignedDiff } from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PlayerLink from "./PlayerLink";
import TeamLabel from "./TeamLabel";

// A unit's minutes in one game are few, so the filter is in minutes together, not the season possession thresholds.
const MINIMUM_MINUTES = [
  { value: 0, label: "All stints" },
  { value: 2, label: "2+ minutes" },
  { value: 4, label: "4+ minutes" },
];
const DEFAULT_MINIMUM = 2;

function TeamUnits({ team, units, minimum, playersByKey, seasonCode }) {
  return (
    <Panel className="p-4">
      <div className="mb-3">
        <TeamLabel team={team} />
      </div>
      {units.length === 0 ? (
        <p className="muted text-sm">
          {minimum === 0 ? "No five-man units are available for this team." : `No five-man unit played ${minimum}+ minutes together.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Unit</th>
                <th className="text-right">Min</th>
                <th className="text-right">Poss</th>
                <th className="text-right">PF</th>
                <th className="text-right">PA</th>
                <th className="text-right">+/-</th>
                <th className="text-right">Net rtg</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.players.join(",")}>
                  <td>
                    <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                      {unit.players.map((personKey) => (
                        <li key={personKey}>
                          <PlayerLink seasonCode={seasonCode} player={playersByKey.get(personKey) ?? { personKey }} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="text-right tabular-nums">{formatMinutes(unit.seconds)}</td>
                  <td className="text-right tabular-nums">{unit.possessionsFor}</td>
                  <td className="text-right tabular-nums">{unit.pointsFor}</td>
                  <td className="text-right tabular-nums">{unit.pointsAgainst}</td>
                  <td className="text-right tabular-nums">{formatSignedDiff(unit.plusMinus)}</td>
                  <td className="text-right tabular-nums">{formatSignedDecimal(unit.netRating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// The five-man units each team used, from the pipeline's lineup stints. Names come from the box score, and a failed box
// score only leaves the person keys in their place.
export default function LineupsSection({ game, seasonCode, boxScoreQuery, lineupsQuery }) {
  const [minimum, setMinimum] = useState(DEFAULT_MINIMUM);
  const units = lineupsQuery.data?.units;
  const playerStats = boxScoreQuery.data?.playerStats;

  const playersByKey = useMemo(() => new Map((playerStats ?? []).map((player) => [player.personKey, player])), [playerStats]);
  const bySide = useMemo(() => {
    const visible = (units ?? [])
      .filter((unit) => unit.seconds >= minimum * 60)
      .sort(
        (left, right) =>
          right.seconds - left.seconds || right.plusMinus - left.plusMinus || left.players.join(",").localeCompare(right.players.join(",")),
      );
    return { local: visible.filter((unit) => unit.side === "local"), road: visible.filter((unit) => unit.side === "road") };
  }, [units, minimum]);

  if (lineupsQuery.isError) {
    return <AsyncState status="error" message="Could not load lineups." onRetry={() => lineupsQuery.refetch()} />;
  }
  if (lineupsQuery.isLoading || boxScoreQuery.isLoading) return <AsyncState status="loading" label="Loading lineups" compact />;
  if (!units || units.length === 0) return <EmptyText>Lineups aren't available for this game yet.</EmptyText>;

  return (
    <div className="flex flex-col gap-4">
      <LabelledSelect
        label="Minimum minutes"
        className="w-40"
        labelClassName="self-start"
        value={minimum}
        onChange={(event) => setMinimum(Number(event.target.value))}
      >
        {MINIMUM_MINUTES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </LabelledSelect>
      <TeamUnits team={game.localTeam} units={bySide.local} minimum={minimum} playersByKey={playersByKey} seasonCode={seasonCode} />
      <TeamUnits team={game.roadTeam} units={bySide.road} minimum={minimum} playersByKey={playersByKey} seasonCode={seasonCode} />
      <p className="muted text-xs">
        Poss is the unit's possessions on offense; PF and PA are points for and against while it was on the court. Net rtg is points per 100
        possessions, for minus against. Small samples swing a lot: a few minutes together is noise, not a trend.
      </p>
    </div>
  );
}
