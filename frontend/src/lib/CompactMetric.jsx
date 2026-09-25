export default function CompactMetric({ value, label, name, isLoading = false, isError = false, imageUrl, imageAlt = "" }) {
  const displayValue = isLoading ? "–" : isError ? "–" : value;
  const valueTitle = isError ? "Could not load this value." : undefined;

  return (
    <div className="kpi-chip">
      <div className="kpi-chip-body">
        {name ? (
          <>
            <span className="label">{label}</span>
            <span className="name">{name}</span>
            <span className="value" title={valueTitle}>
              {displayValue}
            </span>
          </>
        ) : (
          <>
            <span className="value" title={valueTitle}>
              {displayValue}
            </span>
            <span className="label">{label}</span>
          </>
        )}
      </div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="kpi-chip-image"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
