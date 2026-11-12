import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "chart.js/auto";
import { Link, useParams } from "react-router";
import { useLiveSearchParams } from "../lib/useLiveSearchParams";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getHeadToHeadGames, getHeadToHeadTeams, getSeasons } from "../lib/api";
import { seasonSlug } from "../lib/seasonSlug";
import AsyncState from "../lib/AsyncState";
import HeadToHeadSkeleton, { HeadToHeadHistorySkeleton, SeriesFiguresSkeleton } from "./HeadToHeadSkeleton";
import { isForfeit } from "../lib/forfeit";
import BackLink from "../lib/BackLink";
import CompactFilterSelect from "../lib/CompactFilterSelect";
import EmptyText from "../lib/EmptyText";
import { formatDate, formatSeasonLabel } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import PageHeader from "../lib/PageHeader";
import ShortLabel from "../lib/ShortLabel";
import { useElementWidth } from "../lib/useElementWidth";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { thinAxisLabels } from "../lib/chartHelpers";

// The latest played meetings the history shows before the rest are folded away, and the meetings in the form strip.
const HISTORY_SHOWN = 10;
const FORM_SHOWN = 10;
// A meeting decided by this many points or fewer is a close game.
const CLOSE_MARGIN = 5;

// The stages a meeting can be played in, in the order the records list them. A stage the clubs never met in is left out.
const STAGES = [
  { code: "RS", label: "Regular season" },
  { code: "TS", label: "Top 16" },
  { code: "PI", label: "Play-in" },
  { code: "PO", label: "Playoffs" },
  { code: "FF", label: "Final Four" },
];

function teamLabel(team) {
  return team?.abbreviatedName ?? team?.name ?? "TBD";
}

// The clubs and meetings span every archived season, so they are asked of the latest one, whichever season the page shows.
function latestSeasonCode(seasons) {
  return seasons[seasons.length - 1].seasonCode;
}

// Every club across the archived seasons, as it appears in the latest season it played.
async function fetchCrossSeasonTeams(seasons) {
  const data = await getHeadToHeadTeams(latestSeasonCode(seasons));
  return [...(data.teams ?? [])].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
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
  return `${game.seasonCode} · ${game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)}`;
}

const isComplete = (game) => game.played && game.localScore != null && game.roadScore != null;

function sideForA(game, teamAId) {
  const homeIsA = game.localTeam?.clubCode === teamAId;
  return {
    homeIsA,
    scoreA: homeIsA ? game.localScore : game.roadScore,
    scoreB: homeIsA ? game.roadScore : game.localScore,
  };
}

// "A" or "B" for the club that won a played meeting, null for one not played (or level).
function winnerOf(game, teamAId) {
  if (!isComplete(game)) return null;
  const { scoreA, scoreB } = sideForA(game, teamAId);
  return scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;
}

// Team A's venue: the Final Four is played on a neutral court.
function venueForA(game, teamAId) {
  if (game.phaseCode === "FF") return "N";
  return game.localTeam?.clubCode === teamAId ? "H" : "A";
}

function seriesRecord(matchups, teamAId) {
  let winsA = 0;
  let winsB = 0;
  for (const game of matchups) {
    const winner = winnerOf(game, teamAId);
    if (winner === "A") winsA += 1;
    else if (winner === "B") winsB += 1;
  }
  return { winsA, winsB };
}

function currentStreak(playedMatchups, teamAId) {
  if (playedMatchups.length === 0) return null;
  const chronologicalDesc = [...playedMatchups].reverse();
  const first = winnerOf(chronologicalDesc[0], teamAId) === "A";
  let count = 0;
  for (const game of chronologicalDesc) {
    if ((winnerOf(game, teamAId) === "A") !== first) break;
    count += 1;
  }
  return { won: first, count };
}

// Each club's longest run of straight wins in the series, played meetings in date order.
function longestRuns(playedMatchups, teamAId) {
  const best = { A: 0, B: 0 };
  let holder = null;
  let run = 0;
  for (const game of playedMatchups) {
    const winner = winnerOf(game, teamAId);
    run = winner && winner === holder ? run + 1 : winner ? 1 : 0;
    holder = winner;
    if (winner) best[winner] = Math.max(best[winner], run);
  }
  return best;
}

