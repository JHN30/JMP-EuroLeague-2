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
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 5 }),
  });
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const games = gamesQuery.data?.games ?? [];
  const standingByClubCode = new Map(
    (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]),
  );
  const standingsReady = standingsQuery.isSuccess || standingsQuery.isError;

  return (
    <WidgetPanel
      kicker="SCHEDULE"
      title="Upcoming games"
      isLoading={gamesQuery.isLoading || !standingsReady}
      isError={gamesQuery.isError}
      onRetry={() => gamesQuery.refetch()}
      isEmpty={gamesQuery.isSuccess && games.length === 0}
      emptyMessage="No games scheduled yet."
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
