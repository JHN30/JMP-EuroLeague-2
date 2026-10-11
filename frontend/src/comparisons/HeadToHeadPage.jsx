import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { Link, useParams, useSearchParams } from "react-router";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getSeasonTeams, getSeasons, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import BackLink from "../lib/BackLink";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import CompactMetric from "../lib/CompactMetric";
import EmptyText from "../lib/EmptyText";
import { formatDateTime } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import ShortLabel from "../lib/ShortLabel";
import { useElementWidth } from "../lib/useElementWidth";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { thinAxisLabels } from "../lib/chartHelpers";

const GAMES_LIMIT = 100;

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

async function fetchCrossSeasonTeams(seasons) {
  const results = await Promise.all(seasons.map((season) => getSeasonTeams(season.seasonCode)));
  const byClubCode = new Map();
  for (const data of results) {
    for (const team of data.teams ?? []) {
      byClubCode.set(team.clubCode, team);
    }
  }
  return [...byClubCode.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function gameTitle(game) {
  return `${game.seasonCode} \u00b7 ${game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)}`;
}

// One bar per meeting: the margin from the first club's side, above the line when it won. The axis shows fewer labels the narrower
// the chart is, and a tap or hover anywhere in a meeting's column opens its tooltip.
function MarginTimeline({ matchups, teamA, teamB, teamAId }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const wellRef = useRef(null);
  const theme = useActiveTheme();
  const wellWidth = useElementWidth(wellRef);
  const maxLabels = Math.max(2, Math.floor(wellWidth / 80));
  const nameA = shortTeamName(teamA);
  const nameB = shortTeamName(teamB);
  const played = useMemo(() => matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null), [matchups]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const text = getComputedStyle(canvas).getPropertyValue("--color-base-content").trim();
    const primary = getComputedStyle(canvas).getPropertyValue("--color-primary").trim();
    const error = getComputedStyle(canvas).getPropertyValue("--color-error").trim();
    const sides = played.map((game) => sideForA(game, teamAId));
    chartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: thinAxisLabels(played.map((game) => `${game.seasonCode} R${game.roundNumber ?? "?"}`), maxLabels),
        datasets: [{ label: `${nameA} margin`, data: sides.map(({ scoreA, scoreB }) => scoreA - scoreB), backgroundColor: sides.map(({ scoreA, scoreB }) => (scoreA >= scoreB ? primary : error)) }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          // The thinned labels are blanks between the shown ones, so the axis must not skip any itself.
          x: { ticks: { color: text, autoSkip: false, maxRotation: 0 }, grid: { color: "transparent" } },
          y: { ticks: { color: text }, grid: { color: `color-mix(in srgb, ${text} 20%, transparent)` } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: (items) => gameTitle(played[items[0].dataIndex]),
              label: (item) => {
                const { scoreA, scoreB } = sides[item.dataIndex];
                const margin = scoreA - scoreB;
                return [`${nameA} ${scoreA}-${scoreB} ${nameB}`, `${nameA} margin: ${margin > 0 ? "+" : ""}${margin}`];
              },
            },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [played, teamAId, theme, maxLabels, nameA, nameB]);
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="MARGINS" title="Meeting margin" />
      <p className="muted mb-2 text-sm">
        Above the line: {nameA} won. Below it: {nameB} won. Hover or tap a bar for the game.
      </p>
      <div ref={wellRef} className="chart-well relative h-64">
        <canvas ref={canvasRef} role="img" aria-label={`Meeting margin timeline from ${nameA}'s perspective`} />
      </div>
    </Panel>
  );
}

function MomentumPanel({ matchups, teamA, teamB, teamAId }) {
  const played = matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const streak = currentStreak(played, teamAId);
  const splits = ["Home", "Away", "Neutral"].map((label) => {
    const games = played.filter((game) => label === "Neutral" ? game.phaseCode === "FF" : label === "Home" ? game.localTeam?.clubCode === teamAId && game.phaseCode !== "FF" : game.roadTeam?.clubCode === teamAId && game.phaseCode !== "FF");
    const record = seriesRecord(games, teamAId);
    return { label, games: games.length, record };
  });
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="MOMENTUM" title="Series momentum" />
      <p className="mb-3 font-semibold">{streak ? `${shortTeamName(streak.won ? teamA : teamB)} has won ${streak.count} straight` : "No completed meetings"}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        {splits.map((split) => (
          <div key={split.label}>
            <dt className="muted">{split.label}</dt>
            <dd className="font-semibold">{split.record.winsA}-{split.record.winsB} ({split.games})</dd>
          </div>
        ))}
      </dl>
      <p className="muted mt-3 text-xs">
        Wins for {shortTeamName(teamA)} to wins for {shortTeamName(teamB)}; Home and Away are {shortTeamName(teamA)}'s venue. Neutral uses Final Four phase as a proxy.
      </p>
    </Panel>
  );
}

