import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getAdvancedLeaders, getSeasonHighs, getSeasonTeams } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { formatDate } from "../lib/format";
import { isForfeit } from "../lib/forfeit";
import LeaderPhoto from "../lib/LeaderPhoto";
import { cardHover, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { withoutComma } from "../lib/playerName";
import ShortLabel from "../lib/ShortLabel";
import { SkeletonChip } from "../lib/Skeleton";
import { Avatar, BOARD_AVATAR, RankBadge, TeamTag } from "../leaders/LeaderParts";

const MotionLink = motion.create(Link);

const HIGH_LABELS = { pointsScored: "Points", totalRebounds: "Rebounds", assists: "Assists", steals: "Steals", blocks: "Blocks", pir: "PIR" };
const MVP_COUNT = 5;

// A leader card's club: its short name (Olympiacos) from sm, its TV code (OLY) on a phone, and the full name as the tip. A traded
// player's TV codes ("PAR;MAD") stay codes at every width, joined by a slash. The season's teams are the request the Compare
// pages share.
export function ClubLabel({ seasonCode, clubCode, tvCodes, fullName }) {
  const teamsQuery = useQuery({ queryKey: ["teams", seasonCode], queryFn: () => getSeasonTeams(seasonCode) });
  const team = (teamsQuery.data?.teams ?? []).find((entry) => entry.clubCode === clubCode);
  const codes = (tvCodes ?? team?.tvCode ?? clubCode ?? "").replaceAll(";", "/");
  const short = tvCodes?.includes(";") ? codes : (team?.abbreviatedName ?? fullName ?? codes);
  return (
    <span className="club" title={fullName ?? undefined}>
      <ShortLabel short={codes} full={short} />
    </span>
  );
}

const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

function HighCard({ seasonCode, card }) {
  const label = `${HIGH_LABELS[card.metric] ?? card.label} in a game`;
  const record = card.record;
  if (!record) {
    return (
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">{label}</span>
          <AsyncState inline status="empty" message="Not available yet." />
        </div>
      </div>
    );
  }
  return (
    <MotionLink to={`/${seasonCode}/games/${record.gameCode}`} className="kpi-chip kpi-chip-link" variants={listItem} {...cardHover}>
      <div className="kpi-chip-body">
        <span className="label">{label}</span>
        <span className="name">{withoutComma(record.playerName ?? record.personKey)}</span>
        <ClubLabel seasonCode={seasonCode} clubCode={record.clubCode} tvCodes={record.clubTvCode} fullName={record.clubName} />
        <span className="value">{Number(record.value)}</span>
        <span className="muted text-xs">
          {record.opponentTvCode ? `vs ${record.opponentTvCode} · ` : ""}
          {formatDate(record.scheduledAt)}
        </span>
      </div>
      <LeaderPhoto imageUrl={record.playerImageUrl} />
    </MotionLink>
  );
}

// The season's best single game in each of the Statistical leaders' six categories, each opening its game.
export function SeasonHighs({ seasonCode }) {
  const query = useQuery({ queryKey: ["season-highs", seasonCode], queryFn: () => getSeasonHighs(seasonCode) });
  const cards = query.data?.cards ?? [];
  const status = query.isLoading ? "loading" : query.isError ? "error" : cards.every((card) => !card.record) ? "empty" : "ready";

  return (
    <Panel as="section" className="h-full p-4">
      <PanelHeader compact kicker="SEASON HIGHS" title="Best single games" />
      <AsyncState
        status={status}
        compact
        message={query.isError ? "Could not load the season highs." : "No played games yet this season."}
        onRetry={() => query.refetch()}
        skeleton={
          <div className="season-leaders-grid" aria-hidden="true">
            {Object.values(HIGH_LABELS).map((label) => <SkeletonChip key={label} label={`${label} in a game`} image="person" />)}
          </div>
        }
      >
        <motion.div className="season-leaders-grid" role="group" aria-label="Season highs" variants={listContainer} initial="hidden" animate="show">
          {cards.map((card) => <HighCard key={card.metric} seasonCode={seasonCode} card={card} />)}
        </motion.div>
      </AsyncState>
    </Panel>
  );
}

// The top five by win shares over the whole season (the Leaders page's advanced board, its default games rule), with each
// player's RAPM beside it when the season has one. A stat ranking, not an award.
export function MostValuable({ seasonCode }) {
  const sharesQuery = useQuery({
    queryKey: ["overview-win-shares", seasonCode],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: "winShares", scope: "all", limit: MVP_COUNT }),
  });
  const rapmQuery = useQuery({
    queryKey: ["overview-rapm", seasonCode],
    queryFn: () => getAdvancedLeaders(seasonCode, { metric: "rapm", scope: "all", games: "all", limit: 100 }),
  });
  const entries = sharesQuery.data?.entries ?? [];
  const rapmByPlayer = new Map((rapmQuery.data?.entries ?? []).map((entry) => [String(entry.personKey), Number(entry.value)]));
  const status = sharesQuery.isLoading ? "loading" : sharesQuery.isError ? "error" : entries.length === 0 ? "empty" : "ready";

  return (
    <Panel as="section" className="flex h-full min-w-0 flex-col p-4">
      <PanelHeader
        compact
        kicker="WIN SHARES"
        title="Most valuable"
        trailing={
          <Link to={`/${seasonCode}/leaders?scope=advanced&metric=winShares&ascope=all`} className="panel-link">
            Full board →
          </Link>
        }
      />
      <AsyncState
        status={status}
        compact
        message={sharesQuery.isError ? "Could not load win shares." : "Win shares are not available for this season."}
        onRetry={() => sharesQuery.refetch()}
        skeleton={
          <div className="flex flex-col gap-2" aria-hidden="true">
            {Array.from({ length: MVP_COUNT }, (_, index) => <div key={index} className="skeleton h-10" />)}
          </div>
        }
      >
        <motion.ol className="flex flex-1 flex-col" aria-label="Top five by win shares" variants={listContainer} initial="hidden" animate="show">
          {entries.map((entry, index) => {
            const rapm = rapmByPlayer.get(String(entry.personKey));
            return (
              <motion.li key={entry.personKey} variants={listItem} className="flex flex-1 border-b border-base-300 last:border-0">
                <Link to={`/${seasonCode}/players/${entry.personKey}`} className="board-row-link flex flex-1 items-center gap-2 py-2 sm:gap-3">
                  <RankBadge rank={index + 1} compact />
                  <Avatar optimize imageUrl={entry.imageUrl} size={BOARD_AVATAR} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold max-sm:line-clamp-2 sm:truncate">{withoutComma(entry.playerName ?? entry.personKey)}</p>
                    <TeamTag code={entry.clubCode} name={entry.clubName} tvCode={entry.clubTvCode} crestUrl={entry.crestUrl} />
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-lg font-black leading-tight tabular-nums">{Number(entry.value).toFixed(1)}</p>
                    <p className="muted text-xs tabular-nums">
                      WS{Number.isFinite(rapm) ? ` · RAPM ${signed(rapm)}` : ""}
                    </p>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ol>
      </AsyncState>
    </Panel>
  );
}

// Home advantage from the season's played games. Forfeits and the Final Four (a neutral venue) are left out.
function homeRoadSummary(playedGames) {
  const games = playedGames.filter(
    (game) => game.phaseCode !== "FF" && !isForfeit(game) && game.localScore != null && game.roadScore != null && game.localScore !== game.roadScore,
  );
  if (games.length === 0) return null;
  const clubs = new Map();
  const club = (team) => {
    const key = team?.clubCode;
    if (!key) return null;
    if (!clubs.has(key)) clubs.set(key, { team, home: { won: 0, lost: 0 }, road: { won: 0, lost: 0 } });
    return clubs.get(key);
  };
  let homeWins = 0;
  let marginSum = 0;
  for (const game of games) {
    const homeWon = game.localScore > game.roadScore;
    if (homeWon) homeWins += 1;
    marginSum += game.localScore - game.roadScore;
    const local = club(game.localTeam);
    const road = club(game.roadTeam);
    if (local) local.home[homeWon ? "won" : "lost"] += 1;
    if (road) road.road[homeWon ? "lost" : "won"] += 1;
  }
  const bestAt = (side) => {
    const rows = [...clubs.values()].filter((row) => row[side].won + row[side].lost > 0);
    const better = (a, b) => b[side].won - a[side].won || a[side].lost - b[side].lost;
    rows.sort(better);
    const top = rows[0];
    if (!top) return null;
    return { ...top, record: top[side], level: rows.filter((row) => row !== top && better(top, row) === 0).length };
  };
  return { games: games.length, homeWins, homeShare: homeWins / games.length, margin: marginSum / games.length, bestHome: bestAt("home"), bestRoad: bestAt("road") };
}

// One of the two best clubs: its crest, its name and its record at that venue.
function BestClub({ seasonCode, label, best }) {
  if (!best) return null;
  const name = best.team.name ?? best.team.abbreviatedName ?? best.team.clubCode;
  return (
    <li className="flex items-center gap-3 border-t border-base-300 py-2.5 first:border-t-0">
      {best.team.crestUrl ? (
        <img
          src={best.team.crestUrl}
          alt=""
          className="h-8 w-8 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="micro-label">{label}</p>
        <Link to={`/${seasonCode}/teams/${best.team.clubCode}`} className="link-hover block truncate font-semibold">
          {name}
        </Link>
      </div>
      <div className="flex-none text-right">
        <p className="text-xl font-black leading-tight tabular-nums">
          {best.record.won}-{best.record.lost}
        </p>
        {best.level > 0 ? <p className="muted text-xs">+{best.level} level</p> : null}
      </div>
    </li>
  );
}

// Home advantage at a glance: the share of games the home side won as a split bar (home against road wins), the average
// home margin beside it, and the clubs with the best record at home and on the road.
export function HomeVsRoad({ seasonCode, playedGames }) {
  const summary = homeRoadSummary(playedGames);
  const homePercent = summary ? Math.round(summary.homeShare * 100) : 0;
  return (
    <Panel as="section" className="flex h-full min-w-0 flex-col p-4">
      <PanelHeader compact kicker="VENUES" title="Home and away" />
      {!summary ? (
        <p className="muted text-sm">No played games yet this season.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <p className="micro-label">Home wins</p>
                <p className="text-4xl font-black leading-none tabular-nums text-primary">{homePercent}%</p>
              </div>
              <div className="text-right">
                <p className="micro-label">Home margin</p>
                <p className="text-2xl font-black leading-none tabular-nums">{signed(summary.margin)}</p>
                <p className="muted text-xs">points a game</p>
              </div>
            </div>
            <div
              className="mt-3 flex h-3 overflow-hidden rounded-full bg-base-300"
              role="img"
              aria-label={`Home sides won ${summary.homeWins} of ${summary.games} games, road sides ${summary.games - summary.homeWins}`}
            >
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${homePercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="muted mt-1 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums">
              <span>{summary.homeWins} of {summary.games} games won at home</span>
              <span>{summary.games - summary.homeWins} on the road</span>
            </div>
          </div>
          <ul className="flex flex-col">
            <BestClub seasonCode={seasonCode} label="Best at home" best={summary.bestHome} />
            <BestClub seasonCode={seasonCode} label="Best on the road" best={summary.bestRoad} />
          </ul>
        </div>
      )}
    </Panel>
  );
}
