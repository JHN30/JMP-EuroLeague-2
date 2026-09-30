import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import { useElementWidth } from "../lib/useElementWidth";

const isNumber = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));

// Net rating with a centred bar: green to the right of the line, red to the left, on one scale for every club.
export function NetBar({ value, max }) {
  if (!isNumber(value)) return <span className="muted">—</span>;
  const share = Math.min(Math.abs(value) / max, 1) * 50;
  const positive = value >= 0;
  return (
    <div className="net-cell">
      <b>{formatSignedDecimal(value)}</b>
      <span className="diverge-track net-track">
        <motion.i
          className={positive ? "is-good" : "is-bad"}
          style={{ width: `${share}%`, [positive ? "left" : "right"]: "50%", originX: positive ? 0 : 1 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
        />
      </span>
    </div>
  );
}

const LINK = { width: 240, height: 26, pad: 12 };

// Away net rating (hollow dot) to home net rating (filled dot) on a scale shared by every club, so the length of the
// link is the home advantage.
export function HomeAwayLink({ away, home, low, high, clubName }) {
  if (!isNumber(away) || !isNumber(home)) return <span className="muted">—</span>;
  const { width, height, pad } = LINK;
  const x = (value) => pad + ((value - low) / (high - low)) * (width - pad * 2);
  const y = height / 2;
  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${clubName}: net rating ${formatSignedDecimal(away)} away and ${formatSignedDecimal(home)} at home`}
    >
      <line className="zero" x1={x(0)} x2={x(0)} y1="2" y2={height - 2} style={{ opacity: 0.3 }} />
      <motion.line
        x1={x(away)}
        x2={x(home)}
        y1={y}
        y2={y}
        style={{ stroke: "var(--color-info)", strokeWidth: 3, strokeLinecap: "round", opacity: 0.8 }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
      />
      <circle className="dot-expected" cx={x(away)} cy={y} r="5">
        <title>{`Away net rating: ${formatSignedDecimal(away)}`}</title>
      </circle>
      <circle className="dot-actual" cx={x(home)} cy={y} r="5">
        <title>{`Home net rating: ${formatSignedDecimal(home)}`}</title>
      </circle>
    </svg>
  );
}

// The smallest round step that keeps an axis to at most `maxCount` labels.
function tickValues(low, high, maxCount) {
  const step = [1, 2, 5, 10, 20].find((candidate) => (high - low) / candidate <= maxCount) ?? 20;
  const values = [];
  for (let value = Math.ceil(low / step) * step; value <= high; value += step) values.push(value);
  return values;
}

const MARGIN = { top: 22, right: 22, bottom: 50, left: 54 };
const CREST = 13;
const GRID = "color-mix(in srgb, var(--color-base-content) 14%, transparent)";
const LINE = "color-mix(in srgb, var(--color-base-content) 55%, transparent)";
const ISO = "color-mix(in srgb, var(--color-base-content) 18%, transparent)";
const FAINT = "color-mix(in srgb, var(--color-base-content) 60%, transparent)";

// Every club as a crest at its offensive rating (across) against its defensive rating (down, flipped so the good corner
// is top right). Dashed lines are the league averages; the faint diagonals are lines of equal net rating.
export function RatingsScatter({ entries }) {
  const containerRef = useRef(null);
  const width = useElementWidth(containerRef);
  const clipId = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState(null);

  const clubs = entries.filter((entry) => isNumber(entry.offensiveRating) && isNumber(entry.defensiveRating));
  if (clubs.length < 2) return <p className="muted text-sm">Not enough ratings yet for this chart.</p>;

  const values = clubs.flatMap((entry) => [entry.offensiveRating, entry.defensiveRating]);
  const low = Math.floor(Math.min(...values)) - 1;
  const high = Math.ceil(Math.max(...values)) + 1;
  const meanOffense = clubs.reduce((sum, entry) => sum + entry.offensiveRating, 0) / clubs.length;
  const meanDefense = clubs.reduce((sum, entry) => sum + entry.defensiveRating, 0) / clubs.length;

  const compact = width > 0 && width < 560;
  const height = width > 0 ? Math.round(Math.min(560, Math.max(380, width * 0.68))) : 0;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const x = (value) => MARGIN.left + ((value - low) / (high - low)) * plotWidth;
  const y = (value) => MARGIN.top + ((value - low) / (high - low)) * plotHeight;
  const xTicks = tickValues(low, high, Math.max(4, Math.floor(plotWidth / 46)));
  const yTicks = tickValues(low, high, Math.max(4, Math.floor(plotHeight / 28)));

  // The hovered club is drawn last so it sits on top of its neighbours.
  const drawOrder = [...clubs].sort((a, b) => Number(a.clubCode === hovered) - Number(b.clubCode === hovered));
  const hoveredEntry = clubs.find((entry) => entry.clubCode === hovered);

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label="Offensive rating against defensive rating for every club"
          style={{ display: "block", fontSize: 11 }}
        >
          <defs>
            <clipPath id={`plot-${clipId}`}>
              <rect x={MARGIN.left} y={MARGIN.top} width={plotWidth} height={plotHeight} />
            </clipPath>
            <clipPath id={`crest-${clipId}`}>
              <circle r={CREST - 2} />
            </clipPath>
          </defs>

          {xTicks.map((value) => (
            <g key={`x${value}`}>
              <line x1={x(value)} x2={x(value)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} style={{ stroke: GRID }} />
              <text x={x(value)} y={height - MARGIN.bottom + 16} textAnchor="middle" style={{ fill: FAINT }}>
                {value}
              </text>
            </g>
          ))}
          {yTicks.map((value) => (
            <g key={`y${value}`}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(value)} y2={y(value)} style={{ stroke: GRID }} />
              <text x={MARGIN.left - 8} y={y(value) + 4} textAnchor="end" style={{ fill: FAINT }}>
                {value}
              </text>
            </g>
          ))}

          <g clipPath={`url(#plot-${clipId})`}>
            {[-10, -5, 0, 5, 10].map((net) => (
              <line
                key={net}
                x1={x(low + net)}
                y1={y(low)}
                x2={x(high + net)}
                y2={y(high)}
                style={{ stroke: ISO, strokeWidth: net === 0 ? 2 : 1 }}
              />
            ))}
          </g>

          <line x1={x(meanOffense)} x2={x(meanOffense)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} style={{ stroke: LINE, strokeDasharray: "4 4" }} />
          <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(meanDefense)} y2={y(meanDefense)} style={{ stroke: LINE, strokeDasharray: "4 4" }} />
          <text x={x(meanOffense) + 4} y={MARGIN.top + plotHeight - 6} style={{ fill: FAINT, fontSize: 10 }}>
            league avg {formatDecimal(meanOffense)}
          </text>
          <text x={MARGIN.left + plotWidth - 4} y={y(meanDefense) - 4} textAnchor="end" style={{ fill: FAINT, fontSize: 10 }}>
            league avg {formatDecimal(meanDefense)}
          </text>

          {compact ? null : (
            <g style={{ fill: FAINT, fontWeight: 700 }}>
              <text x={MARGIN.left + plotWidth - 8} y={MARGIN.top + 18} textAnchor="end">Strong attack, strong defence</text>
              <text x={MARGIN.left + 8} y={MARGIN.top + 18}>Weak attack, strong defence</text>
              <text x={MARGIN.left + plotWidth - 8} y={MARGIN.top + plotHeight - 14} textAnchor="end">Strong attack, weak defence</text>
              <text x={MARGIN.left + 8} y={MARGIN.top + plotHeight - 14}>Weak attack, weak defence</text>
            </g>
          )}

          <text x={MARGIN.left + plotWidth / 2} y={height - 8} textAnchor="middle" style={{ fontWeight: 700 }}>
            {compact ? "Offensive rating (better to the right)" : "Offensive rating: points scored per 100 possessions (better to the right)"}
          </text>
          <text transform={`translate(14 ${MARGIN.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" style={{ fontWeight: 700 }}>
            {compact ? "Defensive rating (better up)" : "Defensive rating: points allowed per 100 (better up)"}
          </text>

          {drawOrder.map((entry, index) => {
            const isHovered = entry.clubCode === hovered;
            return (
              <g
                key={entry.clubCode}
                transform={`translate(${x(entry.offensiveRating).toFixed(1)} ${y(entry.defensiveRating).toFixed(1)})`}
                tabIndex={0}
                role="img"
                aria-label={`${entry.clubName ?? entry.clubCode}: offensive rating ${formatDecimal(entry.offensiveRating)}, defensive rating ${formatDecimal(entry.defensiveRating)}`}
                style={{ cursor: "default", outline: "none" }}
                onMouseEnter={() => setHovered(entry.clubCode)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(entry.clubCode)}
                onBlur={() => setHovered(null)}
              >
                <motion.g
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1.25 : 1 }}
                  transition={{ duration: 0.3, delay: isHovered ? 0 : 0.05 + index * 0.025, ease: EASE_OUT }}
                >
                  <circle
                    r={CREST}
                    style={{
                      fill: "var(--color-base-100)",
                      stroke: isHovered ? "var(--color-primary)" : "color-mix(in srgb, var(--color-base-content) 35%, transparent)",
                      strokeWidth: isHovered ? 2.5 : 1.5,
                    }}
                  />
                  {entry.crestUrl ? (
                    <image
                      href={entry.crestUrl}
                      x={-(CREST - 2)}
                      y={-(CREST - 2)}
                      width={(CREST - 2) * 2}
                      height={(CREST - 2) * 2}
                      preserveAspectRatio="xMidYMid meet"
                      clipPath={`url(#crest-${clipId})`}
                    />
                  ) : (
                    <text textAnchor="middle" y={3} style={{ fontSize: 8, fontWeight: 800 }}>
                      {entry.clubCode}
                    </text>
                  )}
                </motion.g>
              </g>
            );
          })}

          {hoveredEntry ? (() => {
            const name = hoveredEntry.clubName ?? hoveredEntry.clubCode;
            const detail = `ORtg ${formatDecimal(hoveredEntry.offensiveRating)} · DRtg ${formatDecimal(hoveredEntry.defensiveRating)} · Net ${formatSignedDecimal(hoveredEntry.netRating)}`;
            const boxWidth = Math.max(name.length, detail.length) * 6 + 16;
            const cx = Math.min(Math.max(x(hoveredEntry.offensiveRating), MARGIN.left + boxWidth / 2), width - MARGIN.right - boxWidth / 2);
            const cy = y(hoveredEntry.defensiveRating);
            const above = cy - CREST - 50 > MARGIN.top;
            const top = above ? cy - CREST - 48 : cy + CREST + 8;
            return (
              <g pointerEvents="none">
                <rect x={cx - boxWidth / 2} y={top} width={boxWidth} height={38} rx={6} style={{ fill: "var(--color-neutral)", opacity: 0.96 }} />
                <text x={cx} y={top + 15} textAnchor="middle" style={{ fill: "var(--color-neutral-content)", fontWeight: 700 }}>
                  {name}
                </text>
                <text x={cx} y={top + 30} textAnchor="middle" style={{ fill: "var(--color-neutral-content)", fontSize: 10 }}>
                  {detail}
                </text>
              </g>
            );
          })() : null}
        </svg>
      ) : null}
    </div>
  );
}
