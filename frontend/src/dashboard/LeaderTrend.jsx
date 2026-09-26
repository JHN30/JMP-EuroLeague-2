import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getSeasonStandings, getTeamGames } from "../lib/api";
import { formatPerGame } from "../lib/format";
import { WidgetPanel } from "./Dashboard";

const WIDTH = 320;
const HEIGHT = 90;
const PAD_X = 8;
const PAD_Y = 8;

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

function pointLabel(diff, index) {
  const value = diff > 0 ? `+${formatPerGame(diff)}` : formatPerGame(diff);
  return `Game ${index + 1}: point differential ${value}`;
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
  const diffs = games
    .filter((game) => game.localScore != null && game.roadScore != null)
    .map((game) => {
      const isHome = game.localTeam?.clubCode === leaderClubCode;
      return isHome ? game.localScore - game.roadScore : game.roadScore - game.localScore;
    });

  const trend = diffs.length > 1 ? buildTrend(diffs) : null;
  const rawAverage = diffs.length > 0 ? diffs.reduce((sum, d) => sum + d, 0) / diffs.length : null;
  const average = rawAverage != null ? (rawAverage > 0 ? `+${formatPerGame(rawAverage)}` : formatPerGame(rawAverage)) : null;

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
            <div className="chart-well">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`Point differential per game over the last ${diffs.length} played games`}
              >
                <line x1="0" y1={trend.zeroY} x2={WIDTH} y2={trend.zeroY} className="leader-trend-baseline" vectorEffect="non-scaling-stroke" />
                <motion.polygon
                  points={trend.areaAttr}
                  className="leader-trend-area"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                />
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
                    <title>{pointLabel(diffs[index], index)}</title>
                  </motion.circle>
                ))}
              </svg>
            </div>
          </div>
          <p className="leader-trend-caption">
            How many points {leaderName ?? "they"} have won or lost by, game to game. Above the line means winning
            comfortably; below means it's been close or a loss — the higher above, the more dominant the form.
          </p>
        </div>
      ) : null}
    </WidgetPanel>
  );
}
