import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import { listContainer, listItem } from "../lib/motion";
import ShortLabel from "../lib/ShortLabel";
import CompetitionContext from "../lib/CompetitionContext";
import { seasonSlug } from "../lib/seasonSlug";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { useSummaryTableStage } from "../lib/useSummaryTableStage";
import { groupLabel, groupStandings, isGroupedTable } from "../standings/standingsGroups";
import { WidgetPanel } from "./Dashboard";
import { LeagueTableSkeleton } from "./HomeSkeleton";

const MotionLink = motion.create(Link);

function StandingRow({ entry, seasonCode }) {
  return (
      <motion.li variants={listItem} className="flex items-center gap-3">
        <span className={`rank ${entry.basic?.position === 1 ? "rank-1" : ""}`}>
          {entry.basic?.position ?? "-"}
        </span>
        <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link-hover flex flex-1 items-center gap-2 font-medium">
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
          {entry.clubTvCode ? (
            <ShortLabel short={entry.clubTvCode} full={entry.clubName ?? entry.clubCode} />
          ) : (
            (entry.clubName ?? entry.clubCode)
          )}
        </Link>
        <span className="muted font-semibold tabular-nums">
          {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
        </span>
      </motion.li>
  );
}

export default function StandingsSnapshot({ height }) {
  const { seasonCode } = useParams();
  const phaseCode = useSummaryTableStage(seasonCode);
  const query = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
  });

  const standings = query.data?.standings ?? [];
  // Grouped tables repeat positions, so each group is its own list under its heading and no overall order is implied.
  const grouped = isGroupedTable(standings);
  const stageName = useSeasonFormat(seasonCode).data?.stages.find((stage) => stage.code === phaseCode)?.name ?? "Regular Season";

  return (
    <WidgetPanel
      kicker="STANDINGS"
      title={grouped ? "Group tables" : "League table"}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && standings.length === 0}
      emptyMessage="Standings not available yet."
      skeleton={<LeagueTableSkeleton />}
      className="lg:h-(--results-height)"
      style={height != null ? { "--results-height": `${height}px` } : undefined}
    >
      {grouped ? (
        <motion.div
          className="min-h-0 flex-1 space-y-4 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-4"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          <p className="muted text-xs">{stageName} · positions are within each group; there is no overall table.</p>
          {groupStandings(standings).map((group) => (
            <section key={group.name ?? "none"} aria-label={groupLabel(group.name)}>
              <h3 className="muted mb-2 text-xs font-semibold tracking-wide uppercase">{groupLabel(group.name)}</h3>
              <ol className="space-y-2">
                {group.standings.map((entry) => <StandingRow key={entry.clubCode} entry={entry} seasonCode={seasonCode} />)}
              </ol>
            </section>
          ))}
        </motion.div>
      ) : (
        <motion.ol
          className="min-h-0 flex-1 space-y-2 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-4"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {standings.map((entry) => <StandingRow key={entry.clubCode} entry={entry} seasonCode={seasonCode} />)}
        </motion.ol>
      )}
      {seasonSlug(seasonCode) !== "2021" && <CompetitionContext seasonCode={seasonCode} phaseCode={phaseCode} roundNumber={query.data?.round} className="mt-4 mb-4" />}
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
