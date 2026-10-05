import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import AsyncState from "../lib/AsyncState";
import CompactMetric from "../lib/CompactMetric";
import EmptyText from "../lib/EmptyText";
import { formatDateTime } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ComparisonRow from "../lib/ComparisonRow";
import { winnerSide } from "../lib/comparisonMath";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePhaseParam } from "../lib/usePhaseParam";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import {
  getPhases,
  getPlayer,
  getPlayerGames,
  getPlayerSeasonStats,
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

const TEAM_METRIC_DIRECTIONS = {
  gamesPlayed: "neutral",
  gamesWon: "higher",
  gamesLost: "lower",
  winPercentage: "higher",
  pointsFor: "higher",
  pointsAgainst: "lower",
  pointsDifference: "higher",
};

const PLAYER_METRIC_DIRECTIONS = {
  pointsScored: "higher",
  totalRebounds: "higher",
  assists: "higher",
  steals: "higher",
  turnovers: "lower",
  blocks: "higher",
  pir: "higher",
  minutesPlayed: "neutral",
  gamesPlayed: "neutral",
  effectiveFieldGoalPercentage: "higher",
  trueShootingPercentage: "higher",
  reboundsPercentage: "higher",
  assistsToTurnoversRatio: "higher",
  possessions: "neutral",
  twoPointRate: "neutral",
  threePointRate: "neutral",
  pointsFromTwoPointersPercentage: "neutral",
  pointsFromThreePointersPercentage: "neutral",
  pointsFromFreeThrowsPercentage: "neutral",
  wins: "higher",
  losses: "lower",
  doubleDoubles: "higher",
  tripleDoubles: "higher",
};

function TeamPicker({ label, allTeams, teamsPending, selected, excludeId, onSelect }) {
  const teams = allTeams.filter((team) => team.clubCode !== excludeId);

  return (
    <div>
      <label className="label" htmlFor={`team-picker-${label}`}>
        {label}
      </label>
      <select
        id={`team-picker-${label}`}
        className="select select-bordered select-sm w-full"
        value={selected?.id ?? ""}
        disabled={teamsPending}
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
  if (standingsQuery.isPending) return <AsyncState status="loading" label="Loading the comparison" />;
  if (standingsQuery.isError) {
    return <AsyncState status="error" message="Could not load the comparison." onRetry={() => standingsQuery.refetch()} />;
  }

  const standings = standingsQuery.data.standings ?? [];
  const a = standings.find((entry) => entry.clubCode === entityA.id);
  const b = standings.find((entry) => entry.clubCode === entityB.id);

  return (
    <Panel className="p-3">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <TeamHeaderCell label={entityA.label} crestUrl={a?.crestUrl} />
        <TeamHeaderCell label={entityB.label} crestUrl={b?.crestUrl} />
      </div>
      {TEAM_METRICS.map((metric) => (
        <ComparisonRow
          key={metric.key}
          label={metric.label}
          rawA={a?.basic?.[metric.key]}
          rawB={b?.basic?.[metric.key]}
          displayA={a?.basic?.[metric.key] ?? "-"}
          displayB={b?.basic?.[metric.key] ?? "-"}
          direction={TEAM_METRIC_DIRECTIONS[metric.key]}
        />
      ))}
    </Panel>
  );
}

function TeamHeaderCell({ label, crestUrl }) {
  return (
    <div className="text-center">
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
      <div className="font-semibold">{label}</div>
    </div>
  );
}

function PlayerHeaderCell({ label, imageUrl }) {
  return (
    <div className="text-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="mx-auto mb-1 aspect-3/4 h-12 w-auto object-contain object-bottom"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="font-semibold">{label}</div>
    </div>
  );
}

function PlayerComparisonTable({ seasonCode, phaseCode, mode, entityA, entityB }) {
  const statsAQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityA?.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entityA.id, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode) && Boolean(entityA),
  });
  const statsBQuery = useQuery({
    queryKey: ["player-compare-stats", seasonCode, phaseCode, mode, entityB?.id],
    queryFn: () => getPlayerSeasonStats(seasonCode, entityB.id, { phase: phaseCode, mode }),
    enabled: Boolean(phaseCode) && Boolean(entityB),
  });

  if (!entityA || !entityB) return <p className="muted">Select two players to compare.</p>;
  if (statsAQuery.isPending || statsBQuery.isPending) return <AsyncState status="loading" label="Loading the comparison" />;
  if (statsAQuery.isError || statsBQuery.isError) {
    return (
      <AsyncState status="error"
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
    <Panel className="p-3">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <PlayerHeaderCell label={entityA.label} imageUrl={a?.playerImageUrl} />
        <PlayerHeaderCell label={entityB.label} imageUrl={b?.playerImageUrl} />
      </div>
      {PLAYER_COMPARISON_ROWS.map((row) => {
        if (row.type === "header") {
          return (
            <h3 key={row.key} className="bg-base-200 -mx-3 px-3 py-2 text-sm font-bold">
              {row.label}
            </h3>
          );
        }
        return (
          <ComparisonRow
            key={row.key}
            label={row.label}
            rawA={a?.[row.group]?.[row.metricKey]}
            rawB={b?.[row.group]?.[row.metricKey]}
            displayA={formatStatValue(row.metricKey, a?.[row.group]?.[row.metricKey])}
            displayB={formatStatValue(row.metricKey, b?.[row.group]?.[row.metricKey])}
            direction={PLAYER_METRIC_DIRECTIONS[row.metricKey]}
          />
        );
      })}
    </Panel>
  );
}

