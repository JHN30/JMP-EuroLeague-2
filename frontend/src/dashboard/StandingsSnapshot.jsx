import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import { listContainer, listItem } from "../lib/motion";
import { WidgetPanel } from "./Dashboard";

const MotionLink = motion.create(Link);

export default function StandingsSnapshot({ height }) {
  const { seasonCode } = useParams();
  const query = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });

  const standings = query.data?.standings ?? [];

  return (
    <WidgetPanel
      kicker="STANDINGS"
      title="League table"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && standings.length === 0}
      emptyMessage="Standings not available yet."
      style={height != null ? { height: `${height}px` } : undefined}
    >
      <motion.ol
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-4"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {standings.map((entry) => (
          <motion.li key={entry.clubCode} variants={listItem} className="flex items-center gap-3">
            <span className={`rank ${entry.basic?.position === 1 ? "rank-1" : ""}`}>
              {entry.basic?.position ?? "-"}
            </span>
            <span className="flex flex-1 items-center gap-2 font-medium">
              {entry.crestUrl ? (
                <img
                  src={entry.crestUrl}
                  alt=""
                  className="h-8 w-8 flex-none object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              {entry.clubName ?? entry.clubCode}
            </span>
            <span className="muted font-semibold tabular-nums">
              {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
            </span>
          </motion.li>
        ))}
      </motion.ol>
      <MotionLink
        to={`/${seasonCode}/standings`}
        className="panel-link mt-4 inline-block"
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        View full standings &rarr;
      </MotionLink>
    </WidgetPanel>
  );
}
