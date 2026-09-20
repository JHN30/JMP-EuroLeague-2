import { Fragment } from "react";
import { Link } from "react-router";

const TREND_WIDTH = 52;
const TREND_HEIGHT = 18;
const TREND_PAD = 3;

function formBadge(result, key) {
  const variant = result === "W" ? "badge-success" : result === "L" ? "badge-error" : "badge-ghost";
  return (
    <span key={key} className={`badge badge-xs ${variant}`} title={result ?? "Unknown"}>
      {result ?? "-"}
    </span>
  );
}

function recordWinPct(record) {
  if (typeof record !== "string") return null;
  const match = record.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const total = wins + losses;
  return total > 0 ? wins / total : null;
}

const VIEW_RECORD_FIELD = {
  home: "homeRecord",
  away: "awayRecord",
  last10: "lastTenRecord",
};

function sortForView(standings, view) {
  if (view === "overall") return standings;
  const field = VIEW_RECORD_FIELD[view];
  const ranked = [];
  const unranked = [];
  for (const entry of standings) {
    const pct = recordWinPct(entry.basic?.[field]);
    if (pct === null) {
      unranked.push(entry);
    } else {
      ranked.push({ entry, pct });
    }
  }
  ranked.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    const aDiff = a.entry.basic?.pointsDifference ?? -Infinity;
    const bDiff = b.entry.basic?.pointsDifference ?? -Infinity;
    return bDiff - aDiff;
  });
  return [...ranked.map((r) => r.entry), ...unranked];
}

function tierForPosition(position) {
  if (position == null) return null;
  if (position <= 6) return "postseason";
  if (position <= 10) return "playin";
  return "out";
}

const TIER_LABELS = {
  postseason: "Direct to playoffs",
  playin: "Play-in tournament",
  out: "Out of playoff contention",
};

function TierRow({ tier }) {
  return (
    <tr className={`tier-row tier-row-${tier}`}>
      <td colSpan={14}>{TIER_LABELS[tier]}</td>
    </tr>
  );
}

function buildPositionTrend(positions) {
  if (!positions || positions.length < 2) return null;
  const values = positions.map((p) => -p);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableWidth = TREND_WIDTH - TREND_PAD * 2;
  const usableHeight = TREND_HEIGHT - TREND_PAD * 2;
  const step = usableWidth / (values.length - 1);

  const points = values.map((value, index) => {
    const x = TREND_PAD + step * index;
    const y = TREND_PAD + usableHeight - ((value - min) / range) * usableHeight;
    return `${x},${y}`;
  });

  const first = positions[0];
  const last = positions[positions.length - 1];
  const direction = last < first ? "up" : last > first ? "down" : "flat";

  return { pointsAttr: points.join(" "), direction };
}

const TREND_COLOR = {
  up: "var(--color-success)",
  down: "var(--color-error)",
  flat: "var(--color-base-content)",
};

function TrendCell({ positions }) {
  const trend = buildPositionTrend(positions);
  if (!trend) return <span className="muted">-</span>;
  return (
    <svg
      viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Standings position trend over the last ${positions.length} rounds`}
    >
      <polyline
        points={trend.pointsAttr}
        fill="none"
        stroke={TREND_COLOR[trend.direction]}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StandingsTable({ standings, seasonCode, view = "overall", showTiers = false, trendByClub }) {
  const sorted = sortForView(standings, view);
  const tiersActive = showTiers && view === "overall";
  const tiers = tiersActive ? sorted.map((entry) => tierForPosition(entry.basic?.position)) : [];

  return (
    <div className="panel overflow-x-auto p-2">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>L</th>
            <th>PCT</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>Home</th>
            <th>Away</th>
            <th>L10</th>
            <th>Form</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, index) => {
            const position = entry.basic?.position;
            const tier = tiersActive ? tiers[index] : null;
            const showTierHeader = tiersActive && tier !== null && tier !== tiers[index - 1];

            const tieBreak =
              view === "overall" &&
              entry.basic &&
              entry.calendar &&
              entry.basic.position !== entry.calendar.position;
            const form = [...entry.form].sort((a, b) => a.resultOrdinal - b.resultOrdinal);
            const displayRank = view === "overall" ? position : index + 1;

            return (
              <Fragment key={entry.clubCode}>
                {showTierHeader ? <TierRow tier={tier} /> : null}
                <tr key={entry.clubCode}>
                  <td>
                    <span className={`rank ${displayRank === 1 ? "rank-1" : ""}`}>{displayRank ?? "-"}</span>
                    {tieBreak ? (
                      <span
                        className="tooltip ml-1"
                        data-tip={`Calendar ranking places this team #${entry.calendar.position}`}
                      >
                        <span className="badge badge-xs badge-warning">*</span>
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link link-hover flex items-center gap-2 font-medium">
                      {entry.crestUrl ? (
                        <img
                          src={entry.crestUrl}
                          alt=""
                          className="h-6 w-6 flex-none object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      {entry.clubName ?? entry.clubCode}
                    </Link>
                  </td>
                  <td>{entry.basic?.gamesPlayed ?? "-"}</td>
                  <td>{entry.basic?.gamesWon ?? "-"}</td>
                  <td>{entry.basic?.gamesLost ?? "-"}</td>
                  <td>{entry.basic?.winPercentage ?? "-"}</td>
                  <td>{entry.basic?.pointsFor ?? "-"}</td>
                  <td>{entry.basic?.pointsAgainst ?? "-"}</td>
                  <td className="font-semibold">{entry.basic?.pointsDifference ?? "-"}</td>
                  <td>{entry.basic?.homeRecord ?? "-"}</td>
                  <td>{entry.basic?.awayRecord ?? "-"}</td>
                  <td>{entry.basic?.lastTenRecord ?? "-"}</td>
                  <td>
                    <div className="flex gap-1">{form.map((f) => formBadge(f.result, f.resultOrdinal))}</div>
                  </td>
                  <td className="trend-cell">
                    <TrendCell positions={trendByClub?.get(entry.clubCode)} />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
