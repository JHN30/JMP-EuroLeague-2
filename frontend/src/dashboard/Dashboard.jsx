import AsyncState from "../lib/AsyncState";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import FormWatch from "./FormWatch";
import GamesSnapshot from "./GamesSnapshot";
import KpiStrip from "./KpiStrip";
import LeaderTrend from "./LeaderTrend";
import LeadersPanel from "./LeadersPanel";
import SeasonCoverage from "./SeasonCoverage";
import Spotlight from "./Spotlight";
import StandingsSnapshot from "./StandingsSnapshot";

export function WidgetPanel({ kicker, title, isLoading, isError, onRetry, isEmpty, emptyMessage, children }) {
  const status = isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready";
  return (
    <Panel as="section" className="p-6">
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

export default function Dashboard() {
  useDocumentTitle("Home");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="OVERVIEW" title="Home" />
      <KpiStrip />
      <Spotlight />
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 [&>*:last-child]:flex-1">
          <StandingsSnapshot />
        </div>
        <div className="flex flex-col gap-6 [&>*:last-child]:flex-1">
          <GamesSnapshot />
        </div>
        <div className="flex flex-col gap-6 [&>*:last-child]:flex-1">
          <LeadersPanel />
          <FormWatch />
        </div>
      </div>
      <LeaderTrend />
      <SeasonCoverage />
    </div>
  );
}
