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
import SearchField from "../lib/SearchField";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel } from "../lib/TabStrip";
import {
  PLAYER_METRIC_GROUPS,
  TEAM_METRICS,
  formatStatValue,
  metricGroupFor,
  metricLabelFor,
} from "../lib/statsFields";
import AdvancedLeaderboard from "./AdvancedLeaderboard";
import LeaderboardKpiStrip from "./LeaderboardKpiStrip";
import StatBarCell from "./StatBarCell";
import { barWidthScale } from "./statBarScale";

const PAGE_SIZE = 25;
const LEADERBOARD_PAGE_LIMIT = 100;
const LEADERBOARD_MAX_PAGES = 5;
const MIN_GAMES_OPTIONS = [0, 5, 10, 15];
const RATE_GROUPS = new Set(["advanced", "scoring"]);

async function fetchFullPlayerLeaderboard(seasonCode, phaseCode, mode, sort, order) {
  const players = [];
  let offset = 0;
  for (let page = 0; page < LEADERBOARD_MAX_PAGES; page += 1) {
    const data = await getLeaderStats(seasonCode, {
      phase: phaseCode,
      mode,
      sort,
      order,
      limit: LEADERBOARD_PAGE_LIMIT,
      offset,
    });
    players.push(...data.players);
    if (!data.pagination.hasMore) break;
    offset += LEADERBOARD_PAGE_LIMIT;
  }
  return players;
}

function statNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function rankPlayers(sortedPlayers, group, metric) {
  let lastValue;
  let lastRank = 0;
  return sortedPlayers.map((player, index) => {
    const value = playerMetricValue(player, group, metric);
    if (index === 0 || value !== lastValue) {
      lastRank = index + 1;
      lastValue = value;
    }
    return { player, rank: lastRank, value };
  });
}

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

const PODIUM_ORDER = ["md:order-2 md:-translate-y-3 border-primary/70", "md:order-1", "md:order-3"];

function PodiumCard({ row, seasonCode, group, metric, metricLabel, className }) {
  const { player, rank } = row;
  return (
    <Link
      to={`/${seasonCode}/players/${player.personKey}`}
      className={`panel relative flex flex-col items-center gap-1 border p-4 text-center hover:bg-base-200 ${className}`}
    >
      <span className="badge badge-primary absolute top-2 left-2">#{rank}</span>
      {player.playerImageUrl ? (
        <img
          src={player.playerImageUrl}
          alt=""
          className="aspect-3/4 h-20 w-auto flex-none object-contain object-bottom"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="aspect-3/4 h-20 flex-none rounded-field bg-base-200" />
      )}
      <span className="font-semibold">{player.playerName ?? player.personKey}</span>
      <span className="muted text-xs">{player.clubName ?? player.clubCode}</span>
      <span className="text-primary text-3xl font-bold tabular-nums">
        {formatStatValue(metric, player[group]?.[metric])}
      </span>
      <span className="muted text-xs">{metricLabel}</span>
      <span className="muted text-xs">{player.traditional?.gamesPlayed ?? "-"} games</span>
    </Link>
  );
}

