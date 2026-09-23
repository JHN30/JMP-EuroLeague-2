import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { Link, useParams, useSearchParams } from "react-router";
import { getSeasonTeams, getSeasons, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import CompactMetric from "../lib/CompactMetric";
import EmptyText from "../lib/EmptyText";
import { formatDateTime } from "../lib/format";
import HeaderStats from "../lib/HeaderStats";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useSeasonRangeParams } from "../lib/useSeasonRangeParams";
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

function MarginTimeline({ matchups, teamAId }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const played = useMemo(() => matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null), [matchups]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const text = getComputedStyle(canvas).getPropertyValue("--color-base-content").trim();
    const primary = getComputedStyle(canvas).getPropertyValue("--color-primary").trim();
    const error = getComputedStyle(canvas).getPropertyValue("--color-error").trim();
    chartRef.current = new Chart(canvas, { type: "bar", data: { labels: thinAxisLabels(played.map((game) => `${game.seasonCode} R${game.roundNumber ?? "?"}`), 8), datasets: [{ label: "Team A margin", data: played.map((game) => { const { scoreA, scoreB } = sideForA(game, teamAId); return scoreA - scoreB; }), backgroundColor: played.map((game) => { const { scoreA, scoreB } = sideForA(game, teamAId); return scoreA >= scoreB ? primary : error; }) }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: text }, grid: { color: "transparent" } }, y: { ticks: { color: text }, grid: { color: `color-mix(in srgb, ${text} 20%, transparent)` } } }, plugins: { legend: { display: false }, tooltip: { mode: "nearest", intersect: true } } } });
    return () => chartRef.current?.destroy();
  }, [played, teamAId, theme]);
  return <Panel as="section" className="p-4"><PanelHeader kicker="MARGINS" title="Meeting margin" /><div className="chart-well relative h-64"><canvas ref={canvasRef} role="img" aria-label="Meeting margin timeline from Team A perspective" /></div></Panel>;
}

function MomentumPanel({ matchups, teamAId }) {
  const played = matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const streak = currentStreak(played, teamAId);
  const splits = ["Home", "Away", "Neutral"].map((label) => {
    const games = played.filter((game) => label === "Neutral" ? game.phaseCode === "FF" : label === "Home" ? game.localTeam?.clubCode === teamAId && game.phaseCode !== "FF" : game.roadTeam?.clubCode === teamAId && game.phaseCode !== "FF");
    const record = seriesRecord(games, teamAId);
    return { label, games: games.length, record };
  });
  return <Panel as="section" className="p-4"><PanelHeader kicker="MOMENTUM" title="Series momentum" /><p className="mb-3 font-semibold">{streak ? `${streak.won ? "Team A" : "Team B"} has won ${streak.count} straight` : "No completed meetings"}</p><dl className="grid grid-cols-3 gap-2 text-sm">{splits.map((split) => <div key={split.label}><dt className="muted">{split.label}</dt><dd className="font-semibold">{split.record.winsA}-{split.record.winsB} ({split.games})</dd></div>)}</dl><p className="muted mt-3 text-xs">Neutral uses Final Four phase as a proxy.</p></Panel>;
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

function IdentityCard({ team, align }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-14 w-14 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="text-lg font-semibold">{team?.name ?? "-"}</span>
    </div>
  );
}

function Hero({ teamA, teamB, matchups, teamAId }) {
  const played = matchups.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const { winsA, winsB } = seriesRecord(played, teamAId);

  return (
    <Panel as="section" className="mb-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <IdentityCard team={teamA} align="left" />
        <div className="text-center">
          <span className="text-primary block text-4xl font-black tabular-nums">
            {winsA}-{winsB}
          </span>
          <span className="muted text-sm">{played.length} completed meetings</span>
        </div>
        <IdentityCard team={teamB} align="right" />
      </div>
    </Panel>
  );
}

function SummaryGridStrip({ matchups, teamAId, teamALabel, teamBLabel }) {
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
    <HeaderStats className="mb-6">
      <CompactMetric value={`${winsA}-${winsB}`} label="Series record" />
      <CompactMetric value={avgMargin.toFixed(1)} label="Avg margin" />
      <CompactMetric
        value={streak ? `${streak.won ? teamALabel : teamBLabel} ${streak.count}` : "-"}
        label="Current streak"
      />
      <CompactMetric value={totalPoints.toLocaleString()} label="Total points scored" />
    </HeaderStats>
  );
}

