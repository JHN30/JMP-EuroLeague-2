import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { Avatar } from "../leaders/LeaderParts";
import { fetchQualifiedPool } from "../leaders/leaderData";
import { DEFAULT_SHARE, GAME_SHARES, gamesNeeded } from "../leaders/leaderDefs";
import AsyncState from "../lib/AsyncState";
import { formatDecimal } from "../lib/format";
import { listContainer, listItem, wideCardHover } from "../lib/motion";
import Panel from "../lib/Panel";
import { displayName } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { useUpcomingRound } from "./useUpcomingRound";

// The leaders the suggested pairs are made of: the top two per game in each.
const PAIR_STATS = [
  { key: "pointsScored", label: "Points" },
  { key: "pir", label: "PIR" },
  { key: "totalRebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
];

const statOf = (player, key) => {
  const value = Number(player.traditional?.[key]);
  return Number.isFinite(value) ? value : null;
};
const gamesOf = (player) => statOf(player, "gamesPlayed") ?? 0;
const bestFirst = (players, key) => players.filter((player) => statOf(player, key) !== null).sort((a, b) => statOf(b, key) - statOf(a, key));
const asEntity = (player) => ({ id: player.personKey, label: displayName(player.playerName) });

// The season's regular-season players, per game, kept from half of the games played so far (the most any player has), as the Leaders cards
// rank them.
function useRankedPlayers(seasonCode) {
  const query = useQuery({
    queryKey: ["compare-suggestions", seasonCode],
    queryFn: () => fetchQualifiedPool(seasonCode, "RS", "perGame", 1),
    staleTime: 5 * 60 * 1000,
  });
  const all = query.data ?? [];
  const gamesSoFar = all.reduce((most, player) => Math.max(most, gamesOf(player)), 0);
  const minGames = gamesNeeded(gamesSoFar, GAME_SHARES.find((entry) => entry.key === DEFAULT_SHARE));
  return { query, players: all.filter((player) => gamesOf(player) >= minGames) };
}

function PlayerLine({ player, value }) {
  const club = (player.clubTvCodes ?? player.clubCode)?.replaceAll(";", "/");
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar optimize imageUrl={player.playerImageUrl} size="h-8 w-8 flex-none" />
      <span className="min-w-0 flex-1 wrap-break-word text-sm font-semibold">
        {displayName(player.playerName)}
        {club ? <span className="muted ms-1.5 text-xs font-normal">{club}</span> : null}
      </span>
      <span className="flex-none font-black tabular-nums">{formatDecimal(value, 1)}</span>
    </span>
  );
}

const CARD = "w-full rounded-field border border-base-300 bg-base-100 p-3 text-left transition-colors hover:border-primary hover:bg-base-200";

// One suggested pair: the stat's top two, as one button that opens their comparison.
function PairCard({ stat, first, second, onPick }) {
  const names = `${displayName(first.playerName)} and ${displayName(second.playerName)}`;
  return (
    <m.li variants={listItem}>
      <m.button type="button" {...wideCardHover} aria-label={`Compare ${names}, the top two in ${stat.label.toLowerCase()} per game`} onClick={() => onPick(asEntity(first), asEntity(second))} className={CARD}>
        <span className="eyebrow mb-2 block">{stat.label} per game</span>
        <span className="flex flex-col gap-1.5">
          <PlayerLine player={first} value={statOf(first, stat.key)} />
          <span aria-hidden="true" className="muted ps-10 text-xs">
            vs
          </span>
          <PlayerLine player={second} value={statOf(second, stat.key)} />
        </span>
      </m.button>
    </m.li>
  );
}

