import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  getLeaderStats,
  getPhases,
  getPlayerGames,
  getRounds,
  getSeasonPlayers,
  getSeasonStandings,
  getSeasonTeams,
  getTeamGames,
} from "../lib/api";
import { PLAYER_METRIC_GROUPS, TEAM_METRICS, formatStatValue } from "../lib/statsFields";
import TrendChart from "./TrendChart";

const PLAYER_COMPARISON_ROWS = PLAYER_METRIC_GROUPS.flatMap((group) => [
  { type: "header", key: group.group, label: group.label },
  ...group.options.map(([key, label]) => ({
    type: "metric",
    key: `${group.group}-${key}`,
    group: group.group,
    metricKey: key,
    label,
  })),
]);

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

function TeamPicker({ seasonCode, label, selected, excludeId, onSelect }) {
  const teamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });
  const teams = (teamsQuery.data?.teams ?? []).filter((team) => team.clubCode !== excludeId);

  return (
    <div>
      <label className="label" htmlFor={`team-picker-${label}`}>
        {label}
      </label>
      <select
        id={`team-picker-${label}`}
        className="select select-bordered select-sm w-full"
        value={selected?.id ?? ""}
        disabled={teamsQuery.isPending}
        onChange={(event) => {
          const team = teams.find((candidate) => candidate.clubCode === event.target.value);
          onSelect(team ? { id: team.clubCode, label: team.name ?? team.clubCode } : null);
        }}
      >
        <option value="">Select a team</option>
        {teams.map((team) => (
          <option key={team.clubCode} value={team.clubCode}>
            {team.name ?? team.clubCode}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlayerPicker({ seasonCode, label, selected, excludeId, onSelect }) {
  const [search, setSearch] = useState("");
  const searchQuery = useQuery({
    queryKey: ["player-picker-search", seasonCode, search],
    queryFn: () => getSeasonPlayers(seasonCode, { search, limit: 8 }),
    enabled: search.trim().length > 0,
  });
  const matches = (searchQuery.data?.players ?? []).filter((player) => player.personKey !== excludeId);

  if (selected) {
    return (
      <div>
        <span className="label">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{selected.label}</span>
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => {
              onSelect(null);
              setSearch("");
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="label" htmlFor={`player-picker-${label}`}>
        {label}
      </label>
      <input
        id={`player-picker-${label}`}
        type="search"
        placeholder="Search by name"
        className="input input-bordered input-sm w-full"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {search.trim().length > 0 ? (
        <ul className="menu bg-base-200 rounded-box mt-1 max-h-48 flex-nowrap overflow-y-auto">
          {searchQuery.isPending ? (
            <li>
              <span className="muted px-2 py-1 text-sm">Searching...</span>
            </li>
          ) : matches.length === 0 ? (
            <li>
              <span className="muted px-2 py-1 text-sm">No players match.</span>
            </li>
          ) : (
            matches.map((player) => (
              <li key={player.personKey}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: player.personKey, label: player.name ?? player.personKey })}
                >
                  {player.name ?? player.personKey}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function TeamComparisonTable({ seasonCode, phaseCode, entityA, entityB }) {
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode) && Boolean(entityA) && Boolean(entityB),
  });

  if (!entityA || !entityB) return <p className="muted">Select two teams to compare.</p>;
  if (standingsQuery.isPending) return <CenteredSpinner />;
  if (standingsQuery.isError) {
    return <ErrorAlert message="Could not load the comparison." onRetry={() => standingsQuery.refetch()} />;
  }

  const standings = standingsQuery.data.standings ?? [];
  const a = standings.find((entry) => entry.clubCode === entityA.id);
  const b = standings.find((entry) => entry.clubCode === entityB.id);

  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>Metric</th>
            <TeamHeaderCell label={entityA.label} crestUrl={a?.crestUrl} />
            <TeamHeaderCell label={entityB.label} crestUrl={b?.crestUrl} />
          </tr>
        </thead>
        <tbody>
          {TEAM_METRICS.map((metric) => (
            <tr key={metric.key}>
              <td>{metric.label}</td>
              <td>{a?.basic?.[metric.key] ?? "-"}</td>
              <td>{b?.basic?.[metric.key] ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamHeaderCell({ label, crestUrl }) {
  return (
    <th className="text-center">
      {crestUrl ? (
        <img
          src={crestUrl}
          alt=""
          className="mx-auto mb-1 h-12 w-12 object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div>{label}</div>
    </th>
  );
}

function PlayerHeaderCell({ label, imageUrl }) {
  return (
    <th className="text-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="mx-auto mb-1 h-12 w-12 rounded-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div>{label}</div>
    </th>
  );
}

function PlayerComparisonTable({ seasonCode, phaseCode, mode, entityA, entityB }) {
  const statsAQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityA?.id],
    queryFn: () => getLeaderStats(seasonCode, { phase: phaseCode, mode, personKey: entityA.id }),
    enabled: Boolean(phaseCode) && Boolean(entityA),
  });
  const statsBQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityB?.id],
    queryFn: () => getLeaderStats(seasonCode, { phase: phaseCode, mode, personKey: entityB.id }),
    enabled: Boolean(phaseCode) && Boolean(entityB),
  });

  if (!entityA || !entityB) return <p className="muted">Select two players to compare.</p>;
  if (statsAQuery.isPending || statsBQuery.isPending) return <CenteredSpinner />;
  if (statsAQuery.isError || statsBQuery.isError) {
    return (
      <ErrorAlert
        message="Could not load the comparison."
        onRetry={() => {
          statsAQuery.refetch();
          statsBQuery.refetch();
        }}
      />
    );
  }

  const a = statsAQuery.data.players?.[0];
  const b = statsBQuery.data.players?.[0];

  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>Metric</th>
            <PlayerHeaderCell label={entityA.label} imageUrl={a?.playerImageUrl} />
            <PlayerHeaderCell label={entityB.label} imageUrl={b?.playerImageUrl} />
          </tr>
        </thead>
        <tbody>
          {PLAYER_COMPARISON_ROWS.map((row) =>
            row.type === "header" ? (
              <tr key={row.key}>
                <th colSpan={3} className="bg-base-200">
                  {row.label}
                </th>
              </tr>
            ) : (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{formatStatValue(row.metricKey, a?.[row.group]?.[row.metricKey])}</td>
                <td>{formatStatValue(row.metricKey, b?.[row.group]?.[row.metricKey])}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function entityPoints(game, view, entityId) {
  if (!game.played) return null;
  if (view === "teams") {
    if (game.localTeam?.clubCode === entityId) return game.localScore;
    if (game.roadTeam?.clubCode === entityId) return game.roadScore;
    return null;
  }
  return game.points !== null && game.points !== undefined ? Number(game.points) : null;
}

function buildRoundSeries(rounds, games, phaseCode, view, entityId) {
  const byRound = new Map();
  for (const game of games) {
    if (game.phaseCode !== phaseCode) continue;
    const value = entityPoints(game, view, entityId);
    if (value !== null) byRound.set(game.roundNumber, value);
  }
  return rounds.map((round) => byRound.get(round.number) ?? null);
}

function TrendSection({ seasonCode, phaseCode, view, entityA, entityB }) {
  const roundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, phaseCode],
    queryFn: () => getRounds(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const gamesAQuery = useQuery({
    queryKey: ["trend-games", seasonCode, view, entityA.id],
    queryFn: () =>
      view === "teams"
        ? getTeamGames(seasonCode, entityA.id, { limit: 100 })
        : getPlayerGames(seasonCode, entityA.id, { limit: 100 }),
  });
  const gamesBQuery = useQuery({
    queryKey: ["trend-games", seasonCode, view, entityB.id],
    queryFn: () =>
      view === "teams"
        ? getTeamGames(seasonCode, entityB.id, { limit: 100 })
        : getPlayerGames(seasonCode, entityB.id, { limit: 100 }),
  });

  if (roundsQuery.isPending || gamesAQuery.isPending || gamesBQuery.isPending) return <CenteredSpinner />;
  if (roundsQuery.isError || gamesAQuery.isError || gamesBQuery.isError) {
    return (
      <ErrorAlert
        message="Could not load the trend."
        onRetry={() => {
          roundsQuery.refetch();
          gamesAQuery.refetch();
          gamesBQuery.refetch();
        }}
      />
    );
  }

  const rounds = roundsQuery.data.rounds ?? [];
  const seriesA = buildRoundSeries(rounds, gamesAQuery.data.games ?? [], phaseCode, view, entityA.id);
  const seriesB = buildRoundSeries(rounds, gamesBQuery.data.games ?? [], phaseCode, view, entityB.id);
  const playedCountA = seriesA.filter((value) => value !== null).length;
  const playedCountB = seriesB.filter((value) => value !== null).length;

  if (playedCountA < 2 || playedCountB < 2) {
    return <p className="muted">Not enough played games to chart a trend yet.</p>;
  }

  const labels = rounds.map((round) => round.name ?? `Round ${round.number}`);

  return (
    <TrendChart
      title="Points scored per round"
      labels={labels}
      series={[
        { label: entityA.label, points: seriesA },
        { label: entityB.label, points: seriesB },
      ]}
    />
  );
}

export default function ComparisonsPage() {
  const { seasonCode } = useParams();
  const [view, setView] = useState("teams");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [mode, setMode] = useState("perGame");
  const [entityA, setEntityA] = useState(null);
  const [entityB, setEntityB] = useState(null);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const phaseCode = selectedPhase ?? phases.find((phase) => phase.code === "RS")?.code ?? phases[0]?.code;

  function handleViewChange(value) {
    setView(value);
    setEntityA(null);
    setEntityB(null);
  }

  if (phasesQuery.isLoading) return <CenteredSpinner />;
  if (phasesQuery.isError) {
    return <ErrorAlert message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Comparisons and trends</h1>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
        {[
          ["teams", "Teams"],
          ["players", "Players"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            className={`tab font-semibold ${view === value ? "tab-active" : ""}`}
            onClick={() => handleViewChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tablist" className="tabs tabs-boxed tabs-sm mb-6 w-fit">
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {view === "teams" ? (
          <>
            <TeamPicker
              seasonCode={seasonCode}
              label="Team A"
              selected={entityA}
              excludeId={entityB?.id}
              onSelect={setEntityA}
            />
            <TeamPicker
              seasonCode={seasonCode}
              label="Team B"
              selected={entityB}
              excludeId={entityA?.id}
              onSelect={setEntityB}
            />
          </>
        ) : (
          <>
            <PlayerPicker
              seasonCode={seasonCode}
              label="Player A"
              selected={entityA}
              excludeId={entityB?.id}
              onSelect={setEntityA}
            />
            <PlayerPicker
              seasonCode={seasonCode}
              label="Player B"
              selected={entityB}
              excludeId={entityA?.id}
              onSelect={setEntityB}
            />
          </>
        )}
      </div>

      {view === "players" ? (
        <div role="tablist" className="tabs tabs-boxed tabs-sm mb-4 w-fit">
          {[
            ["accumulated", "Accumulated"],
            ["perGame", "Per game"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              className={`tab font-semibold ${mode === value ? "tab-active" : ""}`}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Comparison</h2>
        {view === "teams" ? (
          <TeamComparisonTable seasonCode={seasonCode} phaseCode={phaseCode} entityA={entityA} entityB={entityB} />
        ) : (
          <PlayerComparisonTable
            seasonCode={seasonCode}
            phaseCode={phaseCode}
            mode={mode}
            entityA={entityA}
            entityB={entityB}
          />
        )}
      </section>

      {entityA && entityB ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Points scored trend</h2>
          <TrendSection seasonCode={seasonCode} phaseCode={phaseCode} view={view} entityA={entityA} entityB={entityB} />
        </section>
      ) : null}
    </div>
  );
}
