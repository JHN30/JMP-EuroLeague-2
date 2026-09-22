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
    <HeaderStats className="mb-4">
      {showLeader ? (
        <CompactMetric
          value={formatKpiNumber(leaderValue)}
          label={
            <>
            Leader &middot; {nameOf(leader)}
            {subtitleOf ? ` (${subtitleOf(leader)})` : ""}
            </>
          }
        />
      ) : null}
      {showGap ? (
        <CompactMetric
          value={formatKpiNumber(leaderValue - runnerUpValue)}
          label={<>Gap to 2nd &middot; {metricLabel}</>}
        />
      ) : null}
      {pageAverage !== null ? (
        <CompactMetric
          value={formatKpiNumber(pageAverage)}
          label={<>Page average &middot; {metricLabel}</>}
        />
      ) : null}
    </HeaderStats>
  );
}
import CompactMetric from "../lib/CompactMetric";
import HeaderStats from "../lib/HeaderStats";
