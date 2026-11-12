import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Link, useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import { listContainer, listItem } from "../lib/motion";
import ShortLabel from "../lib/ShortLabel";
import CompetitionContext from "../lib/CompetitionContext";
import { seasonSlug } from "../lib/seasonSlug";
import { tableTiers, tierForPosition } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import { useSummaryTableStage } from "../lib/useSummaryTableStage";
import { groupLabel, groupStandings, isGroupedTable } from "../standings/standingsGroups";
import { WidgetPanel } from "./Dashboard";
import { LeagueTableSkeleton } from "./HomeSkeleton";

const MotionLink = m.create(Link);

// The line under the last place of a tier, in the Standings page's tier colours, with its meaning for screen readers.
const LINE = { postseason: "border-success/70", playin: "border-warning/70" };

// Each row's tier and whether a qualification line runs under it: after the last row of a qualifying tier, unless it is the
// table's last row. No lines when the season's format gives none (unknown, cancelled, or rules this table cannot place).
function tierLines(standings, tiers) {
  const rowTiers = standings.map((entry) => tierForPosition(entry.basic?.position, tiers));
  return rowTiers.map((tier, index) => (LINE[tier] && index < rowTiers.length - 1 && rowTiers[index + 1] !== tier ? tier : null));
}

function StandingRow({ entry, seasonCode, line = null, labels }) {
  return (
      <m.li variants={listItem} className={`flex items-center gap-3 ${line ? `border-b-2 pb-1 ${LINE[line]}` : ""}`}>
        <span className={`rank ${entry.basic?.position === 1 ? "rank-1" : ""}`}>
          {entry.basic?.position ?? "-"}
        </span>
        <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link-hover flex flex-1 items-center gap-2 font-medium">
          {entry.crestUrl ? (
            <img
              src={entry.crestUrl}
              alt=""
              className="h-6 w-6 flex-none object-contain"
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
        {line ? <span className="sr-only">Last {labels[line]} place</span> : null}
      </m.li>
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
  const format = useSeasonFormat(seasonCode).data;
  const stage = format?.stages.find((entry) => entry.code === phaseCode);
  const stageName = stage?.name ?? "Regular Season";
  // The season's own qualification lines: Playoffs and Play-In now, the top eight or the Top 16 places in older formats, and
  // per group in a grouped table.
  const tiers = tableTiers(format, phaseCode, grouped ? "group" : "table");
  const labels = { postseason: { TS: "Top 16", FF: "Final Four" }[stage?.qualification[0]?.to] ?? "Playoff", playin: "Play-In" };
  const shownTiers = Object.keys(LINE).filter((tier) => tiers?.some((entry) => entry.tier === tier));

  return (
    <WidgetPanel
      kicker="STANDINGS"
      compact
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
        <m.div
          className="min-h-0 flex-1 space-y-4 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-4"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          <p className="muted text-xs">{stageName} · positions are within each group; there is no overall table.</p>
          {groupStandings(standings).map((group) => (
            <section key={group.name ?? "none"} aria-label={groupLabel(group.name)}>
              <h3 className="muted mb-2 text-xs font-semibold tracking-wide uppercase">{groupLabel(group.name)}</h3>
              <ol className="space-y-1">
                {tierLines(group.standings, tiers).map((line, index) => (
                  <StandingRow key={group.standings[index].clubCode} entry={group.standings[index]} seasonCode={seasonCode} line={line} labels={labels} />
                ))}
              </ol>
            </section>
          ))}
        </m.div>
      ) : (
        <m.ol
          className="min-h-0 flex-1 space-y-1 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-4"
          variants={listContainer}
          initial="hidden"
          animate="show"
        >
          {tierLines(standings, tiers).map((line, index) => (
            <StandingRow key={standings[index].clubCode} entry={standings[index]} seasonCode={seasonCode} line={line} labels={labels} />
          ))}
        </m.ol>
      )}
      {shownTiers.length > 0 ? (
        <p className="muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-hidden="true">
          {shownTiers.map((tier) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span className={`w-4 border-b-2 ${LINE[tier]}`} />
              {labels[tier]} places
            </span>
          ))}
        </p>
      ) : null}
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
