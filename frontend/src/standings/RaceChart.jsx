import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { thinAxisLabels } from "../lib/chartHelpers";
import { teamHue } from "../lib/teamHue";
import { useElementWidth } from "../lib/useElementWidth";

const MIN_HEIGHT = 390;
const HEIGHT_PER_ROW = 50;
const POSTSEASON_CUTOFF = 6;
const PLAYIN_CUTOFF = 10;
const CREST_RADIUS = 19;
const MARGIN = { top: 4, bottom: 28, left: 34, right: CREST_RADIUS + 6 };

const GRID_STROKE = "color-mix(in srgb, var(--color-base-content) 20%, transparent)";
const POSTSEASON_FILL = "color-mix(in srgb, var(--color-success) 6.5%, transparent)";
const PLAYIN_FILL = "color-mix(in srgb, var(--color-warning) 6.5%, transparent)";

// The race as a bump chart: one line per club through its position in every played round, with the club's crest at the
// latest round being shown. Stepping the race slides each crest along its line while the line is drawn behind it.
// The x axis always covers every played round, so it doesn't rescale while the season replays; `visibleCount` is how
// many of those rounds are shown (0 is the empty season start).
export default function RaceChart({ rounds, visibleCount, standingsByRound, teamOrder, focusedClub, onFocusClub }) {
  const containerRef = useRef(null);
  const width = useElementWidth(containerRef);
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
  if (rounds.length < 2 || teamCount === 0) {
    return <p className="muted text-sm">Not enough round history yet to chart the standings race.</p>;
  }

  const height = Math.max(MIN_HEIGHT, (teamCount + 1) * HEIGHT_PER_ROW) + MARGIN.top + MARGIN.bottom;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const step = plotWidth / rounds.length;
  const x = (index) => MARGIN.left + (index + 0.5) * step;
  // One row of room above the first place and below the last.
  const y = (position) => MARGIN.top + (position / (teamCount + 1)) * plotHeight;

  const positions = Array.from({ length: teamCount }, (_, index) => index + 1);
  const roundLabels = thinAxisLabels(rounds.map((round) => `R${round}`), 8);
  const postseasonEnd = Math.min(POSTSEASON_CUTOFF + 0.5, teamCount + 0.5);
  const playinEnd = Math.min(PLAYIN_CUTOFF + 0.5, teamCount + 0.5);
  const revealWidth = visibleCount > 0 ? x(visibleCount - 1) + 6 : 0;
  const crestIndex = Math.max(visibleCount, 1) - 1;
  const crestInner = CREST_RADIUS - 3;

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
      <label className="flex w-fit items-center gap-2 text-xs text-base-content/70">
        Team focus
        <select
          className="select select-sm select-bordered"
          value={focusedClub ?? ""}
          onChange={(event) => onFocusClub?.(event.target.value || null)}
        >
          <option value="">All teams</option>
          {teamOrder.map((team) => (
            <option key={team.clubCode} value={team.clubCode}>
              {team.clubName ?? team.clubCode}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div ref={containerRef} className="w-full" style={{ height }}>
          {width > 0 ? (
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
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

              <rect x={MARGIN.left} y={y(0)} width={plotWidth} height={y(postseasonEnd) - y(0)} style={{ fill: POSTSEASON_FILL }} />
              <rect
                x={MARGIN.left}
                y={y(postseasonEnd)}
                width={plotWidth}
                height={Math.max(0, y(playinEnd) - y(postseasonEnd))}
                style={{ fill: PLAYIN_FILL }}
              />

              {positions.map((position) => (
                <g key={position}>
                  <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(position)} y2={y(position)} style={{ stroke: GRID_STROKE }} />
                  <text x={MARGIN.left - 8} y={y(position) + 4} textAnchor="end" style={{ fill: "var(--color-base-content)" }}>
                    {position}
                  </text>
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
                              <title>{`${team.clubName ?? team.clubCode}, round ${rounds[index]}: position ${position}`}</title>
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
                    <circle r={CREST_RADIUS} style={{ fill: "var(--color-base-100)" }} stroke={isFocused ? "var(--color-primary)" : color} strokeWidth={isFocused ? 4 : 2.5} />
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
  );
}
