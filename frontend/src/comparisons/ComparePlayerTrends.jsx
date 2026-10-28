import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getPlayerAdvanced, getPlayerGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { TrendsSkeleton } from "./CompareSkeleton";
import EmptyText from "../lib/EmptyText";
import { sectionContainer, sectionItem } from "../lib/motion";
import { playedLog, viewGame } from "../players/gameLog";
import { advancedScopeForPhase } from "../teams/teamLeague";
import { LineTrend } from "./TrendCharts";
import Panel from "../lib/Panel";
import { chartNames } from "./playerLabels";
import PlayerPairHeader from "./PlayerPairHeader";
import usePlayerRows from "./usePlayerRows";
import { padTo } from "./trendMath";

// Fewer games than this is not a trend.
const MIN_GAMES = 4;

const STATS = [
  { key: "pts", title: "Points", kicker: "SCORING" },
  { key: "reb", title: "Rebounds", kicker: "REBOUNDING" },
  { key: "ast", title: "Assists", kicker: "PLAYMAKING" },
  { key: "pir", title: "Valuation (PIR)", kicker: "OVERALL" },
];

// The tooltip's second line for a game.
function noteOf(view) {
  return (view.home ? "vs " : "at ") + (view.opponent?.abbreviatedName ?? view.opponent?.name ?? "TBD") + ": " + Math.round(view.pts) + " pts, " + Math.round(view.reb) + " reb, " + Math.round(view.ast) + " ast";
}

// The rounds of two players on one axis: a round a player has no row for stays empty.
function byRound(dataA, dataB, key) {
  const rounds = [...new Set([...(dataA?.rounds ?? []), ...(dataB?.rounds ?? [])].map((row) => row.round))].sort((x, y) => x - y);
  const pick = (data) => {
    const rows = new Map((data?.rounds ?? []).map((row) => [row.round, row[key]]));
    return rounds.map((round) => (rows.get(round) === null || rows.get(round) === undefined ? null : Number(rows.get(round))));
  };
  return { labels: rounds.map((round) => "Round " + round), a: pick(dataA), b: pick(dataB) };
}

// How two players have been playing through the season: points, rebounds, assists and PIR in every game, and how
// their PER and Win Shares built up round by round.
export default function ComparePlayerTrends({ seasonCode, phaseCode, entityA, entityB }) {
  const scope = advancedScopeForPhase(phaseCode);
  const [rowA, rowB] = usePlayerRows(seasonCode, phaseCode, entityA, entityB);
  const gamesA = useQuery({ queryKey: ["player-games", seasonCode, entityA.id], queryFn: () => getPlayerGames(seasonCode, entityA.id, { limit: 100 }) });
  const gamesB = useQuery({ queryKey: ["player-games", seasonCode, entityB.id], queryFn: () => getPlayerGames(seasonCode, entityB.id, { limit: 100 }) });
  const advancedFor = (entity) => ({
    queryKey: ["player-advanced", seasonCode, entity.id, scope, "extended"],
    queryFn: () => getPlayerAdvanced(seasonCode, entity.id, { scope, extended: true }),
    enabled: Boolean(phaseCode) && scope !== null,
  });
  const advancedA = useQuery(advancedFor(entityA));
  const advancedB = useQuery(advancedFor(entityB));

  const viewsA = useMemo(() => playedLog(gamesA.data?.games ?? []).map(viewGame), [gamesA.data]);
  const viewsB = useMemo(() => playedLog(gamesB.data?.games ?? []).map(viewGame), [gamesB.data]);
  const length = Math.max(viewsA.length, viewsB.length);
  const labels = useMemo(() => Array.from({ length }, (_, index) => "Game " + (index + 1)), [length]);
  // The legends and tooltips name the players by last name (full names when they share one).
  const [nameA, nameB] = chartNames(entityA.label, entityB.label);
  const gameSeries = useMemo(
    () =>
      Object.fromEntries(
        STATS.map((stat) => [
          stat.key,
          [
            { label: nameA, points: padTo(viewsA.map((view) => view[stat.key]), length), notes: viewsA.map(noteOf) },
            { label: nameB, points: padTo(viewsB.map((view) => view[stat.key]), length), notes: viewsB.map(noteOf) },
          ],
        ]),
      ),
    [viewsA, viewsB, length, nameA, nameB],
  );
  const per = useMemo(() => byRound(advancedA.data, advancedB.data, "per"), [advancedA.data, advancedB.data]);
  const shares = useMemo(() => byRound(advancedA.data, advancedB.data, "winShares"), [advancedA.data, advancedB.data]);

  if (gamesA.isPending || gamesB.isPending) return <AsyncState status="loading" label="Loading the trends" skeleton={<TrendsSkeleton />} />;
  if (gamesA.isError || gamesB.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load the trends."
        onRetry={() => {
          gamesA.refetch();
          gamesB.refetch();
        }}
      />
    );
  }
  if (viewsA.length < MIN_GAMES || viewsB.length < MIN_GAMES) return <EmptyText>Not enough games played to show a trend yet.</EmptyText>;

  const gameNote = "Every game, in order. Hover or tap a point for the game.";
  const haveRatings = per.labels.length >= 2;
  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <Panel className="p-4">
          <PlayerPairHeader seasonCode={seasonCode} entityA={entityA} entityB={entityB} rowA={rowA} rowB={rowB} />
        </Panel>
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        {STATS.map((stat) => (
          <LineTrend key={stat.key} kicker={stat.kicker} title={stat.title} note={gameNote} labels={labels} series={gameSeries[stat.key]} markers />
        ))}
      </motion.div>
      {haveRatings ? (
        <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
          <LineTrend
            kicker="BUILT UP ROUND BY ROUND"
            title="PER"
            note="Player efficiency rating after each round of the season; the league average is 15."
            labels={per.labels}
            series={[
              { label: nameA, points: per.a },
              { label: nameB, points: per.b },
            ]}
          />
          <LineTrend
            kicker="BUILT UP ROUND BY ROUND"
            title="Win Shares"
            note="How many of the team's wins each player is responsible for, running through the season."
            labels={shares.labels}
            series={[
              { label: nameA, points: shares.a },
              { label: nameB, points: shares.b },
            ]}
            digits={2}
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