// The colour of a meeting's chip or dot, as in the margin chart: primary when Team A won, secondary when Team B won.
const winnerColour = (winner) => (winner === "A" ? "bg-primary text-primary-content" : winner === "B" ? "bg-secondary text-secondary-content" : "border border-base-300");

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
  // The margin chart leaves out a recorded forfeit: its awarded score is not a margin played on court.
  const played = useMemo(() => matchups.filter((game) => isComplete(game) && !isForfeit(game)), [matchups]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const text = getComputedStyle(canvas).getPropertyValue("--color-base-content").trim();
    const primary = getComputedStyle(canvas).getPropertyValue("--color-primary").trim();
    const secondary = getComputedStyle(canvas).getPropertyValue("--color-secondary").trim();
    const sides = played.map((game) => sideForA(game, teamAId));
    chartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: thinAxisLabels(played.map((game) => `${game.seasonCode} R${game.roundNumber ?? "?"}`), maxLabels),
        datasets: [{ label: `${nameA} margin`, data: sides.map(({ scoreA, scoreB }) => scoreA - scoreB), backgroundColor: sides.map(({ scoreA, scoreB }) => (scoreA >= scoreB ? primary : secondary)) }],
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
    <Panel as="section" className="p-4 lg:flex lg:flex-col">
      <PanelHeader
        kicker="MARGINS"
        title={<HeaderTip tip={`Above the line: ${nameA} won. Below it: ${nameB} won. Hover or tap a bar for the game.`}>Meeting margin</HeaderTip>}
      />
      {/* The canvas is placed in the well's padding box, so the chart takes the well's size and never sets it: from lg the
          well grows to the height of the records beside it. */}
      <div ref={wellRef} className="chart-well relative h-40 lg:h-auto lg:min-h-40">
        <canvas ref={canvasRef} className="absolute inset-2" role="img" aria-label={`Meeting margin timeline from ${nameA}'s perspective`} />
      </div>
    </Panel>
  );
}

// A club's crest, or nothing when it has none (or it fails to load).
function Crest({ url, className = "size-5" }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className={`flex-none object-contain ${className}`}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

// A record row: its label, A's wins, a bar split between the two clubs' wins, B's wins, then the games. The side with more wins is
// bold in its colour. The figures are read out as one sentence.
function RecordRow({ label, spoken, winsA, winsB, games, teamA, teamB }) {
  const total = winsA + winsB;
  const share = total ? (winsA / total) * 100 : 50;
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem_2.5rem] items-center gap-x-2 gap-y-1 py-1.5 sm:grid-cols-[minmax(7rem,11rem)_2.75rem_minmax(0,1fr)_2.75rem_2.5rem] sm:gap-x-3">
      <span className="sr-only">
        {spoken}: {shortTeamName(teamA)} {winsA}, {shortTeamName(teamB)} {winsB}{games != null ? `, ${games} games` : ""}
      </span>
      <span aria-hidden="true" className="col-span-4 text-sm sm:col-span-1">{label}</span>
      <span aria-hidden="true" className={`text-end tabular-nums ${winsA > winsB ? "text-primary font-bold" : ""}`}>{winsA}</span>
      <span aria-hidden="true" className="bg-base-300 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {total ? (
          <>
            {winsA ? <span className="bg-primary h-full" style={{ width: `${share}%` }} /> : null}
            {winsB ? <span className="bg-secondary h-full flex-1" /> : null}
          </>
        ) : null}
      </span>
      <span aria-hidden="true" className={`tabular-nums ${winsB > winsA ? "text-secondary font-bold" : ""}`}>{winsB}</span>
      <span aria-hidden="true" className="muted text-end text-xs tabular-nums">{games ?? ""}</span>
    </li>
  );
}

