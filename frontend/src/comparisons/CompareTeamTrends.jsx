import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getSeasonStandings, getSeasonTeams, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { TeamTrendsSkeleton } from "./CompareSkeleton";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { formatPerGame } from "../lib/format";
import { isForfeit } from "../lib/forfeit";
import { ordinal } from "../lib/seasonFormat";
import { listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { LineTrend, MarginTrend } from "./TrendCharts";
import { average, padTo } from "./trendMath";
import useClubEntities from "./useClubEntities";

const GAMES_LIMIT = 100;
const WINDOW = 5;
// Fewer games than this is not a trend.
const MIN_GAMES = 4;
const ROLLING = 3;
// A game decided by this many points or fewer is close; by BLOWOUT or more, one-sided.
const CLOSE = 5;
const BLOWOUT = 15;

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
      return { code: game.gameCode, forfeit: isForfeit(game), own, other, margin: own - other, opponent, note: (home ? "vs " : "at ") + (opponent?.abbreviatedName ?? opponent?.name ?? "TBD") + " " + own + "-" + other };
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
  if (value === null || Math.abs(value) < 0.05) return <span className="muted text-xs">(level)</span>;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return <span className={"text-xs font-semibold tabular-nums " + (good ? "text-success" : "text-error")}>({(value > 0 ? "+" : "") + value.toFixed(1)})</span>;
}

// One club's last five games against its season, on one line from sm: who, the record and streak, the results, then points scored and
// allowed over those games with the change on the season average.
function FormLine({ label, crestUrl, games }) {
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
  const streak = streakOf(games);
  return (
    <motion.li variants={listItem} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-base-300 py-2.5 last:border-0 sm:grid-cols-[minmax(0,13rem)_7.5rem_minmax(0,1fr)_auto_auto]">
      <span className="flex min-w-0 items-center gap-2 font-bold">
        {crestUrl ? <RevealImage src={crestUrl} className="h-7 w-7 flex-none object-contain" /> : <span className="h-7 w-7 flex-none" />}
        <span className="min-w-0 wrap-break-word">{label}</span>
      </span>
      <span className="muted text-right text-xs tabular-nums sm:text-left">
        Last {recent.length}: <b className="text-base-content">{wins}-{recent.length - wins}</b>
        {streak ? ` · ${streak}` : ""}
      </span>
      <span className="col-span-2 flex gap-1 sm:col-span-1" aria-label={`Last ${recent.length}: ${recent.map((game) => (game.margin > 0 ? "win" : "loss")).join(", ")}`}>
        {recent.map((game) => (
          <span key={game.code} className={"h-2 flex-1 rounded-full " + (game.margin > 0 ? "bg-success" : "bg-error")} title={game.note} />
        ))}
      </span>
      <span className="text-sm whitespace-nowrap">
        <span className="muted text-xs">Scored</span> <b className="tabular-nums">{formatPerGame(recentScored)}</b> {compare ? <Delta value={recentScored - scored} /> : null}
      </span>
      <span className="text-right text-sm whitespace-nowrap">
        <span className="muted text-xs">Allowed</span> <b className="tabular-nums">{formatPerGame(recentAllowed)}</b> {compare ? <Delta value={recentAllowed - allowed} lowerIsBetter /> : null}
      </span>
    </motion.li>
  );
}

// A club over a narrow column of figures: its TV code (the club code when it has none) at every width, the name in its tip and for
// screen readers.
function ClubCode({ entity }) {
  return (
    <span title={entity.label}>
      <span aria-hidden="true">{entity.tvCode ?? entity.id}</span>
      <span className="sr-only">{entity.label}</span>
    </span>
  );
}

// ---- Game types: close games, one-sided games, and the strong and weak clubs ----

const recordOf = (games) => {
  const wins = games.filter((game) => game.margin > 0).length;
  return { wins, losses: games.length - wins };
};

// The top and bottom halves of one standings table; null for a season played in groups, where places repeat.
function halvesOf(standings) {
  const rows = (standings ?? []).filter((entry) => entry.basic?.position);
  if (rows.length === 0 || new Set(rows.map((entry) => entry.groupName)).size > 1) return null;
  const top = Math.ceil(rows.length / 2);
  return { top: new Set(rows.filter((entry) => entry.basic.position <= top).map((entry) => entry.clubCode)), size: rows.length, cut: top };
}

function TypeRow({ label, tip, a, b }) {
  const share = (record) => (record.wins + record.losses > 0 ? record.wins / (record.wins + record.losses) : null);
  const [shareA, shareB] = [share(a), share(b)];
  const better = shareA !== null && shareB !== null && shareA !== shareB ? (shareA > shareB ? "a" : "b") : null;
  const show = (record, side) => (
    <span className={`text-right tabular-nums ${better === side ? "font-bold text-primary" : "font-semibold"}`}>
      {record.wins + record.losses === 0 ? "—" : `${record.wins}-${record.losses}`}
    </span>
  );
  return (
    <motion.li variants={listItem} data-better={better ?? undefined} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-2 border-b border-base-300 py-2 text-sm last:border-0">
      <span className="min-w-0 font-medium">
        <HeaderTip tip={tip}>{label}</HeaderTip>
      </span>
      {show(a, "a")}
      {show(b, "b")}
    </motion.li>
  );
}

