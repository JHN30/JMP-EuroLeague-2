import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getPhases, getSeasonStandings } from "../lib/api";
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

export default function StandingsPage() {
  const { seasonCode } = useParams();
  const [selectedPhase, setSelectedPhase] = useState(null);

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

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Standings</h1>
      <div role="tablist" className="tabs tabs-boxed mb-6 w-fit">
        {phases.map((phase) => (
          <button
            key={phase.code}
            role="tab"
            type="button"
            className={`tab ${phaseCode === phase.code ? "tab-active" : ""}`}
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
      ) : standingsQuery.data.standings.length === 0 ? (
        <p className="muted">Standings not available yet for this phase.</p>
      ) : (
        <StandingsTable standings={standingsQuery.data.standings} seasonCode={seasonCode} />
      )}
    </div>
  );
}
