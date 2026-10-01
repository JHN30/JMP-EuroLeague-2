import { motion } from "motion/react";
import { Link } from "react-router";
import { formatShortDate, formatTimeOfDay } from "../lib/format";
import { centerPop, listItem, wideCardHover } from "../lib/motion";

const MotionLink = motion.create(Link);

function FixtureTeam({ team, entry, won }) {
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
      <span className="fixture-team-name">{team?.abbreviatedName ?? team?.name ?? "TBD"}</span>
      {entry?.basic ? (
        <span className="fixture-team-record">
          {entry.basic.gamesWon}-{entry.basic.gamesLost}
        </span>
      ) : null}
    </div>
  );
}

// One game on the Games page. Upcoming games put the date and tip-off time in the middle; finished games put the score
// there, with the winning side filled in.
export default function GameCard({ game, seasonCode, standingByClubCode }) {
  const hasScore = game.played && game.localScore != null && game.roadScore != null;
  const localWon = hasScore && game.localScore > game.roadScore;
  const roadWon = hasScore && game.roadScore > game.localScore;
  const localEntry = game.localTeam?.clubCode ? standingByClubCode.get(game.localTeam.clubCode) : null;
  const roadEntry = game.roadTeam?.clubCode ? standingByClubCode.get(game.roadTeam.clubCode) : null;

  return (
    <MotionLink to={`/${seasonCode}/games/${game.gameCode}`} className="fixture-card" variants={listItem} {...wideCardHover}>
      <div className="fixture-card-body">
        <FixtureTeam team={game.localTeam} entry={localEntry} won={localWon} />
        <motion.div className="fixture-center" variants={centerPop}>
          {game.played ? (
            <>
              <span className="score-pill" aria-label={`Final score ${game.localScore ?? "-"} to ${game.roadScore ?? "-"}`}>
                <span className={localWon ? "win" : ""}>{game.localScore ?? "-"}</span>
                <span className={roadWon ? "win" : ""}>{game.roadScore ?? "-"}</span>
              </span>
              <span className="fixture-date">Final · {formatShortDate(game.scheduledAt)}</span>
            </>
          ) : (
            <>
              <span className="fixture-date">{formatShortDate(game.scheduledAt)}</span>
              <span className="fixture-time">{formatTimeOfDay(game.scheduledAt)}</span>
            </>
          )}
        </motion.div>
        <FixtureTeam team={game.roadTeam} entry={roadEntry} won={roadWon} />
      </div>
      <span className="fixture-cta">{game.played ? "Overview" : "Preview"}</span>
    </MotionLink>
  );
}
