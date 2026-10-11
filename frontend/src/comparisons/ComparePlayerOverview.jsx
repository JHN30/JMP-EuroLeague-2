import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getPlayerGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import { formatPerGame } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { nameParts, titleCase } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { Avatar } from "../leaders/LeaderParts";
import { fetchLeagueLeaderboard, leaderboardQueryKey } from "../players/leagueLeaderboard";
import { PROFILE_AXES, SEASON_LINE, rankPlayer, statNumber } from "../players/playerOverview";
import { playedLog, viewGame } from "../players/gameLog";
import { ordinal } from "../teams/teamLeague";
import CompareRadar from "./CompareRadar";
import { chartNames } from "./playerLabels";
import PlayerPairHeader from "./PlayerPairHeader";

const FORM_GAMES = 5;

const nameOf = (player, fallback) => {
  if (!player) return fallback;
  const { last, first } = nameParts(player.playerName);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
};

function PlayerHead({ player, entity, seasonCode }) {
  const games = statNumber(player?.traditional?.gamesPlayed);
  const minutes = statNumber(player?.traditional?.minutesPlayed);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar imageUrl={player?.playerImageUrl} size="h-14 w-14" />
      <div className="min-w-0">
        <Link to={`/${seasonCode}/players/${entity.id}`} className="block font-bold hover:underline">
          {nameOf(player, entity.label)}
        </Link>
        <p className="muted flex min-w-0 items-start gap-1.5 text-sm">
          {player?.clubImageUrl ? <RevealImage src={player.clubImageUrl} className="h-4 w-4 flex-none object-contain" /> : null}
          <span>{player?.clubName ? <ShortLabel short={player.clubTvCodes ?? player.clubCode} full={player.clubName} /> : (player?.clubCode ?? "—")}</span>
        </p>
        <p className="muted text-xs tabular-nums">{games ? `${games} games · ${formatPerGame(minutes)} min` : "Has not played yet"}</p>
      </div>
    </div>
  );
}

// ---- Profile ----

function strongestAndWeakest(axes, side) {
  const ranked = axes.filter((axis) => axis[side] !== null).sort((x, y) => y[side] - x[side]);
  return { best: ranked[0] ?? null, weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null };
}

