import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Link } from "react-router";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getPlayerGames, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { PlayerFormBodySkeleton, PlayerHighsBodySkeleton, PlayerMeetingsBodySkeleton, PlayerOverviewSkeleton } from "./CompareSkeleton";
import { formatDate, formatDateTime, formatPerGame } from "../lib/format";
import { barFill, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { displayName } from "../lib/playerName";
import ShortLabel from "../lib/ShortLabel";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "../players/leagueLeaderboard";
import { PROFILE_AXES, SEASON_LINE, rankPlayer, statNumber } from "../players/playerOverview";
import { playedLog, seasonHighGames, viewGame } from "../players/gameLog";
import { ordinal } from "../teams/teamLeague";
import CompareRadar from "./CompareRadar";
import { chartNames } from "./playerLabels";
import HeaderTip from "../lib/HeaderTip";
import PlayerPairHeader from "./PlayerPairHeader";

const FORM_GAMES = 5;

// Each player's colour, as on the radar: A is the primary colour, B the accent.
const SIDE_TEXT = { a: "text-primary", b: "text-accent" };
const SIDE_BG = { a: "bg-primary", b: "bg-accent" };

// The six numbers of a game line, with the season per-game field each is compared with.
const LINE_STATS = [
  { label: "PTS", key: "pts", full: "Points", field: "pointsScored" },
  { label: "REB", key: "reb", full: "Rebounds", field: "totalRebounds" },
  { label: "AST", key: "ast", full: "Assists", field: "assists" },
  { label: "STL", key: "stl", full: "Steals", field: "steals" },
  { label: "BLK", key: "blk", full: "Blocks", field: "blocks" },
  { label: "PIR", key: "pir", full: "Performance index rating", field: "pir" },
];
const LINE_KEYS = LINE_STATS.map((stat) => stat.key);

const nameOf = (player, fallback) => {
  if (!player) return fallback;
  return displayName(player.playerName);
};

// The short names of the two players across the tab, as the radar names them: their last names, or their full names when the last
// names are the same.
const shortNames = (entityA, entityB, playerA, playerB) => chartNames(playerA?.playerName ?? entityA.label, playerB?.playerName ?? entityB.label);

// Both players' season game logs as played games, oldest first. The Recent form, When they met and Season highs panels read the
// same two queries, so they load once.
function usePairGames(seasonCode, entityA, entityB) {
  const gamesA = useQuery({ queryKey: ["player-games", seasonCode, entityA.id], queryFn: () => getPlayerGames(seasonCode, entityA.id, { limit: 100 }) });
  const gamesB = useQuery({ queryKey: ["player-games", seasonCode, entityB.id], queryFn: () => getPlayerGames(seasonCode, entityB.id, { limit: 100 }) });
  const status = gamesA.isPending || gamesB.isPending ? "loading" : gamesA.isError || gamesB.isError ? "error" : "ready";
  const views = useMemo(
    () => (status === "ready" ? [playedLog(gamesA.data.games ?? []).map(viewGame), playedLog(gamesB.data.games ?? []).map(viewGame)] : [[], []]),
    [status, gamesA.data, gamesB.data],
  );
  return {
    status,
    viewsA: views[0],
    viewsB: views[1],
    retry: () => {
      gamesA.refetch();
      gamesB.refetch();
    },
  };
}

// The loading or error state of a panel that reads the game logs, inside the panel.
function GamesState({ games, skeleton }) {
  if (games.status === "loading") return <AsyncState status="loading" label="Loading the games" skeleton={skeleton} />;
  return <AsyncState status="error" message="Could not load the games." inline onRetry={games.retry} />;
}

// ---- Header ----

// Who has the better number on more of the season line, minutes left out.
function leadLine(pool, entityA, entityB, nameA, nameB) {
  let a = 0;
  let b = 0;
  let level = 0;
  const counted = SEASON_LINE.filter((stat) => stat.label !== "MIN");
  for (const stat of counted) {
    const valueA = rankPlayer(pool, entityA.id, stat).value;
    const valueB = rankPlayer(pool, entityB.id, stat).value;
    if (valueA === null || valueB === null) continue;
    if (valueA > valueB) a += 1;
    else if (valueB > valueA) b += 1;
    else level += 1;
  }
  if (a + b + level === 0) return null;
  return `${nameA} ahead in ${a} of ${counted.length} · ${nameB} in ${b}${level ? ` · ${level} level` : ""}`;
}

function HeaderPanel({ pool, entityA, entityB, playerA, playerB, seasonCode }) {
  const lead = leadLine(pool, entityA, entityB, ...shortNames(entityA, entityB, playerA, playerB));
  return (
    <Panel className="p-4">
      <PlayerPairHeader compact seasonCode={seasonCode} entityA={entityA} entityB={entityB} rowA={playerA} rowB={playerB} />
      {lead ? <p className="border-base-300 mt-3 border-t pt-2 text-center text-sm font-semibold">{lead}</p> : null}
    </Panel>
  );
}

// ---- Profile ----

function strongestAndWeakest(axes, side) {
  const ranked = axes.filter((axis) => axis[side] !== null).sort((x, y) => y[side] - x[side]);
  return { best: ranked[0] ?? null, weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null };
}

// "Best: Scoring 100th · Weakest: Playmaking 50th", in the player's radar colour.
function ProfileSummary({ name, summary, side }) {
  if (!summary.best) return null;
  const part = (label, axis) => (axis ? `${label}: ${axis.label} ${ordinal(axis[side])}` : null);
  return (
    <p className="text-sm">
      <span className={`font-semibold ${SIDE_TEXT[side]}`}>{name}</span>{" "}
      <span className="muted">{[part("Best", summary.best), part("Weakest", summary.weakest)].filter(Boolean).join(" · ")}</span>
    </p>
  );
}

function ProfilePanel({ pool, entityA, entityB, playerA, playerB }) {
  // The radar's legend and tooltips name the two players by last name.
  const [chartNameA, chartNameB] = chartNames(playerA?.playerName ?? entityA.label, playerB?.playerName ?? entityB.label);
  const axes = useMemo(
    () =>
      PROFILE_AXES.map((axis) => ({
        label: axis.label,
        a: rankPlayer(pool, entityA.id, axis, { qualifiedOnly: true }).percentile,
        b: rankPlayer(pool, entityB.id, axis, { qualifiedOnly: true }).percentile,
      })),
    [pool, entityA.id, entityB.id],
  );
  const haveA = axes.some((axis) => axis.a !== null);
  const haveB = axes.some((axis) => axis.b !== null);
  return (
    <Panel className="p-4">
      <PanelHeader kicker="PERCENTILE 0-100" title="Profile" level="h3" />
      {haveA || haveB ? (
        <>
          <CompareRadar axes={axes} labelA={chartNameA} labelB={chartNameB} />
          <div className="mt-2 flex flex-col gap-1">
            <ProfileSummary name={chartNameA} summary={strongestAndWeakest(axes, "a")} side="a" />
            <ProfileSummary name={chartNameB} summary={strongestAndWeakest(axes, "b")} side="b" />
          </div>
          {!haveA || !haveB ? <p className="muted mt-2 text-xs">One of the two has not played enough games to be ranked in this phase yet.</p> : null}
        </>
      ) : (
        <p className="muted text-sm">Neither player has enough games to chart percentiles in this phase yet.</p>
      )}
    </Panel>
  );
}

// ---- Season line ----

// Every row shares this grid so the columns line up. Below sm a row is two lines: the stat name between the two places, then the two
// numbers with a bar each. From sm it is one line: name, A's place, number and bar, B's bar, number and place.
const LINE_GRID = "grid items-center gap-x-2 grid-cols-[3.25rem_1fr_1fr_3.25rem] sm:grid-cols-[3.5rem_2.75rem_3rem_1fr_1fr_3rem_2.75rem]";

// One half of the butterfly: A's grows left from the middle, B's right. Its length is the player's percentile in the phase; the better
// side is in its colour.
function HalfBar({ percentile, side, better }) {
  return (
    <div aria-hidden="true" className="bg-base-300 h-2 min-w-0 overflow-hidden rounded-full">
      <m.div
        className={`h-full rounded-full ${better ? SIDE_BG[side] : "bg-base-content/45"} ${side === "a" ? "ml-auto" : ""}`}
        style={{ width: `${Math.max(4, percentile ?? 0)}%`, originX: side === "a" ? 1 : 0 }}
        {...barFill}
      />
    </div>
  );
}

// The player's place among the qualified players, or a dash for one under the minimum games.
function Place({ ranking, className }) {
  if (ranking.rank) {
    return (
      <span className={`muted text-xs tabular-nums ${className}`} title={`${ordinal(ranking.rank)} of ${ranking.of}`}>
        {ordinal(ranking.rank)}
      </span>
    );
  }
  return (
    <span className={`muted text-xs ${className}`} title={ranking.unqualified ? "Under the minimum games" : undefined}>
      {ranking.unqualified ? (
        <>
          <span aria-hidden="true">&mdash;</span>
          <span className="sr-only">Under the minimum games</span>
        </>
      ) : null}
    </span>
  );
}

function LineRow({ stat, a, b }) {
  const neutral = stat.label === "MIN";
  const better = neutral || a.value === null || b.value === null || a.value === b.value ? null : a.value > b.value ? "a" : "b";
  const value = (ranking, side, className) => (
    <span className={`font-semibold tabular-nums ${better === side ? `font-bold ${SIDE_TEXT[side]}` : ""} ${className}`}>{formatPerGame(ranking.value)}</span>
  );
  return (
    <m.li variants={listItem} data-better={better ?? undefined} className={`${LINE_GRID} border-base-300 gap-y-0.5 border-b py-2 text-sm last:border-0`}>
      <span className="col-span-2 col-start-2 row-start-1 text-center text-xs font-bold tracking-wide uppercase sm:col-span-1 sm:col-start-1 sm:text-left">
        <HeaderTip tip={stat.title}>{stat.label}</HeaderTip>
      </span>
      <Place ranking={a} className="col-start-1 row-start-1 sm:col-start-2" />
      {value(a, "a", "col-start-1 row-start-2 text-right sm:col-start-3 sm:row-start-1")}
      <div className="col-start-2 row-start-2 sm:col-start-4 sm:row-start-1">
        <HalfBar percentile={a.percentile} side="a" better={better === "a"} />
      </div>
      <div className="col-start-3 row-start-2 sm:col-start-5 sm:row-start-1">
        <HalfBar percentile={b.percentile} side="b" better={better === "b"} />
      </div>
      {value(b, "b", "col-start-4 row-start-2 text-left sm:col-start-6 sm:row-start-1")}
      <Place ranking={b} className="col-start-4 row-start-1 text-right sm:col-start-7" />
    </m.li>
  );
}

function SeasonLinePanel({ pool, entityA, entityB, playerA, playerB }) {
  const [nameA, nameB] = shortNames(entityA, entityB, playerA, playerB);
  return (
    <Panel className="p-4">
      <PanelHeader kicker="PER GAME" title="Season line" level="h3" />
      <div aria-hidden="true" className={`${LINE_GRID} muted border-base-300 border-b pb-1 text-xs font-semibold`}>
        <span className="col-span-2 col-start-1 text-center sm:col-start-3">
          <span className={SIDE_TEXT.a}>{nameA}</span>
        </span>
        <span className="col-span-2 col-start-3 text-center sm:col-start-5">
          <span className={SIDE_TEXT.b}>{nameB}</span>
        </span>
      </div>
      <m.ul variants={listContainer} initial="hidden" animate="show">
        {SEASON_LINE.map((stat) => (
          <LineRow
            key={stat.label}
            stat={stat}
            a={rankPlayer(pool, entityA.id, stat, { qualifiedOnly: true })}
            b={rankPlayer(pool, entityB.id, stat, { qualifiedOnly: true })}
          />
        ))}
      </m.ul>
      <p className="muted mt-2 text-xs">The place is among the players with enough games; a bar is the player's percentile.</p>
    </Panel>
  );
}

// ---- Recent form ----

// The grid of a game row and its header: result, venue, opponent, then the four numbers.
// Below sm the venue goes in the opponent's cell and the six number columns narrow, so a row fits at 320px.
const GAME_GRID =
  "grid items-center grid-cols-[1.5rem_minmax(0,1fr)_repeat(6,minmax(0,1.6rem))] gap-x-1 sm:grid-cols-[1.5rem_1.25rem_minmax(0,1fr)_repeat(6,1.9rem)] sm:gap-x-1.5";

function Change({ value, season }) {
  if (value === null || season === null) return null;
  const change = value - season;
  const shown = Math.abs(change) < 0.05 ? "0.0" : `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}`;
  return (
    <span className={`text-xs tabular-nums ${change >= 0.05 ? "text-success" : change <= -0.05 ? "text-error" : "muted"}`} title="Change on the season per-game average">
      {shown}
    </span>
  );
}

function FormList({ views, player, label, side, seasonCode }) {
  const last = views.slice(-FORM_GAMES).reverse();
  const average = (key) => (last.length ? last.reduce((sum, view) => sum + view[key], 0) / last.length : null);
  return (
    <div className="min-w-0">
      <p className={`mb-1.5 font-semibold ${SIDE_TEXT[side]}`}>{label}</p>
      {last.length === 0 ? (
        <p className="muted text-sm">No games played yet.</p>
      ) : (
        // The averages sit beneath the games below xl, where the six columns need the width, and beside them (two by three) from xl.
        <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[10rem_minmax(0,1fr)] xl:items-start xl:gap-4">
          <dl className="order-last grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:order-0 xl:grid-cols-2 xl:gap-y-3">
            {LINE_STATS.map((stat) => (
              <div key={stat.key} className="min-w-0">
                <dt className="muted text-xs">
                  <HeaderTip tip={`${stat.full} per game over these ${last.length} games, and the change on the season average`}>{stat.label}</HeaderTip>
                </dt>
                <dd className="flex items-baseline gap-1">
                  <span className="text-lg font-bold tabular-nums">{formatPerGame(average(stat.key))}</span>
                  <Change value={average(stat.key)} season={statNumber(player?.traditional?.[stat.field])} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="min-w-0">
          <div aria-hidden="true" className={`${GAME_GRID} muted px-1 text-[0.65rem] sm:text-xs`}>
            {LINE_STATS.map((stat, index) => (
              <span key={stat.key} className={`text-end ${index === 0 ? "col-start-3 sm:col-start-4" : ""}`}>
                {stat.label}
              </span>
            ))}
          </div>
          <ul className="flex flex-col">
            {last.map((view) => (
              <li key={view.game.gameCode}>
                <Link
                  to={`/${seasonCode}/games/${view.game.gameCode}`}
                  aria-label={`${view.won ? "Won" : view.won === false ? "Lost" : "Played"} ${view.home ? "vs" : "at"} ${shortTeamName(view.opponent)}: ${Math.round(view.pts)} points, ${Math.round(view.reb)} rebounds, ${Math.round(view.ast)} assists, ${Math.round(view.stl)} steals, ${Math.round(view.blk)} blocks, PIR ${Math.round(view.pir)}`}
                  className={`${GAME_GRID} rounded-field hover:bg-base-200 px-1 py-0.5 text-sm max-sm:min-h-11`}
                >
                  <span className={`badge badge-sm w-6 font-bold ${view.won ? "badge-success" : view.won === false ? "badge-error" : "badge-ghost"}`}>
                    {view.won ? "W" : view.won === false ? "L" : "–"}
                  </span>
                  <span className="muted text-xs max-sm:hidden">{view.home ? "vs" : "at"}</span>
                  <span className="min-w-0 whitespace-nowrap">
                    <span className="muted me-1 text-xs sm:hidden">{view.home ? "vs" : "at"}</span>
                    <ShortLabel short={teamCode(view.opponent)} full={shortTeamName(view.opponent)} />
                  </span>
                  {LINE_STATS.map((stat) => (
                    <span key={stat.key} className={`text-end tabular-nums ${stat.key === "pir" ? "font-semibold" : ""}`}>
                      {Math.round(view[stat.key])}
                    </span>
                  ))}
                </Link>
              </li>
            ))}
          </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function FormPanel({ games, entityA, entityB, playerA, playerB, seasonCode }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker={`LAST ${FORM_GAMES} GAMES`} title="Recent form" level="h3" />
      {games.status !== "ready" ? (
        <GamesState games={games} skeleton={<PlayerFormBodySkeleton />} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <FormList views={games.viewsA} player={playerA} label={nameOf(playerA, entityA.label)} side="a" seasonCode={seasonCode} />
          <FormList views={games.viewsB} player={playerB} label={nameOf(playerB, entityB.label)} side="b" seasonCode={seasonCode} />
        </div>
      )}
    </Panel>
  );
}

// ---- When they met ----

const roundOf = (game) => game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName ?? "");

// "21 · 6 · 1 · 2 · 0", the points, rebounds, assists, steals and blocks of a game.
const lineOf = (view) => ["pts", "reb", "ast", "stl", "blk"].map((key) => Math.round(view[key])).join(" · ");

// The games both played this season: as opponents (on different sides of the game) and as teammates (on the same side).
function sharedGames(viewsA, viewsB) {
  const byGame = new Map(viewsB.map((view) => [view.game.gameCode, view]));
  const met = [];
  let together = 0;
  for (const viewA of viewsA) {
    const viewB = byGame.get(viewA.game.gameCode);
    if (!viewB) continue;
    if (viewA.home === viewB.home) together += 1;
    else met.push({ a: viewA, b: viewB });
  }
  return { met: met.reverse(), together };
}

// The games still to play between the two players' clubs this season, from A's club's schedule, soonest first. Nothing shows for
// players without a club in the phase or on the same club.
function UpcomingMeetings({ seasonCode, playerA, playerB, title }) {
  const clubA = playerA?.clubCode ?? null;
  const clubB = playerB?.clubCode ?? null;
  const enabled = Boolean(clubA && clubB && clubA !== clubB);
  const schedule = useQuery({
    queryKey: ["team-games", seasonCode, clubA, "scheduled"],
    queryFn: () => getTeamGames(seasonCode, clubA, { status: "scheduled", limit: 100, order: "asc" }),
    enabled,
  });
  if (!enabled) return null;
  let body;
  if (schedule.isPending) {
    body = <div aria-hidden="true" className="skeleton h-9 w-full" />;
  } else if (schedule.isError) {
    body = <AsyncState status="error" message="Could not load the schedule." inline onRetry={() => schedule.refetch()} />;
  } else {
    const games = (schedule.data.games ?? []).filter((game) => !game.played && (game.localTeam?.clubCode === clubB || game.roadTeam?.clubCode === clubB));
    body = games.length ? (
      <ul className="divide-base-300 divide-y">
        {games.map((game) => {
          const aHome = game.localTeam?.clubCode === clubA;
          const [teamA, teamB] = aHome ? [game.localTeam, game.roadTeam] : [game.roadTeam, game.localTeam];
          return (
            <li key={game.gameCode}>
              <Link
                to={`/${seasonCode}/games/${game.gameCode}`}
                className="rounded-field hover:bg-base-200 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-1.5 text-sm max-sm:min-h-11"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    <span className={SIDE_TEXT.a}>{teamCode(teamA)}</span> <span className="muted font-normal">{aHome ? "vs" : "at"}</span>{" "}
                    <span className={SIDE_TEXT.b}>{teamCode(teamB)}</span>
                  </span>
                  <span className="muted block text-xs">{roundOf(game)}</span>
                </span>
                <span className="muted text-end text-xs tabular-nums">{formatDateTime(game.scheduledAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="muted text-sm">No meeting left on the schedule.</p>
    );
  }
  return (
    <div className="border-base-300 mt-3 border-t pt-2">
      <p className="mb-1 text-sm font-semibold">{title}</p>
      {body}
    </div>
  );
}

function MeetingsPanel({ games, entityA, entityB, playerA, playerB, seasonCode }) {
  const [nameA, nameB] = shortNames(entityA, entityB, playerA, playerB);
  let body;
  if (games.status !== "ready") {
    body = <GamesState games={games} skeleton={<PlayerMeetingsBodySkeleton />} />;
  } else {
    const { met, together } = sharedGames(games.viewsA, games.viewsB);
    const pirOf = (side) => met.reduce((sum, meeting) => sum + meeting[side].pir, 0) / met.length;
    const wonByA = met.filter((meeting) => meeting.a.won).length;
    body = (
      <>
        {together ? <p className="mb-2 text-sm">Teammates: played {together} {together === 1 ? "game" : "games"} together this season.</p> : null}
        {met.length ? (
          <>
            <p className="mb-2 text-sm font-semibold">
              Met {met.length} {met.length === 1 ? "time" : "times"} &middot; {nameA}&rsquo;s side won {wonByA} &middot; PIR{" "}
              <span className={SIDE_TEXT.a}>{formatPerGame(pirOf("a"))}</span> vs <span className={SIDE_TEXT.b}>{formatPerGame(pirOf("b"))}</span>
            </p>
            <p aria-hidden="true" className="muted text-center text-xs">PTS &middot; REB &middot; AST &middot; STL &middot; BLK &middot; PIR</p>
            <div aria-hidden="true" className="grid grid-cols-2 gap-x-3 px-1 text-xs font-semibold sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <span className={`sm:text-end ${SIDE_TEXT.a}`}>{nameA}</span>
              <span className="max-sm:hidden" />
              <span className={`text-end sm:text-start ${SIDE_TEXT.b}`}>{nameB}</span>
            </div>
            <ul className="divide-base-300 divide-y">
              {met.map(({ a, b }) => {
                const higher = a.pir > b.pir ? "a" : b.pir > a.pir ? "b" : null;
                const clubA = a.home ? a.game.localTeam : a.game.roadTeam;
                const clubB = b.home ? b.game.localTeam : b.game.roadTeam;
                const pir = (view, side) => <span className={`font-bold tabular-nums ${higher === side ? SIDE_TEXT[side] : ""}`}>{Math.round(view.pir)}</span>;
                return (
                  <li key={a.game.gameCode}>
                    <Link to={`/${seasonCode}/games/${a.game.gameCode}`} className="rounded-field hover:bg-base-200 block px-1 py-1.5">
                      <span className="muted block text-center text-xs">
                        {formatDate(a.game.scheduledAt)} &middot; {roundOf(a.game)}
                      </span>
                      {/* Below sm the score sits on its own line over the two players' lines; from sm the three share one. */}
                      <span className="grid grid-cols-2 items-center gap-x-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                        <span className="row-start-2 tabular-nums sm:row-start-1 sm:text-end">
                          {lineOf(a)} &middot; {pir(a, "a")}
                        </span>
                        <span className="col-span-2 row-start-1 text-center font-semibold whitespace-nowrap tabular-nums sm:col-span-1 sm:col-start-2">
                          <span className={a.won ? "font-bold" : "muted font-normal"}>{teamCode(clubA)}</span> {a.clubScore}-{b.clubScore}{" "}
                          <span className={b.won ? "font-bold" : "muted font-normal"}>{teamCode(clubB)}</span>
                        </span>
                        <span className="row-start-2 text-end tabular-nums sm:col-start-3 sm:row-start-1 sm:text-start">
                          {pir(b, "b")} &middot; {lineOf(b)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : together ? null : (
          <p className="muted text-sm">Their clubs have not met this season.</p>
        )}
        {together ? null : <UpcomingMeetings seasonCode={seasonCode} playerA={playerA} playerB={playerB} title={met.length ? "Next meeting" : "Scheduled"} />}
      </>
    );
  }
  return (
    <Panel className="p-4">
      <PanelHeader kicker="THIS SEASON" title="When they met" level="h3" />
      {body}
    </Panel>
  );
}

// ---- Season highs ----

function HighValue({ view, stat, seasonCode, side }) {
  if (!view) return <span className={`muted ${side === "a" ? "text-end" : ""}`}>&mdash;</span>;
  const label = `${Math.round(view[stat.key])} ${stat.full.toLowerCase()} ${view.home ? "vs" : "at"} ${shortTeamName(view.opponent)}, ${formatDate(view.game.scheduledAt)}`;
  return (
    <Link
      to={`/${seasonCode}/games/${view.game.gameCode}`}
      title={label}
      aria-label={label}
      className={`rounded-field hover:bg-base-200 flex items-baseline gap-1.5 px-1 py-0.5 max-sm:min-h-11 max-sm:items-center ${side === "a" ? "justify-end" : ""}`}
    >
      {side === "b" ? <span className={`text-lg font-bold tabular-nums ${SIDE_TEXT.b}`}>{Math.round(view[stat.key])}</span> : null}
      <span className="muted text-xs">
        {view.home ? "vs" : "at"} <ShortLabel short={teamCode(view.opponent)} full={shortTeamName(view.opponent)} />
      </span>
      {side === "a" ? <span className={`text-lg font-bold tabular-nums ${SIDE_TEXT.a}`}>{Math.round(view[stat.key])}</span> : null}
    </Link>
  );
}

function HighsPanel({ games, entityA, entityB, playerA, playerB, seasonCode }) {
  const [nameA, nameB] = shortNames(entityA, entityB, playerA, playerB);
  let body;
  if (games.status !== "ready") {
    body = <GamesState games={games} skeleton={<PlayerHighsBodySkeleton />} />;
  } else {
    const highsA = seasonHighGames(games.viewsA, LINE_KEYS);
    const highsB = seasonHighGames(games.viewsB, LINE_KEYS);
    body = (
      <>
        <div aria-hidden="true" className="muted grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-x-3 px-1 text-xs font-semibold">
          <span className={`text-end ${SIDE_TEXT.a}`}>{nameA}</span>
          <span />
          <span className={SIDE_TEXT.b}>{nameB}</span>
        </div>
        <ul className="divide-base-300 divide-y">
          {LINE_STATS.map((stat) => (
            <li key={stat.key} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-x-3 py-1">
              <HighValue view={highsA[stat.key]} stat={stat} seasonCode={seasonCode} side="a" />
              <span className="text-center text-xs font-bold tracking-wide uppercase">
                <HeaderTip tip={`Most ${stat.full.toLowerCase()} in a game this season`}>{stat.label}</HeaderTip>
              </span>
              <HighValue view={highsB[stat.key]} stat={stat} seasonCode={seasonCode} side="b" />
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <Panel className="p-4">
      <PanelHeader kicker="BEST GAMES" title="Season highs" level="h3" />
      {body}
    </Panel>
  );
}

// The preview of two players: who they are, their percentiles on one radar beside the per-game line with league places, how each has
// played lately, the games they met in, and their best games of the season.
export default function ComparePlayerOverview({ seasonCode, phaseCode, entityA, entityB }) {
  const leaderboard = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  const games = usePairGames(seasonCode, entityA, entityB);
  if (leaderboard.isPending) return <AsyncState status="loading" label="Loading the players" skeleton={<PlayerOverviewSkeleton />} />;
  if (leaderboard.isError) return <AsyncState status="error" message="Could not load the players." onRetry={() => leaderboard.refetch()} />;
  const pool = leaderboard.data;
  const playerA = pool.find((player) => player.personKey === entityA.id) ?? null;
  const playerB = pool.find((player) => player.personKey === entityB.id) ?? null;
  const props = { pool, entityA, entityB, playerA, playerB, seasonCode };
  const gameProps = { games, entityA, entityB, playerA, playerB, seasonCode };
  return (
    <m.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <m.div variants={sectionItem}>
        <HeaderPanel {...props} />
      </m.div>
      <m.div variants={sectionItem} className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ProfilePanel {...props} />
        <SeasonLinePanel {...props} />
      </m.div>
      <m.div variants={sectionItem}>
        <FormPanel {...gameProps} />
      </m.div>
      <m.div variants={sectionItem} className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <MeetingsPanel {...gameProps} />
        <HighsPanel {...gameProps} />
      </m.div>
    </m.div>
  );
}
