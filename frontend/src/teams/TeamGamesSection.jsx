import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import { teamCode } from "../games/gameUtils";
import { formatShortDate, formatSignedDecimal, formatTimeOfDay } from "../lib/format";
import { EASE_OUT, listContainer, listItem, wideCardHover } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import { TabPanel, TabStrip } from "../lib/TabStrip";

const MotionLink = motion.create(Link);

// Rows shown in each column before "Show all"; both columns start the same length so they line up.
const INITIAL_ROWS = 8;
const STRIP_COLUMN_REM = 2.75;
const STRIP_AREA_CLASS = "h-32";
// How much of each half (as a percentage) the tallest bar fills; the rest is room for the margin label above it.
const STRIP_HALF_FILL = 40;
// The tallest bar is at least this many points, so a season of narrow games does not blow every bar up to full height.
const MIN_STRIP_SCALE = 5;

const RESULT_TABS = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
];

const byDate = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);

// A game from the club's side.
function sideOf(game, clubCode) {
  const home = game.localTeam?.clubCode === clubCode;
  const opponent = home ? game.roadTeam : game.localTeam;
  const clubScore = home ? game.localScore : game.roadScore;
  const opponentScore = home ? game.roadScore : game.localScore;
  const hasScore = game.played && clubScore != null && opponentScore != null;
  return {
    home,
    opponent,
    clubScore,
    opponentScore,
    hasScore,
    won: hasScore && clubScore > opponentScore,
    margin: hasScore ? clubScore - opponentScore : null,
  };
}

function opponentName(opponent) {
  return opponent?.abbreviatedName ?? opponent?.name ?? "TBD";
}

// The opponent's name in a row: its TV code below sm, where there is little room beside the date, the abbreviated name from sm.
function OpponentLabel({ opponent }) {
  return <ShortLabel short={teamCode(opponent)} full={opponentName(opponent)} />;
}

function roundLabel(game) {
  const round = game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : null);
  if (game.phaseCode && game.phaseCode !== "RS") return [game.phaseName, round].filter(Boolean).join(" · ");
  return round ?? game.phaseName ?? "";
}

