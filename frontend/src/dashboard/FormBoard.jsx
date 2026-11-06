import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { getPhaseResults, getSeasonStandings } from "../lib/api";
import { listContainer, listItem } from "../lib/motion";
import ShortLabel from "../lib/ShortLabel";
import { useSummaryTableStage } from "../lib/useSummaryTableStage";
import { resultsByClub } from "../standings/breakdownUtils";
import { ResultsRibbon } from "../standings/StreaksFormView";
import { WidgetPanel } from "./Dashboard";

const LAST = 5;
// Phones list this many clubs before "Show more".
const VISIBLE_ON_MOBILE = 8;
const LIST_ID = "form-board-list";

// Every club of the summary table with its last five results, the clubs with the most wins in them first, then by table
// position (a grouped table repeats positions, so its ties fall back to the club's wins in the stage).
export default function FormBoard() {
  const { seasonCode } = useParams();
  const [showAll, setShowAll] = useState(false);
  const phaseCode = useSummaryTableStage(seasonCode);
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, phaseCode],
    queryFn: () => getSeasonStandings(seasonCode, phaseCode),
  });
  // The Standings page's request for the same stage, so the two share the cache.
  const resultsQuery = useQuery({
    queryKey: ["phase-results", seasonCode, phaseCode],
    queryFn: () => getPhaseResults(seasonCode, phaseCode),
  });

  const byClub = resultsByClub(resultsQuery.data);
  const rows = (standingsQuery.data?.standings ?? [])
    .map((entry) => {
      const games = (byClub.get(entry.clubCode) ?? []).slice(-LAST);
      return { entry, games, wins: games.filter((game) => game.pointsFor > game.pointsAgainst).length };
    })
    .filter((row) => row.games.length > 0)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        (a.entry.basic?.position ?? Infinity) - (b.entry.basic?.position ?? Infinity) ||
        (b.entry.basic?.gamesWon ?? 0) - (a.entry.basic?.gamesWon ?? 0),
    );
  const hiddenOnMobile = Math.max(0, rows.length - VISIBLE_ON_MOBILE);

  return (
    <WidgetPanel
      kicker="FORM"
      compact
      title={`Last ${LAST} games`}
      isLoading={standingsQuery.isLoading || resultsQuery.isLoading}
      isError={standingsQuery.isError || resultsQuery.isError}
      onRetry={() => { standingsQuery.refetch(); resultsQuery.refetch(); }}
      isEmpty={standingsQuery.isSuccess && resultsQuery.isSuccess && rows.length === 0}
      emptyMessage="No results yet."
      skeleton={
        <div className="form-board" aria-hidden="true">
          {Array.from({ length: VISIBLE_ON_MOBILE }, (_, index) => <div key={index} className="skeleton h-7" />)}
        </div>
      }
    >
      <motion.ol id={LIST_ID} className="form-board" aria-label={`Clubs by wins in their last ${LAST} games`} variants={listContainer} initial="hidden" animate="show">
        {rows.map(({ entry, games, wins }, index) => {
          const name = entry.clubName ?? entry.clubCode;
          return (
            <motion.li key={entry.clubCode} variants={listItem} className={`form-board-row${index >= VISIBLE_ON_MOBILE && !showAll ? " form-board-extra" : ""}`}>
              <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link-hover flex min-w-0 flex-1 items-center gap-2 font-medium">
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
                <span className="truncate">{entry.clubTvCode ? <ShortLabel short={entry.clubTvCode} full={name} /> : name}</span>
              </Link>
              <ResultsRibbon games={games} clubName={name} />
              <span className="muted w-8 flex-none text-right font-semibold tabular-nums">
                {wins}-{games.length - wins}
              </span>
            </motion.li>
          );
        })}
      </motion.ol>
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
