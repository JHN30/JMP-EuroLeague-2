import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { shortTeamName, teamCode } from "../games/gameUtils";
import { getSeasons, getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { TeamFormBodySkeleton, TeamMatchupSkeleton, TeamWatchBodySkeleton } from "./CompareSkeleton";
import { formatSeasonLabel, formatShortDate } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { displayName as fullName } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import { isForfeit } from "../lib/forfeit";
import ShortLabel from "../lib/ShortLabel";
import { Avatar } from "../leaders/LeaderParts";
import { statNumber } from "../leaders/leaderData";
import { useTeamRows } from "../leaders/teamData";
import { fetchTeamRosterStats } from "../teams/teamRosterStats";
import { absentFromSeason, edgesBetween } from "./teamCompare";
import useClubEntities from "./useClubEntities";

const GAMES_LIMIT = 100;
const EDGES_SHOWN = 3;
// A gap of fewer places than this is not an edge worth naming.
const MIN_EDGE_GAP = 3;

function Crest({ url, className = "h-10 w-10" }) {
  return url ? <RevealImage src={url} className={`${className} flex-none object-contain`} /> : <span className={`${className} flex-none`} />;
}

// `action` sits beside the title, wrapping under it when there is no room.
function PanelTitle({ kicker, title, note, action = null }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="eyebrow mb-0.5">{kicker}</p>
        <h3 className="text-lg font-bold">{title}</h3>
        {note ? <p className="muted mt-1 text-sm">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ---- Matchup edges ----

function EdgeColumn({ row, label, leads, edges, side }) {
  return (
    <div className="rounded-field bg-base-200/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <Crest url={row?.crestUrl} />
        <div className="min-w-0">
          <p className="font-bold">{label}</p>
          <p className="muted text-xs">
            <b className="text-base-content text-lg tabular-nums">{leads}</b> measures ranked higher
          </p>
        </div>
      </div>
      {edges.length === 0 ? (
        <p className="muted text-sm">No big edge: the clubs sit close together in the league.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {edges.map((edge) => {
            const own = side === "a" ? edge.a : edge.b;
            const other = side === "a" ? edge.b : edge.a;
            return (
              <li key={edge.stat.key} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0" title={edge.stat.tip}>
                  {edge.stat.label}
                </span>
                <span className="flex-none tabular-nums">
                  <b className="text-primary">#{own.rank}</b> <span className="muted text-xs">vs #{other.rank}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EdgesPanel({ source, entityA, entityB }) {
  const rowA = source.rows.find((row) => row.clubCode === entityA.id);
  const rowB = source.rows.find((row) => row.clubCode === entityB.id);
  const edges = edgesBetween(source.rows, entityA.id, entityB.id);
  if (!rowA || !rowB || edges.length === 0) return null;
  const aLeads = edges.filter((edge) => edge.gap > 0);
  const bLeads = edges.filter((edge) => edge.gap < 0);
  const tied = edges.length - aLeads.length - bLeads.length;
  const biggest = (list, sign) =>
    list
      .filter((edge) => Math.abs(edge.gap) >= MIN_EDGE_GAP)
      .sort((x, y) => sign * (y.gap - x.gap))
      .slice(0, EDGES_SHOWN);
  return (
    <Panel className="p-4">
      <PanelTitle
        kicker="MATCHUP EDGES"
        title="Where each club is stronger"
        note={`Their places among the ${source.rows.length} clubs on ${edges.length} measures of how a team plays${tied ? `; ${tied} are level` : ""}.${source.unadjusted ? " The clubs played in separate groups, so these are raw numbers, not adjusted for schedule." : ""}`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <EdgeColumn row={rowA} label={entityA.label} leads={aLeads.length} edges={biggest(aLeads, 1)} side="a" />
        <EdgeColumn row={rowB} label={entityB.label} leads={bLeads.length} edges={biggest(bLeads, -1)} side="b" />
      </div>
    </Panel>
  );
}

// ---- Form and venue ----

function playedGames(games, phaseCode) {
  return games.filter((game) => game.played && game.phaseCode === phaseCode && game.localScore != null && game.roadScore != null);
}

function resultFor(game, clubCode) {
  const home = game.localTeam?.clubCode === clubCode;
  const own = home ? game.localScore : game.roadScore;
  const other = home ? game.roadScore : game.localScore;
  return { home, own, other, won: own > other, opponent: home ? game.roadTeam : game.localTeam };
}

function venueRecord(games, clubCode, home) {
  const results = games.map((game) => resultFor(game, clubCode)).filter((result) => result.home === home);
  const wins = results.filter((result) => result.won).length;
  return { wins, losses: results.length - wins };
}

function ClubHeading({ club, suffix = "", extra = null }) {
  return (
    <p className="mb-2 flex items-center gap-2 font-semibold">
      <Crest url={club.crestUrl} className="h-6 w-6" />
      <span>
        {club.label}
        {suffix}
      </span>
      {extra}
    </p>
  );
}

// The run of the same result the club is on, from its latest game back: "W5", "L1".
function currentStreak(results) {
  if (results.length === 0) return null;
  const won = results.at(-1).won;
  let length = 0;
  for (let index = results.length - 1; index >= 0 && results[index].won === won; index -= 1) length += 1;
  return { won, length };
}

function StreakBadge({ streak }) {
  const noun = streak.won ? (streak.length === 1 ? "win" : "wins") : streak.length === 1 ? "loss" : "losses";
  return (
    <span
      aria-label={`Streak: ${streak.length} ${noun}`}
      className={`badge badge-sm ms-auto flex-none font-bold tabular-nums ${streak.won ? "badge-success" : "badge-error"}`}
    >
      {streak.won ? "W" : "L"}
      {streak.length}
    </span>
  );
}

function VenueRecord({ label, record, counts }) {
  return (
    <span className={counts ? "font-bold text-primary" : undefined}>
      {label} <span className="tabular-nums">{record.wins + record.losses === 0 ? "—" : `${record.wins}-${record.losses}`}</span>
    </span>
  );
}

// One club's last five games over its home and away record; `counts` is the venue ("home" or "away") of the game the comparison
// was opened from, whose record is the one that counts.
function FormList({ games, club, seasonCode, counts }) {
  const clubCode = club.id;
  const last = games.slice(-5).reverse();
  const streak = currentStreak(games.map((game) => resultFor(game, clubCode)));
  const home = venueRecord(games, clubCode, true);
  const away = venueRecord(games, clubCode, false);
  return (
    <div>
      <ClubHeading club={club} suffix=": last 5" extra={streak ? <StreakBadge streak={streak} /> : null} />
      {last.length === 0 ? (
        <p className="muted text-sm">No games played yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {last.map((game) => {
            const result = resultFor(game, clubCode);
            return (
              <li key={game.gameCode}>
                <Link
                  to={`/${seasonCode}/games/${game.gameCode}`}
                  className="flex items-center gap-2 rounded-field px-1 py-0.5 text-sm hover:bg-base-200"
                >
                  <span className={`badge badge-sm w-6 flex-none font-bold ${result.won ? "badge-success" : "badge-error"}`}>{result.won ? "W" : "L"}</span>
                  <span className="muted flex-none text-xs">{result.home ? "vs" : "at"}</span>
                  <Crest url={result.opponent?.crestUrl} className="h-5 w-5" />
                  <span className="min-w-0 flex-1">
                    <ShortLabel short={teamCode(result.opponent)} full={shortTeamName(result.opponent)} />
                  </span>
                  <span className="flex-none tabular-nums">
                    {isForfeit(game) ? <span className="muted me-1 text-xs">Forfeit</span> : null}
                    {result.own}-{result.other}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted mt-2 px-1 text-sm">
        <VenueRecord label="Home" record={home} counts={counts === "home"} /> · <VenueRecord label="Away" record={away} counts={counts === "away"} />
      </p>
    </div>
  );
}

function FormPanel({ seasonCode, phaseCode, entityA, entityB, hosted }) {
  const gamesA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const gamesB = useQuery({ queryKey: ["team-games", seasonCode, entityB.id], queryFn: () => getTeamGames(seasonCode, entityB.id, { limit: GAMES_LIMIT, order: "asc" }) });
  if (gamesA.isPending || gamesB.isPending) return <Panel className="h-full p-4"><AsyncState status="loading" label="Loading recent form" skeleton={<TeamFormBodySkeleton />} /></Panel>;
  if (gamesA.isError || gamesB.isError) {
    return (
      <Panel className="h-full p-4">
        <AsyncState status="error" message="Could not load recent form." inline onRetry={() => { gamesA.refetch(); gamesB.refetch(); }} />
      </Panel>
    );
  }
  const playedA = playedGames(gamesA.data.games ?? [], phaseCode);
  const playedB = playedGames(gamesB.data.games ?? [], phaseCode);
  return (
    <Panel className="h-full p-4">
      <PanelTitle
        kicker="FORM"
        title="Recent results and venue"
        note={hosted ? `${entityA.label} host this game, so their home record and ${entityB.label}'s away record are the ones that count.` : null}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
        <FormList games={playedA} club={entityA} seasonCode={seasonCode} counts={hosted ? "home" : null} />
        <FormList games={playedB} club={entityB} seasonCode={seasonCode} counts={hosted ? "away" : null} />
      </div>
    </Panel>
  );
}

// ---- Players to watch ----

function topScorers(statsByPersonKey) {
  return [...statsByPersonKey.values()]
    .filter((player) => (statNumber(player.traditional?.gamesPlayed) ?? 0) > 0)
    .sort((a, b) => (statNumber(b.traditional?.pointsScored) ?? 0) - (statNumber(a.traditional?.pointsScored) ?? 0))
    .slice(0, 3);
}

const displayName = (player) => fullName(player.playerName);

function ScorerList({ players, seasonCode, club }) {
  return (
    <div>
      <ClubHeading club={club} />
      {players.length === 0 ? (
        <p className="muted text-sm">No one has played yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {players.map((player) => (
            <li key={player.personKey}>
              <Link to={`/${seasonCode}/players/${player.personKey}`} className="flex items-center gap-3 rounded-field px-1 py-1 hover:bg-base-200">
                <Avatar imageUrl={player.playerImageUrl} size="h-8 w-8 flex-none" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{displayName(player)}</span>
                  <span className="muted block text-xs tabular-nums">
                    {Number(player.traditional.assists).toFixed(1)} AST · {Number(player.traditional.totalRebounds).toFixed(1)} REB
                  </span>
                </span>
                <span className="flex-none text-right">
                  <b className="tabular-nums">{Number(player.traditional.pointsScored).toFixed(1)}</b> <span className="muted text-xs">PTS</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WatchPanel({ seasonCode, phaseCode, entityA, entityB }) {
  const statsA = useQuery({ queryKey: ["team-roster-stats", seasonCode, phaseCode, entityA.id], queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityA.id), enabled: Boolean(phaseCode) });
  const statsB = useQuery({ queryKey: ["team-roster-stats", seasonCode, phaseCode, entityB.id], queryFn: () => fetchTeamRosterStats(seasonCode, phaseCode, entityB.id), enabled: Boolean(phaseCode) });
  if (statsA.isPending || statsB.isPending) return <Panel className="p-4"><AsyncState status="loading" label="Loading the players" skeleton={<TeamWatchBodySkeleton />} /></Panel>;
  if (statsA.isError || statsB.isError) {
    return (
      <Panel className="p-4">
        <AsyncState status="error" message="Could not load the players." inline onRetry={() => { statsA.refetch(); statsB.refetch(); }} />
      </Panel>
    );
  }
  const playersA = topScorers(statsA.data);
  const playersB = topScorers(statsB.data);
  if (playersA.length === 0 && playersB.length === 0) return null;
  const lead = playersA[0] && playersB[0] ? [playersA[0], playersB[0]] : null;
  return (
    <Panel className="p-4">
      <PanelTitle
        kicker="PLAYERS TO WATCH"
        title="Top scorers"
        note="The three highest scorers of each club, per game."
        action={
          lead ? (
            <Link to={`/${seasonCode}/compare?view=players&playerA=${encodeURIComponent(lead[0].personKey)}&playerB=${encodeURIComponent(lead[1].personKey)}`} className="btn btn-outline btn-sm h-auto py-1.5 text-center whitespace-normal">
              Compare {displayName(lead[0])} and {displayName(lead[1])}
            </Link>
          ) : null
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
        <ScorerList players={playersA} seasonCode={seasonCode} club={entityA} />
        <ScorerList players={playersB} seasonCode={seasonCode} club={entityB} />
      </div>
    </Panel>
  );
}

// ---- Meetings, this season and last ----

const meetingsOf = (games, otherClubCode) => (games ?? []).filter((game) => game.localTeam?.clubCode === otherClubCode || game.roadTeam?.clubCode === otherClubCode);

// One season's meetings under its name and the series score. `gameCode` is the game the comparison was opened from, marked
// "This game".
function MeetingList({ seasonCode, title, meetings, entityA, entityB, gameCode = null }) {
  const played = meetings.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const winsA = played.filter((game) => resultFor(game, entityA.id).won).length;
  const thisGame = <span className="badge badge-primary badge-sm mx-1 align-middle">This game</span>;
  return (
    <div>
      <h4 className="flex flex-wrap items-baseline justify-between gap-x-3 px-1 text-sm font-semibold">
        {title}
        <span className="muted text-xs font-normal">{played.length ? `${entityA.label} ${winsA}-${played.length - winsA} ${entityB.label}` : "Not played yet."}</span>
      </h4>
      <ul className="flex flex-col">
        {meetings.map((game) => {
          // The game being previewed takes the badge in place of its "vs", or beside its date once it has a score.
          const current = gameCode != null && String(game.gameCode) === String(gameCode);
          return (
            <li key={game.gameCode} className="border-b border-base-300 last:border-0">
              <Link to={`/${seasonCode}/games/${game.gameCode}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-field px-1 py-2 hover:bg-base-200">
                <span className="muted text-sm">
                  {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · {formatShortDate(game.scheduledAt)}
                  {current && game.played ? thisGame : null}
                </span>
                <span className="text-sm">
                  <ShortLabel short={teamCode(game.localTeam)} full={shortTeamName(game.localTeam)} />{" "}
                  {isForfeit(game) ? <span className="muted me-1 text-xs">Forfeit</span> : null}
                  {current && !game.played ? thisGame : <b className="tabular-nums">{game.played ? `${game.localScore}-${game.roadScore}` : "vs"}</b>}{" "}
                  <ShortLabel short={teamCode(game.roadTeam)} full={shortTeamName(game.roadTeam)} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// This season's meetings, then last season's: the season before this one in the catalog, where club A may not have played (a
// 404 there means no meetings, not a failure). Last season's list waits quietly; this season's shows as soon as it is known.
function MeetingsPanel({ seasonCode, entityA, entityB, gameCode }) {
  const gamesA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: getSeasons });
  const seasons = seasonsQuery.data?.seasons ?? [];
  // The catalog lists the newest season first.
  const index = seasons.findIndex((season) => season.seasonCode === seasonCode);
  const previous = index >= 0 ? (seasons[index + 1] ?? null) : null;
  const lastGamesA = useQuery({
    queryKey: ["team-games", previous?.seasonCode, entityA.id],
    queryFn: () =>
      getTeamGames(previous.seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }).catch((error) => {
        if (absentFromSeason(error)) return { games: [] };
        throw error;
      }),
    enabled: Boolean(previous),
    retry: false,
  });
  const meetings = meetingsOf(gamesA.data?.games, entityB.id);
  const lastMeetings = meetingsOf(lastGamesA.data?.games, entityB.id);
  if (meetings.length === 0 && lastMeetings.length === 0) return null;
  return (
    <Panel className="h-full p-4">
      <PanelTitle kicker="MEETINGS" title={lastMeetings.length ? "This season and last" : "This season"} />
      <div className="flex flex-col gap-4">
        {meetings.length ? <MeetingList seasonCode={seasonCode} title="This season" meetings={meetings} entityA={entityA} entityB={entityB} gameCode={gameCode} /> : null}
        {lastMeetings.length ? (
          <MeetingList seasonCode={previous.seasonCode} title={formatSeasonLabel(previous.seasonCode)} meetings={lastMeetings} entityA={entityA} entityB={entityB} />
        ) : null}
      </div>
    </Panel>
  );
}

// The preview of a pairing: where each club is stronger in the league, how they have been playing, who to watch and how
// they have met this season and last. From lg the first two sit beside the last two, both columns ending on one line. `gameCode` is the game it was opened from, if any.
export default function CompareTeamOverview({ seasonCode, phaseCode, entityA: pickedA, entityB: pickedB, gameCode }) {
  const [entityA, entityB] = useClubEntities(seasonCode, pickedA, pickedB);
  const source = useTeamRows(seasonCode, phaseCode);
  return (
    <motion.div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2" variants={sectionContainer} initial="hidden" animate="show">
      <div className="flex min-w-0 flex-col gap-6">
        {source.isLoading ? (
          <AsyncState status="loading" label="Loading the matchup" skeleton={<TeamMatchupSkeleton />} />
        ) : source.isError ? (
          <AsyncState status="error" message="Could not load the matchup." onRetry={source.refetch} />
        ) : (
          <motion.div variants={sectionItem}>
            <EdgesPanel source={source} entityA={entityA} entityB={entityB} />
          </motion.div>
        )}
        <motion.div variants={sectionItem} className="lg:flex-1">
          <FormPanel seasonCode={seasonCode} phaseCode={phaseCode} entityA={entityA} entityB={entityB} hosted={gameCode != null} />
        </motion.div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <motion.div variants={sectionItem}>
          <WatchPanel seasonCode={seasonCode} phaseCode={phaseCode} entityA={entityA} entityB={entityB} />
        </motion.div>
        <motion.div variants={sectionItem} className="lg:flex-1">
          <MeetingsPanel seasonCode={seasonCode} entityA={entityA} entityB={entityB} gameCode={gameCode} />
        </motion.div>
      </div>
    </motion.div>
  );
}