// The crest, or the club's letters when there is no crest or it does not load.
function Crest({ team, className = "h-10 w-10" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const url = team?.crestUrl;
  // The crest as it is, never clipped to a shape: crests are not all round.
  if (url && failedUrl !== url) {
    return <img src={url} alt="" className={`${className} flex-none object-contain`} onError={() => setFailedUrl(url)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} flex flex-none items-center justify-center rounded-full bg-base-300 text-[0.6rem] font-bold uppercase`}
    >
      {opponentName(team).slice(0, 3)}
    </span>
  );
}

// One bar per played game, oldest to newest: green going up for a win and red going down for a loss, as tall as the
// margin, with the opponent's crest under it. Each bar opens the game.
function MarginStrip({ played, seasonCode, clubCode }) {
  const scrollRef = useRef(null);
  const sides = played.map((game) => ({ game, side: sideOf(game, clubCode) })).filter(({ side }) => side.hasScore);

  // A season is longer than the strip is wide, so open on the latest games.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [sides.length]);

  if (sides.length === 0) return null;

  const wins = sides.filter(({ side }) => side.won).length;
  const average = sides.reduce((sum, { side }) => sum + side.margin, 0) / sides.length;
  const badges = (
    <>
      <span className="stat-badge stat-badge-neutral">
        {wins}-{sides.length - wins}
      </span>
      <span className={`stat-badge ${average >= 0 ? "stat-badge-positive" : "stat-badge-negative"}`}>
        {formatSignedDecimal(average)} average margin
      </span>
    </>
  );
  const scale = Math.max(MIN_STRIP_SCALE, ...sides.map(({ side }) => Math.abs(side.margin)));

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="FORM"
        title="How the games went"
        trailing={<div className="flex flex-wrap justify-end gap-2 max-sm:hidden">{badges}</div>}
      />
      {/* Below sm the badges sit under the title, where they have the panel's whole width; the other copy is hidden then. */}
      <div className="-mt-2 mb-3 flex flex-wrap gap-2 sm:hidden">{badges}</div>
      <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain pb-1">
        <ul className="flex" style={{ minWidth: `${sides.length * STRIP_COLUMN_REM}rem` }}>
          {sides.map(({ game, side }, index) => {
            const half = (Math.abs(side.margin) / scale) * STRIP_HALF_FILL;
            const signed = `${side.margin > 0 ? "+" : ""}${side.margin}`;
            const description = `${roundLabel(game)}: ${side.home ? "vs" : "@"} ${opponentName(side.opponent)}, ${
              side.won ? "won" : "lost"
            } ${side.clubScore}-${side.opponentScore}`;
            return (
              <li key={game.gameCode} className="flex min-w-0 flex-1 basis-0" style={{ maxWidth: sides.length <= 12 ? "8rem" : "6rem" }}>
                <Link
                  to={`/${seasonCode}/games/${game.gameCode}`}
                  title={description}
                  aria-label={description}
                  className="group flex w-full flex-col items-center gap-1 rounded-field px-0.5 py-1 transition-colors hover:bg-base-200"
                >
                  <div className={`relative w-full ${STRIP_AREA_CLASS}`}>
                    <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-base-content/25" />
                    <motion.span
                      aria-hidden="true"
                      className={`absolute left-1/2 w-3/5 max-w-6 -translate-x-1/2 rounded-sm opacity-90 group-hover:opacity-100 ${
                        side.won ? "bg-success" : "bg-error"
                      }`}
                      style={side.won ? { bottom: "50%" } : { top: "50%" }}
                      initial={{ height: 0 }}
                      animate={{ height: `${half}%` }}
                      transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 40) * 0.015 }}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 text-center text-[0.65rem] font-bold tabular-nums ${
                        side.won ? "text-success" : "text-error"
                      }`}
                      style={side.won ? { bottom: `calc(50% + ${half}%)` } : { top: `calc(50% + ${half}%)` }}
                    >
                      {signed}
                    </span>
                  </div>
                  <Crest team={side.opponent} className="h-6 w-6" />
                  <span aria-hidden="true" className="muted flex items-center gap-0.5 text-[0.65rem] tabular-nums">
                    <HomeAwayIcon home={side.home} className="h-2.5 w-2.5" />
                    {game.roundNumber != null ? `R${game.roundNumber}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="muted mt-2 text-sm">
        Oldest on the left. Click a bar to open the game.
      </p>
    </Panel>
  );
}

function GameRow({ seasonCode, game, clubCode, isNext }) {
  const side = sideOf(game, clubCode);
  const played = game.played;

  return (
    <MotionLink
      to={`/${seasonCode}/games/${game.gameCode}`}
      className="flex items-center gap-3 rounded-field border border-base-300 bg-base-200 p-3 transition-colors hover:border-primary"
      variants={listItem}
      {...wideCardHover}
    >
      <Crest team={side.opponent} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold">
          <HomeAwayIcon home={side.home} className="h-4 w-4 text-base-content/60" />
          <span className="muted font-normal">{side.home ? "vs" : "@"}</span>
          <span className="truncate">
            <OpponentLabel opponent={side.opponent} />
          </span>
        </p>
        <p className="muted truncate text-xs">
          {roundLabel(game)}
          {/* Below sm the "Next" badge sits after the round, so it does not squeeze the opponent beside the date (the badge class sets
              its own display, so the wrapper is what is hidden). */}
          {isNext ? (
            <span className="ms-2 sm:hidden">
              <span className="stat-badge stat-badge-neutral">Next</span>
            </span>
          ) : null}
        </p>
      </div>
      {played ? (
        side.hasScore ? (
          <div className="flex flex-none items-center gap-2">
            <span className={`stat-badge ${side.won ? "stat-badge-positive" : "stat-badge-negative"}`}>{side.won ? "W" : "L"}</span>
            <span className="text-right text-lg font-bold tabular-nums sm:w-16">
              {side.clubScore}-{side.opponentScore}
            </span>
          </div>
        ) : null
      ) : (
        <div className="flex flex-none items-center gap-3 text-right">
          {isNext ? (
            <span className="max-sm:hidden">
              <span className="stat-badge stat-badge-neutral">Next</span>
            </span>
          ) : null}
          <div>
            <p className="text-sm font-semibold">{formatShortDate(game.scheduledAt)}</p>
            <p className="muted text-xs">{formatTimeOfDay(game.scheduledAt)}</p>
          </div>
        </div>
      )}
    </MotionLink>
  );
}

// The list sits in a tab panel when filter tabs control it (so they have something to point at), and loose otherwise.
function ListBody({ panelId, listKey, children }) {
  return panelId ? (
    <TabPanel id={panelId} focusKey={listKey} scroll={false}>
      {children}
    </TabPanel>
  ) : (
    children
  );
}

// A column of games that starts short and grows with "Show all".
function GameColumn({ kicker, title, games, seasonCode, clubCode, markFirst = false, emptyText, controls = null, panelId, listKey }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? games : games.slice(0, INITIAL_ROWS);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker={kicker}
        title={title}
        trailing={<span className="muted text-sm font-semibold tabular-nums">{games.length}</span>}
      />
      {controls}
      <ListBody panelId={panelId} listKey={listKey}>
      {games.length === 0 ? (
        <EmptyText>{emptyText}</EmptyText>
      ) : (
        <>
          <motion.ul key={listKey} className="flex flex-col gap-2" variants={listContainer} initial="hidden" animate="show">
            {visible.map((game, index) => (
              <li key={game.gameCode} className="contents">
                <GameRow seasonCode={seasonCode} game={game} clubCode={clubCode} isNext={markFirst && index === 0} />
              </li>
            ))}
          </motion.ul>
          {games.length > INITIAL_ROWS ? (
            <button type="button" className="btn btn-sm btn-ghost mt-3 w-full" onClick={() => setExpanded((open) => !open)}>
              {expanded ? "Show fewer" : `Show all ${games.length}`}
            </button>
          ) : null}
        </>
      )}
      </ListBody>
    </Panel>
  );
}

// The Games tab: how the played games went as a strip, then what is coming (left, the next game first) beside what has
// happened (right, the latest game first), with the opponent's crest on every row.
export default function TeamGamesSection({ gamesQuery, seasonCode, clubCode }) {
  const [resultFilter, setResultFilter] = useState("all");

  if (gamesQuery.isPending) return <AsyncState status="loading" label="Loading the games" />;
  if (gamesQuery.isError) {
    return <AsyncState status="error" message="Could not load the games." onRetry={() => gamesQuery.refetch()} />;
  }
  const allGames = gamesQuery.data.games ?? [];
  if (allGames.length === 0) {
    return <EmptyText>No games scheduled yet.</EmptyText>;
  }

  const played = allGames.filter((game) => game.played).sort(byDate);
  const upcoming = allGames.filter((game) => !game.played).sort(byDate);
  const results = played
    .slice()
    .reverse()
    .filter((game) => {
      if (resultFilter === "all") return true;
      const side = sideOf(game, clubCode);
      return resultFilter === "wins" ? side.won : side.hasScore && !side.won;
    });

  return (
    <div className="flex flex-col gap-6">
      <MarginStrip played={played} seasonCode={seasonCode} clubCode={clubCode} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
        <GameColumn
          kicker="UPCOMING"
          title="Next games"
          games={upcoming}
          seasonCode={seasonCode}
          clubCode={clubCode}
          markFirst
          emptyText="No games left to play."
        />
        <GameColumn
          kicker="RESULTS"
          title="Latest results"
          games={results}
          seasonCode={seasonCode}
          clubCode={clubCode}
          emptyText={resultFilter === "all" ? "No games played yet." : "No games match this filter."}
          panelId="team-results-panel"
          listKey={resultFilter}
          controls={
            <TabStrip
              ariaLabel="Results filter"
              panelId="team-results-panel"
              activeKey={resultFilter}
              onChange={setResultFilter}
              tabs={RESULT_TABS}
              className="mb-3 w-fit"
            />
          }
        />
      </div>
    </div>
  );
}
