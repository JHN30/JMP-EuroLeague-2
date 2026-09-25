import { useEffect, useRef, useState } from "react";
import { EFFICIENCY_RAMP_INK, efficiencyRamp } from "./chartHelpers";
import { classifyShotZone, summarizeZones } from "./shotZones";

// FIBA half-court, basket-origin coordinates matching the source shot
// coordinates directly (no transform needed). SVG y increases away from the
// baseline, so the hoop renders near the top of the viewBox and the court
// opens downward toward half-court.
const VIEW_BOX = "-790 -197.5 1580 1480";
const KEY_HALF_WIDTH = 245;
const KEY_DEPTH = 580;
const RESTRICTED_AREA_RADIUS = 125;
const THREE_POINT_RADIUS = 675;
const THREE_POINT_SIDELINE_X = 660;
const THREE_POINT_SIDELINE_Y = Math.sqrt(THREE_POINT_RADIUS ** 2 - THREE_POINT_SIDELINE_X ** 2);
const HALF_COURT_Y = 1282.5;

function arcPath(radius, fromAngle, toAngle) {
  const start = { x: radius * Math.cos(fromAngle), y: radius * Math.sin(fromAngle) };
  const end = { x: radius * Math.cos(toAngle), y: radius * Math.sin(toAngle) };
  const largeArc = Math.abs(toAngle - fromAngle) > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function CourtLines({ lineColor, floorColor }) {
  const threePointArc = arcPath(
    THREE_POINT_RADIUS,
    Math.atan2(THREE_POINT_SIDELINE_Y, -THREE_POINT_SIDELINE_X),
    Math.atan2(THREE_POINT_SIDELINE_Y, THREE_POINT_SIDELINE_X),
  );
  const restrictedArc = arcPath(RESTRICTED_AREA_RADIUS, Math.PI, 2 * Math.PI);

  return (
    <g fill="none" stroke={lineColor} strokeWidth={4} vectorEffect="non-scaling-stroke">
      <rect x={-790} y={-197.5} width={1580} height={1480} fill={floorColor} stroke={lineColor} />
      <g opacity={0.48}>
        <line x1={-90} y1={-90} x2={90} y2={-90} />
        <circle cx={0} cy={0} r={22.5} />
        <rect x={-KEY_HALF_WIDTH} y={0} width={KEY_HALF_WIDTH * 2} height={KEY_DEPTH} />
        <circle cx={0} cy={KEY_DEPTH} r={180} strokeDasharray="12 10" />
        <path d={restrictedArc} />
        <line x1={-THREE_POINT_SIDELINE_X} y1={0} x2={-THREE_POINT_SIDELINE_X} y2={THREE_POINT_SIDELINE_Y} />
        <line x1={THREE_POINT_SIDELINE_X} y1={0} x2={THREE_POINT_SIDELINE_X} y2={THREE_POINT_SIDELINE_Y} />
        <path d={threePointArc} />
        <line x1={-790} y1={HALF_COURT_Y} x2={790} y2={HALF_COURT_Y} />
        <path d={arcPath(180, 0, Math.PI)} transform={`translate(0, ${HALF_COURT_Y})`} />
      </g>
      <text
        x={0}
        y={640}
        textAnchor="middle"
        fill={lineColor}
        opacity={0.22}
        fontSize={64}
        fontWeight={700}
        stroke="none"
        style={{ letterSpacing: "0.2em" }}
      >
        FIBA HALF COURT
      </text>
    </g>
  );
}

function ShotMarker({ shot, color, highlighted, onSelect }) {
  const x = Number(shot.coordX);
  const y = Number(shot.coordY);
  const isThree = shot.actionCode === "3FGM" || shot.actionCode === "3FGA";
  const made = shot.actionCode === "2FGM" || shot.actionCode === "3FGM";
  const zone = classifyShotZone(x, y, isThree);
  const title = `${shot.playerName ?? "Unknown player"} · ${made ? "Made" : "Missed"} ${isThree ? "3PT" : "2PT"} · ${zone}`;
  const radius = highlighted ? 20 : 16;

  return (
    <g
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(shot) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(shot);
            }
          : undefined
      }
      style={onSelect ? { cursor: "pointer" } : undefined}
    >
      <title>{title}</title>
      {made ? (
        <circle cx={x} cy={y} r={radius} fill={color} stroke="var(--color-base-100)" strokeWidth={2} />
      ) : (
        <g stroke={color} strokeWidth={4} vectorEffect="non-scaling-stroke">
          <line x1={x - 12} y1={y - 12} x2={x + 12} y2={y + 12} />
          <line x1={x - 12} y1={y + 12} x2={x + 12} y2={y - 12} />
        </g>
      )}
      {highlighted ? (
        <circle cx={x} cy={y} r={25} fill="none" stroke="var(--color-warning)" strokeWidth={3}>
          <animate attributeName="r" values="25;38;25" dur="1s" repeatCount="indefinite" />
        </circle>
      ) : null}
    </g>
  );
}

