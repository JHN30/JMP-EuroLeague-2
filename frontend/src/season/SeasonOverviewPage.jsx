import { useMemo, useRef, useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getLeaderStats, getLeagueTeamStats, getPhases, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { cardHover, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import { withoutComma } from "../lib/playerName";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import RevealImage from "../lib/RevealImage";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useCurrentPhaseCode } from "../lib/useCurrentPhaseCode";
import { useMediaQuery } from "../lib/useMediaQuery";
import { PHASE_NAMES, PHASE_ORDER, dateRangeLabel, isChampionshipLabel, phaseSortIndex } from "../lib/phaseSummary";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";
import { formatDateTime, formatPerGame, formatSeasonLabel } from "../lib/format";
import { teamCode } from "../games/gameUtils";

const MotionLink = motion.create(Link);

const SMALL_CHART_WIDTH = 560;
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
    <div className="season-hero-kpis grid grid-cols-2 gap-3 sm:gap-4" data-testid="season-hero-kpis">
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

function shortName(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

// A team is its crest and a name: its TV code below lg, where the card is narrow, and its short name from lg. Both stay hidden
// from screen readers, which get the full name. Only text is dimmed for the losing side, never the crest. A club without a crest
// (or one that fails to load) is just its name.
function TeamName({ team, dimmed, nameFirst = false }) {
  const [crestFailed, setCrestFailed] = useState(false);
  const crest =
    team?.crestUrl && !crestFailed ? (
      <img src={team.crestUrl} alt="" className="h-6 w-6 flex-none object-contain" onError={() => setCrestFailed(true)} />
    ) : null;
  const name = (
    <>
      <span aria-hidden="true" className={`min-w-0 break-words text-sm font-semibold lg:hidden ${dimmed ? "opacity-60" : ""}`}>
        {teamCode(team)}
      </span>
      <span aria-hidden="true" className={`hidden min-w-0 break-words lg:inline ${dimmed ? "opacity-60" : ""}`}>
        {shortName(team)}
      </span>
    </>
  );
  return (
    <>
      <span className="sr-only">{teamName(team)}</span>
      {nameFirst ? name : crest}
      {nameFirst ? crest : name}
    </>
  );
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
                  <span className={`flex min-w-0 items-center gap-2 font-medium ${localWon ? "highlight-leader font-semibold" : ""}`}>
                    <TeamName team={game.localTeam} dimmed={!localWon} />
                  </span>
                  <span className="badge badge-lg tabular-nums">
                    <span className={localWon ? "highlight-leader font-semibold" : "opacity-60"}>{game.localScore}</span>-
                    <span className={roadWon ? "highlight-leader font-semibold" : "opacity-60"}>{game.roadScore}</span>
                  </span>
                  <span className={`flex min-w-0 items-center justify-end gap-2 font-medium ${roadWon ? "highlight-leader font-semibold" : ""}`}>
                    <TeamName team={game.roadTeam} dimmed={!roadWon} nameFirst />
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
    if (!byRound.has(game.roundNumber)) byRound.set(game.roundNumber, { total: 0, count: 0, phaseCode: game.phaseCode ?? "RS" });
    const entry = byRound.get(game.roundNumber);
    entry.total += game.localScore + game.roadScore;
    entry.count += 1;
  }
  const rounds = [...byRound.entries()].sort(([a], [b]) => a - b);

  // Rounds are numbered straight on from the regular season into the postseason, so a postseason point is named by its
  // phase (and its place within it), not by a number that would read as one more regular-season round.
  const roundsInPhase = new Map();
  for (const [, entry] of rounds) roundsInPhase.set(entry.phaseCode, (roundsInPhase.get(entry.phaseCode) ?? 0) + 1);
  const placeInPhase = new Map();
  return rounds.map(([round, entry]) => {
    const place = (placeInPhase.get(entry.phaseCode) ?? 0) + 1;
    placeInPhase.set(entry.phaseCode, place);
    const phaseName = PHASE_NAMES[entry.phaseCode] ?? entry.phaseCode;
    const name =
      entry.phaseCode === "RS"
        ? `Round ${round}`
        : roundsInPhase.get(entry.phaseCode) > 1
          ? `${phaseName} · round ${place}`
          : phaseName;
    return {
      round,
      phaseCode: entry.phaseCode,
      name,
      // `entry.total` sums both teams' scores per game, so dividing by `count * 2` gives the average points scored per
      // team rather than the combined per-game total.
      value: entry.total / entry.count / 2,
    };
  });
}

// Round 1 and every fifth regular-season round get an axis label (every tenth in a very long series, every round in a
// short one), so a phone-width axis stays horizontal and legible. The postseason is not numbered: a divider marks it, and
// a tooltip names the phase. The chart keeps every round's data, so a tooltip can name any of them.
function axisRoundLabel(point, count) {
  if (point.phaseCode !== "RS") return "";
  if (count <= 8) return String(point.round);
  const step = count > 40 ? 10 : 5;
  return point.round === 1 || point.round % step === 0 ? String(point.round) : "";
}

function scoringSummary(points) {
  const values = points.map((point) => point.value);
  return [
    { label: "Highest", point: points[values.indexOf(Math.max(...values))] },
    { label: "Lowest", point: points[values.indexOf(Math.min(...values))] },
    { label: "Latest", point: points[points.length - 1] },
  ].map(({ label, point }) => ({ label, value: formatPerGame(point.value), name: point.name }));
}

// A dashed line where the postseason begins, labelled above the plot (the label goes left of the line if it would run off).
function postseasonDivider(startIndex, lineColor, textColor) {
  return {
    id: "postseasonDivider",
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const x = (scales.x.getPixelForValue(startIndex - 1) + scales.x.getPixelForValue(startIndex)) / 2;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top - 16);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = textColor;
      ctx.font = `600 11px ${Chart.defaults.font.family}`;
      ctx.textBaseline = "bottom";
      const runsOff = x + 4 + ctx.measureText("Postseason").width > chart.width;
      ctx.textAlign = runsOff ? "right" : "left";
      ctx.fillText("Postseason", runsOff ? x - 4 : x + 4, chartArea.top - 4);
      ctx.restore();
    },
  };
}