async function fetchMergedMatchups(seasonCodes, teamAId, teamBId) {
  const perSeason = await Promise.all(
    seasonCodes.map(async (seasonCode) => {
      const data = await getTeamGames(seasonCode, teamAId, { limit: GAMES_LIMIT, order: "asc" });
      return (data.games ?? [])
        .filter((game) => game.localTeam?.clubCode === teamBId || game.roadTeam?.clubCode === teamBId)
        .map((game) => ({ ...game, seasonCode }));
    }),
  );
  return perSeason.flat().sort((x, y) => new Date(x.scheduledAt ?? 0) - new Date(y.scheduledAt ?? 0));
}

function sideForA(game, teamAId) {
  const homeIsA = game.localTeam?.clubCode === teamAId;
  return {
    homeIsA,
    scoreA: homeIsA ? game.localScore : game.roadScore,
    scoreB: homeIsA ? game.roadScore : game.localScore,
  };
}

function seriesRecord(matchups, teamAId) {
  let winsA = 0;
  let winsB = 0;
  for (const game of matchups) {
    if (!game.played || game.localScore == null || game.roadScore == null) continue;
    const { scoreA, scoreB } = sideForA(game, teamAId);
    if (scoreA > scoreB) winsA += 1;
    else if (scoreB > scoreA) winsB += 1;
  }
  return { winsA, winsB };
}

function currentStreak(playedMatchups, teamAId) {
  if (playedMatchups.length === 0) return null;
  const chronologicalDesc = [...playedMatchups].reverse();
  const wonGame = (game) => {
    const { scoreA, scoreB } = sideForA(game, teamAId);
    return scoreA > scoreB;
  };
  const first = wonGame(chronologicalDesc[0]);
  let count = 0;
  for (const game of chronologicalDesc) {
    if (wonGame(game) !== first) break;
    count += 1;
  }
  return { won: first, count };
}

function TeamPicker({ label, teams, selected, excludeId, onSelect }) {
  return (
    <CompactFilterSelect
      label={label}
      value={selected ?? ""}
      onChange={(event) => onSelect(event.target.value || null)}
    >
      <option value="">Select a team</option>
      {teams
        .filter((team) => team.clubCode !== excludeId)
        .map((team) => (
          <option key={team.clubCode} value={team.clubCode}>
            {team.name ?? team.clubCode}
          </option>
        ))}
    </CompactFilterSelect>
  );
}

