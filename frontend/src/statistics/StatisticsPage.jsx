import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { getLeaderStats, getPhases, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import EmptyText from "../lib/EmptyText";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import {
  PLAYER_METRIC_GROUPS,
  TEAM_METRICS,
  formatStatValue,
  metricGroupFor,
  metricLabelFor,
} from "../lib/statsFields";
import LeaderboardKpiStrip from "./LeaderboardKpiStrip";
import StatBarCell from "./StatBarCell";
import { barWidthScale } from "./statBarScale";

const PAGE_SIZE = 25;

function DirectionSelect({ direction, label, onChange }) {
  return (
    <LabelledSelect label={label} value={direction} onChange={(event) => onChange(event.target.value)}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
    </LabelledSelect>
  );
}

function teamMetricValue(entry, metric) {
  const raw = entry.basic?.[metric];
  if (raw === null || raw === undefined) return null;
  const num = metric === "winPercentage" ? Number(raw) : raw;
  return typeof num === "number" && !Number.isNaN(num) ? num : null;
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
    return [...standings].sort((a, b) => {
      const av = teamMetricValue(a, metric);
      const bv = teamMetricValue(b, metric);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return direction === "desc" ? bv - av : av - bv;
    });
  }, [standingsQuery.data, metric, direction]);

  const metricLabel = TEAM_METRICS.find((option) => option.key === metric)?.label ?? metric;
  const barScale = useMemo(
    () => barWidthScale(sorted.map((entry) => teamMetricValue(entry, metric))),
    [sorted, metric],
  );

  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading the team leaderboard" />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load the team leaderboard." onRetry={() => standingsQuery.refetch()} />;
  }
  if (sorted.length === 0) {
    return <EmptyText>No standings available yet for this phase.</EmptyText>;
  }

  return (
    <div>
      <LeaderboardKpiStrip
        entries={sorted}
        offset={0}
        valueOf={(entry) => teamMetricValue(entry, metric)}
        nameOf={(entry) => entry.clubName ?? entry.clubCode}
        metricLabel={metricLabel}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <CompactFilterSelect
          label="Team metric"
          value={metric}
          onChange={(event) => setMetric(event.target.value)}
        >
          {TEAM_METRICS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </CompactFilterSelect>
        <DirectionSelect direction={direction} label="Team sort direction" onChange={setDirection} />
      </div>

      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => (
              <tr key={entry.clubCode}>
                <td>
                  <span className={`rank ${index === 0 ? "rank-1" : ""}`}>{index + 1}</span>
                </td>
                <td>
                  <Link
                    to={`/${seasonCode}/teams/${entry.clubCode}`}
                    className="link link-hover block max-w-40 truncate font-medium sm:max-w-56"
                    title={entry.clubName ?? entry.clubCode}
                  >
                    {entry.clubName ?? entry.clubCode}
                  </Link>
                </td>
                <StatBarCell widthPct={barScale(teamMetricValue(entry, metric))}>
                  <span className="text-primary font-semibold tabular-nums">
                    {entry.basic?.[metric] ?? "-"}
                  </span>
                </StatBarCell>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function playerMetricValue(player, group, metric) {
  const raw = player[group]?.[metric];
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function PlayerLeaderboard({ seasonCode, phaseCode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") ?? "perGame";
  const metric = searchParams.get("metric") ?? PLAYER_METRIC_GROUPS[0].options[0][0];
  const direction = searchParams.get("direction") ?? "desc";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;
  const category = metricGroupFor(metric) ?? PLAYER_METRIC_GROUPS[0].group;

  // The player leaderboard mirrors its view-level filters into the URL so a
  // leaderboard link is shareable, per the guideline's Leaders exception.
  function updateParams(patch) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    });
  }

  function handleCategoryChange(nextGroup) {
    const groupDef = PLAYER_METRIC_GROUPS.find((g) => g.group === nextGroup);
    updateParams({ metric: groupDef.options[0][0], offset: undefined });
  }

  function handleModeChange(value) {
    updateParams({ mode: value, offset: undefined });
  }

  function handleMetricChange(value) {
    updateParams({ metric: value, offset: undefined });
  }

  function handleDirectionChange(value) {
    updateParams({ direction: value, offset: undefined });
  }

  function handleOffsetChange(nextOffset) {
    updateParams({ offset: nextOffset || undefined });
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

  const players = useMemo(() => statsQuery.data?.players ?? [], [statsQuery.data]);
  const group = metricGroupFor(metric);
  const metricLabel = metricLabelFor(metric);
  const barScale = useMemo(
    () => barWidthScale(players.map((player) => playerMetricValue(player, group, metric))),
    [players, group, metric],
  );
  const currentCategory = PLAYER_METRIC_GROUPS.find((g) => g.group === category) ?? PLAYER_METRIC_GROUPS[0];

  if (statsQuery.isPending) return <AsyncState status="loading" label="Loading the player leaderboard" />;
  if (statsQuery.isError) {
    return <AsyncState status="error" message="Could not load the player leaderboard." onRetry={() => statsQuery.refetch()} />;
  }

  return (
    <div>
      <TabStrip
        ariaLabel="Metric category"
        panelId="player-leaderboard-panel"
        activeKey={category}
        onChange={handleCategoryChange}
        className="mb-4 w-fit"
        tabs={PLAYER_METRIC_GROUPS.map((groupDef) => ({ key: groupDef.group, label: groupDef.label }))}
      />

      <TabPanel id="player-leaderboard-panel" focusKey={category}>
      <LeaderboardKpiStrip
        entries={players}
        offset={offset}
        valueOf={(player) => playerMetricValue(player, group, metric)}
        nameOf={(player) => player.playerName ?? player.personKey}
        subtitleOf={(player) => player.clubName ?? player.clubCode}
        metricLabel={metricLabel}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <LabelledSelect
          label="Player statistics"
          ariaLabel="Player statistics mode"
            value={mode}
            onChange={(event) => handleModeChange(event.target.value)}
          >
            <option value="accumulated">Accumulated</option>
            <option value="perGame">Per game</option>
        </LabelledSelect>

        <CompactFilterSelect
          label="Player metric"
          value={metric}
          onChange={(event) => handleMetricChange(event.target.value)}
        >
          {currentCategory.options.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </CompactFilterSelect>

        <DirectionSelect direction={direction} label="Player sort direction" onChange={handleDirectionChange} />
      </div>

      {players.length === 0 ? (
        <EmptyText>No season statistics available yet for this phase.</EmptyText>
      ) : (
        <>
          <p className="muted mb-2 text-sm">
            Showing {offset + 1}-{offset + players.length} of {statsQuery.data?.pagination.total} players
          </p>
          <Panel className="overflow-x-auto overscroll-x-contain p-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>{metricLabel}</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.personKey}>
                    <td>
                      <span className={`rank ${offset === 0 && index === 0 ? "rank-1" : ""}`}>
                        {offset + index + 1}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/${seasonCode}/players/${player.personKey}`}
                        className="link link-hover flex min-w-0 items-center gap-2 font-medium"
                      >
                        {player.playerImageUrl ? (
                          <img
                            src={player.playerImageUrl}
                            alt=""
                            className="h-8 w-8 flex-none rounded-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <span className="max-w-40 truncate sm:max-w-56" title={player.playerName ?? player.personKey}>
                          {player.playerName ?? player.personKey}
                        </span>
                      </Link>
                    </td>
                    <StatBarCell widthPct={barScale(playerMetricValue(player, group, metric))}>
                      <span className="text-primary font-semibold tabular-nums">
                        {formatStatValue(metric, player[group]?.[metric])}
                      </span>
                    </StatBarCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={offset === 0}
              onClick={() => handleOffsetChange(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous page
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!statsQuery.data?.pagination.hasMore}
              onClick={() => handleOffsetChange(offset + PAGE_SIZE)}
            >
              Next page
            </button>
          </div>
        </>
      )}
      </TabPanel>
    </div>
  );
}

export default function StatisticsPage() {
  useDocumentTitle("Statistics leaderboards");
  const { seasonCode } = useParams();
  const [view, setView] = useState("teams");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode] = usePhaseParam(phases);
  const [, setSearchParams] = useSearchParams();

  // Changing the archive-level phase resets the player leaderboard's
  // view-level filters (its own local state resets via `key={phaseCode}`).
  function handlePhaseChange(code) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set("phase", code);
      next.delete("mode");
      next.delete("metric");
      next.delete("direction");
      next.delete("offset");
      return next;
    });
  }

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <PageHeader kicker="LEADERBOARDS" title="Statistics leaderboards" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="scope-toggle" role="group" aria-label="Leaderboard scope">
          <button
            type="button"
            className={view === "players" ? "active" : ""}
            aria-pressed={view === "players"}
            onClick={() => setView("players")}
          >
            Players
          </button>
          <button
            type="button"
            className={view === "teams" ? "active" : ""}
            aria-pressed={view === "teams"}
            onClick={() => setView("teams")}
          >
            Teams
          </button>
        </div>

        <LabelledSelect
          label="Phase"
          ariaLabel="Statistics phase"
            value={phaseCode ?? ""}
            onChange={(event) => handlePhaseChange(event.target.value)}
          >
            {phases.map((phase) => (
              <option key={phase.code} value={phase.code}>
                {phase.name ?? phase.code}
              </option>
            ))}
        </LabelledSelect>
      </div>

      {view === "teams" ? (
        <TeamLeaderboard key={phaseCode} seasonCode={seasonCode} phaseCode={phaseCode} />
      ) : (
        <PlayerLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      )}
    </div>
  );
}
