import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getTeamGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import { formatShortDate } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import { nameParts, titleCase } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import { Avatar } from "../leaders/LeaderParts";
import { statNumber } from "../leaders/leaderData";
import { useTeamRows } from "../leaders/teamData";
import { fetchTeamRosterStats } from "../teams/teamRosterStats";
import { edgesBetween } from "./teamCompare";

const GAMES_LIMIT = 100;
const EDGES_SHOWN = 3;
// A gap of fewer places than this is not an edge worth naming.
const MIN_EDGE_GAP = 3;

function Crest({ url, className = "h-10 w-10" }) {
  return url ? <RevealImage src={url} className={`${className} flex-none object-contain`} /> : <span className={`${className} flex-none`} />;
}

function PanelTitle({ kicker, title, note }) {
  return (
    <div className="mb-3">
      <p className="eyebrow mb-0.5">{kicker}</p>
      <h3 className="text-lg font-bold">{title}</h3>
      {note ? <p className="muted mt-1 text-sm">{note}</p> : null}
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
          <p className="truncate font-bold">{label}</p>
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
                <span className="truncate" title={edge.stat.tip}>
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
        note={`Their places among the ${source.rows.length} clubs on ${edges.length} measures of how a team plays${tied ? `; ${tied} are level` : ""}.`}
      />
      <div className="grid gap-3 md:grid-cols-2">
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
  return { wins, losses: results.length - wins, share: results.length ? wins / results.length : null };
}

function FormList({ games, clubCode, label, seasonCode }) {
  const last = games.slice(-5).reverse();
  return (
    <div>
      <p className="mb-2 font-semibold">{label}</p>
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
                  <span className="min-w-0 flex-1 truncate">{result.opponent?.abbreviatedName ?? result.opponent?.name ?? "TBD"}</span>
                  <span className="flex-none tabular-nums">
                    {result.own}-{result.other}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FormPanel({ seasonCode, phaseCode, entityA, entityB, hosted }) {
  const gamesA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const gamesB = useQuery({ queryKey: ["team-games", seasonCode, entityB.id], queryFn: () => getTeamGames(seasonCode, entityB.id, { limit: GAMES_LIMIT, order: "asc" }) });
  if (gamesA.isPending || gamesB.isPending) return <Panel className="p-4"><AsyncState status="loading" label="Loading recent form" inline /></Panel>;
  if (gamesA.isError || gamesB.isError) {
    return (
      <Panel className="p-4">
        <AsyncState status="error" message="Could not load recent form." inline onRetry={() => { gamesA.refetch(); gamesB.refetch(); }} />
      </Panel>
    );
  }
  const playedA = playedGames(gamesA.data.games ?? [], phaseCode);
  const playedB = playedGames(gamesB.data.games ?? [], phaseCode);
  const homeA = venueRecord(playedA, entityA.id, true);
  const awayA = venueRecord(playedA, entityA.id, false);
  const homeB = venueRecord(playedB, entityB.id, true);
  const awayB = venueRecord(playedB, entityB.id, false);
  const show = (record) => (record.wins + record.losses === 0 ? "—" : `${record.wins}-${record.losses}`);
  return (
    <Panel className="p-4">
      <PanelTitle
        kicker="FORM"
        title="Recent results and venue"
        note={hosted ? `${entityA.label} host this game, so their home record and ${entityB.label}'s away record are the ones that count.` : null}
      />
      <div className="mb-2 grid gap-6 md:grid-cols-2">
        <FormList games={playedA} clubCode={entityA.id} label={`${entityA.label}: last 5`} seasonCode={seasonCode} />
        <FormList games={playedB} clubCode={entityB.id} label={`${entityB.label}: last 5`} seasonCode={seasonCode} />
      </div>
      <ComparisonRow label="Home record" rawA={homeA.share} rawB={homeB.share} displayA={show(homeA)} displayB={show(homeB)} direction="higher" />
      <ComparisonRow label="Away record" rawA={awayA.share} rawB={awayB.share} displayA={show(awayA)} displayB={show(awayB)} direction="higher" />
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

function displayName(player) {
  const { last, first } = nameParts(player.playerName);
  return `${titleCase(first)} ${titleCase(last)}`.trim();
}

function ScorerList({ players, seasonCode, label }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{label}</p>
      {players.length === 0 ? (
        <p className="muted text-sm">No one has played yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {players.map((player) => (
            <li key={player.personKey}>
              <Link to={`/${seasonCode}/players/${player.personKey}`} className="flex items-center gap-3 rounded-field px-1 py-1 hover:bg-base-200">
                <Avatar imageUrl={player.playerImageUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{displayName(player)}</span>
                  <span className="muted block text-xs tabular-nums">
                    {Number(player.traditional.assists).toFixed(1)} AST · {Number(player.traditional.totalRebounds).toFixed(1)} REB
                  </span>
                </span>
                <span className="flex-none text-right">
                  <b className="text-lg tabular-nums">{Number(player.traditional.pointsScored).toFixed(1)}</b> <span className="muted text-xs">PTS</span>
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
  if (statsA.isPending || statsB.isPending) return <Panel className="p-4"><AsyncState status="loading" label="Loading the players" inline /></Panel>;
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
      <PanelTitle kicker="PLAYERS TO WATCH" title="Top scorers" note="The three highest scorers of each club, per game." />
      <div className="grid gap-6 md:grid-cols-2">
        <ScorerList players={playersA} seasonCode={seasonCode} label={entityA.label} />
        <ScorerList players={playersB} seasonCode={seasonCode} label={entityB.label} />
      </div>
      {lead ? (
        <div className="mt-4">
          <Link to={`/${seasonCode}/compare?view=players&playerA=${encodeURIComponent(lead[0].personKey)}&playerB=${encodeURIComponent(lead[1].personKey)}`} className="btn btn-outline btn-sm">
            Compare {displayName(lead[0])} and {displayName(lead[1])}
          </Link>
        </div>
      ) : null}
    </Panel>
  );
}

// ---- This season's meetings ----

function MeetingsPanel({ seasonCode, entityA, entityB }) {
  const gamesA = useQuery({ queryKey: ["team-games", seasonCode, entityA.id], queryFn: () => getTeamGames(seasonCode, entityA.id, { limit: GAMES_LIMIT, order: "asc" }) });
  const meetings = (gamesA.data?.games ?? []).filter((game) => game.localTeam?.clubCode === entityB.id || game.roadTeam?.clubCode === entityB.id);
  if (meetings.length === 0) return null;
  const played = meetings.filter((game) => game.played && game.localScore != null && game.roadScore != null);
  const winsA = played.filter((game) => resultFor(game, entityA.id).won).length;
  return (
    <Panel className="p-4">
      <PanelTitle
        kicker="THIS SEASON"
        title="Meetings"
        note={played.length ? `${entityA.label} ${winsA}-${played.length - winsA} ${entityB.label}` : "Not played yet this season."}
      />
      <ul className="flex flex-col">
        {meetings.map((game) => (
          <li key={game.gameCode} className="border-b border-base-300 last:border-0">
            <Link to={`/${seasonCode}/games/${game.gameCode}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-field px-1 py-2 hover:bg-base-200">
              <span className="muted text-sm">
                {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · {formatShortDate(game.scheduledAt)}
              </span>
              <span className="text-sm">
                {game.localTeam?.abbreviatedName ?? game.localTeam?.name}{" "}
                <b className="tabular-nums">{game.played ? `${game.localScore}-${game.roadScore}` : "vs"}</b>{" "}
                {game.roadTeam?.abbreviatedName ?? game.roadTeam?.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// The preview of a pairing: where each club is stronger in the league, how they have been playing, who to watch and how
// they have met this season.
export default function CompareTeamOverview({ seasonCode, phaseCode, entityA, entityB, hosted }) {
  const source = useTeamRows(seasonCode, phaseCode);
  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      {source.isLoading ? (
        <AsyncState status="loading" label="Loading the matchup" />
      ) : source.isError ? (
        <AsyncState status="error" message="Could not load the matchup." onRetry={source.refetch} />
      ) : (
        <motion.div variants={sectionItem}>
          <EdgesPanel source={source} entityA={entityA} entityB={entityB} />
        </motion.div>
      )}
      <motion.div variants={sectionItem}>
        <FormPanel seasonCode={seasonCode} phaseCode={phaseCode} entityA={entityA} entityB={entityB} hosted={hosted} />
      </motion.div>
      <motion.div variants={sectionItem}>
        <WatchPanel seasonCode={seasonCode} phaseCode={phaseCode} entityA={entityA} entityB={entityB} />
      </motion.div>
      <motion.div variants={sectionItem}>
        <MeetingsPanel seasonCode={seasonCode} entityA={entityA} entityB={entityB} />
      </motion.div>
    </motion.div>
  );
}
