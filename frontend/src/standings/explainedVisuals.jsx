import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";

// Small, reusable pictures for the "Explained" tab. They play once when scrolled into view.
const inView = { once: true, margin: "-30px" };

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function Unavailable({ children = "No value for this team yet." }) {
  return <p className="explained-caption">{children}</p>;
}

const STRIP = { width: 320, height: 66, pad: 16, axisY: 44 };

// Every club as a dot on one line, the chosen club highlighted, with the league average marked: shows what a value
// means by showing where it sits among the others.
export function DotStrip({ entries, valueOf, exampleCode, format, includeZero = false }) {
  const points = entries
    .map((entry) => ({ entry, value: valueOf(entry) }))
    .filter((point) => point.value !== null && point.value !== undefined && Number.isFinite(Number(point.value)))
    .map((point) => ({ ...point, value: Number(point.value) }));
  const example = points.find((point) => point.entry.clubCode === exampleCode);
  if (!example) return <Unavailable />;

  const values = points.map((point) => point.value);
  let low = Math.min(...values, ...(includeZero ? [0] : []));
  let high = Math.max(...values, ...(includeZero ? [0] : []));
  if (high === low) {
    low -= 1;
    high += 1;
  }
  const { width, height, pad, axisY } = STRIP;
  const x = (value) => pad + ((value - low) / (high - low)) * (width - pad * 2);
  const average = mean(values);

  return (
    <div>
      <svg className="viz-svg explained-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Where every club sits, ${example.entry.clubName ?? example.entry.clubCode} highlighted`}>
        <line className="guide" x1={pad} x2={width - pad} y1={axisY} y2={axisY} />
        {includeZero ? <line className="zero" x1={x(0)} x2={x(0)} y1={8} y2={axisY + 4} /> : null}
        <line x1={x(average)} x2={x(average)} y1={10} y2={axisY + 4} style={{ stroke: "var(--color-base-content)", strokeDasharray: "3 3", opacity: 0.6 }} />
        {points.map((point, index) => {
          const isExample = point.entry.clubCode === exampleCode;
          if (isExample) return null;
          return (
            <motion.circle
              key={point.entry.clubCode}
              cx={x(point.value)}
              cy={axisY - 8 - (index % 3) * 7}
              r={4}
              style={{ fill: "var(--color-base-content)", opacity: 0.3 }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={inView}
              transition={{ duration: 0.35, delay: 0.05 + index * 0.02, ease: EASE_OUT }}
            >
              <title>{`${point.entry.clubName ?? point.entry.clubCode}: ${format(point.value)}`}</title>
            </motion.circle>
          );
        })}
        <motion.g
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={inView}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <circle cx={x(example.value)} cy={axisY - 16} r={7} style={{ fill: "var(--color-primary)", stroke: "var(--color-base-100)", strokeWidth: 2 }}>
            <title>{`${example.entry.clubName ?? example.entry.clubCode}: ${format(example.value)}`}</title>
          </circle>
        </motion.g>
        <text x={x(example.value)} y={10} textAnchor="middle" style={{ fill: "var(--color-primary)" }}>
          {example.entry.clubCode} {format(example.value)}
        </text>
        <text className="axis-text" x={pad} y={height - 4} textAnchor="start">
          {format(Math.min(...values))}
        </text>
        <text className="axis-text" x={width - pad} y={height - 4} textAnchor="end">
          {format(Math.max(...values))}
        </text>
        <text className="axis-text" x={Math.min(Math.max(x(average), 70), width - 70)} y={height - 4} textAnchor="middle">
          avg {format(average)}
        </text>
      </svg>
      <p className="explained-caption">Every dot is a club. Dashed line: league average.</p>
    </div>
  );
}

// A share drawn as 100 squares, so "14.4%" reads as "about 14 of every 100".
export function Waffle({ share, describe }) {
  if (share === null || share === undefined || !Number.isFinite(Number(share))) return <Unavailable />;
  const filled = Math.round(Number(share) * 100);
  return (
    <div>
      <div className="waffle" role="img" aria-label={describe(filled)}>
        {Array.from({ length: 100 }, (_, index) =>
          index < filled ? (
            <motion.i
              key={index}
              className="is-filled"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={inView}
              transition={{ duration: 0.25, delay: 0.05 + index * 0.008, ease: EASE_OUT }}
            />
          ) : (
            <i key={index} />
          ),
        )}
      </div>
      <p className="explained-caption">{describe(filled)}</p>
    </div>
  );
}

const SHOT_ROWS = [
  { label: "Team A", shots: [..."22222222", ..."oooooooo"], fg: "50.0%", efg: "50.0%", sum: "8 twos" },
  { label: "Team B", shots: [..."33332222", ..."oooooooo"], fg: "50.0%", efg: "62.5%", sum: "4 threes + 4 twos" },
];

// Two teams that each make 8 of 16 shots; one of them makes four threes. Same FG%, different eFG%.
export function ShotGrid() {
  return (
    <div>
      {SHOT_ROWS.map((row, rowIndex) => (
        <div key={row.label} className="shot-row">
          <span className="shot-row-label">{row.label}</span>
          <span className="shot-dots" role="img" aria-label={`${row.label}: 16 shots, ${row.sum} made`}>
            {row.shots.map((shot, index) => (
              <motion.i
                key={index}
                className={`shot shot-${shot}`}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={inView}
                transition={{ duration: 0.25, delay: 0.05 + rowIndex * 0.2 + index * 0.02, ease: EASE_OUT }}
              />
            ))}
          </span>
          <span className="shot-row-stats">
            FG% {row.fg} · <b>eFG% {row.efg}</b>
          </span>
        </div>
      ))}
      <p className="explained-caption">
        <span className="shot shot-2" /> made two <span className="shot shot-3" /> made three <span className="shot shot-o" /> miss. Both teams
        make 8 of 16, but a three is worth more, so eFG% gives Team B (8 + 0.5 × 4) ÷ 16 = 62.5%.
      </p>
    </div>
  );
}

// Horizontal bars from a chosen starting value (not zero), so a gap between two similar numbers stays visible.
export function ScaleBars({ rows, min, max, caption }) {
  const usable = rows.filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)));
  if (usable.length < rows.length) return <Unavailable />;
  return (
    <div>
      {rows.map((row, index) => (
        <div key={row.label} className="scale-row">
          <span className="scale-row-label">{row.label}</span>
          <span className="scale-track">
            <motion.i
              className={row.tone === "bad" ? "is-bad" : "is-good"}
              style={{ width: `${Math.max(0, Math.min(100, ((row.value - min) / (max - min)) * 100))}%`, originX: 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={inView}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.15, ease: EASE_OUT }}
            />
          </span>
          <span className="scale-row-value">{row.format(row.value)}</span>
        </div>
      ))}
      {caption ? <p className="explained-caption">{caption}</p> : null}
    </div>
  );
}

