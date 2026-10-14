import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getPostseasonSeries, getRounds, getSeasonGames, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatSeasonLabel, formatShortDate } from "../lib/format";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import Bracket from "./Bracket";
import { bracketSeeds, buildBracket, raceStatus } from "./bracketModel";
import { hasLoadingIssues, LOADING_ISSUES_NOTE, seasonStatusText, stageDescription, tableTiers } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import ChampionPanel from "./ChampionPanel";
import MatchupDetail from "./MatchupDetail";
import RacePanel from "./RacePanel";
import { buildGroupedBracket, GROUPED_POSTSEASON_FAMILIES } from "./groupedBracket";

const PAGE_LIMIT = 100;
const MAX_PAGES = 6;

// The regular-season games still to play, paged through (the API caps a page at 100): how many each club has left, and the
// round the season has reached.
async function fetchRemaining(seasonCode) {
  const remaining = new Map();
  let nextRound = null;
  let total = 0;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getSeasonGames(seasonCode, { phase: "RS", status: "scheduled", order: "asc", limit: PAGE_LIMIT, offset });
    for (const game of data.games) {
      total += 1;
      for (const code of [game.localTeam?.clubCode, game.roadTeam?.clubCode]) {
        if (code) remaining.set(code, (remaining.get(code) ?? 0) + 1);
      }
      if (game.roundNumber != null && (nextRound === null || game.roundNumber < nextRound)) nextRound = game.roundNumber;
    }
    if (!data.pagination.hasMore) break;
    offset += PAGE_LIMIT;
  }
  return { remaining, nextRound, total };
}

function stageState(slots) {
  if (slots.every((slot) => slot.state === "done")) return "done";
  if (slots.some((slot) => slot.state === "live" || slot.state === "done")) return "live";
  return "waiting";
}

function dateRange(series, phaseCodes) {
  const times = series
    .filter((entry) => phaseCodes.includes(entry.phaseCode))
    .flatMap((entry) => entry.games.map((game) => game.scheduledAt))
    .filter(Boolean)
    .map((value) => new Date(value))
    .sort((a, b) => a - b);
  if (times.length === 0) return null;
  const first = formatShortDate(times[0]);
  const last = formatShortDate(times[times.length - 1]);
  return first === last ? first : first + " to " + last;
}

// A stage's subtitle before its games are dated: its description from the format ("Best-of-five series."), or the old wording.
function stageSub(format, code, fallback) {
  const stage = format?.stages.find((entry) => entry.code === code);
  return stage ? stageDescription(stage, format).replace(/\.$/, "") : fallback;
}