function GameTypes({ gamesA, gamesB, entityA, entityB, halves }) {
  const realA = gamesA.filter((game) => !game.forfeit);
  const realB = gamesB.filter((game) => !game.forfeit);
  const rows = [
    { label: `Close games (${CLOSE} or fewer)`, tip: `Games decided by ${CLOSE} points or fewer, won-lost`, pick: (games) => games.filter((game) => Math.abs(game.margin) <= CLOSE), real: true },
    { label: `Decided by ${BLOWOUT}+`, tip: `Games won or lost by ${BLOWOUT} points or more, won-lost`, pick: (games) => games.filter((game) => Math.abs(game.margin) >= BLOWOUT), real: true },
    ...(halves
      ? [
          { label: `Against the top ${halves.cut}`, tip: `Against the clubs placed 1st to ${ordinal(halves.cut)} in the regular-season standings now`, pick: (games) => games.filter((game) => halves.top.has(game.opponent?.clubCode)) },
          { label: `Against the bottom ${halves.size - halves.cut}`, tip: `Against the clubs placed ${ordinal(halves.cut + 1)} to ${ordinal(halves.size)} in the regular-season standings now`, pick: (games) => games.filter((game) => game.opponent?.clubCode && !halves.top.has(game.opponent.clubCode)) },
        ]
      : []),
  ];
  return (
    <Panel as="section" aria-label="Game types" className="h-full p-4">
      <PanelHeader compact level="h2" kicker="RECORDS" title="By type of game" />
      <div aria-hidden="true" className="muted grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-x-2 border-b border-base-300 pb-1 text-right text-xs font-bold tracking-wide uppercase">
        <span />
        <ClubCode entity={entityA} />
        <ClubCode entity={entityB} />
      </div>
      <motion.ul variants={listContainer} initial="hidden" animate="show">
        {rows.map((row) => (
          <TypeRow key={row.label} label={row.label} tip={row.tip} a={recordOf(row.pick(row.real ? realA : gamesA))} b={recordOf(row.pick(row.real ? realB : gamesB))} />
        ))}
      </motion.ul>
      {halves ? null : <p className="muted mt-2 text-xs">The records against the top and bottom of the table need one regular-season table.</p>}
    </Panel>
  );
}

// ---- Common opponents ----

function Margins({ games, better }) {
  return (
    <span className={`flex flex-wrap justify-end gap-x-1.5 tabular-nums ${better ? "rounded-field bg-primary/10 px-1.5" : "px-1.5"}`}>
      {games.map((game) => (
        <span key={game.code} title={game.note} className={`font-semibold ${game.margin > 0 ? "text-success" : "text-error"}`}>
          {game.margin > 0 ? "+" : "−"}
          {Math.abs(game.margin)}
        </span>
      ))}
    </span>
  );
}

// The clubs both have played (their own meetings left out): each club's margins against each, the better total marked, the clubs in
// their standings order.
function CommonOpponents({ gamesA, gamesB, entityA, entityB, order }) {
  const against = (games, own) => {
    const map = new Map();
    for (const game of games) {
      const code = game.opponent?.clubCode;
      if (!code || code === own || code === entityA.id || code === entityB.id) continue;
      map.set(code, [...(map.get(code) ?? []), game]);
    }
    return map;
  };
  const mapA = against(gamesA, entityA.id);
  const mapB = against(gamesB, entityB.id);
  const place = (code) => order.get(code) ?? Number.MAX_SAFE_INTEGER;
  const rows = [...mapA.keys()]
    .filter((code) => mapB.has(code))
    .sort((x, y) => place(x) - place(y))
    .map((code) => {
      const a = mapA.get(code);
      const b = mapB.get(code);
      const total = (games) => games.reduce((sum, game) => sum + game.margin, 0);
      const better = total(a) === total(b) ? null : total(a) > total(b) ? "a" : "b";
      return { code, opponent: a[0].opponent, a, b, better };
    });
  const count = (side) => rows.filter((row) => row.better === side).length;
  const level = rows.length - count("a") - count("b");
  return (
    <Panel as="section" aria-label="Common opponents" className="h-full p-4">
      <PanelHeader compact level="h2" kicker="SAME OPPONENTS" title="Common opponents" />
      {rows.length === 0 ? (
        <p className="muted text-sm">The two clubs have not played the same opponent in this phase yet.</p>
      ) : (
        <>
          <p className="mb-2 text-sm" data-testid="common-summary">
            Against {rows.length} common {rows.length === 1 ? "opponent" : "opponents"}: <b>{entityA.label}</b> better on <b className="tabular-nums">{count("a")}</b>, <b>{entityB.label}</b> on{" "}
            <b className="tabular-nums">{count("b")}</b>
            {level ? `, ${level} level` : ""}
          </p>
          <div aria-hidden="true" className="muted grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] gap-x-2 border-b border-base-300 pb-1 text-right text-xs font-bold tracking-wide uppercase lg:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_minmax(0,1fr)_5.5rem_5.5rem] max-lg:[&>*:nth-child(n+4)]:hidden">
            <span />
            <ClubCode entity={entityA} />
            <ClubCode entity={entityB} />
            <span />
            <ClubCode entity={entityA} />
            <ClubCode entity={entityB} />
          </div>
          <motion.ul className="grid gap-x-6 lg:grid-cols-2" variants={listContainer} initial="hidden" animate="show">
            {rows.map((row) => (
              <motion.li key={row.code} variants={listItem} data-better={row.better ?? undefined} className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-x-2 border-b border-base-300 py-1.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {row.opponent?.crestUrl ? <RevealImage src={row.opponent.crestUrl} className="h-5 w-5 flex-none object-contain" /> : <span className="h-5 w-5 flex-none" />}
                  <ShortLabel short={teamCode(row.opponent)} full={shortTeamName(row.opponent)} />
                </span>
                <Margins games={row.a} better={row.better === "a"} />
                <Margins games={row.b} better={row.better === "b"} />
              </motion.li>
            ))}
          </motion.ul>
        </>
      )}
    </Panel>
  );
}

