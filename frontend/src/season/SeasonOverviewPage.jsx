import { useMemo, useRef, useEffect } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getLeaderStats, getLeagueTeamStats, getPhases, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { cardHover, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import RevealImage from "../lib/RevealImage";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useCurrentPhaseCode } from "../lib/useCurrentPhaseCode";
import { thinAxisLabels } from "../lib/chartHelpers";
import { PHASE_NAMES, PHASE_ORDER, dateRangeLabel, isChampionshipLabel, phaseSortIndex } from "../lib/phaseSummary";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import { formatDateTime, formatPerGame, formatRound, formatSeasonLabel } from "../lib/format";

const MotionLink = motion.create(Link);

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

function SeasonHero({ champion, leader, pointsPerGame }) {
  if (champion) {
    return (
      <Panel className="flex items-center gap-3 p-4">
        <span className="text-2xl" aria-hidden="true">◇</span>
        <p className="text-lg font-semibold">Season finished</p>
      </Panel>
    );
  }

  if (!leader) {
    return (
      <Panel className="flex items-center gap-3 p-4">
        <span className="text-2xl" aria-hidden="true">◇</span>
        <p className="text-lg font-semibold">Season not yet started</p>
      </Panel>
    );
  }

  const ppg = pointsPerGame;

  return (
    <div className="season-hero-kpis grid gap-4 sm:grid-cols-2">
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">League leader</span>
          <span className="name">{leader.clubName ?? leader.clubCode}</span>
          <span className="value">
            {leader.basic?.gamesWon ?? "-"}-{leader.basic?.gamesLost ?? "-"}
          </span>
        </div>
        {leader.crestUrl ? (
          <img
            src={leader.crestUrl}
            alt=""
            className="kpi-chip-image"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">Points per game</span>
          <span className="name">{leader.clubName ?? leader.clubCode}</span>
          <span className="value">{ppg != null ? formatPerGame(ppg) : "-"}</span>
        </div>
        {leader.crestUrl ? (
          <img
            src={leader.crestUrl}
            alt=""
            className="kpi-chip-image"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

const PHASE_BLURBS = {
  RS: "Every team plays every other team home and away.",
  PI: "Teams ranked 7th-10th play for the two remaining playoff spots.",
  PO: "Best-of-five series between the top eight teams.",
  FF: "Championship weekend: the semifinals and the final.",
};

function PhaseStory({ phases, phaseSummaries, activePhaseCode }) {
  // Show the full canonical phase set even when the season's data only has
  // some of them so far (e.g. only Regular Season exists early in the
  // season, before Play-In/Playoffs/Final Four rows are created), so users
  // always see the whole competition path, not just what has data yet.
  const displayPhases = PHASE_ORDER.map(
    (code) => phases.find((phase) => phase.code === code) ?? { code, name: PHASE_NAMES[code] },
  );

  return (
    <div>
      <PanelHeader kicker="TIMELINE" title="Phase story" />
      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {displayPhases.map((phase, index) => {
          const summary = phaseSummaries[phase.code];
          const isActive = phase.code === activePhaseCode;
          return (
            <motion.div key={phase.code} variants={listItem} className="flex items-stretch gap-2">
              <Panel className={`relative flex-1 overflow-hidden p-4 ${isActive ? "border-primary" : ""}`}>
                {isActive ? <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" /> : null}
                <p className="eyebrow mb-1 flex items-center gap-2">
                  Phase {index + 1}
                  {isActive ? <span className="badge badge-primary badge-sm">Current</span> : null}
                </p>
                <h3 className="mb-2 font-semibold">{phase.name ?? PHASE_NAMES[phase.code] ?? phase.code}</h3>
                {!summary || !summary.dateRange ? (
                  <p className="muted text-sm">Not yet applicable</p>
                ) : (
                  <p className="muted text-sm">{summary.dateRange}</p>
                )}
                {PHASE_BLURBS[phase.code] ? (
                  <p className="muted mt-1 text-xs">{PHASE_BLURBS[phase.code]}</p>
                ) : null}
              </Panel>
              {index < displayPhases.length - 1 ? (
                <span className="muted hidden self-center text-lg xl:inline" aria-hidden="true">→</span>
              ) : null}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

// Instead of just the 4 closest games, mix in different kinds of
// "defining" games so the section shows a variety, not four near-identical
// nail-biters. Each pick avoids games already chosen by an earlier category.
function pickDefiningGames(playedGames) {
  const withScores = playedGames
    .filter((game) => game.localScore != null && game.roadScore != null)
    .map((game) => ({
      game,
      margin: Math.abs(game.localScore - game.roadScore),
      combined: game.localScore + game.roadScore,
    }));

  const chosen = new Map();
  function take(sorted, tag) {
    for (const entry of sorted) {
      if (!chosen.has(entry.game.gameCode)) {
        chosen.set(entry.game.gameCode, { ...entry, tag });
        return;
      }
    }
  }

  take([...withScores].sort((a, b) => a.margin - b.margin), "Closest game");
  take([...withScores].sort((a, b) => b.combined - a.combined), "Highest-scoring game");
  take([...withScores].sort((a, b) => a.combined - b.combined), "Lowest-scoring game");
  take([...withScores].sort((a, b) => b.margin - a.margin), "Biggest blowout");

  return [...chosen.values()];
}

function DefiningGames({ seasonCode, playedGames }) {
  const picks = pickDefiningGames(playedGames);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="HIGHLIGHTS" title="Defining games" />
      {picks.length === 0 ? (
        <p className="muted text-sm">No played games yet this season.</p>
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {picks.map(({ game, margin, combined, tag }) => {
            const localWon = game.localScore > game.roadScore;
            const roadWon = game.roadScore > game.localScore;
            const roundLabel = game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : "");
            const showGroupName = game.phaseCode !== "RS" && game.groupName;
            const context = showGroupName ? `${game.groupName} · ${roundLabel}` : roundLabel;
            const statDetail =
              tag === "Highest-scoring game" || tag === "Lowest-scoring game"
                ? `${combined} combined points`
                : tag === "Biggest blowout"
                  ? `Won by ${margin}`
                  : `Decided by ${margin}`;
            return (
              <MotionLink
                key={game.gameCode}
                to={`/${seasonCode}/games/${game.gameCode}`}
                className="card card-border bg-base-100 p-3 transition-colors hover:border-primary"
                variants={listItem}
                {...cardHover}
              >
                <p className="eyebrow mb-1">{tag}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className={`flex min-w-0 items-center gap-2 font-medium ${localWon ? "highlight-leader font-semibold" : "opacity-60"}`}>
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
                  <span className="badge badge-lg tabular-nums">
                    <span className={localWon ? "highlight-leader font-semibold" : "opacity-60"}>{game.localScore}</span>-
                    <span className={roadWon ? "highlight-leader font-semibold" : "opacity-60"}>{game.roadScore}</span>
                  </span>
                  <span className={`flex min-w-0 items-center justify-end gap-2 font-medium ${roadWon ? "highlight-leader font-semibold" : "opacity-60"}`}>
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
                  {context} · {statDetail} · {formatDateTime(game.scheduledAt)}
                </p>
              </MotionLink>
            );
          })}
        </motion.div>
      )}
    </Panel>
  );
}

function roundScoringSeries(playedGames) {
  const byRound = new Map();
  for (const game of playedGames) {
    if (game.localScore == null || game.roadScore == null || game.roundNumber == null) continue;
    if (!byRound.has(game.roundNumber)) byRound.set(game.roundNumber, { total: 0, count: 0 });
    const entry = byRound.get(game.roundNumber);
    entry.total += game.localScore + game.roadScore;
    entry.count += 1;
  }
  const rounds = [...byRound.entries()].sort(([a], [b]) => a - b);
  return {
    labels: rounds.map(([roundNumber]) => formatRound(roundNumber)),
    // `entry.total` sums both teams' scores per game, so dividing by
    // `count * 2` gives the average points scored per team rather than
    // the combined per-game total.
    values: rounds.map(([, entry]) => entry.total / entry.count / 2),
  };
}

function ScoringTrendChart({ playedGames }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { labels, values } = useMemo(() => roundScoringSeries(playedGames), [playedGames]);
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
            label: "Average points per team",
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
              aria-label={`Average points scored per team per round across the season, from ${Math.round(Math.min(...values))} to ${Math.round(Math.max(...values))} points`}
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
  { key: "steals", label: "Steals per game" },
  { key: "blocks", label: "Blocks per game" },
  { key: "pir", label: "PIR per game" },
];

function LeaderCard({ seasonCode, category, phaseCode }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, phaseCode, "perGame", category.key],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: phaseCode, mode: "perGame", sort: category.key, order: "desc", limit: 1, qualified: true }),
  });
  const leader = query.data?.players[0] ?? null;
  const status = query.isLoading ? "loading" : query.isError ? "error" : !leader ? "empty" : "ready";

  if (status !== "ready") {
    return (
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">{category.label}</span>
          <AsyncState inline status={status} message={query.isError ? "Could not load." : "Not available yet."} />
        </div>
      </div>
    );
  }

  return (
    <MotionLink
      to={`/${seasonCode}/players/${leader.personKey}`}
      className="kpi-chip kpi-chip-link"
      variants={listItem}
      {...cardHover}
    >
      <div className="kpi-chip-body">
        <span className="label">{category.label}</span>
        <span className="name">{leader.playerName ?? leader.personKey}</span>
        <span className="club">{leader.clubName ?? leader.clubCode}</span>
        <span className="value">{leader.traditional[category.key] ?? "-"}</span>
      </div>
      {leader.playerImageUrl ? (
        <RevealImage src={leader.playerImageUrl} effect="wipe" className="kpi-chip-image" />
      ) : null}
    </MotionLink>
  );
}

function PhaseLeadersGroup({ seasonCode, phaseCode, showHeading }) {
  return (
    <div>
      {showHeading ? (
        <h3 className="mb-2 font-semibold">{PHASE_NAMES[phaseCode] ?? phaseCode}</h3>
      ) : null}
      <motion.div
        className="season-leaders-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {LEADER_CATEGORIES.map((category) => (
          <LeaderCard key={category.key} seasonCode={seasonCode} category={category} phaseCode={phaseCode} />
        ))}
      </motion.div>
    </div>
  );
}

function SeasonLeaders({ seasonCode }) {
  const phaseCode = useCurrentPhaseCode(seasonCode);
  // Once postseason stats (a combined "PS" phase) are available from the
  // pipeline, this can go back to a single phase - for now, a season that
  // has moved past Regular Season shows both, since RS and postseason
  // leaders are each genuinely interesting and there's no combined view yet.
  const phasesToShow = phaseCode === "RS" ? ["RS"] : ["RS", phaseCode];

  return (
    <Panel className="p-4">
      <PanelHeader
        kicker="LEADERS"
        title={phasesToShow.length === 1 ? (PHASE_NAMES[phaseCode] ?? phaseCode) : "Statistical leaders"}
        trailing={
          <Link to={`/${seasonCode}/leaders`} className="panel-link">
            Full leaderboards →
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        {phasesToShow.map((code) => (
          <PhaseLeadersGroup
            key={code}
            seasonCode={seasonCode}
            phaseCode={code}
            showHeading={phasesToShow.length > 1}
          />
        ))}
      </div>
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

function RoadToTitle({ champion, steps }) {
  if (!champion || steps.length === 0) return null;

  const totalWins = steps.reduce((sum, step) => sum + step.championWins, 0);
  const totalLosses = steps.reduce((sum, step) => sum + step.opponentWins, 0);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="JOURNEY" title="Road to the title" />
      <div className="mb-4 flex items-center gap-4 rounded-field border border-success bg-success/10 p-4">
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
        <div className="min-w-0 flex-1">
          <p className="text-success text-xs font-bold uppercase tracking-wide">Season champion</p>
          <p className="text-xl font-semibold">{teamName(champion)}</p>
          <p className="muted mt-1 text-sm">
            {totalWins}-{totalLosses} in the postseason · defeated {steps.length}{" "}
            {steps.length === 1 ? "opponent" : "opponents"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <RoadStep key={`${step.phaseCode}-${step.opponent?.clubCode ?? index}`} step={step} index={index} />
        ))}
      </div>
    </Panel>
  );
}

export default function SeasonOverviewPage() {
  const { seasonCode } = useParams();
  useDocumentTitle("Overview");

  const phasesQuery = useQuery({
    queryKey: ["phases", seasonCode],
    queryFn: () => getPhases(seasonCode),
  });
  const phases = phasesQuery.data?.phases ?? [];

  // First game of each phase (ascending) gives its start date; a second,
  // descending request gives the end date.
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
  const knockoutPhases = phases.filter((phase) => phase.code !== "RS");
  const knockoutPhaseGamesQueries = useQueries({
    queries: knockoutPhases.map((phase) => ({
      queryKey: ["overview-phase-games", seasonCode, phase.code],
      queryFn: () => getSeasonGames(seasonCode, { phase: phase.code, limit: MAX_PAGE_SIZE, order: "asc" }),
    })),
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

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const leader = standingsQuery.data?.standings.find((entry) => entry.basic?.position === 1) ?? null;
  // The leader's points per game from the team totals (overtime counted), not the standings' regulation-only points.
  const leagueTeamStatsQuery = useQuery({
    queryKey: ["league-team-stats", seasonCode, "RS"],
    queryFn: () => getLeagueTeamStats(seasonCode, "RS"),
  });
  const leaderTotals = leagueTeamStatsQuery.data?.teams.find((team) => team.clubCode === leader?.clubCode);
  const leaderPointsPerGame = leaderTotals?.gamesPlayed ? Number(leaderTotals.own?.points) / leaderTotals.gamesPlayed : null;

  const phaseSummaries = {};
  phases.forEach((phase, index) => {
    const first = phaseFirstGameQueries[index]?.data;
    const last = phaseLastGameQueries[index]?.data;
    phaseSummaries[phase.code] = {
      dateRange: dateRangeLabel(first?.games[0]?.scheduledAt, last?.games[0]?.scheduledAt),
    };
  });

  const playedGames = playedGamesQuery.data ?? [];
  const activePhase = phases.length > 0 ? currentPhaseFromPlayedGames(phases, playedGames) : null;
  const champion = findChampion(finalFourGamesQuery.data?.games ?? []);
  const roadSteps = championRoadSteps(champion, knockoutPhases, knockoutPhaseGamesQueries);

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
    playedGamesQuery.isLoading ||
    finalFourGamesQuery.isLoading ||
    standingsQuery.isLoading;
  const summaryError =
    phaseFirstGameQueries.some((query) => query.isError) ||
    phaseLastGameQueries.some((query) => query.isError) ||
    knockoutPhaseGamesQueries.some((query) => query.isError) ||
    playedGamesQuery.isError ||
    finalFourGamesQuery.isError ||
    standingsQuery.isError;

  function retrySummary() {
    phaseFirstGameQueries.forEach((query) => query.refetch());
    phaseLastGameQueries.forEach((query) => query.refetch());
    knockoutPhaseGamesQueries.forEach((query) => query.refetch());
    playedGamesQuery.refetch();
    finalFourGamesQuery.refetch();
    standingsQuery.refetch();
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <PageHeader stacked kicker="RECAP" title={`EuroLeague ${formatSeasonLabel(seasonCode)}`} />
      </motion.div>

      {summaryLoading ? (
        <AsyncState status="loading" label="Loading season summary" />
      ) : summaryError ? (
        <AsyncState status="error" message="Could not load this season's summary." onRetry={retrySummary} />
      ) : (
        <>
          <motion.div variants={sectionItem}>
            <SeasonHero champion={champion} leader={leader} pointsPerGame={leaderPointsPerGame} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <PhaseStory
              phases={phases}
              phaseSummaries={phaseSummaries}
              activePhaseCode={champion ? null : activePhase?.code}
            />
          </motion.div>
          <motion.div variants={sectionItem}>
            <ScoringTrendChart playedGames={playedGames} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <DefiningGames seasonCode={seasonCode} playedGames={playedGames} />
          </motion.div>
        </>
      )}

      {/* Leaders has its own independent per-category loading/error state
          (see LeaderCard), so it isn't gated behind the summary queries
          above - it can render before or after them finish. */}
      <motion.div variants={sectionItem}>
        <SeasonLeaders seasonCode={seasonCode} />
      </motion.div>

      {summaryLoading || summaryError ? null : (
        <motion.div variants={sectionItem}>
          <RoadToTitle champion={champion} steps={roadSteps} />
        </motion.div>
      )}
    </motion.div>
  );
}
