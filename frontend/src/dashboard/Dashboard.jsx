import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { formatSeasonLabel } from "../lib/format";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import KpiStrip from "./KpiStrip";
import LeadersPanel from "./LeadersPanel";
import LeaderTrend from "./LeaderTrend";
import RecentResults from "./RecentResults";
import StandingsSnapshot from "./StandingsSnapshot";
import UpcomingGames from "./UpcomingGames";

export function WidgetPanel({ kicker, title, isLoading, isError, onRetry, isEmpty, emptyMessage, style, children }) {
  const status = isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready";
  return (
    <Panel as="section" className="flex flex-col p-6" style={style}>
      <PanelHeader kicker={kicker} title={title} />
      <AsyncState
        status={status}
        message={isError ? "Could not load this section." : emptyMessage}
        onRetry={onRetry}
        errorClassName=""
        compact
      >
        {children}
      </AsyncState>
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

export default function Dashboard() {
  useDocumentTitle("Home");
  const { seasonCode } = useParams();
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const round = standingsQuery.data?.round ?? null;
  const [resultsRef, resultsHeight] = useMeasuredHeight();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker={formatSeasonLabel(seasonCode)}
        title={round != null ? `Round ${round}` : "Season overview"}
      />
      <UpcomingGames />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <StandingsSnapshot height={resultsHeight} />
        <div ref={resultsRef}>
          <RecentResults />
        </div>
      </div>
      <KpiStrip />
      <LeadersPanel />
      <LeaderTrend />
    </div>
  );
}