// How each club has been playing through the season: the last five games against the season, records by type of game, results
// against the opponents both have met, scoring and defence game by game with a rolling average, and every game's margin.
export default function CompareTeamTrends({ seasonCode, phaseCode, entityA: pickedA, entityB: pickedB }) {
  const [entityA, entityB] = useClubEntities(seasonCode, pickedA, pickedB);
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const queryA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const queryB = useQuery({ queryKey: ["team-games", seasonCode, entityB.id], queryFn: () => getTeamGames(seasonCode, entityB.id, { limit: GAMES_LIMIT, order: "asc" }) });
  // The same regular-season table the header shows each club's place from.
  const standingsQuery = useQuery({ queryKey: ["standings", seasonCode, "RS"], queryFn: () => getSeasonStandings(seasonCode, "RS"), retry: false });

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
    };
  }, [realA, realB, length, entityA.label, entityB.label]);

  if (queryA.isPending || queryB.isPending) return <AsyncState status="loading" label="Loading the trends" skeleton={<TeamTrendsSkeleton />} />;
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
  const standings = standingsQuery.data?.standings ?? [];
  const halves = halvesOf(standings);
  const order = new Map(standings.map((entry, index) => [entry.clubCode, entry.basic?.position ?? index + 1]));
  const gameNote = "Every game, in order. Hover or tap a point for the game. The bold line is the average of the last 3 games.";
  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <Panel as="section" aria-label="Recent form" className="p-4">
          <PanelHeader compact level="h2" kicker="FORM" title={`The last ${WINDOW} games against the season`} />
          <motion.ul variants={listContainer} initial="hidden" animate="show">
            <FormLine label={entityA.label} crestUrl={crestOf(entityA.id)} games={gamesA} />
            <FormLine label={entityB.label} crestUrl={crestOf(entityB.id)} games={gamesB} />
          </motion.ul>
        </Panel>
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" variants={sectionItem}>
        <GameTypes gamesA={gamesA} gamesB={gamesB} entityA={entityA} entityB={entityB} halves={standingsQuery.isSuccess ? halves : null} />
        <CommonOpponents gamesA={gamesA} gamesB={gamesB} entityA={entityA} entityB={entityB} order={order} />
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        <LineTrend compact rolling={ROLLING} kicker="SCORING" title="Points scored" note={gameNote} subtitle={`Bold: ${ROLLING}-game average`} labels={labels} series={charts.scored} markers />
        <LineTrend compact rolling={ROLLING} kicker="DEFENSE" title="Points allowed" note={gameNote} subtitle={`Lower is better · bold: ${ROLLING}-game average`} labels={labels} series={charts.allowed} markers />
      </motion.div>
      <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2" variants={sectionItem}>
        <MarginTrend compact kicker={entityA.label.toUpperCase()} title="Margin in every game" note="Green: won. Red: lost." labels={labels.slice(0, gamesA.length)} margins={gamesA.map((game) => game.margin)} notes={gamesA.map((game) => game.note)} label={entityA.label} />
        <MarginTrend compact kicker={entityB.label.toUpperCase()} title="Margin in every game" note="Green: won. Red: lost." labels={labels.slice(0, gamesB.length)} margins={gamesB.map((game) => game.margin)} notes={gamesB.map((game) => game.note)} label={entityB.label} />
      </motion.div>
    </motion.div>
  );
}
