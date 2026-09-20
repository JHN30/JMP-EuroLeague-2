import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getPhases, getSeasonStandings } from "../lib/api";
import StandingsKpiStrip from "./StandingsKpiStrip";
import StandingsTable from "./StandingsTable";

function CenteredSpinner() {
  return (
    <div className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-md">
      <span>{message}</span>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

const VIEW_TABS = [
  { key: "overall", label: "Overall" },
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last10", label: "Last 10" },
];

const TREND_ROUNDS_BACK = 5;

export default function StandingsPage() {
  const { seasonCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [view, setView] = useState("overall");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });

  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

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

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Standings</h1>
      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
        {phases.map((phase) => (
          <button
            key={phase.code}
            role="tab"
            type="button"
            className={`tab font-semibold ${phaseCode === phase.code ? "tab-active" : ""}`}
            onClick={() => setSelectedPhase(phase.code)}
          >
            {phase.name ?? phase.code}
          </button>
        ))}
      </div>

      {standingsQuery.isLoading ? (
        <CenteredSpinner />
      ) : standingsQuery.isError ? (
        <ErrorAlert message="Could not load standings." onRetry={() => standingsQuery.refetch()} />
      ) : standings.length === 0 ? (
        <p className="muted">Standings not available yet for this phase.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <StandingsKpiStrip
            seasonCode={seasonCode}
            phaseCode={phaseCode}
            round={round}
            standings={standings}
          />

          <div role="tablist" className="tabs tabs-boxed tabs-sm w-fit">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                type="button"
                className={`tab font-semibold ${view === tab.key ? "tab-active" : ""}`}
                onClick={() => setView(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <StandingsTable
            standings={standings}
            seasonCode={seasonCode}
            view={view}
            showTiers={phaseCode === "RS"}
            trendByClub={trendByClub}
          />
        </div>
      )}
    </div>
  );
}
