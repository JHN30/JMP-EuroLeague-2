export default function CompactMetric({ value, label, isLoading = false, isError = false }) {
  return (
    <div className="kpi-chip">
      <span className="value" title={isError ? "Could not load this value." : undefined}>
        {isLoading ? "–" : isError ? "–" : value}
      </span>
      <span className="label">{label}</span>
    </div>
  );
}
