import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { listContainer } from "../lib/motion";
import { seasonStatusText } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { MatchCard } from "./RecentResults";
import { WidgetPanel } from "./Dashboard";
import { UpcomingGamesSkeleton, VISIBLE_ON_MOBILE } from "./HomeSkeleton";

const LIST_ID = "upcoming-games-list";

export default function UpcomingGames() {
  const { seasonCode } = useParams();
  const [showAll, setShowAll] = useState(false);

  const gamesQuery = useQuery({
    queryKey: ["games", seasonCode, "scheduled", "asc"],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 10 }),
  });
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const games = gamesQuery.data?.games ?? [];
  const hiddenOnMobile = Math.max(0, games.length - VISIBLE_ON_MOBILE);
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
      compact
      title="Upcoming games"
      isLoading={gamesQuery.isLoading || !standingsReady || formatQuery.isLoading}
      isError={gamesQuery.isError || formatQuery.isError}
      onRetry={() => { gamesQuery.refetch(); formatQuery.refetch(); }}
      isEmpty={gamesQuery.isSuccess && games.length === 0}
      emptyMessage={emptyMessage}
      skeleton={<UpcomingGamesSkeleton />}
    >
      {/* Below sm the first five stack and the rest wait behind a button, as in Latest scores; from sm all show in a grid. */}
      <motion.div
        id={LIST_ID}
        className="games-row"
        role="group"
        aria-label="Upcoming games"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {games.map((game, index) => (
          <MatchCard
            key={game.gameCode}
            game={game}
            standingByClubCode={standingByClubCode}
            seasonCode={seasonCode}
            showScore={false}
            className={index >= VISIBLE_ON_MOBILE && !showAll ? "match-card-extra" : ""}
          />
        ))}
      </motion.div>
      {hiddenOnMobile > 0 ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-3 w-full sm:hidden"
          aria-expanded={showAll}
          aria-controls={LIST_ID}
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? "Show fewer" : `Show ${hiddenOnMobile} more`}
        </button>
      ) : null}
    </WidgetPanel>
  );
}
