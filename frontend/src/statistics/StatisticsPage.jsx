import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getLeaderStats, getPhases, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import EmptyText from "../lib/EmptyText";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
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

const PAGE_SIZE = 20;

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

  if (standingsQuery.isPending) return <AsyncState status="loading" />;
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
  const [category, setCategory] = useState(PLAYER_METRIC_GROUPS[0].group);
  const [mode, setMode] = useState("perGame");
  const [metric, setMetric] = useState(PLAYER_METRIC_GROUPS[0].options[0][0]);
  const [direction, setDirection] = useState("desc");
  const [offset, setOffset] = useState(0);

  function handleCategoryChange(nextGroup) {
    setCategory(nextGroup);
    const groupDef = PLAYER_METRIC_GROUPS.find((g) => g.group === nextGroup);
    setMetric(groupDef.options[0][0]);
    setOffset(0);
  }

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

  const players = useMemo(() => statsQuery.data?.players ?? [], [statsQuery.data]);
  const group = metricGroupFor(metric);
  const metricLabel = metricLabelFor(metric);
  const barScale = useMemo(
    () => barWidthScale(players.map((player) => playerMetricValue(player, group, metric))),
    [players, group, metric],
  );
  const currentCategory = PLAYER_METRIC_GROUPS.find((g) => g.group === category) ?? PLAYER_METRIC_GROUPS[0];

  if (statsQuery.isPending) return <AsyncState status="loading" />;
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
      </TabPanel>
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

  if (phasesQuery.isLoading) return <AsyncState status="loading" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Statistics leaderboards</h1>

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
            onChange={(event) => setSelectedPhase(event.target.value)}
          >
            {phases.map((phase) => (
              <option key={phase.code} value={phase.code}>
                {phase.name ?? phase.code}
              </option>
            ))}
        </LabelledSelect>
      </div>

      {view === "teams" ? (
        <TeamLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      ) : (
        <PlayerLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      )}
    </div>
  );
}
