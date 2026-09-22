import Panel from "./Panel";

const STATUS = {
  available: { icon: "OK", label: "Available", badge: "badge-success" },
  partial: { icon: "Some", label: "Partial", badge: "badge-warning" },
  incomplete: { icon: "!", label: "Incomplete", badge: "badge-warning" },
  unavailable: { icon: "No", label: "Unavailable", badge: "badge-error" },
  notYetApplicable: { icon: "Later", label: "Not yet applicable", badge: "badge-info" },
};

function coverageDetail({ availableCount, applicableCount }) {
  if (applicableCount === 0) return "No completed games yet";
  return `${availableCount} of ${applicableCount} applicable records`;
}

export default function DataCoveragePanel({ coverage, title = "This game's data coverage", full = false }) {
  const items = Array.isArray(coverage?.items) ? coverage.items : [];
  const availableCount = items.filter((item) => item.status === "available").length;
  const degraded = items.filter((item) => item.status !== "available" && item.status !== "notYetApplicable");

  return (
    <Panel as="section" className="coverage-panel p-4" aria-labelledby="data-coverage-heading">
      <p className="eyebrow mb-1">ARCHIVE</p>
      <div className={full ? "mb-2 flex flex-wrap items-center gap-2" : "mb-4 flex flex-wrap items-center gap-2"}>
        <h2 id="data-coverage-heading" className={full ? "panel-title text-2xl" : "panel-title"}>{title}</h2>
        {full && items.length > 0 ? (
          <span className="badge badge-outline">{availableCount} of {items.length} fully available</span>
        ) : null}
      </div>
      {full ? (
        <p className="muted mb-4 text-sm">
          Missing source data is shown explicitly and is not treated as a page error.
        </p>
      ) : null}
      {items.length === 0 ? (
        <p role="status" className="muted text-sm">Coverage details are not available for this selection.</p>
      ) : (
        <>
          <div className="coverage-grid">
            {items.map((item) => {
              const status = STATUS[item.status] ?? STATUS.unavailable;
              return (
                <article key={item.key} className={`coverage-item coverage-${item.status}`}>
                  <span className="coverage-icon" aria-hidden="true">{status.icon}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold" title={item.label}>{item.label}</h3>
                    <p className="muted text-xs">{coverageDetail(item)}</p>
                  </div>
                  <span className={`badge badge-sm ${status.badge}`}>{status.label}</span>
                </article>
              );
            })}
          </div>
          {full && degraded.length > 0 ? (
            <div role="alert" className="alert alert-warning alert-soft mt-4">
              <span>
                Not fully available yet: {degraded.map((item) => item.label).join(", ")}.
              </span>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
