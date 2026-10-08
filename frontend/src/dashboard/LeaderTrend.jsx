import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getSeasonStandings, getTeamGames } from "../lib/api";
import { teamCode } from "../games/gameUtils";
import { formatPerGame } from "../lib/format";
import { WidgetPanel } from "./Dashboard";

const WIDTH = 320;
const HEIGHT = 90;
const PAD_X = 8;
const PAD_Y = 8;
// Axis labels closer together than this share of the plot's height would touch, so the later one is left out.
const MIN_LABEL_GAP = 12;

// The scale always includes zero, so the baseline is the line between a win and a loss.
function buildTrend(diffs) {
  const min = Math.min(0, ...diffs);
  const max = Math.max(0, ...diffs);
  const range = max - min || 1;
  const usableWidth = WIDTH - PAD_X * 2;
  const usableHeight = HEIGHT - PAD_Y * 2;
  const step = diffs.length > 1 ? usableWidth / (diffs.length - 1) : 0;
  const yOf = (value) => PAD_Y + usableHeight - ((value - min) / range) * usableHeight;

  const points = diffs.map((diff, index) => ({ x: PAD_X + step * index, y: yOf(diff) }));
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const zeroY = yOf(0);
  const areaAttr = `${pointsAttr} ${points[points.length - 1].x},${zeroY} ${points[0].x},${zeroY}`;
  const average = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

  // The labels of the vertical axis: the top and bottom of the scale and zero, each as a share of the plot's height.
  const labels = [{ value: max, at: (yOf(max) / HEIGHT) * 100 }];
  const zeroAt = (zeroY / HEIGHT) * 100;
  if (min < 0 && max > 0) labels.push({ value: 0, at: zeroAt });
  labels.push({ value: min, at: (yOf(min) / HEIGHT) * 100 });
  const yLabels = labels.filter((label, index) => index === 0 || Math.abs(label.at - labels[index - 1].at) >= MIN_LABEL_GAP);

  return {
    pointsAttr,
    areaAttr,
    points,
    zeroY,
    averageY: yOf(average),
    averageAt: (yOf(average) / HEIGHT) * 100,
    yLabels,
  };
}

const signed = (value) => (value > 0 ? `+${formatPerGame(value)}` : formatPerGame(value));
const signedWhole = (value) => (value > 0 ? `+${Math.round(value)}` : String(Math.round(value)));

function pointLabel(row, index) {
  const place = row.isHome ? "vs" : "at";
  return `Game ${index + 1} ${place} ${row.opponentName}: ${row.score}, point differential ${signed(row.diff)}`;
}

export default function LeaderTrend() {
  const { seasonCode } = useParams();

  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const leaderClubCode = standingsQuery.data?.standings.find((entry) => entry.basic?.position === 1)?.clubCode ?? null;
  const leaderName =
    standingsQuery.data?.standings.find((entry) => entry.basic?.position === 1)?.clubName ?? leaderClubCode;

  const gamesQuery = useQuery({
    queryKey: ["team-games", seasonCode, leaderClubCode, "played", "desc", "trend"],
    queryFn: () => getTeamGames(seasonCode, leaderClubCode, { limit: 10, status: "played", order: "desc" }),
    enabled: Boolean(leaderClubCode),
  });

  const games = (gamesQuery.data?.games ?? []).slice().reverse();
  const rows = games
    .filter((game) => game.localScore != null && game.roadScore != null)
    .map((game) => {
      const isHome = game.localTeam?.clubCode === leaderClubCode;
      const own = isHome ? game.localScore : game.roadScore;
      const other = isHome ? game.roadScore : game.localScore;
      const opponent = isHome ? game.roadTeam : game.localTeam;
      return {
        diff: own - other,
        isHome,
        opponentCode: teamCode(opponent),
        opponentName: opponent?.name ?? opponent?.abbreviatedName ?? "TBD",
        score: `${own}-${other}`,
      };
    });
  const diffs = rows.map((row) => row.diff);

  const trend = diffs.length > 1 ? buildTrend(diffs) : null;
  const rawAverage = diffs.length > 0 ? diffs.reduce((sum, d) => sum + d, 0) / diffs.length : null;
  const average = rawAverage != null ? signed(rawAverage) : null;

  return (
    <WidgetPanel
      kicker="FORM"
      title={leaderName ? `${leaderName} · point margin trend` : "League leader's point margin trend"}
      isLoading={standingsQuery.isLoading || (Boolean(leaderClubCode) && gamesQuery.isLoading)}
      isError={standingsQuery.isError || gamesQuery.isError}
      onRetry={() => gamesQuery.refetch()}
      isEmpty={gamesQuery.isSuccess && !trend}
      emptyMessage="Not enough played games yet for a trend."
    >
      {trend ? (
        <div className="leader-trend">
          <div className="leader-trend-row">
            <div className="leader-trend-stat">
              <span className="value">{average}</span>
              <span className="label">Avg point diff, last {diffs.length}</span>
            </div>
            <div className="leader-trend-plot" data-testid="leader-trend-plot">
              <div className="trend-yaxis" aria-hidden="true">
                {trend.yLabels.map((label) => (
                  <span key={label.value} style={{ top: `${label.at}%` }}>
                    {signedWhole(label.value)}
                  </span>
                ))}
              </div>
              <div className="chart-well">
                <svg
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Point differential per game over the last ${diffs.length} played games, averaging ${average}`}
                >
                  <line x1="0" y1={trend.zeroY} x2={WIDTH} y2={trend.zeroY} className="leader-trend-baseline" vectorEffect="non-scaling-stroke" />
                  <motion.polygon
                    points={trend.areaAttr}
                    className="leader-trend-area"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                  <line x1="0" y1={trend.averageY} x2={WIDTH} y2={trend.averageY} className="leader-trend-average" vectorEffect="non-scaling-stroke" />
                  <motion.polyline
                    points={trend.pointsAttr}
                    className="leader-trend-line"
                    vectorEffect="non-scaling-stroke"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                  />
                  {trend.points.map((point, index) => (
                    <motion.circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      className="leader-trend-point"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 + index * 0.04, duration: 0.25 }}
                    >
                      <title>{pointLabel(rows[index], index)}</title>
                    </motion.circle>
                  ))}
                </svg>
                <div className="trend-overlay" aria-hidden="true">
                  <span className={`trend-average-label ${trend.averageAt < 22 ? "is-below" : ""}`} style={{ top: `${trend.averageAt}%` }}>
                    Avg {average}
                  </span>
                </div>
              </div>
              <div className="trend-xaxis" aria-hidden="true">
                {rows.map((row, index) => (
                  <span key={index} className="max-sm:even:hidden" style={{ left: `${(trend.points[index].x / WIDTH) * 100}%` }}>
                    {row.opponentCode}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="leader-trend-caption">
            Each point is one game: how many points {leaderName ?? "they"} won or lost it by, labelled with the opponent.
            Above the solid line is a win, below it a loss, and the dashed line is the average margin of these games.
          </p>
        </div>
      ) : null}
    </WidgetPanel>
  );
}
