import { useMemo, useRef, useEffect } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { Link, useParams } from "react-router";
import { getCoverage, getLeaderStats, getPhases, getSeasonGames, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import DataCoveragePanel from "../lib/DataCoveragePanel";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { thinAxisLabels } from "../lib/chartHelpers";
import { dateRangeLabel, isChampionshipLabel, phaseSortIndex, teamCountFromGames } from "../lib/phaseSummary";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import {
  formatCount,
  formatDateTime,
  formatPerGame,
  formatSeasonLabel,
} from "../lib/format";

const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 10;

function isFinalGame(game) {
  return isChampionshipLabel(`${game.groupName ?? ""} ${game.roundName ?? ""}`);
}

function findChampion(finalFourGames) {
  const finalGame = finalFourGames.find((game) => game.played && isFinalGame(game));
  if (!finalGame || finalGame.localScore == null || finalGame.roadScore == null) return null;
  if (finalGame.localScore === finalGame.roadScore) return null;
  return finalGame.localScore > finalGame.roadScore ? finalGame.localTeam : finalGame.roadTeam;
}

function currentPhaseFromPlayedGames(phases, playedGames) {
  const phasesWithPlayedGames = new Set(playedGames.map((game) => game.phaseCode));
  const mostAdvanced = [...phases]
    .filter((phase) => phasesWithPlayedGames.has(phase.code))
    .sort((a, b) => phaseSortIndex(b.code) - phaseSortIndex(a.code));
  if (mostAdvanced.length > 0) return mostAdvanced[0];
  return phases.find((phase) => phase.code === "RS") ?? phases[0];
}

// The season API caps `limit` at 100, so a full season's played games (which
// can exceed that) are paged through rather than fetched in one request.
async function fetchAllPlayedGames(seasonCode) {
  const all = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { games, pagination } = await getSeasonGames(seasonCode, {
      status: "played",
      limit: MAX_PAGE_SIZE,
      offset,
      order: "asc",
    });
    all.push(...games);
    if (!pagination.hasMore) break;
    offset += MAX_PAGE_SIZE;
  }
  return all;
}

