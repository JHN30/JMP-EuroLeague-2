import { Fragment } from "react";
import { formatCount, formatSignedDiff } from "../lib/format";
import Panel from "../lib/Panel";
import { ClubCell, FormCell, PositionCell, StandingsFooterBadges } from "./standingsCells";

const TREND_WIDTH = 52;
const TREND_HEIGHT = 18;
const TREND_PAD = 3;

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

function TierRow({ tier, columnCount }) {
  return (
    <tr className={`tier-row tier-row-${tier}`}>
      <td colSpan={columnCount}>{TIER_LABELS[tier]}</td>
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
    return { x, y };
  });

  const first = positions[0];
  const last = positions[positions.length - 1];
  const direction = last < first ? "up" : last > first ? "down" : "flat";

  return { points, pointsAttr: points.map((point) => `${point.x},${point.y}`).join(" "), direction };
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
        vectorEffect="non-scaling-stroke"
      />
      {trend.points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="1.6" fill={TREND_COLOR[trend.direction]}>
          <title>{`Round ${index + 1}: position ${positions[index]}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function TieBreakFlag({ entry }) {
  if (!entry.basic || !entry.calendar || entry.basic.position === entry.calendar.position) return null;
  return (
    <span className="tooltip ml-1" data-tip={`Calendar ranking places this team #${entry.calendar.position}`}>
      <span className="badge badge-xs badge-warning">*</span>
    </span>
  );
}