// Fixed anchors for the five named zones; corner three is mirrored on both
// sides of the court (same underlying aggregate value at each anchor) since
// corners are physically symmetric, while the other zones - none of which
// the classifier splits left/right - get one representative anchor.
const ZONE_ANCHORS = [
  { zone: "Restricted area", x: 0, y: 60 },
  { zone: "Paint", x: 0, y: 340 },
  { zone: "Mid-range", x: 0, y: 500 },
  { zone: "Corner three", x: -600, y: 90 },
  { zone: "Corner three", x: 600, y: 90 },
  { zone: "Above-break three", x: 0, y: 820 },
];
const MIN_BUBBLE_RADIUS = 78;
const MAX_BUBBLE_RADIUS = 156;

function HeatmapBubbles({ shots, inkColor }) {
  const zoneStats = summarizeZones(shots);
  const statsByZone = new Map(zoneStats.map((stat) => [stat.zone, stat]));
  const maxAttempts = Math.max(1, ...zoneStats.map((stat) => stat.attempts));

  return (
    <g>
      {ZONE_ANCHORS.map((anchor, index) => {
        const stat = statsByZone.get(anchor.zone) ?? { attempts: 0, made: 0 };
        if (stat.attempts === 0) return null;
        const percentage = (stat.made / stat.attempts) * 100;
        const radius =
          MIN_BUBBLE_RADIUS + (MAX_BUBBLE_RADIUS - MIN_BUBBLE_RADIUS) * (stat.attempts / maxAttempts);
        return (
          <g key={`${anchor.zone}-${index}`}>
            <circle cx={anchor.x} cy={anchor.y} r={radius} fill={efficiencyRamp(percentage)} opacity={0.88}>
              <title>
                {anchor.zone} · {stat.made}-{stat.attempts} ({percentage.toFixed(1)}%)
              </title>
            </circle>
            <text
              x={anchor.x}
              y={anchor.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={inkColor}
              fontSize={26}
              fontWeight={700}
            >
              {percentage.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

function useSvgThemeColors(svgRef) {
  const [colors, setColors] = useState(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    function readColors() {
      const style = getComputedStyle(el);
      setColors({
        floor: style.getPropertyValue("--color-base-200").trim(),
        line: style.getPropertyValue("--color-base-content").trim(),
        primary: style.getPropertyValue("--color-primary").trim(),
        secondary: style.getPropertyValue("--color-secondary").trim(),
      });
    }
    readColors();
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [svgRef]);

  return colors;
}

// `mode="markers"` plots individual shots; `mode="heatmap"` shows one
// bubble per zone, radius scaled by attempt volume and fill from the
// sequential efficiency ramp.
export default function ShootingCourt({ shots, teams, mode = "markers", ariaLabel, highlightedShotId, onShotSelect }) {
  const svgRef = useRef(null);
  const colors = useSvgThemeColors(svgRef);
  const teamColor = (clubCode) => {
    const index = teams.findIndex((team) => team?.clubCode === clubCode);
    return index === 1 ? colors?.secondary : colors?.primary;
  };

  return (
    <svg ref={svgRef} viewBox={VIEW_BOX} role="img" aria-label={ariaLabel} className="h-auto w-full max-w-3xl">
      {colors ? (
        <>
          <CourtLines lineColor={colors.line} floorColor={colors.floor} />
          {mode === "markers"
            ? shots.map((shot) => (
                <ShotMarker
                  key={shot.shotOrdinal}
                  shot={shot}
                  color={teamColor(shot.clubCode) ?? colors.line}
                  highlighted={highlightedShotId === shot.shotOrdinal}
                  onSelect={onShotSelect}
                />
              ))
            : null}
          {mode === "heatmap" ? <HeatmapBubbles shots={shots} inkColor={EFFICIENCY_RAMP_INK} /> : null}
        </>
      ) : null}
    </svg>
  );
}