// A club in the series header: its crest over its abbreviated name below sm, its crest beside its full name from sm. `mirrored` puts the
// crest on the right of the name from sm.
function IdentityCard({ team, mirrored = false, className = "" }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 ${mirrored ? "sm:flex-row-reverse sm:text-right" : "sm:text-left"} ${className}`}>
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-12 w-12 flex-none object-contain sm:h-14 sm:w-14"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="min-w-0 text-sm font-semibold break-words sm:text-lg">
        <ShortLabel short={shortTeamName(team)} full={team?.name ?? "-"} />
      </span>
    </div>
  );
}

function Hero({ teamA, teamB, matchups, teamAId }) {
  const played = matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const { winsA, winsB } = seriesRecord(played, teamAId);

  return (
    <Panel as="section" className="mb-6 p-4 sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:gap-x-4 sm:gap-y-0">
        <IdentityCard team={teamA} className="col-start-1 row-start-1 sm:row-span-2" />
        <span className="text-primary col-start-2 row-start-1 text-center text-3xl font-black whitespace-nowrap tabular-nums sm:text-4xl">
          {winsA}-{winsB}
        </span>
        <IdentityCard team={teamB} mirrored className="col-start-3 row-start-1 sm:row-span-2" />
        <span className="muted col-span-3 col-start-1 row-start-2 text-center text-sm sm:col-span-1 sm:col-start-2">{played.length} completed meetings</span>
      </div>
    </Panel>
  );
}

// The club that holds the streak: its TV code below sm, its abbreviated name from sm.
function StreakValue({ team, count }) {
  return (
    <>
      <ShortLabel short={teamCode(team)} full={shortTeamName(team)} /> {count}
    </>
  );
}

function SummaryGridStrip({ matchups, teamA, teamB, teamAId }) {
  const played = matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const { winsA, winsB } = seriesRecord(played, teamAId);
  const streak = currentStreak(played, teamAId);
  const totalPoints = played.reduce((sum, game) => sum + (game.localScore ?? 0) + (game.roadScore ?? 0), 0);
  const avgMargin = played.length
    ? played.reduce((sum, game) => {
        const { scoreA, scoreB } = sideForA(game, teamAId);
        return sum + Math.abs(scoreA - scoreB);
      }, 0) / played.length
    : 0;

  return (
    <HeaderStats className="kpi-strip-quad mb-6">
      <CompactMetric value={`${winsA}-${winsB}`} label="Series record" />
      <CompactMetric value={avgMargin.toFixed(1)} label="Avg margin" />
      <CompactMetric
        value={streak ? <StreakValue team={streak.won ? teamA : teamB} count={streak.count} /> : "-"}
        label="Current streak"
      />
      <CompactMetric value={totalPoints.toLocaleString()} label="Total points scored" />
    </HeaderStats>
  );
}

function HeadToHeadBody({ seasonCode, seasons, allTeams }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamAId = searchParams.get("teamA");
  const teamBId = searchParams.get("teamB");

  function selectTeam(key, value) {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }

  function handleSwap() {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (teamBId) next.set("teamA", teamBId); else next.delete("teamA");
      if (teamAId) next.set("teamB", teamAId); else next.delete("teamB");
      return next;
    });
  }

  const teamA = allTeams.find((team) => team.clubCode === teamAId) ?? null;
  const teamB = allTeams.find((team) => team.clubCode === teamBId) ?? null;

  // Every archived season: this is the clubs' all-time series.
  const seasonCodes = seasons.map((season) => season.seasonCode);

  const matchupsQuery = useQuery({
    queryKey: ["head-to-head", teamAId, teamBId, seasonCodes.join(",")],
    queryFn: () => fetchMergedMatchups(seasonCodes, teamAId, teamBId),
    enabled: Boolean(teamAId) && Boolean(teamBId) && seasonCodes.length > 0,
  });

  return (
    <div>
      <BackLink to={`/${seasonCode}/compare`} label="Compare" />
      <PageHeader kicker="HEAD-TO-HEAD" title="Head-to-head" />

      <Panel className="mb-6 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
          <TeamPicker label="Team A" teams={allTeams} selected={teamAId} excludeId={teamBId} onSelect={(v) => selectTeam("teamA", v)} />
          <button
            type="button"
            className="btn btn-outline btn-square btn-sm mx-auto max-sm:h-11 max-sm:w-11"
            aria-label="Swap teams"
            disabled={!teamAId && !teamBId}
            onClick={handleSwap}
          >
            &#8646;
          </button>
          <TeamPicker label="Team B" teams={allTeams} selected={teamBId} excludeId={teamAId} onSelect={(v) => selectTeam("teamB", v)} />
        </div>
      </Panel>

      {!teamA || !teamB ? (
        <EmptyText>Select two teams to see their head-to-head history.</EmptyText>
      ) : matchupsQuery.isPending ? (
        <AsyncState status="loading" label="Loading head-to-head history" />
      ) : matchupsQuery.isError ? (
        <AsyncState status="error" message="Could not load head-to-head history." onRetry={() => matchupsQuery.refetch()} />
      ) : matchupsQuery.data.length === 0 ? (
        <EmptyText>These teams have not met in any archived season.</EmptyText>
      ) : (
        <>
          <Hero teamA={teamA} teamB={teamB} matchups={matchupsQuery.data} teamAId={teamAId} />
          <SummaryGridStrip matchups={matchupsQuery.data} teamA={teamA} teamB={teamB} teamAId={teamAId} />

          <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <MarginTimeline matchups={matchupsQuery.data} teamA={teamA} teamB={teamB} teamAId={teamAId} />
            <MomentumPanel matchups={matchupsQuery.data} teamA={teamA} teamB={teamB} teamAId={teamAId} />
          </div>

          <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <Panel as="section" className="p-4">
              <PanelHeader kicker="NOTABLE" title="Notable meetings" />
              <ul className="text-sm max-sm:divide-y max-sm:divide-base-300 sm:space-y-2">
                {[...matchupsQuery.data].filter((game) => game.played).sort((a, b) => Math.abs((b.localScore ?? 0) - (b.roadScore ?? 0)) - Math.abs((a.localScore ?? 0) - (a.roadScore ?? 0))).slice(0, 3).map((game) => <li key={`margin-${game.seasonCode}-${game.gameCode}`}><Link className="link link-hover flex items-center max-sm:min-h-11" to={`/${game.seasonCode}/games/${game.gameCode}`}>Biggest margin: {game.localScore}-{game.roadScore} ({game.seasonCode})</Link></li>)}
                {[...matchupsQuery.data].filter((game) => game.played).sort((a, b) => ((b.localScore ?? 0) + (b.roadScore ?? 0)) - ((a.localScore ?? 0) + (a.roadScore ?? 0))).slice(0, 3).map((game) => <li key={`points-${game.seasonCode}-${game.gameCode}`}><Link className="link link-hover flex items-center max-sm:min-h-11" to={`/${game.seasonCode}/games/${game.gameCode}`}>Highest scoring: {game.localScore}-{game.roadScore} ({game.seasonCode})</Link></li>)}
              </ul>
            </Panel>
            <Panel as="section" className="p-4">
              <PanelHeader kicker="BY SEASON" title="Season breakdown" />
              <ul className="space-y-2 text-sm">{seasons.filter((season) => matchupsQuery.data.some((game) => game.seasonCode === season.seasonCode)).map((season) => { const games = matchupsQuery.data.filter((game) => game.seasonCode === season.seasonCode); const record = seriesRecord(games, teamAId); return <li key={season.seasonCode} className="flex justify-between gap-3"><span className="min-w-0">{season.name ?? season.seasonCode}</span><span className="flex-none text-right">{games.length} meetings, {record.winsA}-{record.winsB}</span></li>; })}</ul>
            </Panel>
          </div>

          <Panel as="section" className="p-4">
            <PanelHeader kicker="HISTORY" title="Upcoming and latest meetings" />
            <ul className="flex flex-col gap-2">
              {matchupsQuery.data.map((game) => {
                const { scoreA, scoreB } = sideForA(game, teamAId);
                const aWon = game.played && scoreA != null && scoreB != null && scoreA > scoreB;
                const bWon = game.played && scoreA != null && scoreB != null && scoreB > scoreA;
                return (
                  <li key={`${game.seasonCode}-${game.gameCode}`}>
                    <Link
                      to={`/${game.seasonCode}/games/${game.gameCode}`}
                      className="flex flex-col gap-1 rounded-field border border-base-300 p-3 hover:bg-base-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="muted text-sm">{gameTitle(game)}</span>
                      {game.played ? (
                        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                          <span className={aWon ? "text-primary font-bold" : ""}>
                            <ShortLabel short={teamCode(teamA)} full={teamLabel(teamA)} />
                          </span>
                          <span className="tabular-nums">
                            {scoreA ?? "-"}-{scoreB ?? "-"}
                          </span>
                          <span className={bWon ? "text-primary font-bold" : ""}>
                            <ShortLabel short={teamCode(teamB)} full={teamLabel(teamB)} />
                          </span>
                        </span>
                      ) : (
                        <span className="muted text-sm">{formatDateTime(game.scheduledAt)}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

export default function HeadToHeadPage() {
  useDocumentTitle("Head-to-head");
  const { seasonCode } = useParams();

  const seasonsQuery = useQuery({
    queryKey: ["seasons"],
    queryFn: () => getSeasons(),
  });

  const sortedSeasons = [...(seasonsQuery.data?.seasons ?? [])].sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));

  const teamsQuery = useQuery({
    queryKey: ["head-to-head-teams", sortedSeasons.map((s) => s.seasonCode).join(",")],
    queryFn: () => fetchCrossSeasonTeams(sortedSeasons),
    enabled: sortedSeasons.length > 0,
  });

  if (seasonsQuery.isLoading || teamsQuery.isLoading) return <AsyncState status="loading" label="Loading seasons" />;
  if (seasonsQuery.isError) {
    return <AsyncState status="error" message="Could not load seasons." onRetry={() => seasonsQuery.refetch()} />;
  }
  if (teamsQuery.isError) {
    return <AsyncState status="error" message="Could not load teams." onRetry={() => teamsQuery.refetch()} />;
  }

  return <HeadToHeadBody seasonCode={seasonCode} seasons={sortedSeasons} allTeams={teamsQuery.data} />;
}
