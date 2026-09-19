import FormWatch from "./FormWatch";
import GamesSnapshot from "./GamesSnapshot";
import KpiStrip from "./KpiStrip";
import LeaderTrend from "./LeaderTrend";
import LeadersPanel from "./LeadersPanel";
import Spotlight from "./Spotlight";
import StandingsSnapshot from "./StandingsSnapshot";

export function WidgetPanel({ title, isLoading, isError, onRetry, isEmpty, emptyMessage, children }) {
  return (
    <section className="panel p-6">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <span className="loading loading-spinner text-primary" />
        </div>
      ) : isError ? (
        <div role="alert" className="alert alert-error">
          <span>Could not load this section.</span>
          {onRetry ? (
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : isEmpty ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        children
      )}
    </section>
  );
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
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