function headToHeadGames(games, phaseCode, opponentId) {
  return games
    .filter(
      (game) =>
        game.phaseCode === phaseCode &&
        (game.localTeam?.clubCode === opponentId || game.roadTeam?.clubCode === opponentId),
    )
    .slice()
    .sort((x, y) => (x.roundNumber ?? 0) - (y.roundNumber ?? 0));
}

function seriesRecord(matchups, aId) {
  let winsA = 0;
  let winsB = 0;
  for (const game of matchups) {
    if (!game.played || game.localScore == null || game.roadScore == null) continue;
    const homeIsA = game.localTeam?.clubCode === aId;
    const scoreA = homeIsA ? game.localScore : game.roadScore;
    const scoreB = homeIsA ? game.roadScore : game.localScore;
    if (scoreA > scoreB) winsA += 1;
    else if (scoreB > scoreA) winsB += 1;
  }
  return { winsA, winsB };
}

function last10Form(games, clubCode) {
  const played = games
    .filter((game) => game.played && game.localScore != null && game.roadScore != null)
    .slice(-10);
  let wins = 0;
  let diffSum = 0;
  for (const game of played) {
    const isHome = game.localTeam?.clubCode === clubCode;
    const own = isHome ? game.localScore : game.roadScore;
    const opp = isHome ? game.roadScore : game.localScore;
    if (own > opp) wins += 1;
    diffSum += own - opp;
  }
  return { played: played.length, wins, avgDiff: played.length ? diffSum / played.length : 0 };
}

function categoriesWon(standingsA, standingsB) {
  let countA = 0;
  let countB = 0;
  for (const metric of TEAM_METRICS) {
    const winner = winnerSide(standingsA?.basic?.[metric.key], standingsB?.basic?.[metric.key], TEAM_METRIC_DIRECTIONS[metric.key]);
    if (winner === "a") countA += 1;
    else if (winner === "b") countB += 1;
  }
  return { countA, countB };
}

