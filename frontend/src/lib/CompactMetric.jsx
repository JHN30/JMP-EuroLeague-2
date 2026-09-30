// `tone` colours the value ("positive" green, "negative" red) for good or bad news; pair it with an arrow or sign
// in the value so the meaning never depends on colour alone.
export default function CompactMetric({ value, label, name, isLoading = false, isError = false, imageUrl, imageAlt = "", tone }) {
  const displayValue = isLoading ? "–" : isError ? "–" : value;
  const valueClass = tone && !isLoading && !isError ? `value tone-${tone}` : "value";
  const valueTitle = isError ? "Could not load this value." : undefined;

  return (
    <div className="kpi-chip">
      <div className="kpi-chip-body">
        {name ? (
          <>
            <span className="label">{label}</span>
            <span className="name">{name}</span>
            <span className={valueClass} title={valueTitle}>
              {displayValue}
            </span>
          </>
        ) : (
          <>
            <span className={valueClass} title={valueTitle}>
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
