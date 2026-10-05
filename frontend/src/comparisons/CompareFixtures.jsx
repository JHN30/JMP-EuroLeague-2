import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getGame, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { formatDateTime, formatShortDate, formatTimeOfDay } from "../lib/format";
import { listContainer, listItem, wideCardHover } from "../lib/motion";
import RevealImage from "../lib/RevealImage";
import Panel from "../lib/Panel";

// A round never holds more than a handful of games; this is the API's page cap (the Games page asks the same).
const ROUND_GAME_LIMIT = 100;

function Side({ team, record, alignEnd }) {
  const crest = team?.crestUrl ? (
    <RevealImage src={team.crestUrl} className="h-7 w-7 flex-none object-contain sm:h-8 sm:w-8" />
  ) : (
    <span className="h-7 w-7 flex-none sm:h-8 sm:w-8" />
  );
  return (
    <span className={`flex min-w-0 items-center ${alignEnd ? "flex-row-reverse text-right" : ""} gap-1.5 sm:gap-2`}>
      {crest}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{team?.abbreviatedName ?? team?.name ?? "TBD"}</span>
        {record ? <span className="muted block text-xs leading-tight">{record}</span> : null}
      </span>
    </span>
  );
}

// One game as a compact row; choosing it opens the full comparison of its two clubs.
function GameRow({ game, standingByClubCode, onPick }) {
  const hasScore = game.played && game.localScore != null && game.roadScore != null;
  const recordOf = (team) => {
    const basic = team?.clubCode ? standingByClubCode.get(team.clubCode)?.basic : null;
    return basic ? `${basic.gamesWon}-${basic.gamesLost}` : null;
  };
  const localName = game.localTeam?.name ?? game.localTeam?.abbreviatedName ?? "the home team";
  const roadName = game.roadTeam?.name ?? game.roadTeam?.abbreviatedName ?? "the away team";
  const comparable = Boolean(game.localTeam?.clubCode && game.roadTeam?.clubCode);
  return (
    <motion.li variants={listItem}>
      <motion.button
        type="button"
        {...(comparable ? wideCardHover : {})}
        disabled={!comparable}
        aria-label={`Compare ${localName} and ${roadName}`}
        onClick={() => onPick(game)}
        className="grid w-full grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)_1rem] sm:gap-2 sm:px-3 text-left transition-colors hover:border-primary hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Side team={game.localTeam} record={recordOf(game.localTeam)} />
        <span className="flex flex-col items-center text-center leading-tight">
          {hasScore ? (
            <>
              <span className="text-sm font-black tabular-nums">
                {game.localScore}-{game.roadScore}
              </span>
              <span className="muted text-xs">{formatShortDate(game.scheduledAt)}</span>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold">{formatShortDate(game.scheduledAt)}</span>
              <span className="muted text-xs tabular-nums">{formatTimeOfDay(game.scheduledAt)}</span>
            </>
          )}
        </span>
        <Side team={game.roadTeam} record={recordOf(game.roadTeam)} alignEnd />
        <span aria-hidden="true" className="hidden text-primary sm:block">
          ›
        </span>
      </motion.button>
    </motion.li>
  );
}

// The round with the next game to play, as compact rows to pick a game from. The game picked is handed up. Once the season is
// over there is no next game and nothing to show.
export default function CompareFixtures({ seasonCode, onPick }) {
  const nextQuery = useQuery({
    queryKey: ["compare-next-game", seasonCode],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 1 }),
  });
  const nextGame = nextQuery.data?.games[0] ?? null;
  const phaseCode = nextGame?.phaseCode ?? null;
  const roundNumber = nextGame?.roundNumber ?? null;

  const gamesQuery = useQuery({
    queryKey: ["fixtures", seasonCode, phaseCode, roundNumber],
    queryFn: () => getSeasonGames(seasonCode, { phase: phaseCode, round: roundNumber, limit: ROUND_GAME_LIMIT, order: "asc" }),
    enabled: Boolean(phaseCode) && roundNumber !== null,
  });
  // The records under the clubs are the regular-season ones, as on the Games page.
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
    enabled: phaseCode === "RS",
  });
  const standingByClubCode = new Map(phaseCode === "RS" ? (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]) : []);
  const games = gamesQuery.data?.games ?? [];

  if (nextQuery.isLoading || (nextGame && gamesQuery.isLoading)) {
    return (
      <Panel className="p-4">
        <AsyncState status="loading" label="Loading games" inline />
      </Panel>
    );
  }
  if (nextQuery.isError || gamesQuery.isError) {
    return (
      <Panel className="p-4">
        <AsyncState
          status="error"
          message="Could not load games."
          inline
          onRetry={() => {
            nextQuery.refetch();
            gamesQuery.refetch();
          }}
        />
      </Panel>
    );
  }
  if (!nextGame || games.length === 0) return null;

  return (
    <Panel className="p-4">
      <div className="mb-3">
        <p className="eyebrow mb-0.5">UPCOMING GAMES</p>
        <h2 className="text-lg font-bold">{games[0].roundName ?? `Round ${roundNumber}`}</h2>
      </div>
      <motion.ul className="grid gap-2 lg:grid-cols-2" variants={listContainer} initial="hidden" animate="show">
        {games.map((game) => (
          <GameRow key={game.gameCode} game={game} standingByClubCode={standingByClubCode} onPick={onPick} />
        ))}
      </motion.ul>
    </Panel>
  );
}

// The line above an opened comparison: the way back to the games, and, when it was opened from a game, which one.
export function GameContext({ seasonCode, gameCode, backLabel = "← Games", onBack, children }) {
  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    enabled: Boolean(gameCode),
    retry: false,
  });
  const game = gameQuery.data?.game;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={onBack}>
        {backLabel}
      </button>
      {game ? (
        <p className="muted text-sm">
          {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · {formatDateTime(game.scheduledAt)} ·{" "}
          {game.localTeam?.abbreviatedName ?? game.localTeam?.name} at home ·{" "}
          <Link to={`/${seasonCode}/games/${gameCode}`} className="link link-hover">
            {game.played ? "Game overview" : "Game preview"}
          </Link>
        </p>
      ) : null}
      {children}
    </div>
  );
}
