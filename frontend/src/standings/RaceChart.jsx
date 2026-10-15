import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { thinAxisLabels } from "../lib/chartHelpers";
import { tierEnd } from "../lib/seasonFormat";
import { teamHue } from "../lib/teamHue";
import { useElementWidth } from "../lib/useElementWidth";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { NARROW_QUERY } from "./raceSizing";

const CREST_GAP = 6;

// Below sm the chart is built for a narrow screen: every round gets a minimum width, so the plot is wider than the box and
// the box scrolls sideways; crests and rows are smaller; and the position numbers sit in a strip of their own that stays put.
const NARROW = { perRound: 22, axis: 26, left: 6 };
const WIDE_LEFT = 34;

const GRID_STROKE = "color-mix(in srgb, var(--color-base-content) 20%, transparent)";
const POSTSEASON_FILL = "color-mix(in srgb, var(--color-success) 6.5%, transparent)";
const PLAYIN_FILL = "color-mix(in srgb, var(--color-warning) 6.5%, transparent)";

// The race as a bump chart: one line per club through its position in every played round, with the club's crest at the
// latest round being shown. Stepping the race slides each crest along its line while the line is drawn behind it.
// The x axis always covers every played round, so it doesn't rescale while the season replays; `visibleCount` is how
// many of those rounds are shown (0 is the empty season start).
// `layout` (from raceLayout) sets the row height, margins and crest size so the chart fits the screen.
export default function RaceChart({ rounds, visibleCount, standingsByRound, teamOrder, focusedClub, onFocusClub, tiers = null, roundLabel, layout, followTop }) {
  const containerRef = useRef(null);
  const width = useElementWidth(containerRef);
  const narrow = useMediaQuery(NARROW_QUERY);
  const reducedMotion = usePrefersReducedMotion();
  const clipId = `race-reveal-${useId().replace(/:/g, "")}`;
  const crestClipId = `${clipId}-crest`;

  // How many rounds the last step moved: one step glides, a jump of the slider snaps faster.
  const [lastCount, setLastCount] = useState(visibleCount);
  const [jump, setJump] = useState(1);
  if (visibleCount !== lastCount) {
    setLastCount(visibleCount);
    setJump(Math.abs(visibleCount - lastCount));
  }
  const duration = jump > 1 ? 0.35 : 0.6;
  const move = { duration, ease: "easeInOut" };

  const teamCount = teamOrder.length;

  const { crestRadius, rowHeight } = layout;
  const margin = { ...layout.margin, left: narrow ? NARROW.left : WIDE_LEFT, right: crestRadius + CREST_GAP };
  const height = (teamCount + 1) * rowHeight + margin.top + margin.bottom;
  // Wide screens fit every round in the box; a narrow one keeps a minimum per round and lets the box scroll.
  const contentWidth = narrow ? Math.max(width, margin.left + rounds.length * NARROW.perRound + margin.right) : width;
  const plotWidth = Math.max(0, contentWidth - margin.left - margin.right);
  const plotHeight = height - margin.top - margin.bottom;
  const step = plotWidth / Math.max(1, rounds.length);
  const x = (index) => margin.left + (index + 0.5) * step;
  // One row of room above the first place and below the last.
  const y = (position) => margin.top + (position / (teamCount + 1)) * plotHeight;

  const crestIndex = Math.max(visibleCount, 1) - 1;

  // Below sm the box scrolls, so keep the round being shown in view: the first run (the latest round) jumps, later steps glide.
  const followedOnce = useRef(false);
  const followX = x(crestIndex);
  useEffect(() => {
    const box = containerRef.current;
    if (!narrow || !box || width === 0) return;
    const left = Math.max(0, followX - box.clientWidth / 2);
    box.scrollTo({ left, behavior: followedOnce.current && !reducedMotion ? "smooth" : "auto" });
    followedOnce.current = true;
  }, [narrow, followX, width, reducedMotion]);

  // Where even the smallest rows leave the chart taller than the room under the bar, the page follows the focused crest.
  const svgRef = useRef(null);
  const focusedPosition = focusedClub ? (standingsByRound.get(rounds[crestIndex])?.get(focusedClub) ?? null) : null;
  const focusedY = focusedPosition == null || visibleCount === 0 ? null : y(focusedPosition);
  useEffect(() => {
    const svg = svgRef.current;
    if (layout.fits || focusedY == null || !svg) return;
    const top = svg.getBoundingClientRect().top + focusedY - crestRadius - 8;
    const bottom = top + 2 * crestRadius + 16;
    const shift = top < followTop ? top - followTop : Math.max(0, bottom - window.innerHeight);
    if (shift !== 0) window.scrollBy({ top: shift, behavior: reducedMotion ? "auto" : "smooth" });
  }, [layout.fits, focusedY, followTop, crestRadius, reducedMotion]);

  if (rounds.length < 2 || teamCount === 0) {
    return <p className="muted text-sm">Not enough round history yet to chart the standings race.</p>;
  }

  const positions = Array.from({ length: teamCount }, (_, index) => index + 1);
  const compactRounds = rounds.map((round) => roundLabel
    ? roundLabel(round).split(": ").at(-1).replace(/^Round\s+(\d+)$/i, "R$1").replace(/^Round name unavailable$/, "?")
    : `R${round}`);
  const roundLabels = thinAxisLabels(compactRounds, Math.max(2, Math.min(8, Math.floor(plotWidth / 40))));
  // The bands follow the season's qualification lines; with none, both bands are empty (zero height).
  const postseasonCutoff = tierEnd(tiers, "postseason") ?? 0;
  const playinCutoff = tierEnd(tiers, "playin") ?? postseasonCutoff;
  const postseasonEnd = postseasonCutoff > 0 ? Math.min(postseasonCutoff + 0.5, teamCount + 0.5) : 0;
  const playinEnd = playinCutoff > postseasonCutoff ? Math.min(playinCutoff + 0.5, teamCount + 0.5) : postseasonEnd;
  const revealWidth = visibleCount > 0 ? x(visibleCount - 1) + 6 : 0;
  const crestInner = crestRadius - 3;

  const teams = teamOrder.map((team, index) => {
    const series = rounds.map((round) => standingsByRound.get(round)?.get(team.clubCode) ?? null);
    return { team, color: teamHue(index), series };
  });
  // The focused club is drawn last so it sits on top.
  const drawOrder = [...teams].sort(
    (a, b) => Number(a.team.clubCode === focusedClub) - Number(b.team.clubCode === focusedClub),
  );
  const toggleFocus = (clubCode) => onFocusClub?.(clubCode === focusedClub ? null : clubCode);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className={narrow ? "flex" : undefined}>
          {narrow ? (
            // The position numbers stay put while the rounds scroll beside them.
            <svg width={NARROW.axis} height={height} aria-hidden="true" style={{ display: "block", flex: "none", fontSize: 12 }}>
              {positions.map((position) => (
                <text key={position} x={NARROW.axis - 6} y={y(position) + 4} textAnchor="end" style={{ fill: "var(--color-base-content)" }}>
                  {position}
                </text>
              ))}
            </svg>
          ) : null}
          <div
            ref={containerRef}
            className={narrow ? "min-w-0 flex-1 overflow-x-auto overscroll-x-contain" : "w-full"}
            style={narrow ? undefined : { height }}
            {...(narrow ? { tabIndex: 0, role: "region", "aria-label": "Standings race chart, scrolls sideways" } : {})}
          >
          {width > 0 ? (
            <svg
              ref={svgRef}
              width={contentWidth}
              height={height}
              viewBox={`0 0 ${contentWidth} ${height}`}
              role="img"
              aria-label={`Standings position by round across ${rounds.length} rounds for ${teamCount} teams`}
              style={{ display: "block", fontSize: 12 }}
            >
              <defs>
                <clipPath id={clipId}>
                  <motion.rect x={0} y={0} height={height} initial={{ width: 0 }} animate={{ width: revealWidth }} transition={move} />
                </clipPath>
                <clipPath id={crestClipId}>
                  <circle r={crestInner} />
                </clipPath>
              </defs>

              <rect x={margin.left} y={y(0)} width={plotWidth} height={y(postseasonEnd) - y(0)} style={{ fill: POSTSEASON_FILL }} />
              <rect
                x={margin.left}
                y={y(postseasonEnd)}
                width={plotWidth}
                height={Math.max(0, y(playinEnd) - y(postseasonEnd))}
                style={{ fill: PLAYIN_FILL }}
              />

              {positions.map((position) => (
                <g key={position}>
                  <line x1={margin.left} x2={margin.left + plotWidth} y1={y(position)} y2={y(position)} style={{ stroke: GRID_STROKE }} />
                  {narrow ? null : (
                    <text x={WIDE_LEFT - 8} y={y(position) + 4} textAnchor="end" style={{ fill: "var(--color-base-content)" }}>
                      {position}
                    </text>
                  )}
                </g>
              ))}
              {rounds.map((round, index) => (
                <g key={round}>
                  <line x1={x(index)} x2={x(index)} y1={y(0.5)} y2={y(teamCount + 0.5)} style={{ stroke: GRID_STROKE }} />
                  {roundLabels[index] ? (
                    <text x={x(index)} y={height - 8} textAnchor="middle" style={{ fill: "var(--color-base-content)" }}>
                      {roundLabels[index]}
                    </text>
                  ) : null}
                </g>
              ))}

              <g clipPath={`url(#${clipId})`}>
                {drawOrder.map(({ team, color, series }) => {
                  const isFocused = focusedClub === team.clubCode;
                  const stroke = isFocused ? "var(--color-primary)" : color;
                  const path = series
                    .map((position, index) => (position == null ? null : `${x(index).toFixed(1)} ${y(position).toFixed(1)}`))
                    .filter(Boolean)
                    .map((point, index) => `${index === 0 ? "M" : "L"}${point}`)
                    .join(" ");
                  return (
                    <motion.g key={team.clubCode} initial={false} animate={{ opacity: focusedClub && !isFocused ? 0.12 : 1 }}>
                      <path d={path} fill="none" stroke={stroke} strokeWidth={isFocused ? 5 : 2} strokeLinejoin="round" />
                      {series.map((position, index) =>
                        position == null ? null : (
                          <g key={rounds[index]} onClick={() => toggleFocus(team.clubCode)} style={{ cursor: "pointer" }}>
                            <circle cx={x(index)} cy={y(position)} r={isFocused ? 4 : 2.4} fill={stroke} />
                            <circle cx={x(index)} cy={y(position)} r={8} fill="transparent">
                              <title>{`${team.clubName ?? team.clubCode}, ${roundLabel ? roundLabel(rounds[index]) : `round ${rounds[index]}`}: position ${position}`}</title>
                            </circle>
                          </g>
                        ),
                      )}
                    </motion.g>
                  );
                })}
              </g>

              {drawOrder.map(({ team, color, series }) => {
                const isFocused = focusedClub === team.clubCode;
                const position = series[crestIndex];
                if (position == null) return null;
                const at = { x: x(crestIndex), y: y(position) };
                const name = team.clubName ?? team.clubCode;
                return (
                  <motion.g
                    key={team.clubCode}
                    initial={{ ...at, opacity: 0 }}
                    animate={{ ...at, opacity: visibleCount === 0 ? 0 : focusedClub && !isFocused ? 0.35 : 1 }}
                    transition={{ ...move, opacity: { duration: 0.25 } }}
                    onClick={() => toggleFocus(team.clubCode)}
                    style={{ cursor: "pointer", pointerEvents: visibleCount === 0 ? "none" : undefined }}
                  >
                    <circle r={crestRadius} style={{ fill: "var(--color-base-100)" }} stroke={isFocused ? "var(--color-primary)" : color} strokeWidth={isFocused ? 4 : 2.5} />
                    {team.crestUrl ? (
                      <image
                        href={team.crestUrl}
                        x={-crestInner}
                        y={-crestInner}
                        width={crestInner * 2}
                        height={crestInner * 2}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${crestClipId})`}
                      />
                    ) : null}
                    <title>{`${name}: position ${position}`}</title>
                  </motion.g>
                );
              })}
            </svg>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
