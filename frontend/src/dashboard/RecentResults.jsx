import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { formatDateTime as formatTime } from "../lib/format";
import { cardHover, listContainer, listItem } from "../lib/motion";
import { WidgetPanel } from "./Dashboard";

const MotionLink = motion.create(Link);

function roundLabel(game) {
  if (game.phaseCode && game.phaseCode !== "RS") {
    return game.phaseName ?? game.phaseCode;
  }
  return game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName);
}

export function MatchCard({ game, standingByClubCode, seasonCode, showScore }) {
  const localEntry = game.localTeam?.clubCode ? standingByClubCode.get(game.localTeam.clubCode) : null;
  const roadEntry = game.roadTeam?.clubCode ? standingByClubCode.get(game.roadTeam.clubCode) : null;
  const localWon = showScore && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
  const roadWon = showScore && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;

  return (
    <MotionLink to={`/${seasonCode}/games/${game.gameCode}`} className="match-card" variants={listItem} {...cardHover}>
      <div className="match-card-head">
        <span>{roundLabel(game)}</span>
        <span className={`status-chip ${showScore ? "final" : "upcoming"}`}>
          {showScore ? "Final" : formatTime(game.scheduledAt)}
        </span>
      </div>
      <div className="game-teams">
        <div className={`game-team${localWon ? " win" : ""}`}>
          {game.localTeam?.crestUrl ? (
            <img
              src={game.localTeam.crestUrl}
              alt=""
              className="h-6 w-6 flex-none object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span className="flex-1">{game.localTeam?.abbreviatedName ?? game.localTeam?.name ?? "TBD"}</span>
          {localEntry?.basic ? (
            <span className="record">
              {localEntry.basic.gamesWon}-{localEntry.basic.gamesLost}
            </span>
          ) : null}
          {showScore ? <span className="score">{game.localScore ?? "-"}</span> : null}
        </div>
        <div className={`game-team${roadWon ? " win" : ""}`}>
          {game.roadTeam?.crestUrl ? (
            <img
              src={game.roadTeam.crestUrl}
              alt=""
              className="h-6 w-6 flex-none object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span className="flex-1">{game.roadTeam?.abbreviatedName ?? game.roadTeam?.name ?? "TBD"}</span>
          {roadEntry?.basic ? (
            <span className="record">
              {roadEntry.basic.gamesWon}-{roadEntry.basic.gamesLost}
            </span>
          ) : null}
          {showScore ? <span className="score">{game.roadScore ?? "-"}</span> : null}
        </div>
      </div>
    </MotionLink>
  );
}

export default function RecentResults() {
  const { seasonCode } = useParams();
  const query = useQuery({
    queryKey: ["games", seasonCode, "played", "desc"],
    queryFn: () => getSeasonGames(seasonCode, { status: "played", order: "desc", limit: 5 }),
  });
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const games = query.data?.games ?? [];
  const standingByClubCode = new Map(
    (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]),
  );

  return (
    <WidgetPanel
      kicker="RESULTS"
      title="Latest scores"
      isLoading={query.isLoading || !(standingsQuery.isSuccess || standingsQuery.isError)}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && games.length === 0}
      emptyMessage="No results yet."
    >
      <motion.div className="games-list" variants={listContainer} initial="hidden" animate="show">
        {games.map((game) => (
          <MatchCard
            key={game.gameCode}
            game={game}
            standingByClubCode={standingByClubCode}
            seasonCode={seasonCode}
            showScore
          />
        ))}
      </motion.div>
    </WidgetPanel>
  );
}
