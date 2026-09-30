import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { listContainer } from "../lib/motion";
import { MatchCard } from "./RecentResults";
import { WidgetPanel } from "./Dashboard";

export default function UpcomingGames() {
  const { seasonCode } = useParams();

  const gamesQuery = useQuery({
    queryKey: ["games", seasonCode, "scheduled", "asc"],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 10 }),
  });
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const games = gamesQuery.data?.games ?? [];
  const standings = standingsQuery.data?.standings ?? [];
  const standingByClubCode = new Map(standings.map((entry) => [entry.clubCode, entry]));
  const standingsReady = standingsQuery.isSuccess || standingsQuery.isError;
  // Every scheduled game already has a slot in the season's published
  // calendar, so an empty result here almost never means "not scheduled
  // yet" - it means there are no games left, which is only reachable once
  // some have actually been played.
  const hasPlayedGames = standings.some((entry) => (entry.basic?.gamesPlayed ?? 0) > 0);

  return (
    <WidgetPanel
      kicker="SCHEDULE"
      title="Upcoming games"
      isLoading={gamesQuery.isLoading || !standingsReady}
      isError={gamesQuery.isError}
      onRetry={() => gamesQuery.refetch()}
      isEmpty={gamesQuery.isSuccess && games.length === 0}
      emptyMessage={hasPlayedGames ? "Season finished." : "No games scheduled yet."}
    >
      <motion.div className="games-row" variants={listContainer} initial="hidden" animate="show">
        {games.map((game) => (
          <MatchCard
            key={game.gameCode}
            game={game}
            standingByClubCode={standingByClubCode}
            seasonCode={seasonCode}
            showScore={false}
          />
        ))}
      </motion.div>
    </WidgetPanel>
  );
}
