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

export default function DataCoveragePanel({ coverage, title = "This game's data coverage" }) {
  const items = Array.isArray(coverage?.items) ? coverage.items : [];

  return (
    <Panel as="section" className="coverage-panel p-4" aria-labelledby="data-coverage-heading">
      <p className="eyebrow mb-1">ARCHIVE</p>
      <h2 id="data-coverage-heading" className="panel-title mb-4">{title}</h2>
      {items.length === 0 ? (
        <p role="status" className="muted text-sm">Coverage details are not available for this selection.</p>
      ) : (
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
      )}
    </Panel>
  );
}