// Signed values either side of a centre line, on one shared scale. Green is the good side and red the bad side: right is
// good unless a row is `invert`ed (lower is better), and a `neutral` row is grey because neither side is better.
export function DivergingBars({ rows, caption }) {
  const usable = rows.filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)));
  if (usable.length === 0) return <Unavailable />;
  const maxAbs = Math.max(0.1, ...usable.map((row) => Math.abs(row.value)));
  return (
    <div>
      {rows.map((row, index) => {
        const value = row.value;
        const missing = value === null || value === undefined || !Number.isFinite(Number(value));
        const share = missing ? 0 : (Math.abs(value) / maxAbs) * 50;
        return (
          <div key={row.label} className="scale-row">
            <span className="scale-row-label">{row.label}</span>
            <span className="diverge-track">
              {missing ? null : (
                <motion.i
                  className={row.neutral ? "is-neutral" : (value >= 0) !== Boolean(row.invert) ? "is-good" : "is-bad"}
                  style={{ width: `${share}%`, [value >= 0 ? "left" : "right"]: "50%", originX: value >= 0 ? 0 : 1 }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={inView}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.12, ease: EASE_OUT }}
                />
              )}
            </span>
            <span className="scale-row-value">{missing ? "—" : row.format(value)}</span>
          </div>
        );
      })}
      {caption ? <p className="explained-caption">{caption}</p> : null}
    </div>
  );
}

const DUMBBELL = { width: 320, rowHeight: 30, pad: 18 };

// Actual wins (filled dot) against the wins the scoring suggests (hollow dot), one row per club.
export function Dumbbells({ rows }) {
  const usable = rows.filter((row) => row.wins !== null && row.expected !== null && row.expected !== undefined);
  if (usable.length === 0) return <Unavailable />;
  const values = usable.flatMap((row) => [row.wins, row.expected]);
  const low = Math.floor(Math.min(...values)) - 1;
  const high = Math.ceil(Math.max(...values)) + 1;
  const { width, rowHeight, pad } = DUMBBELL;
  const x = (value) => pad + ((value - low) / (high - low)) * (width - pad * 2);
  const height = usable.length * rowHeight + 4;

  return (
    <div>
      <svg className="viz-svg explained-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Actual wins against expected wins">
        {usable.map((row, index) => {
          const cy = index * rowHeight + 14;
          const difference = row.wins - row.expected;
          return (
            <g key={row.key}>
              <text x={pad} y={cy - 8} style={{ opacity: 0.75 }}>
                {row.label}
              </text>
              <line className="guide" x1={pad} x2={width - pad} y1={cy + 4} y2={cy + 4} />
              <line className={difference >= 0 ? "link-up" : "link-down"} x1={x(row.expected)} x2={x(row.wins)} y1={cy + 4} y2={cy + 4} />
              <circle className="dot-expected" cx={x(row.expected)} cy={cy + 4} r={5}>
                <title>{`Expected wins: ${row.expected.toFixed(1)}`}</title>
              </circle>
              <circle className="dot-actual" cx={x(row.wins)} cy={cy + 4} r={5}>
                <title>{`Actual wins: ${row.wins}`}</title>
              </circle>
              <text x={width - pad} y={cy - 8} textAnchor="end" style={{ fill: difference >= 0 ? "var(--win-4)" : "var(--loss-4)" }}>
                {difference >= 0 ? "+" : ""}
                {difference.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="explained-caption">Filled dot: actual wins. Hollow dot: expected wins.</p>
    </div>
  );
}
