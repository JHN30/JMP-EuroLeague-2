import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdvancedStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatRound, formatSignedDecimal } from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { ClubCell } from "./standingsCells";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };

function lastTenRecord(entry) {
  return entry.last10Games > 0 ? `${entry.last10Wins}-${entry.last10Games - entry.last10Wins}` : "—";
}

export default function AdvancedStandingsView({ seasonCode }) {
  const [scope, setScope] = useState(null);
  const [round, setRound] = useState(null);

  const query = useQuery({
    queryKey: ["advanced-standings", seasonCode, scope, round],
    queryFn: () => getAdvancedStandings(seasonCode, { scope: scope ?? undefined, round: round ?? undefined }),
    placeholderData: keepPreviousData,
  });

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced standings" />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced standings." onRetry={() => query.refetch()} />;
  }

  const { scopes, rounds, standings } = query.data;
  const activeScope = query.data.scope;
  if (standings.length === 0) return <EmptyText>Advanced standings not available yet for this season.</EmptyText>;

  function changeScope(next) {
    setScope(next);
    setRound(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <TabStrip
          ariaLabel="Advanced standings scope"
          panelId="advanced-standings-panel"
          activeKey={activeScope}
          onChange={changeScope}
          className="w-fit"
          tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
        />
        <LabelledSelect
          label="Round"
          labelClassName="text-xs text-base-content/70"
          value={query.data.round}
          onChange={(event) => setRound(Number(event.target.value))}
        >
          {rounds.map((roundNumber) => (
            <option key={roundNumber} value={roundNumber}>
              {formatRound(roundNumber)}
              {roundNumber === rounds[rounds.length - 1] ? " (latest)" : ""}
            </option>
          ))}
        </LabelledSelect>
      </div>

      <TabPanel id="advanced-standings-panel" focusKey={activeScope}>
        <Panel className="p-2">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>GP</th>
                  <th>W</th>
                  <th>L</th>
                  <th title="Net rating: points scored minus allowed per 100 possessions">Net</th>
                  <th title="Possessions per 40 minutes">Pace</th>
                  <th title="Effective field goal percentage">eFG%</th>
                  <th title="Simple rating system: average margin adjusted for schedule strength">SRS</th>
                  <th>L10</th>
                  <th title="Net rating over the last 10 games">L10 Net</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((entry, index) => (
                  <tr key={entry.clubCode}>
                    <td>
                      <span className="rank">{index + 1}</span>
                    </td>
                    <td>
                      <ClubCell entry={entry} seasonCode={seasonCode} />
                    </td>
                    <td>{entry.gamesPlayed}</td>
                    <td>{entry.wins}</td>
                    <td>{entry.losses}</td>
                    <td className="font-semibold">{formatSignedDecimal(entry.netRating)}</td>
                    <td>{formatDecimal(entry.pace)}</td>
                    <td>{formatFractionPercent(entry.efgPct)}</td>
                    <td>
                      {formatSignedDecimal(entry.srs)}
                      {entry.connected ? null : (
                        <span className="tooltip ml-1" data-tip="Schedule not connected to the rest of the league, so SRS is not calculated">
                          <span className="badge badge-xs badge-warning">*</span>
                        </span>
                      )}
                    </td>
                    <td>{lastTenRecord(entry)}</td>
                    <td>{formatSignedDecimal(entry.last10NetRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-1 py-2 text-xs text-base-content/70">
            Ordered by net rating. Values are cumulative through the selected round. Ratings are per 100 possessions.
          </p>
        </Panel>
      </TabPanel>
    </div>
  );
}
