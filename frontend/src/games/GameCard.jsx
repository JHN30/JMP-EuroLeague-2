import { motion } from "motion/react";
import { Link } from "react-router";
import { formatShortDate, formatTimeOfDay } from "../lib/format";
import { centerPop, listItem, wideCardHover } from "../lib/motion";
import ShortLabel from "../lib/ShortLabel";
import { groupPositionLabel } from "../standings/standingsGroups";
import { shortTeamName, teamCode } from "./gameUtils";

const MotionLink = motion.create(Link);

function FixtureTeam({ team, entry, won, showGroup }) {
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
    </div>
  );
}

// One game on the Games page. Upcoming games put the date and tip-off time in the middle; finished games put the score
// there, with the winning side filled in.
export default function GameCard({ game, seasonCode, standingByClubCode, cancelled = false, showGroup = false, caption = null }) {
  const hasScore = game.played && game.localScore != null && game.roadScore != null;
  const localWon = hasScore && game.localScore > game.roadScore;
  const roadWon = hasScore && game.roadScore > game.localScore;
  const localEntry = game.localTeam?.clubCode ? standingByClubCode.get(game.localTeam.clubCode) : null;
  const roadEntry = game.roadTeam?.clubCode ? standingByClubCode.get(game.roadTeam.clubCode) : null;

  return (
    <MotionLink to={`/${seasonCode}/games/${game.gameCode}`} className="fixture-card" variants={listItem} {...wideCardHover}>
      {caption ?? (showGroup ? game.groupName : null) ? <span className="muted block text-center text-xs font-semibold tracking-wide uppercase">{caption ?? game.groupName}</span> : null}
      <div className="fixture-card-body">
        <FixtureTeam team={game.localTeam} entry={localEntry} won={localWon} showGroup={showGroup} />
        <motion.div className="fixture-center" variants={centerPop}>
          {game.played ? (
            <>
              <span className="score-pill" aria-label={`${game.gameStatus === "Walkover" ? "Forfeit awarded" : "Final score"} ${game.localScore ?? "-"} to ${game.roadScore ?? "-"}`}>
                <span className={localWon ? "win" : ""}>{game.localScore ?? "-"}</span>
                <span className={roadWon ? "win" : ""}>{game.roadScore ?? "-"}</span>
              </span>
              <span className="fixture-date">{game.gameStatus === "Walkover" ? "Forfeit" : "Final"} · {formatShortDate(game.scheduledAt)}</span>
            </>
          ) : cancelled ? (
            <><span className="fixture-date">Not played</span><span className="text-xs">Season cancelled</span></>
          ) : (
            <>
              <span className="fixture-date">{formatShortDate(game.scheduledAt)}</span>
              <span className="fixture-time">{formatTimeOfDay(game.scheduledAt)}</span>
            </>
          )}
        </motion.div>
        <FixtureTeam team={game.roadTeam} entry={roadEntry} won={roadWon} showGroup={showGroup} />
      </div>
      <span className="fixture-cta">{game.played || cancelled ? "Overview" : "Preview"}</span>
    </MotionLink>
  );
}
