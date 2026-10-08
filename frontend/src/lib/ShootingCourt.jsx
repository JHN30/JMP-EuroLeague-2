import { useEffect, useRef, useState } from "react";
import { efficiencyRamp } from "./chartHelpers";
import { COURT, CORNER_THREE_MAX_Y, hasLocation, isThreePointer, plotPosition, shotZone, summarizeZones, toScreen } from "./shotZones";
import { ZONE_LABEL_POINTS, ZONE_SHAPES } from "./zoneShapes";

// One SVG unit is one centimetre. The picture is the FIBA half court seen from the side: the baseline on the left, the
// half-court line on the right, the hoop on the left. Lines and zone regions are drawn in the feed's own frame (hoop at
// the origin) inside one quarter-turn group; markers and chips are placed with toScreen so they are never rotated.
// A strip outside the half-court line stands for the Backcourt zone, whose shots are drawn on the line itself.
const MARGIN = 20;
const STRIP_GAP = 15;
const STRIP_WIDTH = 100;
const STRIP_LEFT = COURT.halfCourtY + STRIP_GAP;
const VIEW_LEFT = COURT.baselineY - MARGIN;
const VIEW_TOP = -COURT.halfWidth - MARGIN;
const VIEW_WIDTH = STRIP_LEFT + STRIP_WIDTH + MARGIN - VIEW_LEFT;
const VIEW_HEIGHT = 2 * COURT.halfWidth + 2 * MARGIN;
const VIEW_BOX = `${VIEW_LEFT} ${VIEW_TOP} ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
// Never wider than one pixel per centimetre and never taller than 90% of the window, so the whole court fits on screen.
const MAX_WIDTH = `min(${VIEW_WIDTH}px, calc(90vh * ${VIEW_WIDTH / VIEW_HEIGHT}))`;
const LINE_WIDTH = 5;
// (x, y) in the feed's frame -> (y, -x) on screen.
const QUARTER_TURN = "matrix(0 -1 1 0 0 0)";

// An arc between two points that bulges toward +y when it runs from +x to -x.
function arc(radius, from, to) {
  return `M ${from[0]} ${from[1]} A ${radius} ${radius} 0 0 1 ${to[0]} ${to[1]}`;
}

function CourtFloor({ lineColor, floorColor }) {
  return (
    <rect
      x={COURT.baselineY}
      y={-COURT.halfWidth}
      width={COURT.halfCourtY - COURT.baselineY}
      height={2 * COURT.halfWidth}
      fill={floorColor}
      stroke={lineColor}
      strokeWidth={LINE_WIDTH}
    />
  );
}

function CourtMarkings({ lineColor }) {
  const { laneHalfWidth, freeThrowY, freeThrowRadius, restrictedRadius, restrictedEndY, threePointRadius, threePointSidelineX } = COURT;
  const { baselineY, halfCourtY, backboardY, backboardHalfWidth, rimRadius, centerCircleRadius } = COURT;

  return (
    <g transform={QUARTER_TURN} fill="none" stroke={lineColor} strokeWidth={LINE_WIDTH} opacity={0.48}>
      <line x1={-backboardHalfWidth} y1={backboardY} x2={backboardHalfWidth} y2={backboardY} />
      <circle cx={0} cy={0} r={rimRadius} />
      <rect x={-laneHalfWidth} y={baselineY} width={laneHalfWidth * 2} height={freeThrowY - baselineY} />
      <path d={arc(freeThrowRadius, [freeThrowRadius, freeThrowY], [-freeThrowRadius, freeThrowY])} />
      <path d={arc(freeThrowRadius, [-freeThrowRadius, freeThrowY], [freeThrowRadius, freeThrowY])} strokeDasharray="30 25" />
      <path d={arc(restrictedRadius, [restrictedRadius, 0], [-restrictedRadius, 0])} />
      <line x1={-restrictedRadius} y1={0} x2={-restrictedRadius} y2={restrictedEndY} />
      <line x1={restrictedRadius} y1={0} x2={restrictedRadius} y2={restrictedEndY} />
      <line x1={-threePointSidelineX} y1={baselineY} x2={-threePointSidelineX} y2={CORNER_THREE_MAX_Y} />
      <line x1={threePointSidelineX} y1={baselineY} x2={threePointSidelineX} y2={CORNER_THREE_MAX_Y} />
      <path d={arc(threePointRadius, [threePointSidelineX, CORNER_THREE_MAX_Y], [-threePointSidelineX, CORNER_THREE_MAX_Y])} />
      <path d={arc(centerCircleRadius, [-centerCircleRadius, halfCourtY], [centerCircleRadius, halfCourtY])} />
    </g>
  );
}

// Markers pop in one after another, but never over more than about half a second however many there are.
const MARKER_STAGGER_MS = 3;
const MARKER_STAGGER_LIMIT = 160;

function markerSetKey(shots) {
  const first = shots[0];
  const last = shots.at(-1);
  return `${shots.length}-${first?.clubCode}-${first?.shotOrdinal}-${last?.shotOrdinal}`;
}

const metres = (centimetres) => (centimetres / 100).toFixed(1);

function shotTitle(shot, made, isThree, zone) {
  const x = Number(shot.coordX);
  const y = Number(shot.coordY);
  const parts = [
    shot.playerName ?? "Unknown player",
    `${made ? "Made" : "Missed"} ${isThree ? "3PT" : "2PT"}`,
    zone,
    `${metres(Math.hypot(x, y))} m from the basket`,
  ];
  // Drawn on the half-court line; the real place is only in the text.
  if (y > COURT.halfCourtY) parts.push(`past the half-court line, ${metres(y - COURT.baselineY)} m from the baseline`);
  return parts.join(" · ");
}

function ShotMarker({ shot, color, delay }) {
  const { x, y } = plotPosition(Number(shot.coordX), Number(shot.coordY));
  const isThree = isThreePointer(shot);
  const made = shot.actionCode === "2FGM" || shot.actionCode === "3FGM";
  const zone = shotZone(shot);

  return (
    <g data-zone={zone} className="court-marker" style={{ animationDelay: `${delay}ms` }}>
      <title>{shotTitle(shot, made, isThree, zone)}</title>
      {made ? (
        <circle cx={x} cy={y} r={16} fill={color} stroke="var(--color-base-100)" strokeWidth={2} />
      ) : (
        <g stroke={color} strokeWidth={4} vectorEffect="non-scaling-stroke">
          <line x1={x - 12} y1={y - 12} x2={x + 12} y2={y + 12} />
          <line x1={x - 12} y1={y + 12} x2={x + 12} y2={y - 12} />
        </g>
      )}
    </g>
  );
}

function zoneTitle(stat) {
  return `${stat.zone} · ${stat.made}-${stat.attempts} (${((stat.made / stat.attempts) * 100).toFixed(1)}%)`;
}

// A zone with attempts is filled by FG% in the efficiency ramp; one without is left as the bare floor.
function ZoneFills({ stats, lineColor }) {
  return (
    <g transform={QUARTER_TURN} stroke={lineColor} strokeOpacity={0.4} strokeWidth={3} fillRule="evenodd">
      {stats.map((stat) =>
        ZONE_SHAPES[stat.zone] ? (
          <path
            key={stat.zone}
            className="court-zone"
            d={ZONE_SHAPES[stat.zone]}
            data-zone={stat.attempts > 0 ? stat.zone : undefined}
            fill={stat.attempts > 0 ? efficiencyRamp((stat.made / stat.attempts) * 100) : "none"}
          >
            {stat.attempts > 0 ? <title>{zoneTitle(stat)}</title> : null}
          </path>
        ) : null,
      )}
    </g>
  );
}

// The label is about 235 units long once rotated, so it is centred this far from the strip's top edge to stay inside it,
// clear of the zone chip in the middle of the strip.
const BACKCOURT_LABEL_OFFSET = 175;

// The strip outside the half-court line that stands for shots taken past it.
function BackcourtStrip({ stat, lineColor }) {
  const filled = stat && stat.attempts > 0;
  return (
    <g>
      <rect
        x={STRIP_LEFT}
        y={-COURT.halfWidth}
        width={STRIP_WIDTH}
        height={2 * COURT.halfWidth}
        fill={filled ? efficiencyRamp((stat.made / stat.attempts) * 100) : "none"}
        stroke={lineColor}
        strokeOpacity={0.4}
        strokeWidth={3}
        strokeDasharray="20 14"
        data-zone={filled ? "Backcourt" : undefined}
      >
        {filled ? <title>{zoneTitle(stat)}</title> : null}
      </rect>
      <text
        x={STRIP_LEFT + STRIP_WIDTH / 2}
        y={-COURT.halfWidth + BACKCOURT_LABEL_OFFSET}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={lineColor}
        opacity={0.55}
        fontSize={34}
        fontWeight={700}
        transform={`rotate(90 ${STRIP_LEFT + STRIP_WIDTH / 2} ${-COURT.halfWidth + BACKCOURT_LABEL_OFFSET})`}
        style={{ letterSpacing: "0.1em" }}
      >
        BACKCOURT
      </text>
    </g>
  );
}

const CHIP_HEIGHT = 84;

// Made/attempts over FG% on a dark chip, readable on every fill and in both themes. `percentOnly` is for a court drawn too small
// for two lines of text: just the percentage, in larger type.
function ZoneChip({ x, y, stat, percentOnly }) {
  if (percentOnly) {
    const percentage = `${((stat.made / stat.attempts) * 100).toFixed(0)}%`;
    const width = percentage.length * 34 + 24;
    return (
      <g pointerEvents="none" className="court-chip">
        <rect x={x - width / 2} y={y - 40} width={width} height={80} rx={12} fill="rgba(15, 23, 42, 0.74)" />
        <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={56} fontWeight={700}>
          {percentage}
        </text>
      </g>
    );
  }
  const lineOne = `${stat.made}/${stat.attempts}`;
  const lineTwo = `${((stat.made / stat.attempts) * 100).toFixed(0)}%`;
  const width = Math.max(lineOne.length * 17, lineTwo.length * 20, 52) + 16;
  return (
    <g pointerEvents="none" className="court-chip">
      <rect x={x - width / 2} y={y - CHIP_HEIGHT / 2} width={width} height={CHIP_HEIGHT} rx={10} fill="rgba(15, 23, 42, 0.74)" />
      <text x={x} y={y - 18} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={28}>
        {lineOne}
      </text>
      <text x={x} y={y + 17} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={32} fontWeight={700}>
        {lineTwo}
      </text>
    </g>
  );
}

function ZoneChips({ stats, percentOnly }) {
  return (
    <g>
      {stats.map((stat) => {
        if (stat.attempts === 0) return null;
        const point =
          stat.zone === "Backcourt" ? { x: STRIP_LEFT + STRIP_WIDTH / 2, y: 0 } : toScreen(...(ZONE_LABEL_POINTS[stat.zone] ?? []));
        // Keyed by the numbers too, so a zone whose numbers changed fades in again.
        return <ZoneChip key={`${stat.zone}-${stat.made}-${stat.attempts}-${percentOnly}`} x={point.x} y={point.y} stat={stat} percentOnly={percentOnly} />;
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
        success: style.getPropertyValue("--color-success").trim(),
        error: style.getPropertyValue("--color-error").trim(),
      });
    }
    readColors();
    const observer = new MutationObserver(readColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [svgRef]);

  return colors;
}

// Whether the court is drawn narrower than `limit` pixels (never, with no limit).
function useNarrowCourt(svgRef, limit) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || !limit) return undefined;
    const measure = () => setNarrow(el.getBoundingClientRect().width < limit);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [svgRef, limit]);

  return narrow;
}

// `mode="markers"` plots individual shots; `mode="heatmap"` shades each zone by its FG% (more opaque is better) and
// labels it with made/attempts (only the percentage when the court is drawn narrower than `compactBelow` pixels). Shots without a usable location are not drawn. Markers take their team's colour; with
// `resultColors` (for a chart of one team's shots) makes are green and misses red instead.
export default function ShootingCourt({ shots, teams, mode = "markers", ariaLabel, maxWidth = MAX_WIDTH, resultColors = false, replayKey = "", compactBelow = 0 }) {
  const svgRef = useRef(null);
  const narrow = useNarrowCourt(svgRef, compactBelow);
  const colors = useSvgThemeColors(svgRef);
  const teamColor = (clubCode) => {
    const index = teams.findIndex((team) => team?.clubCode === clubCode);
    return index === 1 ? colors?.secondary : colors?.primary;
  };
  const zoneStats = mode === "heatmap" ? summarizeZones(shots) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={VIEW_BOX}
      role="img"
      aria-label={ariaLabel}
      className="mx-auto h-auto w-full"
      style={{ maxWidth }}
    >
      {colors ? (
        <>
          <CourtFloor lineColor={colors.line} floorColor={colors.floor} />
          {zoneStats ? <ZoneFills stats={zoneStats} lineColor={colors.line} /> : null}
          <CourtMarkings lineColor={colors.line} />
          <BackcourtStrip stat={zoneStats?.find((stat) => stat.zone === "Backcourt")} lineColor={colors.line} />
          {zoneStats ? <ZoneChips stats={zoneStats} percentOnly={narrow} /> : null}
          {mode === "markers" ? (
            // Keyed by what is plotted, so a different set (a new filter or side) remounts and pops in again.
            <g key={`${replayKey}-${markerSetKey(shots)}`}>
              {shots.filter(hasLocation).map((shot, index) => (
                // The ordinal only counts within one game, and a season chart holds many.
                <ShotMarker
                  key={`${index}-${shot.shotOrdinal}`}
                  shot={shot}
                  delay={Math.min(index, MARKER_STAGGER_LIMIT) * MARKER_STAGGER_MS}
                  color={
                    resultColors
                      ? (shot.actionCode.endsWith("M") ? colors.success : colors.error)
                      : (teamColor(shot.clubCode) ?? colors.line)
                  }
                />
              ))}
            </g>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
