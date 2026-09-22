import { formatPerGame } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";

const WIDTH = 900;
const HEIGHT = 140;
const PAD_X = 12;
const PAD_Y = 12;

function buildTrend(diffs) {
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  const range = max - min || 1;
  const usableWidth = WIDTH - PAD_X * 2;
  const usableHeight = HEIGHT - PAD_Y * 2;
  const step = diffs.length > 1 ? usableWidth / (diffs.length - 1) : 0;

  const points = diffs.map((diff, index) => {
    const x = PAD_X + step * index;
    const y = PAD_Y + usableHeight - ((diff - min) / range) * usableHeight;
    return { x, y };
  });

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaAttr = `${pointsAttr} ${points[points.length - 1].x},${HEIGHT} ${points[0].x},${HEIGHT}`;
  const zeroY = PAD_Y + usableHeight - ((0 - min) / range) * usableHeight;

  return { pointsAttr, areaAttr, points, zeroY: Math.max(0, Math.min(HEIGHT, zeroY)) };
}

function pointLabel(diff, game, index) {
  const value = diff > 0 ? `+${formatPerGame(diff)}` : formatPerGame(diff);
  const round = game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : `Game ${index + 1}`);
  return `${round}: point differential ${value}`;
}

export default function TeamTrendChart({ games, clubCode }) {
  const played = games
    .filter((game) => game.played && game.localScore != null && game.roadScore != null)
    .slice(-10);
  const diffs = played.map((game) => {
    const isHome = game.localTeam?.clubCode === clubCode;
    return isHome ? game.localScore - game.roadScore : game.roadScore - game.localScore;
  });

  if (diffs.length < 2) {
    return (
      <Panel as="section" className="p-6">
        <PanelHeader kicker="TREND" title={`Point differential · last ${diffs.length || ""} games`} />
        <p className="muted">Not enough played games yet for a trend.</p>
      </Panel>
    );
  }

  const trend = buildTrend(diffs);
  const rawAverage = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  const average = rawAverage > 0 ? `+${formatPerGame(rawAverage)}` : formatPerGame(rawAverage);

  return (
    <Panel as="section" className="p-6">
      <PanelHeader
        kicker="TREND"
        title={`Point differential · last ${diffs.length} games`}
        trailing={
          <div className="leader-trend-stat text-right">
            <span className="value">{average}</span>
            <span className="label">Avg diff</span>
          </div>
        }
      />
      <div className="chart-well">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Point differential per game over the last ${diffs.length} played games`}
          className="block h-auto w-full"
        >
          <line x1="0" y1={trend.zeroY} x2={WIDTH} y2={trend.zeroY} className="leader-trend-baseline" vectorEffect="non-scaling-stroke" />
          <polygon points={trend.areaAttr} className="leader-trend-area" />
          <polyline points={trend.pointsAttr} className="leader-trend-line" vectorEffect="non-scaling-stroke" />
          {trend.points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="4" className="leader-trend-point">
              <title>{pointLabel(diffs[index], played[index], index)}</title>
            </circle>
          ))}
        </svg>
      </div>
    </Panel>
  );
}