// A club's head over its column: its crest and TV code, in its colour.
function ColumnHead({ team, colour, mirrored = false }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${colour} ${mirrored ? "" : "flex-row-reverse"}`}>
      <Crest url={team?.crestUrl} className="size-4 max-sm:hidden" />
      {teamCode(team)}
    </span>
  );
}

// The series split by the stage of the season, by Team A's venue, in close games, and each club's longest run of wins. Forfeits count in
// the stage and venue records and in the runs; close games are real games only.
function RecordsByType({ matchups, teamA, teamB, teamAId }) {
  const played = matchups.filter(isComplete);
  const row = (label, spoken, games) => ({ label, spoken, games: games.length, ...seriesRecord(games, teamAId) });
  const stages = STAGES.map((stage) => row(stage.label, stage.label, played.filter((game) => game.phaseCode === stage.code))).filter((entry) => entry.games > 0);
  const venues = [
    row(<>At <ShortLabel short={teamCode(teamA)} full={shortTeamName(teamA)} /></>, `At ${shortTeamName(teamA)}`, played.filter((game) => venueForA(game, teamAId) === "H")),
    row(<>At <ShortLabel short={teamCode(teamB)} full={shortTeamName(teamB)} /></>, `At ${shortTeamName(teamB)}`, played.filter((game) => venueForA(game, teamAId) === "A")),
    row("Neutral (Final Four)", "Neutral (Final Four)", played.filter((game) => venueForA(game, teamAId) === "N")),
  ].filter((entry, index) => index < 2 || entry.games > 0);
  const closeLabel = `Close games (\u2264${CLOSE_MARGIN})`;
  const close = row(closeLabel, closeLabel, played.filter((game) => !isForfeit(game) && Math.abs(game.localScore - game.roadScore) <= CLOSE_MARGIN));
  const runs = longestRuns(played, teamAId);
  const groups = [
    ["By stage", stages],
    ["By venue", venues],
    ["Other", [close, { label: "Longest run", spoken: "Longest run", winsA: runs.A, winsB: runs.B, games: null }]],
  ];
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="RECORDS" title="Records by type of game" />
      <div aria-hidden="true" className="muted grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem_2.5rem] items-end gap-x-2 pb-1 text-xs sm:grid-cols-[minmax(7rem,11rem)_2.75rem_minmax(0,1fr)_2.75rem_2.5rem] sm:gap-x-3">
        <span className="max-sm:hidden" />
        <span className="flex justify-end"><ColumnHead team={teamA} colour="text-primary" /></span>
        <span />
        <ColumnHead team={teamB} colour="text-secondary" mirrored />
        <span className="text-end">Games</span>
      </div>
      <div className="flex flex-col gap-2">
        {groups.map(([title, entries]) => (
          <div key={title}>
            <p className="eyebrow border-base-300 border-b pb-1 text-[0.65rem]">{title}</p>
            <ul className="divide-base-300 divide-y">
              {entries.map((entry, index) => <RecordRow key={index} {...entry} teamA={teamA} teamB={teamB} />)}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TeamPicker({ label, teams, selected, excludeId, onSelect, className = "" }) {
  return (
    <CompactFilterSelect
      label={label}
      className={className}
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

// The club that holds the streak: its TV code below sm, its abbreviated name from sm.
function StreakValue({ team, count }) {
  return (
    <>
      <ShortLabel short={teamCode(team)} full={shortTeamName(team)} /> {count}
    </>
  );
}

function Figure({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="muted text-xs">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

// "CZV 80-70 KBA", Team A always first.
function scoreLine(game, teamA, teamB, teamAId) {
  const { scoreA, scoreB } = sideForA(game, teamAId);
  return `${teamCode(teamA)} ${scoreA}-${scoreB} ${teamCode(teamB)}`;
}

// The last meetings, oldest first: a chip with the winner's TV code per meeting, linking to its game.
function FormStrip({ played, teamA, teamB, teamAId }) {
  const last = played.slice(-FORM_SHOWN);
  return (
    <div className="min-w-0">
      <p className="muted mb-1 text-xs">Last {last.length}</p>
      <ol className="grid grid-cols-5 gap-1 sm:grid-cols-10" aria-label={`Last ${last.length} meetings, oldest first`}>
        {last.map((game) => {
          const winner = winnerOf(game, teamAId);
          const label = `${gameTitle(game)}: ${scoreLine(game, teamA, teamB, teamAId)}`;
          return (
            <li key={`${game.seasonCode}-${game.gameCode}`}>
              <Link
                to={`/${game.seasonCode}/games/${game.gameCode}`}
                title={label}
                aria-label={label}
                className={`rounded-field flex items-center justify-center text-xs font-bold max-sm:min-h-11 sm:h-7 sm:px-1 ${winnerColour(winner)}`}
              >
                {winner ? teamCode(winner === "A" ? teamA : teamB) : "-"}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// The averages, the streak and the last meetings, under the pickers. The record counts a recorded forfeit; points and margins do not,
// since its awarded score was not played.
function SeriesFigures({ teamA, teamB, played, teamAId }) {
  const streak = currentStreak(played, teamAId);
  const real = played.filter((game) => !isForfeit(game)).map((game) => sideForA(game, teamAId));
  const average = (pick) => (real.length ? (real.reduce((sum, side) => sum + pick(side), 0) / real.length).toFixed(1) : "-");
  return (
    <div className="border-base-300 mt-3 flex flex-col gap-3 border-t pt-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-8">
        <Figure label="Avg score">
          {teamCode(teamA)} {average((side) => side.scoreA)} &middot; {teamCode(teamB)} {average((side) => side.scoreB)}
        </Figure>
        <Figure label="Avg margin">{average((side) => Math.abs(side.scoreA - side.scoreB))}</Figure>
        <Figure label="Current streak">{streak ? <StreakValue team={streak.won ? teamA : teamB} count={streak.count} /> : "-"}</Figure>
      </dl>
      {played.length ? <FormStrip played={played} teamA={teamA} teamB={teamB} teamAId={teamAId} /> : null}
    </div>
  );
}

// The series header: each club's crest and select, the record and the swap button between them, then the figures once the meetings have
// loaded (or their placeholder while they load). Below sm the three stack.
function SeriesHeader({ teamA, teamB, teamAId, pickerA, pickerB, swap, played, figures }) {
  const record = played ? seriesRecord(played, teamAId) : null;
  return (
    <Panel as="section" className="mb-6 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Crest url={teamA?.crestUrl} className="size-10 sm:size-12" />
          {pickerA}
        </div>
        <div className="flex items-center justify-center gap-3 sm:flex-col sm:gap-1">
          {record ? (
            <div className="flex flex-col items-center">
              <span className="text-primary text-3xl font-black whitespace-nowrap tabular-nums sm:text-4xl">
                {record.winsA}-{record.winsB}
              </span>
              <span className="muted text-center text-xs whitespace-nowrap">{played.length} completed meetings</span>
            </div>
          ) : null}
          {swap}
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:flex-row-reverse">
          <Crest url={teamB?.crestUrl} className="size-10 sm:size-12" />
          {pickerB}
        </div>
      </div>
      {figures}
    </Panel>
  );
}

// A side of a meeting: that season's crest, from the game, or the club's latest.
const crestOf = (game, team) => (game.localTeam?.clubCode === team?.clubCode ? game.localTeam?.crestUrl : game.roadTeam?.crestUrl) ?? team?.crestUrl;

// The score of a meeting as a scoreboard: A's name and crest to the left of the score, B's crest and name to its right, so the scores
// line up down a list. The winner is bold in its colour; TV codes below sm, abbreviated names from sm.
function Scoreboard({ game, teamA, teamB, teamAId }) {
  const { scoreA, scoreB } = sideForA(game, teamAId);
  const winner = winnerOf(game, teamAId);
  return (
    <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
      <span className={`flex min-w-0 items-center justify-end gap-1.5 text-end ${winner === "A" ? "text-primary font-bold" : ""}`}>
        <span className="min-w-0 truncate">
          <ShortLabel short={teamCode(teamA)} full={teamLabel(teamA)} />
        </span>
        <Crest url={crestOf(game, teamA)} />
      </span>
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {isForfeit(game) ? <span className="muted me-1 text-xs font-normal">Forfeit</span> : null}
        {scoreA ?? "-"}-{scoreB ?? "-"}
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 ${winner === "B" ? "text-secondary font-bold" : ""}`}>
        <Crest url={crestOf(game, teamB)} />
        <span className="min-w-0 truncate">
          <ShortLabel short={teamCode(teamB)} full={teamLabel(teamB)} />
        </span>
      </span>
    </span>
  );
}