function OverviewTable({ standings, seasonCode, view, showTiers, trendByClub }) {
  const sorted = sortForView(standings, view);
  const tiersActive = showTiers && view === "overall";
  const tiers = tiersActive ? sorted.map((entry) => tierForPosition(entry.basic?.position)) : [];
  const columnCount = 14;

  return (
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
          const displayRank = view === "overall" ? position : index + 1;

          return (
            <Fragment key={entry.clubCode}>
              {showTierHeader ? <TierRow tier={tier} columnCount={columnCount} /> : null}
              <tr>
                <td>
                  <PositionCell position={displayRank} qualified={entry.basic?.qualified} />
                  <TieBreakFlag entry={entry} />
                </td>
                <td>
                  <ClubCell entry={entry} seasonCode={seasonCode} />
                </td>
                <td>{entry.basic?.gamesPlayed ?? "-"}</td>
                <td>{entry.basic?.gamesWon ?? "-"}</td>
                <td>{entry.basic?.gamesLost ?? "-"}</td>
                <td>{entry.basic?.winPercentage ?? "-"}</td>
                <td>{formatCount(entry.basic?.pointsFor)}</td>
                <td>{formatCount(entry.basic?.pointsAgainst)}</td>
                <td className="font-semibold">{formatSignedDiff(entry.basic?.pointsDifference)}</td>
                <td>{entry.basic?.homeRecord ?? "-"}</td>
                <td>{entry.basic?.awayRecord ?? "-"}</td>
                <td>{entry.basic?.lastTenRecord ?? "-"}</td>
                <td>
                  <FormCell form={entry.form} />
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
  );
}

function StreaksFormTable({ standings, seasonCode }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Home</th>
          <th>Away</th>
          <th>L10</th>
          <th>Home L5</th>
          <th>Away L5</th>
          <th>Longest W (season)</th>
          <th>Longest L (season)</th>
          <th>Longest W (any season)</th>
          <th>Longest L (any season)</th>
          <th>Form</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((entry) => (
          <tr key={entry.clubCode}>
            <td>
              <PositionCell position={entry.streaks?.position} qualified={entry.streaks?.qualified} />
            </td>
            <td>
              <ClubCell entry={entry} seasonCode={seasonCode} />
            </td>
            <td>{entry.streaks?.homeRecord ?? "-"}</td>
            <td>{entry.streaks?.awayRecord ?? "-"}</td>
            <td>{entry.streaks?.last10 ?? "-"}</td>
            <td>{entry.streaks?.homeLast5 ?? "-"}</td>
            <td>{entry.streaks?.awayLast5 ?? "-"}</td>
            <td>{entry.streaks?.longestWinStreakCurrentSeason ?? "-"}</td>
            <td>{entry.streaks?.longestLoseStreakCurrentSeason ?? "-"}</td>
            <td>{entry.streaks?.longestWinStreakAnySeason ?? "-"}</td>
            <td>{entry.streaks?.longestLoseStreakAnySeason ?? "-"}</td>
            <td>
              <FormCell form={entry.form} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarginsTable({ standings, seasonCode }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Margin 1-5</th>
          <th>Margin 6-10</th>
          <th>Margin 11-15</th>
          <th>Margin 15+</th>
          <th>Rebounds</th>
          <th>Assists</th>
          <th>Blocks</th>
          <th>3PT</th>
          <th>2PT</th>
          <th>FT</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((entry) => (
          <tr key={entry.clubCode}>
            <td>
              <PositionCell position={entry.margins?.position} qualified={entry.margins?.qualified} />
            </td>
            <td>
              <ClubCell entry={entry} seasonCode={seasonCode} />
            </td>
            <td>{entry.margins?.pointDifference1To5 ?? "-"}</td>
            <td>{entry.margins?.pointDifference6To10 ?? "-"}</td>
            <td>{entry.margins?.pointDifference11To15 ?? "-"}</td>
            <td>{entry.margins?.pointDifferenceMoreThan15 ?? "-"}</td>
            <td>{entry.margins?.rebounds ?? "-"}</td>
            <td>{entry.margins?.assists ?? "-"}</td>
            <td>{entry.margins?.blocks ?? "-"}</td>
            <td>{entry.margins?.threePointers ?? "-"}</td>
            <td>{entry.margins?.twoPointers ?? "-"}</td>
            <td>{entry.margins?.freeThrows ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AheadBehindTable({ standings, seasonCode }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Win%</th>
          <th>Q1 Ahead</th>
          <th>Q1 Behind</th>
          <th>Q1 Tied</th>
          <th>Half Ahead</th>
          <th>Half Behind</th>
          <th>Half Tied</th>
          <th>Q3 Ahead</th>
          <th>Q3 Behind</th>
          <th>Q3 Tied</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((entry) => (
          <tr key={entry.clubCode}>
            <td>
              <PositionCell position={entry.aheadBehind?.position} qualified={entry.aheadBehind?.qualified} />
            </td>
            <td>
              <ClubCell entry={entry} seasonCode={seasonCode} />
            </td>
            <td>{entry.aheadBehind?.winsPercentage ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter1Ahead ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter1Behind ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter1Tied ?? "-"}</td>
            <td>{entry.aheadBehind?.half1Ahead ?? "-"}</td>
            <td>{entry.aheadBehind?.half1Behind ?? "-"}</td>
            <td>{entry.aheadBehind?.half1Tied ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter3Ahead ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter3Behind ?? "-"}</td>
            <td>{entry.aheadBehind?.quarter3Tied ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function StandingsTable({
  standings,
  seasonCode,
  view = "overall",
  showTiers = false,
  trendByClub,
  breakdown = "overview",
}) {
  return (
    <Panel className="p-2">
      <div className="overflow-x-auto overscroll-x-contain">
        {breakdown === "streaks" ? (
          <StreaksFormTable standings={standings} seasonCode={seasonCode} />
        ) : breakdown === "margins" ? (
          <MarginsTable standings={standings} seasonCode={seasonCode} />
        ) : breakdown === "aheadBehind" ? (
          <AheadBehindTable standings={standings} seasonCode={seasonCode} />
        ) : (
          <OverviewTable
            standings={standings}
            seasonCode={seasonCode}
            view={view}
            showTiers={showTiers}
            trendByClub={trendByClub}
          />
        )}
      </div>
      <StandingsFooterBadges />
    </Panel>
  );
}
