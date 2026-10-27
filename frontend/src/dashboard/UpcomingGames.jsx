import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { listContainer } from "../lib/motion";
import { seasonStatusText } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { useMediaQuery } from "../lib/useMediaQuery";
import { MatchCard } from "./RecentResults";
import { WidgetPanel } from "./Dashboard";
import { UpcomingGamesSkeleton } from "./HomeSkeleton";

export default function UpcomingGames() {
  const { seasonCode } = useParams();
  const isSwipeRow = useMediaQuery("not (min-width: 40rem)");

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
  // The format knows better than the standings: a season can be between stages, or cancelled, with nothing scheduled.
  const formatQuery = useSeasonFormat(seasonCode);
  const format = formatQuery.data ?? null;
  const emptyMessage = !format
    ? "Season status is unavailable."
    : format.status === "completed"
      ? "Season finished."
      : format.status === "cancelled"
        ? "Season cancelled."
        : seasonStatusText(format, { hasScheduledGame: false });

  return (
    <WidgetPanel
      kicker="SCHEDULE"
      title="Upcoming games"
      isLoading={gamesQuery.isLoading || !standingsReady || formatQuery.isLoading}
      isError={gamesQuery.isError || formatQuery.isError}
      onRetry={() => { gamesQuery.refetch(); formatQuery.refetch(); }}
      isEmpty={gamesQuery.isSuccess && games.length === 0}
      emptyMessage={emptyMessage}
      skeleton={<UpcomingGamesSkeleton />}
    >
      <motion.div
        className="games-row"
        role="group"
        aria-label="Upcoming games"
        tabIndex={isSwipeRow ? 0 : undefined}
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
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
