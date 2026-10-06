import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getPostseasonSeries, getRounds, getSeasonGames, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatSeasonLabel, formatShortDate } from "../lib/format";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import Bracket from "./Bracket";
import { buildBracket, raceStatus } from "./bracketModel";
import ChampionPanel from "./ChampionPanel";
import MatchupDetail from "./MatchupDetail";
import RacePanel from "./RacePanel";

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

function Steps({ steps }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Stages of the season">
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

function summaryLine({ bracket, regularSeasonDone, nextRound, totalRounds, series }) {
  if (bracket.champion) return { kicker: "THE SEASON IS OVER", title: bracket.champion.name + " are the champions" };
  if (series.some((entry) => entry.phaseCode === "FF")) return { kicker: "UNDER WAY", title: "The Final Four is on" };
  if (series.some((entry) => entry.phaseCode === "PO")) return { kicker: "UNDER WAY", title: "The Playoffs are on" };
  if (series.some((entry) => entry.phaseCode === "PI")) return { kicker: "UNDER WAY", title: "The Play-In is on" };
  if (regularSeasonDone) return { kicker: "NEXT UP", title: "The regular season is over: the Play-In is next" };
  return {
    kicker: "REGULAR SEASON",
    title: nextRound && totalRounds ? "Round " + nextRound + " of " + totalRounds + ": the bracket is a projection" : "The bracket is a projection",
  };
}

export default function PostseasonPage() {
  useDocumentTitle("Postseason");
  const { seasonCode } = useParams();
  const [selectedId, setSelectedId] = useState(null);
  const [focusClub, setFocusClub] = useState(null);
  const detailRef = useRef(null);

  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, "RS"], queryFn: () => getSeasonStandings(seasonCode, "RS") });
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const seriesQuery = useQuery({ queryKey: ["postseason-series", seasonCode], queryFn: () => getPostseasonSeries(seasonCode) });
  const remainingQuery = useQuery({ queryKey: ["rs-remaining", seasonCode], queryFn: () => fetchRemaining(seasonCode) });
  const roundsQuery = useQuery({ queryKey: ["rounds", seasonCode, "RS"], queryFn: () => getRounds(seasonCode, "RS") });

  const standings = useMemo(
    () => [...(standingsQuery.data?.standings ?? [])].sort((a, b) => a.basic.position - b.basic.position),
    [standingsQuery.data],
  );
  const teams = teamsQuery.data?.teams;
  const series = seriesQuery.data?.series;
  const remaining = remainingQuery.data;
  const regularSeasonDone = standings.length > 0 && remaining !== undefined && remaining.total === 0;

  const bracket = useMemo(
    () => (standings.length && teams && series ? buildBracket({ standings, teams, series, regularSeasonDone }) : null),
    [standings, teams, series, regularSeasonDone],
  );
  const race = useMemo(() => (remaining && standings.length ? raceStatus(standings, remaining.remaining) : null), [standings, remaining]);

  const queries = [standingsQuery, teamsQuery, seriesQuery, remainingQuery];
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
  const summary = summaryLine({ bracket, regularSeasonDone, nextRound: remaining.nextRound, totalRounds, series });
  const steps = [
    {
      title: "Regular season",
      sub: regularSeasonDone ? "Finished" : remaining.nextRound && totalRounds ? "Round " + remaining.nextRound + " of " + totalRounds : "Under way",
      state: regularSeasonDone ? "done" : "live",
    },
    { title: "Play-In", sub: dateRange(series, ["PI"]) ?? "Seeds 7 to 10", state: regularSeasonDone || series.length ? stageState(bracket.playIn) : "waiting" },
    { title: "Playoffs", sub: dateRange(series, ["PO"]) ?? "Best of five", state: stageState(bracket.playoffs) },
    { title: "Final Four", sub: dateRange(series, ["FF"]) ?? "Semifinals and final", state: stageState([...bracket.semis, bracket.final]) },
  ];

  const selected = bracket.all.find((slot) => slot.id === selectedId) ?? null;
  function select(id) {
    setSelectedId(id);
    if (window.innerWidth < 1024) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
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

      {bracket.champion ? <ChampionPanel bracket={bracket} seasonLabel={seasonLabel} /> : null}

      {bracket.projected ? (
        <p className="muted -mb-2 text-sm">Projected from the current standings: the dashed matchups update as the regular season goes on.</p>
      ) : null}
      <Bracket bracket={bracket} selectedId={selectedId} focusClub={focusClub} onSelect={select} onFocusClub={setFocusClub} />

      <div ref={detailRef} className="scroll-mt-28">
        {selected ? <MatchupDetail slot={selected} seasonCode={seasonCode} /> : <p className="muted text-sm">Select a matchup to see its games.</p>}
      </div>

      {!regularSeasonDone && race ? <RacePanel standings={standings} teams={teams} race={race} /> : null}

      <details className="rounded-box border border-base-300 bg-base-100 p-4">
        <summary className="cursor-pointer font-semibold">How the postseason works</summary>
        <div className="muted mt-3 flex flex-col gap-2 text-sm">
          <p>The top six clubs of the regular season go straight to the Playoffs. The clubs placed seventh to tenth play the Play-In.</p>
          <p>
            In the Play-In, 7th hosts 8th and 9th hosts 10th in single games. The loser of 7 v 8 then plays the winner of 9 v 10 for the last Playoffs place; the winner of 7 v 8
            takes the 7th place.
          </p>
          <p>The Playoffs are best-of-five series: 1st plays the 8th place, 2nd the 7th, 3rd the 6th and 4th the 5th. The higher seed has home court.</p>
          <p>
            The winners of 1 v 8 and 4 v 5 meet in one Final Four semifinal, the winners of 2 v 7 and 3 v 6 in the other. Each is a single game, and the two winners play the
            final. Some seasons also have a third-place game.
          </p>
        </div>
      </details>
    </motion.div>
  );
}