function Podium({ ranked, seasonCode, group, metric, metricLabel }) {
  const top3 = ranked.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      {top3.map((row, index) => (
        <PodiumCard
          key={row.player.personKey}
          row={row}
          seasonCode={seasonCode}
          group={group}
          metric={metric}
          metricLabel={metricLabel}
          className={PODIUM_ORDER[index]}
        />
      ))}
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
  const minGames = Number(searchParams.get("minGames") ?? "0") || 0;
  const search = searchParams.get("search") ?? "";
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

  function handleMinGamesChange(value) {
    updateParams({ minGames: Number(value) || undefined, offset: undefined });
  }

  function handleSearchChange(value) {
    updateParams({ search: value || undefined, offset: undefined });
  }

  const statsQuery = useQuery({
    queryKey: ["player-leaderboard-full", seasonCode, phaseCode, mode, metric, direction],
    queryFn: () => fetchFullPlayerLeaderboard(seasonCode, phaseCode, mode, metric, direction),
    enabled: Boolean(phaseCode),
  });

  const group = metricGroupFor(metric);
  const metricLabel = metricLabelFor(metric);
  const allPlayers = statsQuery.data ?? [];
  const withGames =
    minGames > 0
      ? allPlayers.filter((player) => (statNumber(player.traditional?.gamesPlayed) ?? 0) >= minGames)
      : allPlayers;
  const ranked = rankPlayers(withGames, group, metric);
  const visible = search
    ? ranked.filter((row) => (row.player.playerName ?? "").toLowerCase().includes(search.toLowerCase()))
    : ranked;

  const players = visible.slice(offset, offset + PAGE_SIZE);
  const barScale = barWidthScale(players.map((row) => row.value));

  if (statsQuery.isPending) return <AsyncState status="loading" label="Loading the player leaderboard" />;
  if (statsQuery.isError) {
    return <AsyncState status="error" message="Could not load the player leaderboard." onRetry={() => statsQuery.refetch()} />;
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Metric category"
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {PLAYER_METRIC_GROUPS.flatMap((groupDef) => groupDef.options).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            className={`btn btn-sm ${metric === key ? "btn-primary" : "btn-ghost bg-base-100"}`}
            onClick={() => handleMetricChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <TabPanel id="player-leaderboard-panel" focusKey={category}>
      <Podium ranked={ranked} seasonCode={seasonCode} group={group} metric={metric} metricLabel={metricLabel} />

      <LeaderboardKpiStrip
        entries={players.map((row) => row.player)}
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

        <DirectionSelect direction={direction} label="Player sort direction" onChange={handleDirectionChange} />

        <LabelledSelect
          label="Minimum games"
          ariaLabel="Minimum games played"
          value={String(minGames)}
          onChange={(event) => handleMinGamesChange(event.target.value)}
        >
          {MIN_GAMES_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? "No minimum" : `${value}+ games`}
            </option>
          ))}
        </LabelledSelect>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField
          label="Search players by name"
          placeholder="Search players..."
          defaultValue={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
        <span className="muted text-xs">Actual rank is preserved while searching.</span>
      </div>

      {RATE_GROUPS.has(category) ? (
        <div className="alert alert-info alert-soft mb-4 text-sm">
          Rate rankings qualify on games rather than attempts, because attempt-based qualification isn't in the
          source data.
        </div>
      ) : null}

      {players.length === 0 ? (
        <EmptyText>No season statistics available yet for this phase.</EmptyText>
      ) : (
        <>
          <p className="muted mb-2 text-sm">
            Showing {offset + 1}-{offset + players.length} of {visible.length} players
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
                {players.map((row) => (
                  <tr key={row.player.personKey}>
                    <td>
                      <span className={`rank ${row.rank === 1 ? "rank-1" : ""}`}>{row.rank}</span>
                    </td>
                    <td>
                      <Link
                        to={`/${seasonCode}/players/${row.player.personKey}`}
                        className="link link-hover flex min-w-0 items-center gap-2 font-medium"
                      >
                        {row.player.playerImageUrl ? (
                          <img
                            src={row.player.playerImageUrl}
                            alt=""
                            className="aspect-3/4 h-8 w-auto flex-none object-contain object-bottom"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <span
                          className="max-w-40 truncate sm:max-w-56"
                          title={row.player.playerName ?? row.player.personKey}
                        >
                          {row.player.playerName ?? row.player.personKey}
                        </span>
                      </Link>
                    </td>
                    <StatBarCell widthPct={barScale(row.value)}>
                      <span className="text-primary font-semibold tabular-nums">
                        {formatStatValue(metric, row.player[group]?.[metric])}
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
              disabled={offset + PAGE_SIZE >= visible.length}
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
  useDocumentTitle("Leaders");
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
      <PageHeader kicker="LEADERBOARDS" title="Leaders" />

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
          <button
            type="button"
            className={view === "advanced" ? "active" : ""}
            aria-pressed={view === "advanced"}
            onClick={() => setView("advanced")}
          >
            Advanced
          </button>
        </div>

        {view === "advanced" ? null : (
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
        )}
      </div>

      {view === "advanced" ? (
        <AdvancedLeaderboard key={seasonCode} seasonCode={seasonCode} />
      ) : view === "teams" ? (
        <TeamLeaderboard key={phaseCode} seasonCode={seasonCode} phaseCode={phaseCode} />
      ) : (
        <PlayerLeaderboard seasonCode={seasonCode} phaseCode={phaseCode} />
      )}
    </div>
  );
}
