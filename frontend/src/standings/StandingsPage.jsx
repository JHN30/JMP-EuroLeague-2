import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getPhases, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import StandingsKpiStrip from "./StandingsKpiStrip";
import StandingsTable from "./StandingsTable";
import RaceView from "./RaceView";

const VIEW_TABS = [
  { key: "overall", label: "Overall" },
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last10", label: "Last 10" },
];

const MODE_TABS = [
  { key: "table", label: "Table" },
  { key: "race", label: "Race" },
];

const BREAKDOWN_TABS = [
  { key: "overview", label: "Overview" },
  { key: "streaks", label: "Streaks and form" },
  { key: "margins", label: "Winning margins" },
  { key: "aheadBehind", label: "Ahead/behind" },
];

const TREND_ROUNDS_BACK = 5;

export default function StandingsPage() {
  useDocumentTitle("Standings");
  const { seasonCode } = useParams();
  const [view, setView] = useState("overall");
  const [mode, setMode] = useState("table");
  const [breakdown, setBreakdown] = useState("overview");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });

  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  const round = standingsQuery.data?.round ?? null;
  const standings = standingsQuery.data?.standings ?? [];

  const historyRounds = [];
  if (round) {
    for (let n = round - 1; n >= Math.max(1, round - TREND_ROUNDS_BACK); n -= 1) {
      historyRounds.push(n);
    }
  }

  const historyQueries = useQueries({
    queries: historyRounds.map((roundNumber) => ({
      queryKey: ["standings", seasonCode, phaseCode, "round", roundNumber],
      queryFn: () => getSeasonStandings(seasonCode, phaseCode, { round: roundNumber }),
      enabled: Boolean(phaseCode) && Boolean(round),
    })),
  });

  const trendByClub = new Map();
  if (standings.length > 0) {
    const roundsAscending = [
      ...historyRounds.map((roundNumber, i) => ({ round: roundNumber, data: historyQueries[i].data })),
      { round, data: { standings } },
    ]
      .filter((entry) => entry.data)
      .sort((a, b) => a.round - b.round);

    for (const entry of standings) {
      const positions = [];
      for (const { data } of roundsAscending) {
        const match = data.standings.find((row) => row.clubCode === entry.clubCode);
        if (match?.basic?.position != null) positions.push(match.basic.position);
      }
      trendByClub.set(entry.clubCode, positions);
    }
  }

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="SEASON" title="Standings" />
      <TabStrip
        ariaLabel="Phase"
        panelId="standings-panel"
        activeKey={phaseCode}
        onChange={setPhaseCode}
        className="mb-4 w-fit"
        tabs={phases.map((phase) => ({ key: phase.code, label: phase.name ?? phase.code }))}
      />

      <TabPanel id="standings-panel" focusKey={`${phaseCode}-${view}`}>
        {standingsQuery.isLoading ? (
          <AsyncState status="loading" label="Loading standings" />
        ) : standingsQuery.isError ? (
          <AsyncState status="error" message="Could not load standings." onRetry={() => standingsQuery.refetch()} />
        ) : standings.length === 0 ? (
          <EmptyText>Standings not available yet for this phase.</EmptyText>
        ) : (
          <div className="flex flex-col gap-4">
            <StandingsKpiStrip
              seasonCode={seasonCode}
              phaseCode={phaseCode}
              round={round}
              standings={standings}
            />

            <TabStrip
              ariaLabel="Standings display"
              panelId="standings-panel"
              activeKey={mode}
              onChange={setMode}
              className="w-fit"
              tabs={MODE_TABS}
            />

            {mode === "race" ? (
              <RaceView seasonCode={seasonCode} phaseCode={phaseCode} latestStandings={standings} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  {breakdown === "overview" ? (
                    <TabStrip
                      ariaLabel="Standings view"
                      panelId="standings-panel"
                      activeKey={view}
                      onChange={setView}
                      className="w-fit"
                      tabs={VIEW_TABS}
                    />
                  ) : null}
                  <label className="flex items-center gap-2 text-xs text-base-content/70">
                    Breakdown
                    <select
                      className="select select-sm select-bordered"
                      value={breakdown}
                      onChange={(event) => setBreakdown(event.target.value)}
                    >
                      {BREAKDOWN_TABS.map((tab) => (
                        <option key={tab.key} value={tab.key}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <StandingsTable
                  standings={standings}
                  seasonCode={seasonCode}
                  view={view}
                  showTiers={phaseCode === "RS"}
                  trendByClub={trendByClub}
                  breakdown={breakdown}
                />
              </>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
}