function TeamSeriesSection({ seasonCode, phaseCode, entityA, entityB }) {
  const gamesAQuery = useQuery({
    queryKey: ["trend-games", seasonCode, "teams", entityA.id],
    queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: 100 }),
  });

  if (gamesAQuery.isPending) return <AsyncState status="loading" label="Loading the season series" />;
  if (gamesAQuery.isError) {
    return <AsyncState status="error" message="Could not load the season series." onRetry={() => gamesAQuery.refetch()} />;
  }

  const matchups = headToHeadGames(gamesAQuery.data.games ?? [], phaseCode, entityB.id);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="HEAD-TO-HEAD" title="Season series" />
      {matchups.length === 0 ? (
        <EmptyText>No matchups this phase yet.</EmptyText>
      ) : (
        <ul className="flex flex-col gap-2">
          {matchups.map((game) => {
            const homeIsA = game.localTeam?.clubCode === entityA.id;
            const scoreA = homeIsA ? game.localScore : game.roadScore;
            const scoreB = homeIsA ? game.roadScore : game.localScore;
            const aWon = game.played && scoreA != null && scoreB != null && scoreA > scoreB;
            const bWon = game.played && scoreA != null && scoreB != null && scoreB > scoreA;
            return (
              <li
                key={game.gameCode}
                className="flex items-center justify-between gap-4 border-b border-base-300 py-2 last:border-0"
              >
                <span className="muted text-sm">
                  {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : "")}
                </span>
                {game.played ? (
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={aWon ? "font-bold underline" : ""}>{entityA.label}</span>
                    <span className="tabular-nums">
                      {scoreA ?? "-"}-{scoreB ?? "-"}
                    </span>
                    <span className={bWon ? "font-bold underline" : ""}>{entityB.label}</span>
                  </span>
                ) : (
                  <span className="muted text-sm">{formatDateTime(game.scheduledAt)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function TeamVerdictStrip({ seasonCode, phaseCode, entityA, entityB, allTeams }) {
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const gamesAQuery = useQuery({
    queryKey: ["trend-games", seasonCode, "teams", entityA.id],
    queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: 100 }),
  });
  const gamesBQuery = useQuery({
    queryKey: ["trend-games", seasonCode, "teams", entityB.id],
    queryFn: () => getTeamGames(seasonCode, entityB.id, { limit: 100 }),
  });

  if (standingsQuery.isPending || gamesAQuery.isPending || gamesBQuery.isPending) return <AsyncState status="loading" label="Loading the comparison" />;
  if (standingsQuery.isError || gamesAQuery.isError || gamesBQuery.isError) {
    return (
      <AsyncState status="error"
        message="Could not load the verdict summary."
        onRetry={() => {
          standingsQuery.refetch();
          gamesAQuery.refetch();
          gamesBQuery.refetch();
        }}
      />
    );
  }

  const standings = standingsQuery.data.standings ?? [];
  const standingsA = standings.find((entry) => entry.clubCode === entityA.id);
  const standingsB = standings.find((entry) => entry.clubCode === entityB.id);
  const shortA = allTeams.find((team) => team.clubCode === entityA.id)?.abbreviatedName ?? entityA.label;
  const shortB = allTeams.find((team) => team.clubCode === entityB.id)?.abbreviatedName ?? entityB.label;

  const gamesA = gamesAQuery.data.games ?? [];
  const gamesB = gamesBQuery.data.games ?? [];

  const matchups = headToHeadGames(gamesA, phaseCode, entityB.id);
  const { winsA, winsB } = seriesRecord(matchups, entityA.id);
  const seriesValue =
    winsA === winsB ? `${winsA}-${winsB}` : winsA > winsB ? `${shortA} ${winsA}-${winsB}` : `${shortB} ${winsB}-${winsA}`;

  const { countA, countB } = categoriesWon(standingsA, standingsB);
  const categoriesLabel =
    countA === countB ? "Categories won · Even" : `Categories won · ${countA > countB ? shortA : shortB}`;

  const formA = last10Form(gamesA, entityA.id);
  const formB = last10Form(gamesB, entityB.id);
  let formValue = "Even";
  if (formA.played > 0 || formB.played > 0) {
    if (formA.wins !== formB.wins) formValue = formA.wins > formB.wins ? shortA : shortB;
    else if (formA.avgDiff !== formB.avgDiff) formValue = formA.avgDiff > formB.avgDiff ? shortA : shortB;
  }

  return (
    <HeaderStats className="mb-6">
      <CompactMetric value={seriesValue} label="Season series" />
      <CompactMetric value={`${countA}-${countB}`} label={categoriesLabel} />
      <CompactMetric value={formValue} label={<>Better recent form &middot; L10</>} />
    </HeaderStats>
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

  const dataReady = roundsQuery.isSuccess && gamesAQuery.isSuccess && gamesBQuery.isSuccess;

  // buildRoundSeries and the labels/series it feeds into TrendChart are
  // recomputed here only when the underlying query data or selection
  // actually changes (react-query keeps `data` referentially stable across
  // renders that don't refetch), so the chart below isn't torn down and
  // rebuilt on every unrelated render of this page. Computed unconditionally,
  // ahead of the loading/error returns below, because Hooks can't follow one.
  const { labels, series, playedCountA, playedCountB } = useMemo(() => {
    if (!dataReady) return { labels: [], series: [], playedCountA: 0, playedCountB: 0 };
    const rounds = roundsQuery.data.rounds ?? [];
    const seriesA = buildRoundSeries(rounds, gamesAQuery.data.games ?? [], phaseCode, view, entityA.id);
    const seriesB = buildRoundSeries(rounds, gamesBQuery.data.games ?? [], phaseCode, view, entityB.id);
    return {
      labels: rounds.map((round) => round.name ?? `Round ${round.number}`),
      series: [
        { label: entityA.label, points: seriesA },
        { label: entityB.label, points: seriesB },
      ],
      playedCountA: seriesA.filter((value) => value !== null).length,
      playedCountB: seriesB.filter((value) => value !== null).length,
    };
  }, [
    dataReady,
    roundsQuery.data,
    gamesAQuery.data,
    gamesBQuery.data,
    phaseCode,
    view,
    entityA.id,
    entityA.label,
    entityB.id,
    entityB.label,
  ]);

  if (roundsQuery.isPending || gamesAQuery.isPending || gamesBQuery.isPending) return <AsyncState status="loading" label="Loading the trend" />;
  if (roundsQuery.isError || gamesAQuery.isError || gamesBQuery.isError) {
    return (
      <AsyncState status="error"
        message="Could not load the trend."
        onRetry={() => {
          roundsQuery.refetch();
          gamesAQuery.refetch();
          gamesBQuery.refetch();
        }}
      />
    );
  }

  if (playedCountA < 2 || playedCountB < 2) {
    return <p className="muted">Not enough played games to chart a trend yet.</p>;
  }

  return <TrendChart title="Points scored per round" labels={labels} series={series} />;
}

function ComparisonsBody({
  seasonCode,
  phases,
  phaseCode,
  setSelectedPhase,
  allTeams,
  initialView,
  initialTeamA,
  initialTeamB,
  initialPlayerA,
  initialPlayerB,
}) {
  const [, setSearchParams] = useSearchParams();
  const [view, setView] = useState(initialView);
  const [section, setSection] = useState("comparison");
  const [mode, setMode] = useState("perGame");
  const [entityA, setEntityA] = useState(() => {
    if (initialView !== "teams") return null;
    const team = allTeams.find((candidate) => candidate.clubCode === initialTeamA);
    return team ? { id: team.clubCode, label: team.name ?? team.clubCode } : null;
  });
  const [entityB, setEntityB] = useState(() => {
    if (initialView !== "teams") return null;
    const team = allTeams.find((candidate) => candidate.clubCode === initialTeamB);
    return team ? { id: team.clubCode, label: team.name ?? team.clubCode } : null;
  });
  const [copyLabel, setCopyLabel] = useState("Copy comparison link");

  // Resolve player entities named only by personKey in the URL (teams
  // resolve synchronously above from the already-loaded team list).
  const resolveAQuery = useQuery({
    queryKey: ["comparison-resolve-player", seasonCode, initialPlayerA],
    queryFn: () => getPlayer(seasonCode, initialPlayerA),
    enabled: initialView === "players" && Boolean(initialPlayerA),
  });
  const resolveBQuery = useQuery({
    queryKey: ["comparison-resolve-player", seasonCode, initialPlayerB],
    queryFn: () => getPlayer(seasonCode, initialPlayerB),
    enabled: initialView === "players" && Boolean(initialPlayerB),
  });
  // While a player named only by personKey in the URL is still resolving
  // (or once resolved but not yet explicitly re-picked), fall back to the
  // resolved entity rather than storing it in state via an effect.
  const resolvedPlayerA = resolveAQuery.data?.player
    ? { id: resolveAQuery.data.player.personKey, label: resolveAQuery.data.player.name ?? resolveAQuery.data.player.personKey }
    : null;
  const resolvedPlayerB = resolveBQuery.data?.player
    ? { id: resolveBQuery.data.player.personKey, label: resolveBQuery.data.player.name ?? resolveBQuery.data.player.personKey }
    : null;
  const effectiveEntityA = entityA ?? resolvedPlayerA;
  const effectiveEntityB = entityB ?? resolvedPlayerB;

  function persistEntities(nextView, a, b) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set("view", nextView);
        if (nextView === "teams") {
          if (a?.id) next.set("teamA", a.id); else next.delete("teamA");
          if (b?.id) next.set("teamB", b.id); else next.delete("teamB");
          next.delete("playerA");
          next.delete("playerB");
        } else {
          if (a?.id) next.set("playerA", a.id); else next.delete("playerA");
          if (b?.id) next.set("playerB", b.id); else next.delete("playerB");
          next.delete("teamA");
          next.delete("teamB");
        }
        return next;
      },
      { replace: true },
    );
  }

  function handleViewChange(value) {
    setView(value);
    setSection("comparison");
    setEntityA(null);
    setEntityB(null);
    persistEntities(value, null, null);
  }

  function handleSelectA(next) {
    setEntityA(next);
    persistEntities(view, next, effectiveEntityB);
  }

  function handleSelectB(next) {
    setEntityB(next);
    persistEntities(view, effectiveEntityA, next);
  }

  function handleSwap() {
    setEntityA(effectiveEntityB);
    setEntityB(effectiveEntityA);
    persistEntities(view, effectiveEntityB, effectiveEntityA);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLabel("Link copied");
      setTimeout(() => setCopyLabel("Copy comparison link"), 3000);
    });
  }

  // Changing the archive-level phase resets the view-level per-game/totals
  // mode, but not the selected teams/players being compared.
  function handlePhaseChange(code) {
    setSelectedPhase(code);
    setMode("perGame");
  }

  return (
    <div>
      <PageHeader kicker="HEAD-TO-HEAD" title="Compare">
        {effectiveEntityA && effectiveEntityB ? (
          <button type="button" className="btn btn-sm" onClick={handleCopyLink}>
            {copyLabel}
          </button>
        ) : null}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-4">
        <LabelledSelect
          label="Comparison type"
            value={view}
            onChange={(event) => handleViewChange(event.target.value)}
          >
            <option value="teams">Teams</option>
            <option value="players">Players</option>
        </LabelledSelect>

        <LabelledSelect
          label="Phase"
          ariaLabel="Comparison phase"
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

      <div className="mb-6 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {view === "teams" ? (
          <>
            <TeamPicker
              label="Team A"
              allTeams={allTeams}
              teamsPending={false}
              selected={effectiveEntityA}
              excludeId={effectiveEntityB?.id}
              onSelect={handleSelectA}
            />
            <button
              type="button"
              className="btn btn-outline btn-square btn-sm mx-auto"
              aria-label="Swap teams"
              disabled={!effectiveEntityA && !effectiveEntityB}
              onClick={handleSwap}
            >
              &#8646;
            </button>
            <TeamPicker
              label="Team B"
              allTeams={allTeams}
              teamsPending={false}
              selected={effectiveEntityB}
              excludeId={effectiveEntityA?.id}
              onSelect={handleSelectB}
            />
          </>
        ) : (
          <>
            <PlayerPicker
              seasonCode={seasonCode}
              label="Player A"
              selected={effectiveEntityA}
              excludeId={effectiveEntityB?.id}
              onSelect={handleSelectA}
            />
            <button
              type="button"
              className="btn btn-outline btn-square btn-sm mx-auto"
              aria-label="Swap players"
              disabled={!effectiveEntityA && !effectiveEntityB}
              onClick={handleSwap}
            >
              &#8646;
            </button>
            <PlayerPicker
              seasonCode={seasonCode}
              label="Player B"
              selected={effectiveEntityB}
              excludeId={effectiveEntityA?.id}
              onSelect={handleSelectB}
            />
          </>
        )}
      </div>

      {view === "players" ? (
        <LabelledSelect
          label="Player statistics"
          ariaLabel="Player comparison mode"
          labelClassName="mb-4"
          className="w-fit"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="accumulated">Accumulated</option>
            <option value="perGame">Per game</option>
        </LabelledSelect>
      ) : null}

      {effectiveEntityA && effectiveEntityB ? (
        <section className="mb-8">
          {view === "teams" ? (
            <Link
              to={`/${seasonCode}/comparisons/head-to-head?teamA=${encodeURIComponent(effectiveEntityA.id)}&teamB=${encodeURIComponent(effectiveEntityB.id)}`}
              className="btn btn-outline btn-sm mb-4"
            >
              Head-to-head
            </Link>
          ) : null}
          <TabStrip
            ariaLabel="Comparison section"

            level={1}
            panelId="comparison-section-panel"
            activeKey={section}
            onChange={setSection}
            className="mb-4 w-fit"
            tabs={[
              { key: "comparison", label: "Comparison" },
              { key: "trends", label: "Trends" },
            ]}
          />
          <TabPanel id="comparison-section-panel" focusKey={section}>
            {section === "comparison" ? (
              <>
                {view === "teams" ? (
                  <>
                    <TeamVerdictStrip
                      seasonCode={seasonCode}
                      phaseCode={phaseCode}
                      entityA={effectiveEntityA}
                      entityB={effectiveEntityB}
                      allTeams={allTeams}
                    />
                    <section className="mb-8">
                      <TeamSeriesSection
                        seasonCode={seasonCode}
                        phaseCode={phaseCode}
                        entityA={effectiveEntityA}
                        entityB={effectiveEntityB}
                      />
                    </section>
                  </>
                ) : null}
                <h2 className="mb-3 text-xl font-semibold">Comparison</h2>
                {view === "teams" ? (
                  <TeamComparisonTable
                    seasonCode={seasonCode}
                    phaseCode={phaseCode}
                    entityA={effectiveEntityA}
                    entityB={effectiveEntityB}
                  />
                ) : (
                  <PlayerComparisonTable
                    seasonCode={seasonCode}
                    phaseCode={phaseCode}
                    mode={mode}
                    entityA={effectiveEntityA}
                    entityB={effectiveEntityB}
                  />
                )}
              </>
            ) : (
              <>
                <h2 className="mb-3 text-xl font-semibold">Points scored trend</h2>
                <TrendSection
                  seasonCode={seasonCode}
                  phaseCode={phaseCode}
                  view={view}
                  entityA={effectiveEntityA}
                  entityB={effectiveEntityB}
                />
              </>
            )}
          </TabPanel>
        </section>
      ) : null}
    </div>
  );
}

export default function ComparisonsPage() {
  useDocumentTitle("Compare");
  const { seasonCode } = useParams();
  const [searchParams] = useSearchParams();

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];
  const [phaseCode, setPhaseCode] = usePhaseParam(phases);

  const teamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });

  if (phasesQuery.isLoading || teamsQuery.isLoading) return <AsyncState status="loading" label="Loading phases" />;
  if (phasesQuery.isError) {
    return <AsyncState status="error" message="Could not load phases." onRetry={() => phasesQuery.refetch()} />;
  }
  if (teamsQuery.isError) {
    return <AsyncState status="error" message="Could not load teams." onRetry={() => teamsQuery.refetch()} />;
  }

  return (
    <ComparisonsBody
      seasonCode={seasonCode}
      phases={phases}
      phaseCode={phaseCode}
      setSelectedPhase={setPhaseCode}
      allTeams={teamsQuery.data.teams ?? []}
      initialView={searchParams.get("view") === "players" ? "players" : "teams"}
      initialTeamA={searchParams.get("teamA")}
      initialTeamB={searchParams.get("teamB")}
      initialPlayerA={searchParams.get("playerA")}
      initialPlayerB={searchParams.get("playerB")}
    />
  );
}