function SeasonHero({ champion, phaseName, hasPlayedGames }) {
  if (champion) {
    return (
      <Panel className="flex items-center gap-4 border-success bg-success/10 p-4">
        {champion.crestUrl ? (
          <img
            src={champion.crestUrl}
            alt=""
            className="h-16 w-16 flex-none object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div>
          <p className="text-success text-xs font-bold uppercase tracking-wide">Season champion</p>
          <p className="text-xl font-semibold">{champion.name ?? champion.abbreviatedName ?? champion.clubCode}</p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className="text-2xl" aria-hidden="true">◇</span>
      <p className="text-lg font-semibold">
        {hasPlayedGames ? `${phaseName} in progress` : "Season not yet started"}
      </p>
    </Panel>
  );
}

function SummaryCards({ totalGames, playedGames, phases, currentPhaseCode }) {
  const withScores = playedGames.filter((game) => game.localScore != null && game.roadScore != null);
  const combinedScores = withScores.map((game) => game.localScore + game.roadScore);
  const margins = withScores.map((game) => Math.abs(game.localScore - game.roadScore));
  const avg = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

  const cards = [
    { label: "Games", value: formatCount(totalGames) },
    { label: "Scoring level", value: withScores.length === 0 ? "—" : `${formatPerGame(avg(combinedScores))} pts/game` },
    { label: "Average margin of victory", value: withScores.length === 0 ? "—" : `${formatPerGame(avg(margins))} pts` },
    { label: "Competition path", highlight: currentPhaseCode },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Panel key={card.label} className="p-4">
          <p className="eyebrow mb-1">{card.label}</p>
          {card.highlight ? (
            <p className="text-sm font-medium">
              {phases.map((phase, index) => (
                <span key={phase.code} className={phase.code === card.highlight ? "text-primary font-semibold" : ""}>
                  {phase.name ?? phase.code}
                  {index < phases.length - 1 ? " → " : ""}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-2xl font-semibold">{card.value}</p>
          )}
        </Panel>
      ))}
    </div>
  );
}

function PhaseStory({ phases, phaseSummaries }) {
  return (
    <div>
      <PanelHeader kicker="TIMELINE" title="Phase story" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {phases.map((phase, index) => {
          const summary = phaseSummaries[phase.code];
          return (
            <div key={phase.code} className="flex items-center gap-2">
              <Panel className="relative flex-1 overflow-hidden p-4">
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
                <p className="eyebrow mb-1">Phase {index + 1}</p>
                <h3 className="mb-2 font-semibold">{phase.name ?? phase.code}</h3>
                {!summary || summary.gameCount === 0 ? (
                  <p className="muted text-sm">Not yet applicable</p>
                ) : (
                  <>
                    <p className="muted text-sm">{formatCount(summary.gameCount)} games · {formatCount(summary.teamCount)} teams</p>
                    {summary.dateRange ? <p className="muted text-xs">{summary.dateRange}</p> : null}
                  </>
                )}
              </Panel>
              {index < phases.length - 1 ? (
                <span className="muted hidden text-lg xl:inline" aria-hidden="true">→</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

function DefiningGames({ seasonCode, playedGames }) {
  const closest = playedGames
    .filter((game) => game.localScore != null && game.roadScore != null)
    .map((game) => ({ game, margin: Math.abs(game.localScore - game.roadScore) }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 3);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="HIGHLIGHTS" title="Defining games" />
      {closest.length === 0 ? (
        <p className="muted text-sm">No played games yet this season.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {closest.map(({ game, margin }) => (
            <Link
              key={game.gameCode}
              to={`/${seasonCode}/games/${game.gameCode}`}
              className="card card-border bg-base-100 p-3 transition-colors hover:border-primary"
            >
              <p className="eyebrow mb-1">
                {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : "")}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  {game.localTeam?.crestUrl ? (
                    <img
                      src={game.localTeam.crestUrl}
                      alt=""
                      className="h-6 w-6 flex-none object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="truncate">{teamName(game.localTeam)}</span>
                </span>
                <span className="stat-badge stat-badge-neutral tabular-nums">
                  {game.localScore}-{game.roadScore}
                </span>
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate">{teamName(game.roadTeam)}</span>
                  {game.roadTeam?.crestUrl ? (
                    <img
                      src={game.roadTeam.crestUrl}
                      alt=""
                      className="h-6 w-6 flex-none object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </span>
              </div>
              <p className="muted mt-1 text-xs">
                Decided by {margin} · {formatDateTime(game.scheduledAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function monthlyScoringSeries(playedGames) {
  const byMonth = new Map();
  for (const game of playedGames) {
    if (game.localScore == null || game.roadScore == null || !game.scheduledAt) continue;
    const date = new Date(game.scheduledAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, { total: 0, count: 0, date });
    const entry = byMonth.get(key);
    entry.total += game.localScore + game.roadScore;
    entry.count += 1;
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  return {
    labels: months.map(([, entry]) => entry.date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })),
    values: months.map(([, entry]) => entry.total / entry.count),
  };
}

function ScoringTrendChart({ playedGames }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { labels, values } = useMemo(() => monthlyScoringSeries(playedGames), [playedGames]);
  const axisLabels = useMemo(() => thinAxisLabels(labels, 6), [labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || labels.length < 2) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;
    const fillColor = `color-mix(in srgb, ${primary} 15%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: axisLabels,
        datasets: [
          {
            label: "Average combined score",
            data: values,
            borderColor: primary,
            backgroundColor: fillColor,
            fill: true,
            borderWidth: 4,
            pointRadius: 5,
            pointBackgroundColor: primary,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { mode: "nearest", intersect: true },
        },
        interaction: { mode: "nearest", intersect: true },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [axisLabels, values, labels.length, theme]);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="TRENDS" title="Scoring through the season" />
      {labels.length < 2 ? (
        <p className="muted text-sm">Not enough played games yet to chart a trend.</p>
      ) : (
        <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
          <div className="relative h-64 w-full">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Average combined score per month across the season, from ${Math.round(Math.min(...values))} to ${Math.round(Math.max(...values))} points`}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

const LEADER_CATEGORIES = [
  { key: "pointsScored", label: "Points per game" },
  { key: "totalRebounds", label: "Rebounds per game" },
  { key: "assists", label: "Assists per game" },
  { key: "pir", label: "PIR per game" },
];

function LeaderCard({ seasonCode, category }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, "all", "perGame", category.key],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort: category.key, order: "desc", limit: 1 }),
  });
  const leader = query.data?.players[0] ?? null;

  return (
    <div className="leader-card">
      <span className="cat">{category.label}</span>
      <AsyncState
        inline
        status={query.isLoading ? "loading" : query.isError ? "error" : !leader ? "empty" : "ready"}
        message={query.isError ? "Could not load." : "Not available yet."}
      >
        {leader ? (
          <Link to={`/${seasonCode}/players/${leader.personKey}`} className="leader-top">
            {leader.playerImageUrl ? (
              <img
                src={leader.playerImageUrl}
                alt=""
                className="h-14 w-14 flex-none rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <span className="link link-hover block truncate font-medium">
                {leader.playerName ?? leader.personKey}
              </span>
              <span className="muted block truncate text-sm">{leader.clubName ?? leader.clubCode}</span>
            </div>
            <span className="leader-value">{leader.traditional[category.key] ?? "-"}</span>
          </Link>
        ) : null}
      </AsyncState>
    </div>
  );
}

function SeasonLeaders({ seasonCode }) {
  return (
    <Panel className="p-4">
      <PanelHeader
        kicker="LEADERS"
        title="Statistical leaders"
        trailing={
          <Link to={`/${seasonCode}/statistics`} className="panel-link">
            Full leaderboards →
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {LEADER_CATEGORIES.map((category) => (
          <LeaderCard key={category.key} seasonCode={seasonCode} category={category} />
        ))}
      </div>
    </Panel>
  );
}

function SeasonStandingsSnapshot({ seasonCode }) {
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const top = standingsQuery.data?.standings.slice(0, 8) ?? [];

  return (
    <Panel className="p-4">
      <PanelHeader kicker="STANDINGS" title="Standings snapshot" />
      {standingsQuery.isLoading ? (
        <AsyncState status="loading" label="Loading standings" compact />
      ) : standingsQuery.isError ? (
        <AsyncState status="error" inline message="Could not load standings." />
      ) : top.length === 0 ? (
        <p className="muted text-sm">Standings not available yet.</p>
      ) : (
        <>
          <ol className="space-y-2">
            {top.map((entry) => (
              <li key={entry.clubCode} className="flex items-center gap-3">
                <span className={`rank ${entry.basic?.position === 1 ? "rank-1" : ""}`}>
                  {entry.basic?.position ?? "-"}
                </span>
                <Link
                  to={`/${seasonCode}/teams/${entry.clubCode}`}
                  className="link link-hover flex flex-1 items-center gap-2 font-medium"
                >
                  {entry.crestUrl ? (
                    <img
                      src={entry.crestUrl}
                      alt=""
                      className="h-8 w-8 flex-none object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="truncate">{entry.clubName ?? entry.clubCode}</span>
                </Link>
                <span className="muted font-semibold tabular-nums">
                  {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
                </span>
              </li>
            ))}
          </ol>
          <Link to={`/${seasonCode}/standings`} className="panel-link mt-4 inline-block">
            Full standings →
          </Link>
        </>
      )}
    </Panel>
  );
}

// `groupName` is EuroLeague's own series/tie identifier: one game per
// group in Play-In and Final Four, 3-5 games per group in Playoffs
// (best-of-5 series). Grouping by it, rather than by opponent alone,
// keeps two ties against the same opponent in different phases separate.
function championRoadSteps(champion, knockoutPhases, knockoutPhaseGamesQueries) {
  if (!champion) return [];

  const groups = new Map();
  knockoutPhases.forEach((phase, index) => {
    const games = knockoutPhaseGamesQueries[index]?.data?.games ?? [];
    for (const game of games) {
      const isLocal = game.localTeam?.clubCode === champion.clubCode;
      const isRoad = game.roadTeam?.clubCode === champion.clubCode;
      if (!isLocal && !isRoad) continue;

      const key = `${phase.code}:${game.groupName ?? game.gameCode}`;
      if (!groups.has(key)) {
        groups.set(key, {
          phaseCode: phase.code,
          opponent: isLocal ? game.roadTeam : game.localTeam,
          games: [],
          championWins: 0,
          opponentWins: 0,
        });
      }
      const group = groups.get(key);
      group.games.push(game);
      if (game.played && game.localScore != null && game.roadScore != null) {
        const championScore = isLocal ? game.localScore : game.roadScore;
        const opponentScore = isLocal ? game.roadScore : game.localScore;
        if (championScore > opponentScore) group.championWins += 1;
        else if (opponentScore > championScore) group.opponentWins += 1;
      }
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      earliestDate: group.games.map((game) => game.scheduledAt).filter(Boolean).sort()[0] ?? "",
    }))
    .sort(
      (a, b) =>
        phaseSortIndex(a.phaseCode) - phaseSortIndex(b.phaseCode) ||
        (a.earliestDate < b.earliestDate ? -1 : a.earliestDate > b.earliestDate ? 1 : 0),
    );
}

function RoadStep({ step, index }) {
  const isSeries = step.games.length > 1;
  const singleGame = step.games[0];
  const isLocal = singleGame.localTeam?.clubCode !== step.opponent?.clubCode;
  const championScore = isLocal ? singleGame.localScore : singleGame.roadScore;
  const opponentScore = isLocal ? singleGame.roadScore : singleGame.localScore;
  const resultText = isSeries
    ? `Won series ${step.championWins}-${step.opponentWins}`
    : `Won ${championScore}-${opponentScore}`;

  return (
    <Panel className="flex items-center gap-3 border-success bg-success/10 p-4">
      <span className="rank rank-1">{index + 1}</span>
      {step.opponent?.crestUrl ? (
        <img
          src={step.opponent.crestUrl}
          alt=""
          className="h-8 w-8 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">Defeated {teamName(step.opponent)}</p>
        <p className="muted text-xs">{resultText}</p>
      </div>
    </Panel>
  );
}

function RoadToTitle({ steps }) {
  if (steps.length === 0) return null;

  return (
    <div>
      <PanelHeader kicker="JOURNEY" title="Road to the title" />
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <RoadStep key={`${step.phaseCode}-${step.opponent?.clubCode ?? index}`} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}

function ClosingLinksBar({ seasonCode }) {
  const links = [
    { label: "All games", to: `/${seasonCode}/games` },
    { label: "Standings", to: `/${seasonCode}/standings` },
    { label: "Teams", to: `/${seasonCode}/teams` },
    { label: "Playoffs", to: `/${seasonCode}/playoffs` },
  ];

  return (
    <Panel className="p-4">
      <p className="eyebrow mb-3">Keep exploring</p>
      <div className="flex flex-wrap gap-4">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="panel-link">
            {link.label} →
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export default function SeasonOverviewPage() {
  const { seasonCode } = useParams();
  useDocumentTitle(`${formatSeasonLabel(seasonCode)} season overview`);

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];

  // First game of each phase (ascending) gives the phase's game count and
  // start date in one request; a second, descending request gives the end
  // date. Regular Season's team count comes from its standings (every
  // registered team appears there); the knockout phases (Play-In, Playoffs,
  // Final Four) have no standings concept, so their team count is derived
  // from the phase's own games instead, fetched in one request each since
  // a knockout bracket never approaches the API's page-size cap.
  const phaseFirstGameQueries = useQueries({
    queries: phases.map((phase) => ({
      queryKey: ["overview-phase-first-game", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: 1, order: "asc" }),
    })),
  });
  const phaseLastGameQueries = useQueries({
    queries: phases.map((phase) => ({
      queryKey: ["overview-phase-last-game", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: 1, order: "desc" }),
    })),
  });
  // Regular Season's roster is every registered team, regardless of how
  // many rounds have been played; standings entries only materialize once
  // games are played, so they would under-report a not-yet-started season.
  const seasonTeamsQuery = useQuery({
    queryKey: ["teams", seasonCode],
    queryFn: () => getSeasonTeams(seasonCode),
  });
  const knockoutPhases = phases.filter((phase) => phase.code !== "RS");
  const knockoutPhaseGamesQueries = useQueries({
    queries: knockoutPhases.map((phase) => ({
      queryKey: ["overview-phase-games", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: MAX_PAGE_SIZE, order: "asc" }),
    })),
  });

  const totalGamesQuery = useQuery({
    queryKey: ["overview-games-total", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { limit: 1 }),
  });

  const playedGamesQuery = useQuery({
    queryKey: ["overview-played-games", seasonCode],
    queryFn: () => fetchAllPlayedGames(seasonCode),
  });

  const finalFourGamesQuery = useQuery({
    queryKey: ["overview-ff-games", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { phase: "FF", limit: MAX_PAGE_SIZE, order: "asc" }),
    enabled: phases.some((phase) => phase.code === "FF"),
  });

  const phaseSummaries = {};
  phases.forEach((phase, index) => {
    const first = phaseFirstGameQueries[index]?.data;
    const last = phaseLastGameQueries[index]?.data;
    const teamCount =
      phase.code === "RS"
        ? seasonTeamsQuery.data?.teams?.length ?? 0
        : teamCountFromGames(
            knockoutPhaseGamesQueries[knockoutPhases.findIndex((p) => p.code === phase.code)]?.data?.games ?? [],
          );
    phaseSummaries[phase.code] = {
      gameCount: first?.pagination.total ?? 0,
      teamCount,
      dateRange: dateRangeLabel(first?.games[0]?.scheduledAt, last?.games[0]?.scheduledAt),
    };
  });

  const playedGames = playedGamesQuery.data ?? [];
  const activePhase = phases.length > 0 ? currentPhaseFromPlayedGames(phases, playedGames) : null;
  const champion = findChampion(finalFourGamesQuery.data?.games ?? []);
  const roadSteps = championRoadSteps(champion, knockoutPhases, knockoutPhaseGamesQueries);

  const coverageQuery = useQuery({
    queryKey: ["coverage", seasonCode],
    queryFn: () => getCoverage(seasonCode),
  });

  if (phasesQuery.isLoading) return <AsyncState status="loading" label="Loading phases" fullScreen />;
  if (phasesQuery.isError) {
    return (
      <AsyncState status="error" fullScreen message="Could not load this season." onRetry={() => phasesQuery.refetch()} />
    );
  }

  const summaryLoading =
    phaseFirstGameQueries.some((query) => query.isLoading) ||
    phaseLastGameQueries.some((query) => query.isLoading) ||
    knockoutPhaseGamesQueries.some((query) => query.isLoading) ||
    seasonTeamsQuery.isLoading ||
    totalGamesQuery.isLoading ||
    playedGamesQuery.isLoading ||
    finalFourGamesQuery.isLoading;
  const summaryError =
    phaseFirstGameQueries.some((query) => query.isError) ||
    phaseLastGameQueries.some((query) => query.isError) ||
    knockoutPhaseGamesQueries.some((query) => query.isError) ||
    seasonTeamsQuery.isError ||
    totalGamesQuery.isError ||
    playedGamesQuery.isError ||
    finalFourGamesQuery.isError;

  function retrySummary() {
    phaseFirstGameQueries.forEach((query) => query.refetch());
    phaseLastGameQueries.forEach((query) => query.refetch());
    knockoutPhaseGamesQueries.forEach((query) => query.refetch());
    seasonTeamsQuery.refetch();
    totalGamesQuery.refetch();
    playedGamesQuery.refetch();
    finalFourGamesQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="RECAP" title={`EuroLeague ${formatSeasonLabel(seasonCode)}`} />

      {summaryLoading ? (
        <AsyncState status="loading" label="Loading season summary" />
      ) : summaryError ? (
        <AsyncState status="error" message="Could not load this season's summary." onRetry={retrySummary} />
      ) : (
        <>
          <SeasonHero
            champion={champion}
            phaseName={activePhase?.name ?? activePhase?.code ?? "Season"}
            hasPlayedGames={playedGames.length > 0}
          />
          <SummaryCards
            totalGames={totalGamesQuery.data?.pagination.total}
            playedGames={playedGames}
            phases={phases}
            currentPhaseCode={activePhase?.code}
          />
          <PhaseStory phases={phases} phaseSummaries={phaseSummaries} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
            <ScoringTrendChart playedGames={playedGames} />
            <DefiningGames seasonCode={seasonCode} playedGames={playedGames} />
          </div>
          <RoadToTitle steps={roadSteps} />
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SeasonLeaders seasonCode={seasonCode} />
        <SeasonStandingsSnapshot seasonCode={seasonCode} />
      </div>

      <ClosingLinksBar seasonCode={seasonCode} />

      {coverageQuery.isLoading ? (
        <AsyncState status="loading" label="Loading season data coverage" compact />
      ) : coverageQuery.isError ? (
        <AsyncState status="error" inline message="Could not load this season's data coverage." />
      ) : (
        <DataCoveragePanel coverage={coverageQuery.data} title="Season data coverage" full />
      )}
    </div>
  );
}
