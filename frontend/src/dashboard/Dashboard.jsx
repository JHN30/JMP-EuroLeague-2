import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { getRounds, getSeasonGames, getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { formatSeasonLabel } from "../lib/format";
import { sectionContainer, sectionItem } from "../lib/motion";
import { hasLoadingIssues, LOADING_ISSUES_NOTE, seasonStatusText, stageRoundLabel } from "../lib/seasonFormat";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import KpiStrip from "./KpiStrip";
import LeadersPanel from "./LeadersPanel";
import LeaderTrend from "./LeaderTrend";
import RecentResults from "./RecentResults";
import StandingsSnapshot from "./StandingsSnapshot";
import { roundStatus } from "./roundStatus";
import UpcomingGames from "./UpcomingGames";

export function WidgetPanel({ kicker, title, isLoading, isError, onRetry, isEmpty, emptyMessage, className = "", style, children }) {
  const status = isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready";
  return (
    <Panel as="section" className={`flex flex-col p-4 sm:p-5 lg:p-6 ${className}`} style={style}>
      <PanelHeader kicker={kicker} title={title} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <AsyncState
            status={status}
            message={isError ? "Could not load this section." : emptyMessage}
            onRetry={onRetry}
            errorClassName=""
            compact
          >
            {children}
          </AsyncState>
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}

function useMeasuredHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, height];
}

// The current time, refreshed every minute, so the header's round line moves on ("in 3 days", "tomorrow", "under way") without a reload.
function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export default function Dashboard() {
  useDocumentTitle("Home", "The current EuroLeague round: results, upcoming games, standings and league leaders.");
  const { seasonCode } = useParams();
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const round = standingsQuery.data?.round ?? null;
  const [resultsRef, resultsHeight] = useMeasuredHeight();

  // The current round is the round of the next unplayed game (the first of Upcoming games' own query); its games, under the key the
  // Compare page uses for the same request, say where it stands.
  const now = useNow(60_000);
  const nextQuery = useQuery({
    queryKey: ["games", seasonCode, "scheduled", "asc"],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 10 }),
  });
  const nextGame = nextQuery.data?.games?.[0] ?? null;
  const roundQuery = useQuery({
    queryKey: ["fixtures", seasonCode, nextGame?.phaseCode, nextGame?.roundNumber],
    queryFn: () => getSeasonGames(seasonCode, { phase: nextGame.phaseCode, round: nextGame.roundNumber, limit: 100, order: "asc" }),
    enabled: Boolean(nextGame?.phaseCode) && nextGame?.roundNumber != null,
  });
  const hasPlayed = (standingsQuery.data?.standings ?? []).some((entry) => (entry.basic?.gamesPlayed ?? 0) > 0);

  // The season's format says which stage the next round belongs to and, when no game is scheduled, whether the season finished, was
  // cancelled or is waiting for its next stage's fixtures: an empty schedule alone cannot prove the season is over.
  const formatQuery = useSeasonFormat(seasonCode);
  const format = formatQuery.data ?? null;
  const nextStage = format?.stages.find((stage) => stage.code === nextGame?.phaseCode) ?? null;
  // Outside the regular season a round's own name ("Game 2", "Semifinal") comes from the phase's rounds, the same request as Games.
  const stageRoundsQuery = useQuery({
    queryKey: ["rounds", seasonCode, nextGame?.phaseCode],
    queryFn: () => getRounds(seasonCode, nextGame.phaseCode),
    enabled: Boolean(nextGame?.phaseCode) && nextGame?.phaseCode !== "RS",
  });
  const stageRoundName = stageRoundsQuery.data?.rounds?.find((entry) => entry.number === nextGame?.roundNumber)?.name ?? null;

  let title = round != null ? `Round ${round}` : "Season overview";
  let statusLine = null;
  if (nextQuery.isPending || (nextGame && roundQuery.isPending)) {
    // Until the games arrive the latest played round would be the wrong one to name.
    title = "Season overview";
  } else if (nextGame && roundQuery.isSuccess) {
    const roundName = nextGame.phaseCode === "RS" ? (nextGame.roundName ?? `Round ${nextGame.roundNumber}`) : (stageRoundName ?? nextGame.roundName);
    title = nextStage ? stageRoundLabel(nextStage, roundName) : (nextGame.roundName ?? `Round ${nextGame.roundNumber}`);
    statusLine = roundStatus(roundQuery.data.games ?? [], now)?.line ?? null;
  } else if (nextQuery.isSuccess && !nextGame) {
    title = "Season overview";
    if (format) {
      statusLine = seasonStatusText(format, { hasScheduledGame: false });
    } else if (formatQuery.isError && hasPlayed) {
      statusLine = "Season status is unavailable.";
    }
  }
  if (hasLoadingIssues(format)) statusLine = statusLine ? `${statusLine} ${LOADING_ISSUES_NOTE}` : LOADING_ISSUES_NOTE;

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.div variants={sectionItem}>
        <PageHeader
          stacked
          kicker={formatSeasonLabel(seasonCode)}
          title={title}
          description={statusLine ? <p className="muted mt-1 text-sm">{statusLine}</p> : null}
        />
      </motion.div>
      <motion.div variants={sectionItem}>
        <UpcomingGames />
      </motion.div>
      <motion.div variants={sectionItem} className="grid items-start gap-6 lg:grid-cols-2">
        <StandingsSnapshot height={resultsHeight} />
        <div ref={resultsRef}>
          <RecentResults />
        </div>
      </motion.div>
      <motion.div variants={sectionItem}>
        <KpiStrip />
      </motion.div>
      <motion.div variants={sectionItem}>
        <LeadersPanel />
      </motion.div>
      <motion.div variants={sectionItem}>
        <LeaderTrend />
      </motion.div>
    </motion.div>
  );
}
