import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getLeaderStats, getPhases, getSeasonStandings } from "../lib/api";
import { PLAYER_METRIC_GROUPS, TEAM_METRICS, metricGroupFor, metricLabelFor } from "../lib/statsFields";

const PAGE_SIZE = 20;

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

function DirectionToggle({ direction, onChange }) {
  return (
    <div role="tablist" className="tabs tabs-boxed w-fit">
      {[
        ["desc", "Descending"],
        ["asc", "Ascending"],
      ].map(([value, label]) => (
        <button
          key={value}
          role="tab"
          type="button"
          className={`tab ${direction === value ? "tab-active" : ""}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TeamLeaderboard({ seasonCode, phaseCode }) {
  const [metric, setMetric] = useState("pointsFor");
  const [direction, setDirection] = useState("desc");

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });

  const sorted = useMemo(() => {
    const standings = standingsQuery.data?.standings ?? [];
    const value = (entry) => {
      const raw = entry.basic?.[metric];
      if (raw === null || raw === undefined) return null;
      return metric === "winPercentage" ? Number(raw) : raw;
    };
    return [...standings].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return direction === "desc" ? bv - av : av - bv;
    });
  }, [standingsQuery.data, metric, direction]);

  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load the team leaderboard." onRetry={() => standingsQuery.refetch()} />;
  }
  if (sorted.length === 0) {
    return <p className="muted">No standings available yet for this phase.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <select
          aria-label="Team metric"
          className="select select-bordered select-sm"
          value={metric}
          onChange={(event) => setMetric(event.target.value)}
        >
          {TEAM_METRICS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <DirectionToggle direction={direction} onChange={setDirection} />
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>{TEAM_METRICS.find((option) => option.key === metric)?.label}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => (
              <tr key={entry.clubCode}>
                <td>{index + 1}</td>
                <td>
                  <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link link-hover">
                    {entry.clubName ?? entry.clubCode}
                  </Link>
                </td>
                <td>{entry.basic?.[metric] ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerLeaderboard({ seasonCode, phaseCode }) {
  const [mode, setMode] = useState("perGame");
  const [metric, setMetric] = useState("pointsScored");
  const [direction, setDirection] = useState("desc");
  const [offset, setOffset] = useState(0);

  function handleModeChange(value) {
    setMode(value);
    setOffset(0);
  }

  function handleMetricChange(value) {
    setMetric(value);
    setOffset(0);
  }

  function handleDirectionChange(value) {
    setDirection(value);
    setOffset(0);
  }

  const statsQuery = useQuery({
    queryKey: ["player-leaderboard", seasonCode, phaseCode, mode, metric, direction, offset],
    queryFn: () =>
      getLeaderStats(seasonCode, {
        phase: phaseCode,
        mode,
        sort: metric,
        order: direction,
        limit: PAGE_SIZE,
        offset,
      }),
    enabled: Boolean(phaseCode),
  });

  const players = statsQuery.data?.players ?? [];
  const group = metricGroupFor(metric);

  if (statsQuery.isPending) return <CenteredSpinner />;
  if (statsQuery.isError) {
    return <ErrorAlert message="Could not load the player leaderboard." onRetry={() => statsQuery.refetch()} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div role="tablist" className="tabs tabs-boxed w-fit">
          {[
            ["accumulated", "Accumulated"],
            ["perGame", "Per game"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              className={`tab ${mode === value ? "tab-active" : ""}`}
              onClick={() => handleModeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          aria-label="Player metric"
          className="select select-bordered select-sm"
          value={metric}
          onChange={(event) => handleMetricChange(event.target.value)}
        >
          {PLAYER_METRIC_GROUPS.map((metricGroup) => (
            <optgroup key={metricGroup.group} label={metricGroup.label}>
              {metricGroup.options.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <DirectionToggle direction={direction} onChange={handleDirectionChange} />
      </div>

      {players.length === 0 ? (
        <p className="muted">No season statistics available yet for this phase.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>{metricLabelFor(metric)}</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.personKey}>
                    <td>{offset + index + 1}</td>
                    <td>
                      <Link to={`/${seasonCode}/players/${player.personKey}`} className="link link-hover">
                        {player.playerName ?? player.personKey}
                      </Link>
                    </td>
                    <td>{player[group]?.[metric] ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={offset === 0}
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            >
              Previous page
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!statsQuery.data?.pagination.hasMore}
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
            >
              Next page
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StatisticsPage() {
  const { seasonCode } = useParams();
  const [view, setView] = useState("teams");
  const [selectedPhase, setSelectedPhase] = useState(null);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Statistics leaderboards</h1>

      <div role="tablist" className="tabs tabs-boxed mb-4 w-fit">
        {[
          ["teams", "Teams"],
          ["players", "Players"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            className={`tab ${view === value ? "tab-active" : ""}`}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>

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

      {view === "teams" ? (
        <TeamLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      ) : (
        <PlayerLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      )}
    </div>
  );
}