// A notable meeting as a card: its label, both clubs around a big score with the winner in its colour, then the game and its figure.
function NotableCard({ label, game, figure, teamA, teamB, teamAId }) {
  if (!game) {
    return (
      <div className="rounded-box border-base-300 flex flex-col gap-2 border p-3">
        <span className="eyebrow text-[0.65rem]">{label}</span>
        <span className="muted text-sm">No meeting</span>
      </div>
    );
  }
  const { scoreA, scoreB } = sideForA(game, teamAId);
  const winner = winnerOf(game, teamAId);
  const side = (team, mine, colour, mirrored) => (
    <span className={`flex min-w-0 items-center gap-1.5 text-sm ${mirrored ? "flex-row-reverse" : ""} ${winner === mine ? `${colour} font-bold` : "muted"}`}>
      <Crest url={crestOf(game, team)} className="size-7" />
      {teamCode(team)}
    </span>
  );
  return (
    <Link to={`/${game.seasonCode}/games/${game.gameCode}`} className="rounded-box border-base-300 hover:bg-base-200 flex flex-col gap-2 border p-3">
      <span className="eyebrow text-[0.65rem]">{label}</span>
      <span className="flex items-center justify-between gap-2">
        {side(teamA, "A", "text-primary", false)}
        <span className="text-xl font-black whitespace-nowrap tabular-nums">
          {scoreA}-{scoreB}
        </span>
        {side(teamB, "B", "text-secondary", true)}
      </span>
      <span className="muted flex justify-between gap-2 text-xs">
        <span className="min-w-0 truncate">{gameTitle(game)}</span>
        <span className="tabular-nums">{figure(game)}</span>
      </span>
    </Link>
  );
}

