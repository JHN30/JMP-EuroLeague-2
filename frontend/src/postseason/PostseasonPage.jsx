import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getPostseasonSeries, getRounds, getSeasonGames, getSeasonStandings, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import PostseasonSkeleton from "./PostseasonSkeleton";
import EmptyText from "../lib/EmptyText";
import { formatSeasonLabel, formatShortDate } from "../lib/format";
import { EASE_OUT } from "../lib/motion";
import PageHeader from "../lib/PageHeader";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import Bracket from "./Bracket";
import EliminationGrid from "./EliminationGrid";
import { bracketMovers, bracketSeeds, buildBracket, raceStatus } from "./bracketModel";
import { hasLoadingIssues, LOADING_ISSUES_NOTE, seasonStatusText, stageDescription, tableTiers } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import ChampionPanel from "./ChampionPanel";
import MatchupDetail from "./MatchupDetail";
import RacePanel from "./RacePanel";
import NextGamesPanel from "./NextGamesPanel";
import { isChampionshipLabel } from "../lib/phaseSummary";
import { buildGroupedBracket, GROUPED_POSTSEASON_FAMILIES } from "./groupedBracket";
import { buildEliminationBracket } from "./eliminationBracket";

const PAGE_LIMIT = 100;
const MAX_PAGES = 6;

// The regular-season games still to play, paged through (the API caps a page at 100): how many each club has left, the
// round the season has reached, and that round's games.
async function fetchRemaining(seasonCode) {
  const remaining = new Map();
  const scheduled = [];
  let nextRound = null;
  let total = 0;
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await getSeasonGames(seasonCode, { phase: "RS", status: "scheduled", order: "asc", limit: PAGE_LIMIT, offset });
    for (const game of data.games) {
      total += 1;
      if (game.localTeam?.clubCode && game.roadTeam?.clubCode) {
        scheduled.push({ gameCode: game.gameCode, roundNumber: game.roundNumber, scheduledAt: game.scheduledAt, localClubCode: game.localTeam.clubCode, roadClubCode: game.roadTeam.clubCode });
      }
      for (const code of [game.localTeam?.clubCode, game.roadTeam?.clubCode]) {
        if (code) remaining.set(code, (remaining.get(code) ?? 0) + 1);
      }
      if (game.roundNumber != null && (nextRound === null || game.roundNumber < nextRound)) nextRound = game.roundNumber;
    }
    if (!data.pagination.hasMore) break;
    offset += PAGE_LIMIT;
  }
  return { remaining, nextRound, total, nextGames: scheduled.filter((game) => game.roundNumber === nextRound) };
}

