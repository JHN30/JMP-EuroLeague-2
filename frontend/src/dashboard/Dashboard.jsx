import GamesSnapshot from "./GamesSnapshot";
import LeadersPanel from "./LeadersPanel";
import StandingsSnapshot from "./StandingsSnapshot";

export function WidgetPanel({ title, isLoading, isError, onRetry, isEmpty, emptyMessage, children }) {
  return (
    <section className="panel p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
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
    <div className="grid gap-6 md:grid-cols-2">
      <StandingsSnapshot />
      <GamesSnapshot />
      <LeadersPanel />
    </div>
  );
}
