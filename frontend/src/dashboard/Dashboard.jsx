import AsyncState from "../lib/AsyncState";
import Panel from "../lib/Panel";
import FormWatch from "./FormWatch";
import GamesSnapshot from "./GamesSnapshot";
import KpiStrip from "./KpiStrip";
import LeaderTrend from "./LeaderTrend";
import LeadersPanel from "./LeadersPanel";
import Spotlight from "./Spotlight";
import StandingsSnapshot from "./StandingsSnapshot";

export function WidgetPanel({ title, isLoading, isError, onRetry, isEmpty, emptyMessage, children }) {
  const status = isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready";
  return (
    <Panel as="section" className="p-6">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
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
  return (
    <div className="flex flex-col gap-6">
      <h1 className="mb-6 text-2xl font-semibold">Home</h1>
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
    </div>
  );
}
