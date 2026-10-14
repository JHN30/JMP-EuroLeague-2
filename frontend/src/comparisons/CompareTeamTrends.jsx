import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getSeasonTeams, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatPerGame } from "../lib/format";
import { isForfeit } from "../lib/forfeit";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { LineTrend, MarginTrend } from "./TrendCharts";
import { average, padTo } from "./trendMath";
import useClubEntities from "./useClubEntities";

const GAMES_LIMIT = 100;
const WINDOW = 5;
// Fewer games than this is not a trend.
const MIN_GAMES = 4;

// One club's played games in the phase, in order, each from the club's side.
function gamesOf(data, phaseCode, clubCode) {
  return (data?.games ?? [])
    .filter((game) => game.played && game.phaseCode === phaseCode && game.localScore != null && game.roadScore != null)
    .sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt))
    .map((game) => {
      const home = game.localTeam?.clubCode === clubCode;
      const own = home ? game.localScore : game.roadScore;
      const other = home ? game.roadScore : game.localScore;
      const opponent = home ? game.roadTeam : game.localTeam;
      return { code: game.gameCode, forfeit: isForfeit(game), own, other, margin: own - other, note: (home ? "vs " : "at ") + (opponent?.abbreviatedName ?? opponent?.name ?? "TBD") + " " + own + "-" + other };
    });
}

function streakOf(games) {
  if (games.length === 0) return null;
  const won = games[games.length - 1].margin > 0;
  let count = 0;
  for (let index = games.length - 1; index >= 0 && games[index].margin > 0 === won; index -= 1) count += 1;
  return (won ? "W" : "L") + count;
}

function Delta({ value, lowerIsBetter = false }) {
  if (value === null || Math.abs(value) < 0.05) return <span className="muted text-xs">level with the season</span>;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return <span className={"text-xs font-semibold tabular-nums " + (good ? "text-success" : "text-error")}>{(value > 0 ? "+" : "") + value.toFixed(1) + " on the season"}</span>;
}