function ProfilePanel({ pool, entityA, entityB, playerA, playerB, seasonCode }) {
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
  const summaryA = strongestAndWeakest(axes, "a");
  const summaryB = strongestAndWeakest(axes, "b");
  const badge = (axis, side, tone) => (axis ? <span className={`badge badge-${tone} badge-outline h-auto min-h-6 py-0.5 text-left whitespace-normal`}>{`${axis.label} · ${ordinal(axis[side])} percentile`}</span> : null);
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">PERCENTILE 0-100</p>
      <h3 className="mb-3 text-lg font-bold">Profile</h3>
      {haveA || haveB ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3 lg:order-1">
              <PlayerHead player={playerA} entity={entityA} seasonCode={seasonCode} />
              <div className="flex flex-wrap gap-2 text-sm">
                {badge(summaryA.best, "a", "success")}
                {badge(summaryA.weakest, "a", "error")}
              </div>
            </div>
            <div className="lg:order-2">
              <CompareRadar axes={axes} labelA={chartNameA} labelB={chartNameB} />
            </div>
            <div className="flex flex-col gap-3 lg:order-3 lg:items-end">
              <PlayerHead player={playerB} entity={entityB} seasonCode={seasonCode} />
              <div className="flex flex-wrap gap-2 text-sm lg:justify-end">
                {badge(summaryB.best, "b", "success")}
                {badge(summaryB.weakest, "b", "error")}
              </div>
            </div>
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

function SeasonLinePanel({ pool, entityA, entityB, playerA, playerB, seasonCode }) {
  const place = (ranking) => (ranking.rank ? `${ordinal(ranking.rank)} of ${ranking.of}` : ranking.unqualified ? "Under the minimum games" : null);
  return (
    <Panel className="p-3">
      <p className="eyebrow mb-0.5 px-1">PER GAME</p>
      <h3 className="mb-3 px-1 text-lg font-bold">Season line</h3>
      <div className="mb-2">
        <PlayerPairHeader seasonCode={seasonCode} entityA={entityA} entityB={entityB} rowA={playerA} rowB={playerB} />
      </div>
      <motion.div variants={sectionContainer} initial="hidden" animate="show">
        {SEASON_LINE.map((stat) => {
          const a = rankPlayer(pool, entityA.id, stat, { qualifiedOnly: true });
          const b = rankPlayer(pool, entityB.id, stat, { qualifiedOnly: true });
          return (
            <ComparisonRow
              key={stat.label}
              animated
              compact
              label={stat.label}
              tip={stat.title}
              rawA={a.value}
              rawB={b.value}
              displayA={formatPerGame(a.value)}
              displayB={formatPerGame(b.value)}
              avgA={place(a)}
              avgB={place(b)}
              direction={stat.label === "MIN" ? "neutral" : "higher"}
            />
          );
        })}
      </motion.div>
    </Panel>
  );
}

// ---- Recent form ----

function FormList({ games, label, seasonCode }) {
  const views = playedLog(games).slice(-FORM_GAMES).reverse().map(viewGame);
  const average = (key) => (views.length ? views.reduce((sum, view) => sum + view[key], 0) / views.length : null);
  return (
    <div>
      <p className="mb-2 font-semibold">{label}</p>
      {views.length === 0 ? (
        <p className="muted text-sm">No games played yet.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1">
            {[
              ["PTS", "pts"],
              ["REB", "reb"],
              ["AST", "ast"],
              ["PIR", "pir"],
            ].map(([name, key]) => (
              <span key={key} className="flex flex-col">
                <span className="muted text-xs font-bold uppercase tracking-wide">{name}</span>
                <span className="text-lg font-bold tabular-nums">{formatPerGame(average(key))}</span>
              </span>
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {views.map((view) => (
              <li key={view.game.gameCode}>
                <Link to={`/${seasonCode}/games/${view.game.gameCode}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-field px-1 py-0.5 text-sm hover:bg-base-200">
                  <span className={`badge badge-sm w-6 flex-none font-bold ${view.won ? "badge-success" : view.won === false ? "badge-error" : "badge-ghost"}`}>
                    {view.won ? "W" : view.won === false ? "L" : "–"}
                  </span>
                  <span className="muted flex-none text-xs">{view.home ? "vs" : "at"}</span>
                  <span className="min-w-0 flex-1">
                    <ShortLabel short={teamCode(view.opponent)} full={shortTeamName(view.opponent)} />
                  </span>
                  <span className="flex-none tabular-nums max-sm:basis-full max-sm:pl-10">
                    {Math.round(view.pts)} pts · {Math.round(view.reb)} reb · {Math.round(view.ast)} ast
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FormPanel({ seasonCode, entityA, entityB, playerA, playerB }) {
  const gamesA = useQuery({ queryKey: ["player-games", seasonCode, entityA.id], queryFn: () => getPlayerGames(seasonCode, entityA.id, { limit: 100 }) });
  const gamesB = useQuery({ queryKey: ["player-games", seasonCode, entityB.id], queryFn: () => getPlayerGames(seasonCode, entityB.id, { limit: 100 }) });
  let body;
  if (gamesA.isPending || gamesB.isPending) {
    body = <AsyncState status="loading" label="Loading recent games" inline />;
  } else if (gamesA.isError || gamesB.isError) {
    body = (
      <AsyncState
        status="error"
        message="Could not load the recent games."
        inline
        onRetry={() => {
          gamesA.refetch();
          gamesB.refetch();
        }}
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
        <FormList games={gamesA.data.games ?? []} label={nameOf(playerA, entityA.label)} seasonCode={seasonCode} />
        <FormList games={gamesB.data.games ?? []} label={nameOf(playerB, entityB.label)} seasonCode={seasonCode} />
      </div>
    );
  }
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">LAST {FORM_GAMES} GAMES</p>
      <h3 className="mb-3 text-lg font-bold">Recent form</h3>
      {body}
    </Panel>
  );
}

// The preview of two players: their percentiles on one radar, the per-game line with league places and how each has played lately.
export default function ComparePlayerOverview({ seasonCode, phaseCode, entityA, entityB }) {
  const leaderboard = useQuery({
    queryKey: leaderboardQueryKey(seasonCode, phaseCode),
    queryFn: () => fetchLeagueLeaderboard(seasonCode, phaseCode),
    enabled: Boolean(phaseCode),
  });
  if (leaderboard.isPending) return <AsyncState status="loading" label="Loading the players" />;
  if (leaderboard.isError) return <AsyncState status="error" message="Could not load the players." onRetry={() => leaderboard.refetch()} />;
  const pool = leaderboard.data;
  const playerA = pool.find((player) => player.personKey === entityA.id) ?? null;
  const playerB = pool.find((player) => player.personKey === entityB.id) ?? null;
  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <ProfilePanel pool={pool} entityA={entityA} entityB={entityB} playerA={playerA} playerB={playerB} seasonCode={seasonCode} />
      </motion.div>
      <motion.div variants={sectionItem}>
        <SeasonLinePanel pool={pool} entityA={entityA} entityB={entityB} playerA={playerA} playerB={playerB} seasonCode={seasonCode} />
      </motion.div>
      <motion.div variants={sectionItem}>
        <FormPanel seasonCode={seasonCode} entityA={entityA} entityB={entityB} playerA={playerA} playerB={playerB} />
      </motion.div>
    </motion.div>
  );
}
