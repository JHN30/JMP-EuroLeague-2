function formatKpiNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function LeaderboardKpiStrip({ entries, offset, valueOf, nameOf, subtitleOf, metricLabel }) {
  const values = entries
    .map((entry) => valueOf(entry))
    .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

  const leader = offset === 0 ? entries[0] : undefined;
  const leaderValue = leader ? valueOf(leader) : null;
  const runnerUp = offset === 0 ? entries[1] : undefined;
  const runnerUpValue = runnerUp ? valueOf(runnerUp) : null;
  const pageAverage = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  const showLeader = leader !== undefined && leaderValue !== null && leaderValue !== undefined;
  const showGap =
    showLeader && runnerUp !== undefined && runnerUpValue !== null && runnerUpValue !== undefined;

  if (!showLeader && !showGap && pageAverage === null) return null;

  return (
    <div className="kpi-strip mb-4">
      {showLeader ? (
        <div className="kpi-chip">
          <span className="value">{formatKpiNumber(leaderValue)}</span>
          <span className="label">
            Leader &middot; {nameOf(leader)}
            {subtitleOf ? ` (${subtitleOf(leader)})` : ""}
          </span>
        </div>
      ) : null}
      {showGap ? (
        <div className="kpi-chip">
          <span className="value">{formatKpiNumber(leaderValue - runnerUpValue)}</span>
          <span className="label">Gap to 2nd &middot; {metricLabel}</span>
        </div>
      ) : null}
      {pageAverage !== null ? (
        <div className="kpi-chip">
          <span className="value">{formatKpiNumber(pageAverage)}</span>
          <span className="label">Page average &middot; {metricLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