function FormColumn({ label, crestUrl, games }) {
  const recent = games.slice(-WINDOW);
  const wins = recent.filter((game) => game.margin > 0).length;
  // A forfeit counts in the record and the streak, but its awarded score is no points scored: the averages use real games only.
  const real = games.filter((game) => !game.forfeit);
  const recentReal = recent.filter((game) => !game.forfeit);
  const scored = average(real.map((game) => game.own));
  const allowed = average(real.map((game) => game.other));
  const recentScored = average(recentReal.map((game) => game.own));
  const recentAllowed = average(recentReal.map((game) => game.other));
  const compare = real.length > recentReal.length;
  return (
    <div className="rounded-field bg-base-200/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        {crestUrl ? <RevealImage src={crestUrl} className="h-10 w-10 flex-none object-contain" /> : <span className="h-10 w-10 flex-none" />}
        <div className="min-w-0">
          <p className="font-bold">{label}</p>
          <p className="muted text-xs">
            Last {recent.length}: {wins}-{recent.length - wins}
            {streakOf(games) ? " · streak " + streakOf(games) : ""}
          </p>
        </div>
      </div>
      <div className="mb-3 flex gap-1" aria-hidden="true">
        {recent.map((game) => (
          <span key={game.code} className={"h-2 flex-1 rounded-full " + (game.margin > 0 ? "bg-success" : "bg-error")} title={game.note} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="muted text-xs font-bold uppercase tracking-wide">Scored</p>
          <p className="text-2xl font-black tabular-nums">{formatPerGame(recentScored)}</p>
          {compare ? <Delta value={recentScored - scored} /> : null}
        </div>
        <div>
          <p className="muted text-xs font-bold uppercase tracking-wide">Allowed</p>
          <p className="text-2xl font-black tabular-nums">{formatPerGame(recentAllowed)}</p>
          {compare ? <Delta value={recentAllowed - allowed} lowerIsBetter /> : null}
        </div>
      </div>
    </div>
  );
}

// How each club has been playing through the season: the last five games against the season, scoring and defence as five-game
// averages, the running point differential and every game's margin.
export default function CompareTeamTrends({ seasonCode, phaseCode, entityA: pickedA, entityB: pickedB }) {
  const [entityA, entityB] = useClubEntities(seasonCode, pickedA, pickedB);
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const queryA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const queryB = useQuery({ queryKey: ["team-games", seasonCode, entityB.id], queryFn: () => getTeamGames(seasonCode, entityB.id, { limit: GAMES_LIMIT, order: "asc" }) });

  const gamesA = useMemo(() => gamesOf(queryA.data, phaseCode, entityA.id), [queryA.data, phaseCode, entityA.id]);
  const gamesB = useMemo(() => gamesOf(queryB.data, phaseCode, entityB.id), [queryB.data, phaseCode, entityB.id]);
  // The charts show scoring, so they leave out a recorded forfeit (its game number is the played games' position).
  const realA = useMemo(() => gamesA.filter((game) => !game.forfeit), [gamesA]);
  const realB = useMemo(() => gamesB.filter((game) => !game.forfeit), [gamesB]);
  const length = Math.max(realA.length, realB.length);
  const labels = useMemo(() => Array.from({ length }, (_, index) => "Game " + (index + 1)), [length]);
  const charts = useMemo(() => {
    const line = (games, pick) => padTo(games.map(pick), length);
    return {
      scored: [
        { label: entityA.label, points: line(realA, (game) => game.own), notes: realA.map((game) => game.note) },
        { label: entityB.label, points: line(realB, (game) => game.own), notes: realB.map((game) => game.note) },
      ],
      allowed: [
        { label: entityA.label, points: line(realA, (game) => game.other), notes: realA.map((game) => game.note) },
        { label: entityB.label, points: line(realB, (game) => game.other), notes: realB.map((game) => game.note) },
      ],
      margin: [
        { label: entityA.label, points: line(realA, (game) => game.margin), notes: realA.map((game) => game.note) },
        { label: entityB.label, points: line(realB, (game) => game.margin), notes: realB.map((game) => game.note) },
      ],
    };
  }, [realA, realB, length, entityA.label, entityB.label]);

  if (queryA.isPending || queryB.isPending) return <AsyncState status="loading" label="Loading the trends" />;
  if (queryA.isError || queryB.isError) {
    return (
      <AsyncState
        status="error"
        message="Could not load the trends."
        onRetry={() => {
          queryA.refetch();
          queryB.refetch();
        }}
      />
    );
  }
  if (gamesA.length < MIN_GAMES || gamesB.length < MIN_GAMES) return <EmptyText>Not enough games played in this phase to show a trend yet.</EmptyText>;

  const crestOf = (id) => (teamsQuery.data?.teams ?? []).find((team) => team.clubCode === id)?.crestUrl;
  const gameNote = "Every game, in order. Hover or tap a point for the game.";
  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <Panel className="p-4">
          <p className="eyebrow mb-0.5">FORM</p>
          <h3 className="mb-3 text-lg font-bold">The last {WINDOW} games against the season</h3>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <FormColumn label={entityA.label} crestUrl={crestOf(entityA.id)} games={gamesA} />
            <FormColumn label={entityB.label} crestUrl={crestOf(entityB.id)} games={gamesB} />
          </div>
        </Panel>
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        <LineTrend kicker="SCORING" title="Points scored" note={gameNote} labels={labels} series={charts.scored} markers />
        <LineTrend kicker="DEFENSE" title="Points allowed" note={gameNote + " Lower is better."} labels={labels} series={charts.allowed} markers />
      </motion.div>
      <motion.div variants={sectionItem}>
        <LineTrend kicker="MARGIN" title="Point differential" note="Points scored minus points allowed in each game: above the line is a win, below it a loss. Hover or tap a point for the game." labels={labels} series={charts.margin} digits={0} zero markers />
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        <MarginTrend kicker={entityA.label.toUpperCase()} title="Margin in every game" note="Green: won. Red: lost." labels={labels.slice(0, gamesA.length)} margins={gamesA.map((game) => game.margin)} notes={gamesA.map((game) => game.note)} label={entityA.label} />
        <MarginTrend kicker={entityB.label.toUpperCase()} title="Margin in every game" note="Green: won. Red: lost." labels={labels.slice(0, gamesB.length)} margins={gamesB.map((game) => game.margin)} notes={gamesB.map((game) => game.note)} label={entityB.label} />
      </motion.div>
    </motion.div>
  );
}