function HeadToHeadBody({ seasons, allTeams }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamAId = searchParams.get("teamA");
  const teamBId = searchParams.get("teamB");
  const { from, through, setFrom, setThrough } = useSeasonRangeParams(seasons);

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

  const fromIndex = seasons.findIndex((season) => season.seasonCode === from);
  const throughIndex = seasons.findIndex((season) => season.seasonCode === through);
  const selectedSeasonCodes = seasons.slice(fromIndex, throughIndex + 1).map((season) => season.seasonCode);

  const matchupsQuery = useQuery({
    queryKey: ["head-to-head", teamAId, teamBId, selectedSeasonCodes.join(",")],
    queryFn: () => fetchMergedMatchups(selectedSeasonCodes, teamAId, teamBId),
    enabled: Boolean(teamAId) && Boolean(teamBId) && selectedSeasonCodes.length > 0,
  });

  return (
    <div>
      <PageHeader kicker="HEAD-TO-HEAD" title="Head-to-head" />

      <Panel className="mb-6 p-4">
        <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <TeamPicker label="Team A" teams={allTeams} selected={teamAId} excludeId={teamBId} onSelect={(v) => selectTeam("teamA", v)} />
          <button
            type="button"
            className="btn btn-outline btn-square btn-sm mx-auto"
            aria-label="Swap teams"
            disabled={!teamAId && !teamBId}
            onClick={handleSwap}
          >
            &#8646;
          </button>
          <TeamPicker label="Team B" teams={allTeams} selected={teamBId} excludeId={teamAId} onSelect={(v) => selectTeam("teamB", v)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <CompactFilterSelect label="From season" value={from} onChange={(event) => setFrom(event.target.value)}>
            {seasons.map((season) => (
              <option key={season.seasonCode} value={season.seasonCode}>
                {season.name ?? season.seasonCode}
              </option>
            ))}
          </CompactFilterSelect>
          <CompactFilterSelect label="Through season" value={through} onChange={(event) => setThrough(event.target.value)}>
            {seasons.map((season) => (
              <option key={season.seasonCode} value={season.seasonCode}>
                {season.name ?? season.seasonCode}
              </option>
            ))}
          </CompactFilterSelect>
        </div>
      </Panel>

      {!teamA || !teamB ? (
        <EmptyText>Select two teams to see their head-to-head history.</EmptyText>
      ) : matchupsQuery.isPending ? (
        <AsyncState status="loading" label="Loading head-to-head history" />
      ) : matchupsQuery.isError ? (
        <AsyncState status="error" message="Could not load head-to-head history." onRetry={() => matchupsQuery.refetch()} />
      ) : matchupsQuery.data.length === 0 ? (
        <EmptyText>These teams did not meet in this selection - try a wider season range.</EmptyText>
      ) : (
        <>
          <Hero teamA={teamA} teamB={teamB} matchups={matchupsQuery.data} teamAId={teamAId} />
          <SummaryGridStrip
            matchups={matchupsQuery.data}
            teamAId={teamAId}
            teamALabel={teamLabel(teamA)}
            teamBLabel={teamLabel(teamB)}
          />

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <MarginTimeline matchups={matchupsQuery.data} teamAId={teamAId} />
            <MomentumPanel matchups={matchupsQuery.data} teamAId={teamAId} />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Panel as="section" className="p-4">
              <PanelHeader kicker="NOTABLE" title="Notable meetings" />
              <ul className="space-y-2 text-sm">
                {[...matchupsQuery.data].filter((game) => game.played).sort((a, b) => Math.abs((b.localScore ?? 0) - (b.roadScore ?? 0)) - Math.abs((a.localScore ?? 0) - (a.roadScore ?? 0))).slice(0, 3).map((game) => <li key={`margin-${game.seasonCode}-${game.gameCode}`}><Link className="link link-hover" to={`/${game.seasonCode}/games/${game.gameCode}`}>Biggest margin: {game.localScore}-{game.roadScore} ({game.seasonCode})</Link></li>)}
                {[...matchupsQuery.data].filter((game) => game.played).sort((a, b) => ((b.localScore ?? 0) + (b.roadScore ?? 0)) - ((a.localScore ?? 0) + (a.roadScore ?? 0))).slice(0, 3).map((game) => <li key={`points-${game.seasonCode}-${game.gameCode}`}><Link className="link link-hover" to={`/${game.seasonCode}/games/${game.gameCode}`}>Highest scoring: {game.localScore}-{game.roadScore} ({game.seasonCode})</Link></li>)}
              </ul>
            </Panel>
            <Panel as="section" className="p-4">
              <PanelHeader kicker="BY SEASON" title="Season breakdown" />
              <ul className="space-y-2 text-sm">{seasons.filter((season) => selectedSeasonCodes.includes(season.seasonCode)).map((season) => { const games = matchupsQuery.data.filter((game) => game.seasonCode === season.seasonCode); const record = seriesRecord(games, teamAId); return <li key={season.seasonCode} className="flex justify-between"><span>{season.name ?? season.seasonCode}</span><span>{games.length} meetings, {record.winsA}-{record.winsB}</span></li>; })}</ul>
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
                      className="flex items-center justify-between gap-4 rounded-field border border-base-300 p-3 hover:bg-base-200"
                    >
                      <span className="muted text-sm">
                        {game.seasonCode} &middot;{" "}
                        {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)}
                      </span>
                      {game.played ? (
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <span className={aWon ? "text-primary font-bold" : ""}>{teamLabel(teamA)}</span>
                          <span className="tabular-nums">
                            {scoreA ?? "-"}-{scoreB ?? "-"}
                          </span>
                          <span className={bWon ? "text-primary font-bold" : ""}>{teamLabel(teamB)}</span>
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