// Each club's biggest win, and the highest- and lowest-scoring meetings. Forfeits are left out: their awarded scores were not played.
function NotableMeetings({ matchups, teamA, teamB, teamAId }) {
  const real = matchups.filter((game) => isComplete(game) && !isForfeit(game));
  const marginA = (game) => {
    const { scoreA, scoreB } = sideForA(game, teamAId);
    return scoreA - scoreB;
  };
  const total = (game) => game.localScore + game.roadScore;
  const pick = (games, better) => games.reduce((best, game) => (best == null || better(game, best) ? game : best), null);
  const cards = [
    { key: "a", label: <>Biggest <ShortLabel short={teamCode(teamA)} full={shortTeamName(teamA)} /> win</>, game: pick(real.filter((game) => marginA(game) > 0), (x, y) => marginA(x) > marginA(y)), figure: (game) => `+${marginA(game)}` },
    { key: "b", label: <>Biggest <ShortLabel short={teamCode(teamB)} full={shortTeamName(teamB)} /> win</>, game: pick(real.filter((game) => marginA(game) < 0), (x, y) => marginA(x) < marginA(y)), figure: (game) => `+${-marginA(game)}` },
    { key: "high", label: "Highest scoring", game: pick(real, (x, y) => total(x) > total(y)), figure: (game) => `${total(game)} pts` },
    { key: "low", label: "Lowest scoring", game: pick(real, (x, y) => total(x) < total(y)), figure: (game) => `${total(game)} pts` },
  ];
  return (
    <Panel as="section" className="mb-6 p-4">
      <PanelHeader kicker="NOTABLE" title="Notable meetings" />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, ...card }) => (
          <li key={key} className="min-w-0">
            <NotableCard {...card} teamA={teamA} teamB={teamB} teamAId={teamAId} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// One aligned row per season the clubs met in: the record, a dot per meeting in date order, and the playoff and Final Four records.
function SeasonBreakdown({ seasons, matchups, teamA, teamB, teamAId }) {
  const rows = seasons
    .map((season) => ({ season, games: matchups.filter((game) => game.seasonCode === season.seasonCode) }))
    .filter((entry) => entry.games.length > 0);
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="BY SEASON" title="Season breakdown" />
      <ul
        className="text-sm lg:grid lg:grid-flow-col lg:gap-x-8"
        style={{ gridTemplateRows: `repeat(${Math.ceil(rows.length / 2)}, auto)` }}
      >
        {rows.map(({ season, games }) => {
          const record = seriesRecord(games, teamAId);
          const tags = [
            ["Playoffs", games.filter((game) => game.phaseCode === "PO" && isComplete(game))],
            ["Final Four", games.filter((game) => game.phaseCode === "FF" && isComplete(game))],
          ].filter(([, stageGames]) => stageGames.length > 0);
          return (
            <li key={season.seasonCode} className="border-base-300 grid grid-cols-[4.5rem_2.75rem_minmax(0,1fr)] items-center gap-x-3 border-b py-1.5">
              <span className="whitespace-nowrap">{formatSeasonLabel(season.seasonCode)}</span>
              <span className="text-end font-semibold tabular-nums">{record.winsA}-{record.winsB}</span>
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {games.map((game) => {
                  const winner = winnerOf(game, teamAId);
                  return (
                    <span
                      key={game.gameCode}
                      aria-hidden="true"
                      title={isComplete(game) ? `${gameTitle(game)}: ${scoreLine(game, teamA, teamB, teamAId)}` : `${gameTitle(game)}: not played yet`}
                      className={`size-2.5 flex-none rounded-full ${winnerColour(winner)}`}
                    />
                  );
                })}
                {tags.map(([label, stageGames]) => {
                  const stage = seriesRecord(stageGames, teamAId);
                  return (
                    <span key={label} className="badge badge-ghost badge-sm ms-1 whitespace-nowrap tabular-nums">
                      {label} {stage.winsA}-{stage.winsB}
                    </span>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// A meeting still to play: its date is in the first column, so only its time follows.
function upcomingLabel(scheduledAt) {
  if (!scheduledAt) return "Upcoming";
  return `Upcoming · ${new Date(scheduledAt).toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}

const VENUE_NAMES = { H: "at home", A: "away", N: "on a neutral court" };

// Every meeting: the games still to play first (soonest first), then the played ones newest first. The upcoming games and the latest
// played ones are shown; the rest fold behind a button.
function MeetingHistory({ matchups, teamA, teamB, teamAId }) {
  const [showAll, setShowAll] = useState(false);
  const upcoming = matchups.filter((game) => !game.played);
  const played = matchups.filter((game) => game.played).reverse();
  const shownPlayed = showAll ? played : played.slice(0, HISTORY_SHOWN);
  const rows = [...upcoming, ...shownPlayed];
  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="HISTORY" title="Meetings" />
      <ul className="divide-base-300 divide-y">
        {rows.map((game) => {
          const venue = venueForA(game, teamAId);
          const { scoreA, scoreB } = sideForA(game, teamAId);
          const margin = isComplete(game) && !isForfeit(game) ? Math.abs(scoreA - scoreB) : null;
          return (
            <li key={`${game.seasonCode}-${game.gameCode}`}>
              <Link
                to={`/${game.seasonCode}/games/${game.gameCode}`}
                className="rounded-field hover:bg-base-200 flex flex-col justify-center gap-0.5 px-1 py-1.5 max-sm:min-h-11 sm:grid sm:grid-cols-[5.5rem_minmax(0,7rem)_minmax(0,1fr)_2.5rem] sm:items-center sm:gap-x-3 lg:grid-cols-[6.5rem_minmax(0,10rem)_minmax(0,1fr)_2.5rem]"
              >
                <span className="muted flex min-w-0 gap-1 text-xs sm:contents sm:text-sm">
                  <span className="whitespace-nowrap">{formatDate(game.scheduledAt)}</span>
                  <span aria-hidden="true" className="sm:hidden">&middot;</span>
                  <span className="min-w-0 truncate">{gameTitle(game)}</span>
                </span>
                <span className="flex items-center gap-2 sm:contents">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span aria-hidden="true" className="badge badge-ghost badge-sm w-6 flex-none">{venue}</span>
                    <span className="sr-only">{shortTeamName(teamA)} {VENUE_NAMES[venue]}:</span>
                    {game.played ? (
                      <Scoreboard game={game} teamA={teamA} teamB={teamB} teamAId={teamAId} />
                    ) : (
                      <span className="muted flex-1 text-center text-sm">{upcomingLabel(game.scheduledAt)}</span>
                    )}
                  </span>
                  <span className="muted ms-auto text-end text-xs tabular-nums sm:ms-0">{margin != null ? `+${margin}` : ""}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {played.length > HISTORY_SHOWN ? (
        <button type="button" className="btn btn-ghost btn-sm mt-2 w-full max-sm:h-11" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show fewer" : `Show all ${matchups.length} meetings`}
        </button>
      ) : null}
    </Panel>
  );
}

// Every meeting, oldest first, each with its season in the year form the page's addresses use.
async function fetchMergedMatchups(seasons, teamAId, teamBId) {
  const data = await getHeadToHeadGames(latestSeasonCode(seasons), teamAId, teamBId);
  return (data.games ?? []).map((game) => ({ ...game, seasonCode: seasonSlug(game.seasonCode) }));
}

function HeadToHeadBody({ seasonCode, seasons, allTeams }) {
  const [searchParams, setSearchParams] = useLiveSearchParams();
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
    // Both teams from the live address, so a team picked just before the swap is swapped too.
    setSearchParams((params) => {
      const [liveA, liveB] = [params.get("teamA"), params.get("teamB")];
      const next = new URLSearchParams(params);
      if (liveB) next.set("teamA", liveB); else next.delete("teamA");
      if (liveA) next.set("teamB", liveA); else next.delete("teamB");
      return next;
    });
  }

  const teamA = allTeams.find((team) => team.clubCode === teamAId) ?? null;
  const teamB = allTeams.find((team) => team.clubCode === teamBId) ?? null;

  // Every archived season: this is the clubs' all-time series.
  const seasonCodes = seasons.map((season) => season.seasonCode);

  const matchupsQuery = useQuery({
    queryKey: ["head-to-head", teamAId, teamBId, seasonCodes.join(",")],
    queryFn: () => fetchMergedMatchups(seasons, teamAId, teamBId),
    enabled: Boolean(teamAId) && Boolean(teamBId) && seasonCodes.length > 0,
  });

  const props = { matchups: matchupsQuery.data ?? [], teamA, teamB, teamAId };
  const ready = teamA && teamB && matchupsQuery.isSuccess && matchupsQuery.data.length > 0;
  const played = ready ? matchupsQuery.data.filter(isComplete) : null;
  const picker = "w-full min-w-0 font-semibold sm:max-w-80";

  return (
    <div>
      <BackLink to={`/${seasonCode}/compare`} label="Compare" />
      <PageHeader kicker="HEAD-TO-HEAD" title="Head-to-head" />

      <SeriesHeader
        teamA={teamA}
        teamB={teamB}
        teamAId={teamAId}
        played={played}
        pickerA={<TeamPicker label="Team A" teams={allTeams} selected={teamAId} excludeId={teamBId} onSelect={(v) => selectTeam("teamA", v)} className={picker} />}
        pickerB={<TeamPicker label="Team B" teams={allTeams} selected={teamBId} excludeId={teamAId} onSelect={(v) => selectTeam("teamB", v)} className={picker} />}
        swap={
          <button
            type="button"
            className="btn btn-outline btn-square btn-sm max-sm:h-11 max-sm:w-11"
            aria-label="Swap teams"
            disabled={!teamAId && !teamBId}
            onClick={handleSwap}
          >
            &#8646;
          </button>
        }
        figures={
          ready ? <SeriesFigures teamA={teamA} teamB={teamB} played={played} teamAId={teamAId} /> : teamA && teamB && matchupsQuery.isPending ? <SeriesFiguresSkeleton /> : null
        }
      />

      {!teamA || !teamB ? (
        <EmptyText>Select two teams to see their head-to-head history.</EmptyText>
      ) : matchupsQuery.isPending ? (
        <AsyncState status="loading" label="Loading head-to-head history" skeleton={<HeadToHeadHistorySkeleton />} />
      ) : matchupsQuery.isError ? (
        <AsyncState status="error" message="Could not load head-to-head history." onRetry={() => matchupsQuery.refetch()} />
      ) : matchupsQuery.data.length === 0 ? (
        <EmptyText>These teams have not met in any archived season.</EmptyText>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <RecordsByType {...props} />
            <MarginTimeline {...props} />
          </div>

          <NotableMeetings {...props} />

          <div className="mb-6">
            <SeasonBreakdown seasons={seasons} {...props} />
          </div>

          {/* A new pair of clubs starts with the history folded again. */}
          <MeetingHistory key={`${teamAId}-${teamBId}`} {...props} />
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

  if (seasonsQuery.isLoading || teamsQuery.isLoading) return <AsyncState status="loading" label="Loading seasons" skeleton={<HeadToHeadSkeleton />} />;
  if (seasonsQuery.isError) {
    return <AsyncState status="error" message="Could not load seasons." onRetry={() => seasonsQuery.refetch()} />;
  }
  if (teamsQuery.isError) {
    return <AsyncState status="error" message="Could not load teams." onRetry={() => teamsQuery.refetch()} />;
  }

  return <HeadToHeadBody seasonCode={seasonCode} seasons={sortedSeasons} allTeams={teamsQuery.data} />;
}