// Last season's champion: the winner of its played Final Four championship game (the Overview's rule), or null.
function holdersFrom(games) {
  const final = games.find((game) => game.played && game.localScore != null && game.roadScore != null && game.localScore !== game.roadScore && isChampionshipLabel(`${game.groupName ?? ""} ${game.roundName ?? ""}`));
  if (!final) return null;
  return final.localScore > final.roadScore ? final.localTeam : final.roadTeam;
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
    <ol className={"grid gap-3 sm:grid-cols-2 " + (steps.length === 3 ? "lg:grid-cols-3" : steps.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")} aria-label="Stages of the season">
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
  if (bracket.elimination) {
    if (series.some((entry) => entry.phaseCode === "PO")) return { kicker: "UNDER WAY", title: "The knockout rounds are on" };
    return { kicker: "NEXT UP", title: regularSeasonDone ? "The regular season is over: the round of 16 is next" : "The round of 16 matchups are not yet decided" };
  }
  if (series.some((entry) => entry.phaseCode === "FF")) return { kicker: "UNDER WAY", title: "The Final Four is on" };
  if (series.some((entry) => entry.phaseCode === "PO")) return { kicker: "UNDER WAY", title: "The Playoffs are on" };
  if (series.some((entry) => entry.phaseCode === "PI")) return { kicker: "UNDER WAY", title: "The Play-In is on" };
  if (bracket.direct) return { kicker: "GROUP QUALIFICATION", title: "Final Four matchups are not yet verified" };
  if (bracket.grouped) return { kicker: "GROUP QUALIFICATION", title: "Quarterfinal matchups are not yet verified" };
  if (regularSeasonDone) return { kicker: "NEXT UP", title: "The regular season is over: the " + (bracket.playIn.length ? "Play-In is next" : "Playoffs are next") };
  return {
    kicker: "REGULAR SEASON",
    title: nextRound && totalRounds ? "Round " + nextRound + " of " + totalRounds + ": the bracket is a projection" : "The bracket is a projection",
  };
}

// The matchup the detail shows before anybody picks one: a series in progress (the one with the latest game), else the latest
// finished matchup (the Final on a finished season), else the first matchup with both clubs known (a projected one during the
// regular season). None when no matchup has two clubs yet.
function defaultMatchup(slots) {
  const lastGame = (slot) => (slot.series?.games ?? []).map((game) => game.scheduledAt).filter(Boolean).sort().at(-1) ?? "";
  const latest = (list) => list.reduce((best, slot) => (!best || lastGame(slot) > lastGame(best) ? slot : best), null);
  return (
    latest(slots.filter((slot) => slot.state === "live")) ??
    latest(slots.filter((slot) => slot.state === "done")) ??
    slots.find((slot) => slot.participants.filter((side) => side.clubCode).length === 2) ??
    null
  );
}

const FORMAT_COLUMNS = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

// "How the postseason works": one numbered card per stage, in the order the season plays them.
function FormatCards({ cards }) {
  return (
    <Panel className="p-4">
      <PanelHeader compact kicker="FORMAT" title="How the postseason works" />
      <ol className={"grid gap-3 sm:grid-cols-2 " + (FORMAT_COLUMNS[cards.length] ?? "lg:grid-cols-4")} aria-label="How the postseason works">
        {cards.map((card, index) => (
          <li key={card.title} className="rounded-field border border-base-300 bg-base-100/60 p-3">
            <p className="flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                {index + 1}
              </span>
              {card.title}
            </p>
            {card.paragraphs.filter(Boolean).map((text, paragraph) => (
              <p key={paragraph} className="muted mt-2 text-sm">{text}</p>
            ))}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const GROUP_COUNT_WORDS = { 2: "Two", 3: "Three", 4: "Four" };
const SERIES_WORDS = { 2: "three", 3: "five" };
const WIN_WORDS = { 2: "Two", 3: "Three" };

// "Four groups; top two per group reach the Playoffs", from the Top 16 stage's own group count, qualification rule and destination.
function top16Summary(stage) {
  const rule = stage?.qualification?.find((entry) => entry.within === "group" && "positions" in entry);
  const places = rule?.positions[1];
  const groups = GROUP_COUNT_WORDS[stage?.plannedGroups] ?? stage?.plannedGroups;
  const destination = rule?.to === "FF" ? "the Final Four" : "the Playoffs";
  if (!groups || !places) return "Group stage; the best clubs of each group advance";
  if (places === 1) return `${groups} groups; the winner of each group reaches ${destination}`;
  return `${groups} groups; top ${{ 2: "two", 3: "three", 4: "four" }[places] ?? places} per group reach ${destination}`;
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
  const elimination = format?.family === "eliminationSeries";

  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, "RS"], queryFn: () => getSeasonStandings(seasonCode, "RS"), enabled });
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode), enabled });
  const seriesQuery = useQuery({ queryKey: ["postseason-series", seasonCode], queryFn: () => getPostseasonSeries(seasonCode), enabled });
  const remainingQuery = useQuery({ queryKey: ["rs-remaining", seasonCode], queryFn: () => fetchRemaining(seasonCode), enabled: enabled && !grouped && !elimination });
  const roundsQuery = useQuery({ queryKey: ["rounds", seasonCode, "RS"], queryFn: () => getRounds(seasonCode, "RS"), enabled });
  const top16Query = useQuery({ queryKey: ["standings", seasonCode, "TS"], queryFn: () => getSeasonStandings(seasonCode, "TS"), enabled: enabled && grouped });
  const ffGamesQuery = useQuery({ queryKey: ["postseason-ff-games", seasonCode], queryFn: () => getSeasonGames(seasonCode, { phase: "FF", limit: PAGE_LIMIT }), enabled: enabled && grouped });
  // The elimination tournament's stages are only named on its games (the source's round numbers mix them).
  const knockoutGamesQuery = useQuery({ queryKey: ["postseason-po-games", seasonCode], queryFn: () => getSeasonGames(seasonCode, { phase: "PO", limit: PAGE_LIMIT }), enabled: enabled && elimination });

  const standings = useMemo(
    () => [...(standingsQuery.data?.standings ?? [])].sort((a, b) => a.basic.position - b.basic.position),
    [standingsQuery.data],
  );
  const teams = teamsQuery.data?.teams;
  const series = seriesQuery.data?.series;
  const remaining = remainingQuery.data ?? { remaining: new Map(), nextRound: null, total: 0, nextGames: [] };
  const tiers = useMemo(() => tableTiers(format, "RS"), [format]);
  const regularSeasonStage = format?.stages.find((stage) => stage.code === "RS") ?? null;
  const laterStagePlayed = format?.stages.some((stage) => stage.code !== "RS" && stage.observed.gamesPlayed > 0) ?? false;
  const raceUnavailable = format?.issues?.some((issue) => issue.stage === "RS" || issue.stage === null) ?? false;
  const regularSeasonDone = regularSeasonStage?.dataState === "loaded" || laterStagePlayed;
  // While the bracket is projected, the standings of the round before the latest one, for the seeds' moves.
  const movesSince = remaining.nextRound != null && remaining.nextRound - 2 >= 1 ? remaining.nextRound - 2 : null;
  const earlierQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS", "round", movesSince],
    queryFn: () => getSeasonStandings(seasonCode, "RS", { round: movesSince }),
    enabled: enabled && !grouped && !elimination && !regularSeasonDone && movesSince != null,
  });
  // The holders: last season's champion, for the space above the Final.
  const previousSeason = String(Number(seasonCode) - 1);
  const holdersQuery = useQuery({
    queryKey: ["postseason-ff-games", previousSeason],
    queryFn: () => getSeasonGames(previousSeason, { phase: "FF", limit: PAGE_LIMIT }),
    enabled: enabled && !grouped && !elimination && Number(seasonCode) > 2000,
  });
  const bracket = useMemo(
    () => !enabled || !teams || !series ? null : elimination
      ? buildEliminationBracket({ teams, series, games: knockoutGamesQuery.data?.games ?? [], format })
      : grouped
      ? buildGroupedBracket({ standings: top16Query.data?.standings ?? [], teams, series, games: ffGamesQuery.data?.games ?? [], format })
      : standings.length ? buildBracket({ standings, teams, series, regularSeasonDone, format, tiers }) : null,
    [enabled, grouped, elimination, standings, teams, series, regularSeasonDone, format, tiers, top16Query.data, ffGamesQuery.data, knockoutGamesQuery.data],
  );
  const pathKey = JSON.stringify([seasonCode, bracket?.all.map((slot) => [slot.id, slot.label, slot.participants.map((side) => side.clubCode ?? null)])]);
  if (seenPath !== pathKey) {
    setSeenPath(pathKey);
    setSelectedId(null);
    setFocusClub(null);
  }
  const race = useMemo(
    () => (enabled && !grouped && !elimination && remainingQuery.data && standings.length ? raceStatus(standings, remainingQuery.data.remaining, bracketSeeds(tiers)) : null),
    [enabled, grouped, elimination, standings, remainingQuery.data, tiers],
  );

  if (formatQuery.isLoading) return <AsyncState status="loading" label="Loading the postseason" skeleton={<PostseasonSkeleton />} />;
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

  const queries = [formatQuery, standingsQuery, teamsQuery, seriesQuery, roundsQuery, ...(elimination ? [knockoutGamesQuery] : grouped ? [top16Query, ffGamesQuery] : [remainingQuery])];
  if (queries.some((query) => query.isLoading)) return <AsyncState status="loading" label="Loading the postseason" skeleton={<PostseasonSkeleton />} />;
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
  // Places gained since `movesSince` (negative when lost), for the clubs that moved; only while the bracket is projected.
  const moves = new Map();
  if (bracket.projected && earlierQuery.data) {
    const before = new Map(earlierQuery.data.standings.map((entry) => [entry.clubCode, entry.basic?.position]));
    for (const entry of standings) {
      const was = before.get(entry.clubCode);
      if (was != null && was !== entry.basic.position) moves.set(entry.clubCode, was - entry.basic.position);
    }
  }
  const holdersClub = holdersQuery.data ? holdersFrom(holdersQuery.data.games) : null;
  const holders = holdersClub ? { club: holdersClub, seasonCode: previousSeason, seasonLabel: formatSeasonLabel(previousSeason) } : null;
  const showRace = !grouped && !elimination && !regularSeasonDone && !raceUnavailable && race;
  const movers = showRace ? bracketMovers(remaining.nextGames, standings, race, bracketSeeds(tiers)) : [];
  const summary = summaryLine({ bracket, regularSeasonDone, nextRound: remaining.nextRound, totalRounds, series, format });
  const regularStep = {
    title: "Regular season",
    sub: regularSeasonDone ? "Finished" : remaining.nextRound && totalRounds ? "Round " + remaining.nextRound + " of " + totalRounds : "Under way",
    state: regularSeasonDone ? "done" : "live",
  };
  const steps = bracket.elimination ? [
    regularStep,
    ...bracket.rounds.map((round) => ({
      title: round.title,
      sub: dateRange([{ phaseCode: "PO", games: round.slots.flatMap((slot) => slot.series?.games ?? []) }], ["PO"]) ?? (round.winTarget ? "Best of " + (2 * round.winTarget - 1) : "Series"),
      state: stageState(round.slots),
    })),
  ] : [
    regularStep,
    ...(grouped ? [{ title: "Top 16", sub: top16Summary(format.stages.find((stage) => stage.code === "TS")), state: format.stages.find((stage) => stage.code === "TS")?.dataState === "loaded" ? "done" : format.stages.find((stage) => stage.code === "TS")?.observed.gamesPlayed > 0 ? "live" : "waiting" }] : []),
    ...(bracket.playIn.length ? [{
      title: "Play-In",
      sub: dateRange(series, ["PI"]) ?? "Seeds " + (bracket.directSeeds + 1) + " to " + bracket.playInLast,
      state: regularSeasonDone || series.length ? stageState(bracket.playIn) : "waiting",
    }] : []),
    ...(bracket.direct ? [] : [{ title: "Playoffs", sub: dateRange(series, ["PO"]) ?? stageSub(format, "PO", "Best of five"), state: stageState(bracket.playoffs) }]),
    { title: "Final Four", sub: dateRange(series, ["FF"]) ?? stageSub(format, "FF", "Semifinals and final"), state: stageState([...bracket.semis, bracket.final]) },
  ];

  const selected = bracket.all.find((slot) => slot.id === selectedId) ?? defaultMatchup(bracket.all);
  function select(id) {
    setSelectedId(id);
    // The detail sits under the bracket at every width, so it is brought into view whenever it is partly below the fold.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  // The format, one card per stage, from the same wording as before.
  const stageOf = (code) => format.stages.find((stage) => stage.code === code);
  const formatCards = [
    { title: "Regular season", paragraphs: [stageDescription(regularSeasonStage, format)] },
    ...(elimination ? [{
      title: "Knockout rounds",
      paragraphs: [
        stageDescription(stageOf("PO"), format),
        `Each round is a series: the first round and quarterfinals are won with ${WIN_WORDS[bracket.rounds[0].winTarget]?.toLowerCase() ?? "two"} wins, the semifinals and final with ${WIN_WORDS[bracket.final.winTarget]?.toLowerCase() ?? "three"}. A series counts as decided only when a club reaches that number, and a club moves on only when it is recorded as playing the next tie. There is no Top 16 or Final Four and no third-place game.`,
      ],
    }] : grouped ? [
      {
        title: "Top 16",
        paragraphs: [
          stageDescription(stageOf("TS"), format),
          bracket.direct ? `Only the winner of each Top 16 group advances, straight to the Final Four; there are no quarterfinals. Labels such as ${bracket.semis[0]?.participants[0]?.seedLabel ?? "G1"} are Top 16 group places.` : null,
        ],
      },
      ...(bracket.direct ? [] : [{
        title: "Quarterfinals",
        paragraphs: [`Quarterfinals are best-of-${SERIES_WORDS[bracket.playoffs[0]?.winTarget] ?? "five"} series between recorded cross-group qualifiers. ${WIN_WORDS[bracket.playoffs[0]?.winTarget] ?? "Three"} wins are required to advance; labels such as ${bracket.playoffs.find((slot) => slot.label.includes(" v "))?.label ?? "E1 v F4"} are Top 16 group places.`],
      }]),
      { title: "Final Four", paragraphs: ["The Final Four follows the recorded semifinal matchups, championship game and any verified third-place game. Unverified draws and results remain unknown."] },
    ] : [
      ...(bracket.playIn.length ? [{
        title: "Play-In",
        paragraphs: ["In the Play-In, 7th hosts 8th and 9th hosts 10th in single games. The loser of 7 v 8 then plays the winner of 9 v 10 for the last Playoffs place; the winner of 7 v 8 takes the 7th place."],
      }] : []),
      { title: "Playoffs", paragraphs: ["The Playoffs are best-of-five series: 1st plays the 8th place, 2nd the 7th, 3rd the 6th and 4th the 5th. The higher seed has home court."] },
      {
        title: "Final Four",
        paragraphs: [`The winners of 1 v 8 and 4 v 5 meet in one Final Four semifinal, the winners of 2 v 7 and 3 v 6 in the other. Each is a single game, and the two winners play the final. ${stageSub(format, "FF", "")}`.trim()],
      },
    ]),
  ];

  const seasonLabel = formatSeasonLabel(seasonCode);
  return (
    <motion.div className="flex flex-col gap-6 lg:gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
      <PageHeader stacked compact kicker={summary.kicker} title="Postseason" description={<p className="mt-1 font-semibold">{summary.title}</p>}>
        <div className="basis-full">
          <Steps steps={steps} />
        </div>
      </PageHeader>

      {hasLoadingIssues(format) ? <p className="muted text-sm">{LOADING_ISSUES_NOTE}</p> : null}
      {elimination ? <>
        <p className="text-sm">The round of 16 is played by the top four clubs of each regular-season group. <Link to={`/${seasonCode}/standings?phase=RS`} className="link link-primary">View the group standings</Link>.</p>
        {bracket.issues.map((issue) => <p key={issue.message} className="muted text-sm">{issue.message} <Link to={`/${seasonCode}/games?phase=PO`} className="link link-primary">View the recorded Playoffs games</Link>.</p>)}
      </> : null}
      {grouped ? <>
        <p className="text-sm">{bracket.direct ? "Final Four participants are the winners of the Top 16 groups." : "Quarterfinal participants come from the Top 16 groups."} <Link to={`/${seasonCode}/standings?phase=TS`} className="link link-primary">View Top 16 group standings</Link>.</p>
        {bracket.issues.map((issue) => <p key={issue.stage} className="muted text-sm">{issue.message} <Link to={`/${seasonCode}/games?phase=${issue.stage}`} className="link link-primary">{issue.stage === "PO" ? "View recorded quarterfinal games" : "View recorded Final Four games"}</Link>.</p>)}
      </> : null}

      {bracket.champion ? <ChampionPanel bracket={bracket} seasonLabel={seasonLabel} /> : null}

      {bracket.projected ? (
        <p className="muted -mb-2 text-sm">Projected from the current standings: the dashed matchups update as the regular season goes on.</p>
      ) : null}
      {elimination
        ? <EliminationGrid bracket={bracket} selectedId={selected?.id ?? null} focusClub={focusClub} onSelect={select} onFocusClub={setFocusClub} />
        : <Bracket bracket={bracket} selectedId={selected?.id ?? null} focusClub={focusClub} onSelect={select} onFocusClub={setFocusClub} moves={moves} movesSince={movesSince} holders={grouped ? null : holders} />}

      <div ref={detailRef} className="scroll-mt-28">
        {selected ? <MatchupDetail slot={selected} seasonCode={seasonCode} /> : null}
      </div>

      {!grouped && !elimination && !regularSeasonDone && raceUnavailable ? <EmptyText>The qualification race is unavailable while regular-season data is incomplete.</EmptyText> : null}
      {showRace ? <NextGamesPanel seasonCode={seasonCode} round={remaining.nextRound} games={movers} standings={standings} teams={teams} /> : null}
      {showRace ? <RacePanel standings={standings} teams={teams} race={race} directSeeds={bracket.directSeeds} playInLast={bracket.playInLast} /> : null}

      <FormatCards cards={formatCards} />
    </motion.div>
  );
}
