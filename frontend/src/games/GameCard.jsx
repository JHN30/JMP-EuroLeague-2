import { m } from "motion/react";
import { Link } from "react-router";
import { formatShortDate, formatTimeOfDay } from "../lib/format";
import { centerPop, listItem, wideCardHover } from "../lib/motion";
import PlayerPortrait from "../lib/PlayerPortrait";
import { displayName, nameParts } from "../lib/playerName";
import ShortLabel from "../lib/ShortLabel";
import { FormCell } from "../standings/standingsCells";
import { groupPositionLabel } from "../standings/standingsGroups";
import { shortTeamName, teamCode } from "./gameUtils";

const MotionLink = m.create(Link);

// A side's top scorer, as plain text: the card is already one link to the game. The surname alone below sm.
function TopScorer({ scorer }) {
  const full = displayName(scorer.personName ?? scorer.personKey);
  const surname = nameParts(scorer.personName ?? scorer.personKey).last || full;
  return (
    <span className="fixture-scorer" title={`${full}, ${scorer.points} points`}>
      <PlayerPortrait imageUrl={scorer.headshotUrl} className="fixture-scorer-photo" />
      <span className="fixture-scorer-name">
        <ShortLabel short={surname} full={full} />
      </span>
      <span className="fixture-scorer-points">{scorer.points} PTS</span>
    </span>
  );
}

// A club's last five results, oldest first, as the standings table draws them; nothing without a form.
function RecentForm({ entry }) {
  const form = [...(entry?.form ?? [])].sort((a, b) => a.resultOrdinal - b.resultOrdinal).slice(-5);
  if (form.length === 0) return null;
  return (
    <span className="fixture-form">
      <FormCell form={form} />
    </span>
  );
}

function FixtureTeam({ team, entry, won, showGroup, scorer = null, showForm = false }) {
  const position = showGroup ? groupPositionLabel(entry) : null;
  return (
    <div className={`fixture-team${won ? " win" : ""}`}>
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="fixture-crest"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <span className="fixture-crest" />
      )}
      <span className="fixture-team-name">
        <ShortLabel short={teamCode(team)} full={shortTeamName(team)} />
      </span>
      {entry?.basic ? (
        <span className="fixture-team-record" title={position ?? undefined}>
          {entry.basic.gamesWon}-{entry.basic.gamesLost}
          {position ? <span className="sr-only"> ({position})</span> : null}
        </span>
      ) : null}
      {scorer ? <TopScorer scorer={scorer} /> : null}
      {showForm ? <RecentForm entry={entry} /> : null}
    </div>
  );
}

// One game on the Games page. Upcoming games put the date and tip-off time in the middle; finished games put the score
// there, with the winning side filled in.
export default function GameCard({ game, seasonCode, standingByClubCode, cancelled = false, showGroup = false, caption = null }) {
  const hasScore = game.played && game.localScore != null && game.roadScore != null;
  const localWon = hasScore && game.localScore > game.roadScore;
  const roadWon = hasScore && game.roadScore > game.localScore;
  const forfeit = game.gameStatus === "Walkover";
  const overtime = game.overtimes > 1 ? `${game.overtimes}OT` : game.overtimes === 1 ? "OT" : null;
  const localEntry = game.localTeam?.clubCode ? standingByClubCode.get(game.localTeam.clubCode) : null;
  const roadEntry = game.roadTeam?.clubCode ? standingByClubCode.get(game.roadTeam.clubCode) : null;
  // A game still to play also shows both clubs' recent form and the arena.
  const upcoming = !game.played && !cancelled;

  return (
    <MotionLink to={`/${seasonCode}/games/${game.gameCode}`} className="fixture-card" variants={listItem} {...wideCardHover}>
      {caption ?? (showGroup ? game.groupName : null) ? <span className="muted block text-center text-xs font-semibold tracking-wide uppercase">{caption ?? game.groupName}</span> : null}
      <div className="fixture-card-body">
        <FixtureTeam team={game.localTeam} entry={localEntry} won={localWon} showGroup={showGroup} scorer={game.played ? game.topScorers?.local : null} showForm={upcoming} />
        <m.div className="fixture-center" variants={centerPop}>
          {game.played ? (
            <>
              <span
                className="score-pill"
                aria-label={`${forfeit ? "Forfeit awarded" : "Final score"} ${game.localScore ?? "-"} to ${game.roadScore ?? "-"}${overtime ? ` after ${overtime}` : ""}`}
              >
                <span className={localWon ? "win" : ""}>{game.localScore ?? "-"}</span>
                <span className={roadWon ? "win" : ""}>{game.roadScore ?? "-"}</span>
              </span>
              <span className="fixture-date">{forfeit ? "Forfeit" : "Final"}{overtime ? ` · ${overtime}` : ""} · {formatShortDate(game.scheduledAt)}</span>
            </>
          ) : cancelled ? (
            <><span className="fixture-date">Not played</span><span className="text-xs">Season cancelled</span></>
          ) : (
            <>
              <span className="fixture-date">{formatShortDate(game.scheduledAt)}</span>
              <span className="fixture-time">{formatTimeOfDay(game.scheduledAt)}</span>
            </>
          )}
        </m.div>
        <FixtureTeam team={game.roadTeam} entry={roadEntry} won={roadWon} showGroup={showGroup} scorer={game.played ? game.topScorers?.road : null} showForm={upcoming} />
      </div>
      {upcoming && game.venueName ? <span className="fixture-venue" title={game.venueName}>{game.venueName}</span> : null}
      <span className="fixture-cta">{game.played || cancelled ? "Overview" : "Preview"}</span>
    </MotionLink>
  );
}