function ScoringTrendChart({ playedGames }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const points = useMemo(() => roundScoringSeries(playedGames), [playedGames]);
  const values = useMemo(() => points.map((point) => point.value), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;
    const fillColor = `color-mix(in srgb, ${primary} 15%, transparent)`;
    const postseasonStart = points.findIndex((point) => point.phaseCode !== "RS");
    const hasPostseason = postseasonStart > 0;

    chartRef.current = new Chart(canvas, {
      type: "line",
      plugins: hasPostseason ? [postseasonDivider(postseasonStart, `color-mix(in srgb, ${textColor} 55%, transparent)`, textColor)] : [],
      data: {
        labels: points.map((point) => point.name),
        datasets: [
          {
            label: "Average points per team",
            data: values,
            borderColor: primary,
            backgroundColor: fillColor,
            fill: true,
            // A full season has dozens of rounds: thinner marks keep a narrow chart readable as a line.
            borderWidth: (context) => (context.chart.width < SMALL_CHART_WIDTH ? 2 : 4),
            pointRadius: (context) => (context.chart.width < SMALL_CHART_WIDTH ? 2 : 5),
            pointHoverRadius: 6,
            pointBackgroundColor: primary,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: hasPostseason ? 16 : 0 } },
        scales: {
          x: {
            title: { display: true, text: hasPostseason ? "Regular season round" : "Round", color: textColor },
            ticks: {
              color: textColor,
              autoSkip: false,
              maxRotation: 0,
              callback: (value) => axisRoundLabel(points[value], points.length),
            },
            grid: { color: (context) => (axisRoundLabel(points[context.index], points.length) ? gridColor : "transparent") },
          },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { display: false },
          // A tap or hover anywhere along the chart reads the nearest round: a finger cannot hit a 2px marker.
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: (items) => points[items[0].dataIndex].name,
              label: (item) => `${formatPerGame(item.parsed.y)} points per team`,
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [points, values, theme]);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="TRENDS" title="Scoring through the season" />
      {points.length < 2 ? (
        <p className="muted text-sm">Not enough played games yet to chart a trend.</p>
      ) : (
        <>
          <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
            <div className="relative h-64 w-full">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Average points scored per team per round across the season, from ${Math.round(Math.min(...values))} to ${Math.round(Math.max(...values))} points`}
              />
            </div>
          </div>
          <p className="muted mt-3 text-xs">Average points per team, by round</p>
          <dl className="mt-1 grid grid-cols-3 gap-2">
            {scoringSummary(points).map(({ label, value, name }) => (
              <div key={label} className="rounded-field border border-base-300 bg-base-100/60 p-2">
                <dt className="micro-label">{label}</dt>
                <dd className="text-lg font-bold leading-tight tabular-nums">{value}</dd>
                <dd className="muted text-xs">{name}</dd>
              </div>
            ))}
          </dl>
        </>
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
        <span className="name">{withoutComma(leader.playerName ?? leader.personKey)}</span>
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
  const isSwipeRow = useMediaQuery("not (min-width: 40rem)");
  return (
    <div>
      {showHeading ? (
        <h3 className="mb-2 font-semibold">{PHASE_NAMES[phaseCode] ?? phaseCode}</h3>
      ) : null}
      <motion.div
        className="season-leaders-grid"
        role="group"
        aria-label={`${PHASE_NAMES[phaseCode] ?? phaseCode} leaders`}
        tabIndex={isSwipeRow ? 0 : undefined}
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
        <p className="break-words font-medium">Defeated {teamName(step.opponent)}</p>
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
