import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getGame, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { UpcomingGamesSkeleton } from "./CompareSkeleton";
import { useUpcomingRound } from "./useUpcomingRound";
import { formatDateTime, formatShortDate, formatTimeOfDay } from "../lib/format";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { listContainer, listItem, wideCardHover } from "../lib/motion";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import Panel from "../lib/Panel";
import { FormCell } from "../standings/standingsCells";

// A club's side of a game: crest, code (the name from sm), and under it the regular-season record with the last five results beside it
// (oldest first) from sm; below sm a club's column is too narrow for five results, so the record stands alone.
function Side({ team, record, form, alignEnd }) {
  const crest = team?.crestUrl ? (
    <RevealImage src={team.crestUrl} className="h-7 w-7 flex-none object-contain sm:h-8 sm:w-8" />
  ) : (
    <span className="h-7 w-7 flex-none sm:h-8 sm:w-8" />
  );
  return (
    <span className={`flex min-w-0 items-center ${alignEnd ? "flex-row-reverse text-right" : ""} gap-1.5 sm:gap-2`}>
      {crest}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">
          <ShortLabel short={teamCode(team)} full={shortTeamName(team)} />
        </span>
        {record ? (
          <span className={`muted flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-tight ${alignEnd ? "justify-end" : ""}`}>
            {record}
            {form?.length ? (
              <span className="compact-form max-sm:hidden">
                <FormCell form={form} />
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </span>
  );
}

// One game as a compact row; choosing it opens the full comparison of its two clubs.
function GameRow({ game, standingByClubCode, onPick }) {
  const hasScore = game.played && game.localScore != null && game.roadScore != null;
  const standingOf = (team) => (team?.clubCode ? standingByClubCode.get(team.clubCode) : null);
  const recordOf = (team) => {
    const basic = standingOf(team)?.basic;
    return basic ? `${basic.gamesWon}-${basic.gamesLost}` : null;
  };
  const formOf = (team) => [...(standingOf(team)?.form ?? [])].sort((a, b) => a.resultOrdinal - b.resultOrdinal).slice(-5);
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
        className="grid h-full w-full grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)_1rem] sm:gap-2 sm:px-3 text-left transition-colors hover:border-primary hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Side team={game.localTeam} record={recordOf(game.localTeam)} form={formOf(game.localTeam)} />
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
        <Side team={game.roadTeam} record={recordOf(game.roadTeam)} form={formOf(game.roadTeam)} alignEnd />
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
  const { nextQuery, gamesQuery, nextGame, phaseCode, roundNumber, games } = useUpcomingRound(seasonCode);
  // The records under the clubs are the regular-season ones, as on the Games page.
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
    enabled: phaseCode === "RS",
  });
  const standingByClubCode = new Map(phaseCode === "RS" ? (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]) : []);

  if (nextQuery.isLoading || (nextGame && gamesQuery.isLoading)) {
    return <AsyncState status="loading" label="Loading games" skeleton={<UpcomingGamesSkeleton />} />;
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

// What an opened comparison is about, for the page header: when it was opened from a game, which one (round, date and host), with the
// ways on to that game and, for two clubs, to their all-time record. `centred` puts it all on one centred line (wrapping when narrow),
// under the two clubs of the team header.
export function ComparisonContext({ seasonCode, gameCode, headToHeadTo, centred = false }) {
  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    enabled: Boolean(gameCode),
    retry: false,
  });
  const game = gameQuery.data?.game;
  if (!game && !headToHeadTo) return null;
  const when = game ? `${game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · ${formatDateTime(game.scheduledAt)}` : null;
  const host = game ? `Hosted by ${game.localTeam?.abbreviatedName ?? game.localTeam?.name}` : null;
  const links = (
    <>
      {game ? (
        <Link to={`/${seasonCode}/games/${gameCode}`} className="btn btn-outline btn-sm">
          {game.played ? "Game overview" : "Game preview"}
        </Link>
      ) : null}
      {headToHeadTo ? (
        <Link to={headToHeadTo} className="btn btn-outline btn-sm">
          All-time head-to-head
        </Link>
      ) : null}
    </>
  );
  if (centred) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-base-300 pt-3 text-center">
        {game ? (
          <p className="muted text-sm">
            {when} · {host}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">{links}</div>
      </div>
    );
  }
  return (
    <div className="mt-2">
      {game ? (
        <>
          <p className="muted text-sm">{when}</p>
          <p className="muted text-sm">{host}</p>
        </>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">{links}</div>
    </div>
  );
}