function Steps({ steps }) {
  return (
    <ol className={"grid gap-3 sm:grid-cols-2 " + (steps.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")} aria-label="Stages of the season">
      {steps.map((step) => (
        <li key={step.title} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={
              "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-black " +
              (step.state === "done" ? "bg-success text-success-content" : step.state === "live" ? "bg-primary text-primary-content" : "border border-base-300 text-base-content/50")
            }
          >
            {step.state === "done" ? "✓" : step.state === "live" ? "●" : ""}
          </span>
          <span className="min-w-0">
            <span className={"block font-semibold " + (step.state === "waiting" ? "muted" : "")}>{step.title}</span>
            <span className="muted block text-xs">{step.sub}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function summaryLine({ bracket, regularSeasonDone, nextRound, totalRounds, series, format }) {
  if (bracket.champion) return { kicker: "THE SEASON IS OVER", title: bracket.champion.name + " are the champions" };
  if (format.status === "completed") return { kicker: "THE SEASON IS OVER", title: "The season has finished; some postseason results are unavailable" };
  if (series.some((entry) => entry.phaseCode === "FF")) return { kicker: "UNDER WAY", title: "The Final Four is on" };
  if (series.some((entry) => entry.phaseCode === "PO")) return { kicker: "UNDER WAY", title: "The Playoffs are on" };
  if (series.some((entry) => entry.phaseCode === "PI")) return { kicker: "UNDER WAY", title: "The Play-In is on" };
  if (bracket.grouped) return { kicker: "GROUP QUALIFICATION", title: "Quarterfinal matchups are not yet verified" };
  if (regularSeasonDone) return { kicker: "NEXT UP", title: "The regular season is over: the " + (bracket.playIn.length ? "Play-In is next" : "Playoffs are next") };
  return {
    kicker: "REGULAR SEASON",
    title: nextRound && totalRounds ? "Round " + nextRound + " of " + totalRounds + ": the bracket is a projection" : "The bracket is a projection",
  };
}

const SERIES_WORDS = { 2: "three", 3: "five" };
const WIN_WORDS = { 2: "Two", 3: "Three" };

// "Four groups; top two per group reach the Playoffs", from the Top 16 stage's own group count and qualification rule.
const GROUP_COUNT_WORDS = { 2: "Two", 3: "Three", 4: "Four" };
function top16Summary(stage) {
  const places = stage?.qualification?.find((rule) => rule.within === "group" && "positions" in rule)?.positions[1];
  const groups = GROUP_COUNT_WORDS[stage?.plannedGroups] ?? stage?.plannedGroups;
  const top = { 1: "one", 2: "two", 3: "three", 4: "four" }[places] ?? places;
  return groups && top ? `${groups} groups; top ${top} per group reach the Playoffs` : "Group stage; the best clubs of each group reach the Playoffs";
}

export default function PostseasonPage() {
  useDocumentTitle("Postseason");
  const { seasonCode } = useParams();
  const [selectedId, setSelectedId] = useState(null);
  const [focusClub, setFocusClub] = useState(null);
  const [seenPath, setSeenPath] = useState(null);
  const detailRef = useRef(null);
  const formatQuery = useSeasonFormat(seasonCode);
  const format = formatQuery.data ?? null;
  const cancelled = format?.status === "cancelled";
  const enabled = Boolean(format) && !cancelled;
  const grouped = GROUPED_POSTSEASON_FAMILIES.includes(format?.family);

  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, "RS"], queryFn: () => getSeasonStandings(seasonCode, "RS"), enabled });
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode), enabled });
  const seriesQuery = useQuery({ queryKey: ["postseason-series", seasonCode], queryFn: () => getPostseasonSeries(seasonCode), enabled });
  const remainingQuery = useQuery({ queryKey: ["rs-remaining", seasonCode], queryFn: () => fetchRemaining(seasonCode), enabled: enabled && !grouped });
  const roundsQuery = useQuery({ queryKey: ["rounds", seasonCode, "RS"], queryFn: () => getRounds(seasonCode, "RS"), enabled });
  const top16Query = useQuery({ queryKey: ["standings", seasonCode, "TS"], queryFn: () => getSeasonStandings(seasonCode, "TS"), enabled: enabled && grouped });
  const ffGamesQuery = useQuery({ queryKey: ["postseason-ff-games", seasonCode], queryFn: () => getSeasonGames(seasonCode, { phase: "FF", limit: PAGE_LIMIT }), enabled: enabled && grouped });

  const standings = useMemo(
    () => [...(standingsQuery.data?.standings ?? [])].sort((a, b) => a.basic.position - b.basic.position),
    [standingsQuery.data],
  );
  const teams = teamsQuery.data?.teams;
  const series = seriesQuery.data?.series;
  const remaining = remainingQuery.data ?? { remaining: new Map(), nextRound: null, total: 0 };
  const tiers = useMemo(() => tableTiers(format, "RS"), [format]);
  const regularSeasonStage = format?.stages.find((stage) => stage.code === "RS") ?? null;
  const laterStagePlayed = format?.stages.some((stage) => stage.code !== "RS" && stage.observed.gamesPlayed > 0) ?? false;
  const raceUnavailable = format?.issues?.some((issue) => issue.stage === "RS" || issue.stage === null) ?? false;
  const regularSeasonDone = regularSeasonStage?.dataState === "loaded" || laterStagePlayed;
  const bracket = useMemo(
    () => !enabled || !teams || !series ? null : grouped
      ? buildGroupedBracket({ standings: top16Query.data?.standings ?? [], teams, series, games: ffGamesQuery.data?.games ?? [], format })
      : standings.length ? buildBracket({ standings, teams, series, regularSeasonDone, format, tiers }) : null,
    [enabled, grouped, standings, teams, series, regularSeasonDone, format, tiers, top16Query.data, ffGamesQuery.data],
  );
  const pathKey = JSON.stringify([seasonCode, bracket?.all.map((slot) => [slot.id, slot.label, slot.participants.map((side) => side.clubCode ?? null)])]);
  if (seenPath !== pathKey) {
    setSeenPath(pathKey);
    setSelectedId(null);
    setFocusClub(null);
  }
  const race = useMemo(
    () => (enabled && !grouped && remainingQuery.data && standings.length ? raceStatus(standings, remainingQuery.data.remaining, bracketSeeds(tiers)) : null),
    [enabled, grouped, standings, remainingQuery.data, tiers],
  );

  if (formatQuery.isLoading) return <AsyncState status="loading" label="Loading the postseason" />;
  if (formatQuery.isError) return <AsyncState status="error" message="Could not load the postseason." onRetry={() => formatQuery.refetch()} />;
  if (cancelled) {
    return (
      <div>
        <PageHeader stacked kicker="SEASON" title="Postseason" />
        <Panel className="p-4">
          <h2 className="mb-2 text-xl font-bold">Season cancelled</h2>
          <p>{seasonStatusText(format, { hasScheduledGame: false })}</p>
          <p className="muted mt-2">No postseason was played and no champion was named. Standings show positions at suspension, not a final classification.</p>
        </Panel>
      </div>
    );
  }
  if (!format) return <EmptyText>The season format is unavailable, so there is no bracket to show.</EmptyText>;

  const queries = [formatQuery, standingsQuery, teamsQuery, seriesQuery, roundsQuery, ...(grouped ? [top16Query, ffGamesQuery] : [remainingQuery])];
  if (queries.some((query) => query.isLoading)) return <AsyncState status="loading" label="Loading the postseason" />;
  if (queries.some((query) => query.isError)) {
    return <AsyncState status="error" message="Could not load the postseason." onRetry={() => queries.forEach((query) => query.isError && query.refetch())} />;
  }
  if (!bracket) {
    return (
      <div>
        <PageHeader kicker="SEASON" title="Postseason" />
        <EmptyText>The standings are not available yet, so there is no bracket to show.</EmptyText>
      </div>
    );
  }

  const totalRounds = roundsQuery.data?.rounds?.length ?? null;
  const summary = summaryLine({ bracket, regularSeasonDone, nextRound: remaining.nextRound, totalRounds, series, format });
  const steps = [
    {
      title: "Regular season",
      sub: regularSeasonDone ? "Finished" : remaining.nextRound && totalRounds ? "Round " + remaining.nextRound + " of " + totalRounds : "Under way",
      state: regularSeasonDone ? "done" : "live",
    },
    ...(grouped ? [{ title: "Top 16", sub: top16Summary(format.stages.find((stage) => stage.code === "TS")), state: format.stages.find((stage) => stage.code === "TS")?.dataState === "loaded" ? "done" : format.stages.find((stage) => stage.code === "TS")?.observed.gamesPlayed > 0 ? "live" : "waiting" }] : []),
    ...(bracket.playIn.length ? [{
      title: "Play-In",
      sub: dateRange(series, ["PI"]) ?? "Seeds " + (bracket.directSeeds + 1) + " to " + bracket.playInLast,
      state: regularSeasonDone || series.length ? stageState(bracket.playIn) : "waiting",
    }] : []),
    { title: "Playoffs", sub: dateRange(series, ["PO"]) ?? stageSub(format, "PO", "Best of five"), state: stageState(bracket.playoffs) },
    { title: "Final Four", sub: dateRange(series, ["FF"]) ?? stageSub(format, "FF", "Semifinals and final"), state: stageState([...bracket.semis, bracket.final]) },
  ];

  const selected = bracket.all.find((slot) => slot.id === selectedId) ?? null;
  function select(id) {
    setSelectedId(id);
    // The detail sits under the bracket at every width, so it is brought into view whenever it is partly below the fold.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  const seasonLabel = formatSeasonLabel(seasonCode);
  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      <PageHeader stacked kicker="SEASON" title="Postseason" />

      <Panel className="p-4">
        <p className="eyebrow mb-0.5">{summary.kicker}</p>
        <h2 className="mb-4 text-xl font-bold">{summary.title}</h2>
        <Steps steps={steps} />
      </Panel>

      {hasLoadingIssues(format) ? <p className="muted text-sm">{LOADING_ISSUES_NOTE}</p> : null}
      {grouped ? <>
        <p className="text-sm">Quarterfinal participants come from the Top 16 groups. <Link to={`/${seasonCode}/standings?phase=TS`} className="link link-primary">View Top 16 group standings</Link>.</p>
        {bracket.issues.map((issue) => <p key={issue.stage} className="muted text-sm">{issue.message} <Link to={`/${seasonCode}/games?phase=${issue.stage}`} className="link link-primary">{issue.stage === "PO" ? "View recorded quarterfinal games" : "View recorded Final Four games"}</Link>.</p>)}
      </> : null}

      {bracket.champion ? <ChampionPanel bracket={bracket} seasonLabel={seasonLabel} /> : null}

      {bracket.projected ? (
        <p className="muted -mb-2 text-sm">Projected from the current standings: the dashed matchups update as the regular season goes on.</p>
      ) : null}
      <Bracket bracket={bracket} selectedId={selectedId} focusClub={focusClub} onSelect={select} onFocusClub={setFocusClub} />

      <div ref={detailRef} className="scroll-mt-28">
        {selected ? <MatchupDetail slot={selected} seasonCode={seasonCode} /> : <p className="muted text-sm">Select a matchup to see its games.</p>}
      </div>

      {!grouped && !regularSeasonDone && raceUnavailable ? <EmptyText>The qualification race is unavailable while regular-season data is incomplete.</EmptyText> : null}
      {!grouped && !regularSeasonDone && !raceUnavailable && race ? <RacePanel standings={standings} teams={teams} race={race} directSeeds={bracket.directSeeds} playInLast={bracket.playInLast} /> : null}

      <details className="rounded-box border border-base-300 bg-base-100 p-4">
        <summary className="cursor-pointer font-semibold">How the postseason works</summary>
        <div className="muted mt-3 flex flex-col gap-2 text-sm">
          <p>{stageDescription(regularSeasonStage, format)}</p>
          {grouped ? <>
            <p>{stageDescription(format.stages.find((stage) => stage.code === "TS"), format)}</p>
            <p>Quarterfinals are best-of-{SERIES_WORDS[bracket.playoffs[0]?.winTarget] ?? "five"} series between recorded cross-group qualifiers. {WIN_WORDS[bracket.playoffs[0]?.winTarget] ?? "Three"} wins are required to advance; labels such as {bracket.playoffs.find((slot) => slot.label.includes(" v "))?.label ?? "E1 v F4"} are Top 16 group places.</p>
            <p>The Final Four follows the recorded semifinal matchups, championship game and any verified third-place game. Unverified draws and results remain unknown.</p>
          </> : <>
          {bracket.playIn.length ? <p>
            In the Play-In, 7th hosts 8th and 9th hosts 10th in single games. The loser of 7 v 8 then plays the winner of 9 v 10 for the last Playoffs place; the winner of 7 v 8
            takes the 7th place.
          </p> : null}
          <p>The Playoffs are best-of-five series: 1st plays the 8th place, 2nd the 7th, 3rd the 6th and 4th the 5th. The higher seed has home court.</p>
          <p>
            The winners of 1 v 8 and 4 v 5 meet in one Final Four semifinal, the winners of 2 v 7 and 3 v 6 in the other. Each is a single game, and the two winners play the
            final. {stageSub(format, "FF", "")}
          </p>
          </>}
        </div>
      </details>
    </motion.div>
  );
}