function ClubSide({ team, player, alignEnd }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${alignEnd ? "flex-row-reverse text-right" : ""}`}>
      {team?.crestUrl ? <RevealImage src={team.crestUrl} className="h-7 w-7 flex-none object-contain" /> : <span className="h-7 w-7 flex-none" />}
      <span className="min-w-0">
        <span className="block wrap-break-word text-sm font-semibold leading-tight">{displayName(player.playerName)}</span>
        <span className="muted block text-xs leading-tight">
          <ShortLabel short={teamCode(team)} full={shortTeamName(team)} /> · {formatDecimal(statOf(player, "pir"), 1)} PIR
        </span>
      </span>
    </span>
  );
}

// One game of the round with each side's best player by PIR per game, as one button that opens their comparison.
function MatchupRow({ game, home, road, onPick }) {
  return (
    <m.li variants={listItem}>
      <m.button
        type="button"
        {...wideCardHover}
        aria-label={`Compare ${displayName(home.playerName)} and ${displayName(road.playerName)}, the best players of ${shortTeamName(game.localTeam)} and ${shortTeamName(game.roadTeam)}`}
        onClick={() => onPick(asEntity(home), asEntity(road))}
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 py-2 sm:px-3 ${CARD}`}
      >
        <ClubSide team={game.localTeam} player={home} />
        <span aria-hidden="true" className="muted text-xs">
          vs
        </span>
        <ClubSide team={game.roadTeam} player={road} alignEnd />
      </m.button>
    </m.li>
  );
}

function SuggestionsSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <div className="skeleton mb-1 h-3 w-24" />
      <div className="skeleton mb-3 h-5 w-40" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: PAIR_STATS.length }, (_, index) => (
          <div key={index} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}

// Starting points for a player comparison, over the pickers: the best player of each side in every game of the coming round, then the top
// two of the season in a few stats. A pick hands both players up.
export default function CompareSuggestions({ seasonCode, onPick }) {
  const { query, players } = useRankedPlayers(seasonCode);
  const round = useUpcomingRound(seasonCode);

  if (query.isPending) return <AsyncState status="loading" label="Loading suggested pairs" skeleton={<SuggestionsSkeleton />} />;
  if (query.isError) {
    return (
      <Panel className="p-4">
        <AsyncState status="error" message="Could not load suggested pairs." inline onRetry={() => query.refetch()} />
      </Panel>
    );
  }

  const pairs = PAIR_STATS.map((stat) => ({ stat, top: bestFirst(players, stat.key) })).filter((pair) => pair.top.length >= 2);
  const bestOf = new Map();
  for (const player of bestFirst(players, "pir")) if (player.clubCode && !bestOf.has(player.clubCode)) bestOf.set(player.clubCode, player);
  const matchups = round.games.flatMap((game) => {
    const home = bestOf.get(game.localTeam?.clubCode);
    const road = bestOf.get(game.roadTeam?.clubCode);
    return home && road ? [{ game, home, road }] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      {matchups.length > 0 ? (
        <Panel as="section" aria-labelledby="star-matchups" className="p-4">
          <div className="mb-3">
            <p className="eyebrow mb-0.5">STAR MATCHUPS</p>
            <h2 id="star-matchups" className="text-lg font-bold">
              {matchups[0].game.roundName ?? `Round ${round.roundNumber}`}
            </h2>
          </div>
          <m.ul className="grid gap-2 lg:grid-cols-2" variants={listContainer} initial="hidden" animate="show">
            {matchups.map(({ game, home, road }) => (
              <MatchupRow key={game.gameCode} game={game} home={home} road={road} onPick={onPick} />
            ))}
          </m.ul>
        </Panel>
      ) : null}
      {pairs.length > 0 ? (
        <Panel as="section" aria-labelledby="suggested-pairs" className="p-4">
          <div className="mb-3">
            <p className="eyebrow mb-0.5">LEADERS</p>
            <h2 id="suggested-pairs" className="text-lg font-bold">
              Suggested pairs
            </h2>
          </div>
          <m.ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
            {pairs.map(({ stat, top }) => (
              <PairCard key={stat.key} stat={stat} first={top[0]} second={top[1]} onPick={onPick} />
            ))}
          </m.ul>
        </Panel>
      ) : null}
    </div>
  );
}
