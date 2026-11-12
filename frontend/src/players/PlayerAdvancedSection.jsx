import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { getPlayerAdvanced } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { PlayerAdvancedSkeleton } from "./PlayerPageSkeleton";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import { barFill, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { ordinal, rankTier } from "../teams/teamLeague";
import AdvancedGauge, { VerdictPill } from "./AdvancedGauge";
import { verdictFor } from "./advancedVerdict";

const SCOPE_LABELS = { RS: "Regular season", TS: "Top 16", all: "All games", PS: "Postseason" };
const EM_DASH = "—";

// Samples below these are hidden. On/off is raw (a player's on-court stints against his club's other stints),
// so it needs far more time than RAPM, whose ridge penalty already pulls small samples toward zero.
const ON_OFF_MIN_SECONDS = 300 * 60;
const RAPM_MIN_SECONDS = 20 * 60;
// RAPM is drawn on a fixed scale (points per 100 possessions) so a value of 0.2 looks as small as it is.
const RAPM_SCALE = 2;

const TREND_METRICS = [
  { key: "per", label: "PER", digits: 1 },
  { key: "winShares", label: "Win Shares", digits: 2 },
  { key: "winSharesPer40", label: "WS / 40", digits: 3 },
  { key: "usgPct", label: "USG%", digits: 1, percent: true },
];

function minutes(seconds) {
  return seconds === null || seconds === undefined ? null : seconds / 60;
}

function EarlySeasonNote() {
  return (
    <p className="rounded-field border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <span className="font-semibold">Small sample of data:</span> these ratings and ranks may not be accurate yet, and they can change a
      lot early in the season.
    </p>
  );
}

// On/off is shown whatever the sample, with this line when the player was on the court for less than the minimum.
function isSmallOnCourtSample(seconds) {
  return seconds > 0 && seconds < ON_OFF_MIN_SECONDS;
}

function SmallSampleLine({ seconds }) {
  return (
    <p className="text-xs font-semibold text-warning">
      Based on only {formatDecimal(minutes(seconds), 0)} of {ON_OFF_MIN_SECONDS / 60} minutes on court.
    </p>
  );
}

// ---- Scorecard: every stat with a verdict and a gauge against the league; what it means is in its tip ----

// How each number is written, what it measures, and how to read it. `neutral` stats describe a role, not a quality.
const STATS = {
  per: {
    label: "PER",
    format: (value) => formatDecimal(value),
    tip: "Player efficiency rating",
    what: "Everything a player does on the floor in one number: scoring, rebounds, assists, steals and blocks, minus misses and turnovers. It is built so the average player is 15.",
  },
  winShares: {
    label: "Win Shares",
    format: (value) => formatDecimal(value, 2),
    tip: "Win Shares",
    what: "How many of the team's wins the player is responsible for, from what they did on the floor. It keeps growing through the season, so players who play more have more.",
  },
  winSharesPer40: {
    label: "WS / 40",
    format: (value) => formatDecimal(value, 3),
    tip: "Win Shares per 40 minutes",
    what: "Win Shares per 40 minutes played: the same idea without rewarding only the players who play the most. Around 0.100 is average.",
  },
  usgPct: {
    label: "USG%",
    format: (value) => formatFractionPercent(value),
    tip: "Usage",
    neutral: true,
    what: "How often a possession ends with this player (a shot, free throws or a turnover) while they are on the floor. It describes a role, not quality: a go-to scorer has high usage, a role player low.",
  },
  rapm: {
    label: "RAPM",
    format: (value) => formatSignedDecimal(value),
    tip: "Regularized adjusted plus-minus",
    what: "Estimated points per 100 possessions the team gains with this player against an average player, after adjusting for teammates and opponents. 0 is average; it is a noisy estimate.",
  },
  onOffNet: {
    label: "On / off",
    format: (value) => formatSignedDecimal(value),
    tip: "On/off net rating",
    what: "How much better or worse the team's net rating (points scored minus allowed per 100 possessions) is with the player on the court than off it. It is affected by who else is on the floor.",
  },
};
const SCORECARD = ["per", "winShares", "winSharesPer40", "usgPct", "rapm", "onOffNet"];

function ScoreCard({ statKey, value, rank, hint, caution }) {
  const stat = STATS[statKey];
  const ranked = rank?.rank ? rank : null;
  const verdict = ranked ? verdictFor(ranked.percentile, stat.neutral) : null;

  return (
    <m.div className="flex min-w-0 flex-col rounded-box border border-base-300 bg-base-100 p-3" variants={listItem}>
      <div className="flex items-center justify-between gap-2">
        <span className="muted text-xs font-bold uppercase tracking-wide">
          <HeaderTip tip={`${stat.tip}. ${stat.what}`}>{stat.label}</HeaderTip>
        </span>
        {ranked ? <VerdictPill percentile={ranked.percentile} neutral={stat.neutral} /> : null}
      </div>
      <p className="mt-1 text-3xl font-black leading-none tabular-nums">{value === null || value === undefined ? EM_DASH : stat.format(value)}</p>
      {ranked ? (
        <>
          <AdvancedGauge percentile={ranked.percentile} spread={ranked.spread} format={stat.format} neutral={stat.neutral} label={stat.label} />
          <p className="mt-1 text-xs">
            <span className="font-semibold">{verdict.label}</span>
            <span className="muted">
              {" "}
              · {ordinal(ranked.rank)} of {ranked.of}
              {ranked.spread ? ` · median ${stat.format(ranked.spread.p50)}` : ""}
            </span>
          </p>
        </>
      ) : (
        <p className="muted mt-3 text-sm">{rank ? `Not ranked: under ${rank.minMinutes} minutes played.` : (hint ?? "")}</p>
      )}
      {caution ? <div className="mt-2">{caution}</div> : null}
    </m.div>
  );
}

// One sentence on the whole picture, from the stats that are better when higher.
function ScorecardSummary({ ranks }) {
  const groups = { better: [], average: [], below: [] };
  for (const key of SCORECARD) {
    if (STATS[key].neutral) continue;
    const percentile = ranks?.[key]?.percentile;
    if (percentile === null || percentile === undefined) continue;
    (percentile >= 60 ? groups.better : percentile >= 40 ? groups.average : groups.below).push(STATS[key].label);
  }
  const parts = [];
  if (groups.better.length) parts.push(`better than most players on ${groups.better.join(", ")}`);
  if (groups.average.length) parts.push(`about average on ${groups.average.join(", ")}`);
  if (groups.below.length) parts.push(`below most on ${groups.below.join(", ")}`);
  if (parts.length === 0) return null;
  const usage = ranks?.usgPct?.percentile;
  return (
    <p className="rounded-field border border-base-300 bg-base-100 px-3 py-2 text-sm">
      <span className="font-semibold">In short:</span> compared with the other players this season, {parts.join("; ")}.
      {usage === null || usage === undefined ? "" : ` Usage is ${verdictFor(usage, true).label.replace(/ usage$/i, "").toLowerCase()}, which describes a role, not quality.`}
    </p>
  );
}

// The verdict colours and what each number means, for anyone who wants the detail.
function ReadingGuide({ minMinutes }) {
  return (
    <details className="rounded-box border border-base-300 bg-base-100 p-4">
      <summary className="cursor-pointer text-sm font-semibold">How to read these numbers</summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <p>
          Every number is compared with the other players of the same season and games shown above who have played at least {minMinutes} minutes.
          The coloured bar runs from the worst player to the best, and the marker shows where this player sits. The three values under it are
          what the 10th-percentile player, the median player and the 90th-percentile player have.
        </p>
        <ul className="flex flex-wrap gap-2">
          {[5, 15, 30, 50, 65, 80, 95].map((percentile) => (
            <li key={percentile}>
              <VerdictPill percentile={percentile} />
            </li>
          ))}
        </ul>
        <p className="muted">
          From left to right: the bottom 10%, 10-25%, 25-40%, the middle 20%, 60-75%, 75-90% and the top 10%. Usage uses blue shades because a
          high or low usage is a role, not good or bad.
        </p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {SCORECARD.map((key) => (
            <div key={key}>
              <dt className="font-semibold">{STATS[key].tip}</dt>
              <dd className="muted">{STATS[key].what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

function Scorecard({ rounds, ranks, rapm, onOff }) {
  const latest = rounds[rounds.length - 1];
  const mainOnOff = [...onOff].sort((x, y) => (y.onSeconds ?? 0) - (x.onSeconds ?? 0))[0];
  const values = {
    per: latest.per,
    winShares: latest.winShares,
    winSharesPer40: latest.winSharesPer40,
    usgPct: latest.usgPct,
    rapm: rapm?.rapm ?? null,
    // A club with no on-court time has nothing to show; a small sample is shown with a line saying so.
    onOffNet: mainOnOff && (mainOnOff.onSeconds ?? 0) > 0 ? mainOnOff.netRatingDiff : null,
  };
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="SCORECARD" title={`After round ${latest.round}`} />
      <ScorecardSummary ranks={ranks} />
      <m.div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" variants={listContainer} initial="hidden" animate="show">
        {SCORECARD.map((key) => (
          <ScoreCard
            key={key}
            statKey={key}
            value={values[key]}
            rank={ranks?.[key]}
            hint={key === "onOffNet" && onOff.length === 0 ? "No on/off data for this scope." : undefined}
            caution={key === "onOffNet" && isSmallOnCourtSample(mainOnOff?.onSeconds) ? <SmallSampleLine seconds={mainOnOff.onSeconds} /> : undefined}
          />
        ))}
      </m.div>
      <p className="muted text-xs">
        {latest.gamesPlayed} games, {formatDecimal(minutes(latest.secondsPlayed), 0)} minutes. Hover or tap a name for what it measures.
      </p>
      <ReadingGuide minMinutes={ranks?.per?.minMinutes ?? 100} />
    </section>
  );
}

// ---- Trend: how a rating built up round by round, against today's league median ----

// How many round labels the x axis can hold before it thins them out.
const MAX_ROUND_LABELS = 12;

function TrendFact({ label, value, sub, tone }) {
  return (
    <div className="min-w-0">
      <p className="muted text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-black leading-tight tabular-nums ${tone ?? ""}`}>{value}</p>
      <p className="muted truncate text-xs">{sub}</p>
    </div>
  );
}

// The rounds since which the latest side of the median (above or below) has held, as "R7".
function sideSince(points, median) {
  const last = points[points.length - 1];
  const above = last.value >= median;
  let start = points.length - 1;
  while (start > 0 && points[start - 1].value >= median === above) start -= 1;
  return { above, round: points[start].round };
}

// The player's running value per round as a line, shaded green where it is above the league median and red where it
// is below, with every round on the axis (thinned when there are many) and the latest value called out. Drawn in SVG
// stretched to the box, so the line keeps its width (`non-scaling-stroke`, which is why it fades in rather than drawing
// itself: a drawn-in dash is measured in the stretched units) and the dots and labels are HTML on top.
function RoundChart({ points, median, metric }) {
  const values = points.map((point) => point.value);
  const all = median === null ? values : [...values, median];
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = (high - low || Math.abs(high) || 1) * 0.12;
  // A rating that never goes below zero keeps its scale at zero rather than padding into negatives.
  const [bottom, top] = [low >= 0 ? Math.max(0, low - pad) : low - pad, high + pad];
  const x = (index) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const y = (value) => 100 - ((value - bottom) / (top - bottom)) * 100;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)} ${y(point.value)}`).join("");
  const medianY = median === null ? null : y(median);
  const area = medianY === null ? null : `${line}L${x(points.length - 1)} ${medianY}L${x(0)} ${medianY}Z`;
  const every = Math.ceil(points.length / MAX_ROUND_LABELS);
  const format = (value) => `${formatDecimal(value, metric.digits)}${metric.percent ? "%" : ""}`;
  const last = points[points.length - 1];

  return (
    <div className="grid grid-cols-[2.75rem_1fr] gap-x-2">
      {/* The y axis: the top, middle and bottom of the scale. */}
      <div aria-hidden="true" className="muted relative h-44 text-[0.65rem] tabular-nums">
        {[top, (top + bottom) / 2, bottom].map((value, index) => (
          <span key={index} className="absolute right-0 -translate-y-1/2" style={{ top: `${index * 50}%` }}>
            {formatDecimal(value, metric.digits > 1 ? 2 : 1)}
          </span>
        ))}
      </div>
      <div className="relative h-44">
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {medianY === null ? null : (
              <>
                <clipPath id="trend-above">
                  <rect x="0" y="0" width="100" height={medianY} />
                </clipPath>
                <clipPath id="trend-below">
                  <rect x="0" y={medianY} width="100" height={100 - medianY} />
                </clipPath>
              </>
            )}
          </defs>
          {[0, 50, 100].map((at) => (
            <line key={at} x1="0" x2="100" y1={at} y2={at} className="text-base-300" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {area ? (
            <>
              <path d={area} clipPath="url(#trend-above)" className="text-success" fill="currentColor" fillOpacity="0.18" />
              <path d={area} clipPath="url(#trend-below)" className="text-error" fill="currentColor" fillOpacity="0.15" />
              <line x1="0" x2="100" y1={medianY} y2={medianY} className="text-base-content/50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            </>
          ) : null}
          <m.path
            d={line}
            className="text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        {medianY === null ? null : (
          <span
            className="muted absolute right-0 -translate-y-full rounded bg-base-100/80 px-1 text-[0.65rem] font-semibold tabular-nums"
            style={{ top: `${medianY}%` }}
          >
            League median {format(median)}
          </span>
        )}
        {points.map((point, index) => (
          <span
            key={point.round}
            title={`Round ${point.round}: ${format(point.value)}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-base-100 bg-primary ${point === last ? "h-3.5 w-3.5" : "h-2 w-2"}`}
            style={{ left: `${x(index)}%`, top: `${y(point.value)}%` }}
          />
        ))}
        <span
          className="absolute -translate-x-full -translate-y-[160%] rounded bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-content tabular-nums"
          style={{ left: `${x(points.length - 1)}%`, top: `${y(last.value)}%` }}
        >
          {format(last.value)}
        </span>
      </div>
      <span />
      <div aria-hidden="true" className="muted relative mt-1 h-4 text-[0.65rem] tabular-nums">
        {points.map((point, index) =>
          index % every === 0 || index === points.length - 1 ? (
            <span key={point.round} className="absolute -translate-x-1/2" style={{ left: `${x(index)}%` }}>
              R{point.round}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function RoundTrend({ rounds, ranks }) {
  const [metricKey, setMetricKey] = useState("per");
  const metric = TREND_METRICS.find((entry) => entry.key === metricKey);
  const scaled = (value) => (value === null || value === undefined ? null : metric.percent ? value * 100 : value);
  const median = scaled(ranks?.[metric.key]?.spread?.p50 ?? null);
  const points = rounds.map((point) => ({ round: point.round, value: scaled(point[metric.key]) })).filter((point) => point.value !== null);
  const format = (value) => `${formatDecimal(value, metric.digits)}${metric.percent ? "%" : ""}`;

  let facts = null;
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const peak = points.reduce((best, point) => (point.value > best.value ? point : best));
    const lowest = points.reduce((worst, point) => (point.value < worst.value ? point : worst));
    const gap = median === null ? null : last.value - median;
    const since = median === null ? null : sideSince(points, median);
    facts = (
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TrendFact label={`Now, round ${last.round}`} value={format(last.value)} sub={metric.label} />
        <TrendFact
          label="Against the median"
          value={gap === null ? EM_DASH : `${gap >= 0 ? "+" : ""}${formatDecimal(gap, metric.digits)}`}
          tone={gap === null ? null : gap >= 0 ? "text-success" : "text-error"}
          sub={since === null ? "no league median" : `${since.above ? "above" : "below"} it since R${since.round}`}
        />
        <TrendFact label="Peak" value={format(peak.value)} sub={`after round ${peak.round}`} />
        <TrendFact label="Low" value={format(lowest.value)} sub={`after round ${lowest.round}`} />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="ROUND BY ROUND" title="How the ratings built up" />
      {points.length < 2 ? (
        <EmptyText>Not enough rounds yet to chart a trend.</EmptyText>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TabStrip
              ariaLabel="Rating to chart"
              scrolling
              panelId="player-advanced-trend"
              activeKey={metricKey}
              onChange={setMetricKey}
              className="w-fit"
              tabs={TREND_METRICS.map((entry) => ({ key: entry.key, label: entry.label }))}
            />
            <p className="muted text-xs">Running value through each round, never a single round.</p>
          </div>
          <Panel id="player-advanced-trend" className="p-4">
            {facts}
            <div
              role="img"
              aria-label={`${metric.label} round by round, from ${format(points[0].value)} after round ${points[0].round} to ${format(points[points.length - 1].value)} after round ${points[points.length - 1].round}${median === null ? "" : `, against a league median of ${format(median)}`}`}
            >
              <RoundChart key={metric.key} points={points} median={median} metric={metric} />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Show the round-by-round numbers</summary>
              <div className="mt-2 overflow-x-auto overscroll-x-contain">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th className="text-right">{metric.label}</th>
                      {median === null ? null : <th className="text-right">Against the median</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.round}>
                        <td>R{point.round}</td>
                        <td className="text-right tabular-nums">{format(point.value)}</td>
                        {median === null ? null : (
                          <td className={`text-right tabular-nums ${point.value >= median ? "text-success" : "text-error"}`}>
                            {point.value - median >= 0 ? "+" : ""}
                            {formatDecimal(point.value - median, metric.digits)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Panel>
        </>
      )}
    </section>
  );
}

// ---- Impact: on / off (the team's rating with the player on the floor and off it) beside RAPM ----

// The ratings in the on/off table. `higher` says which way helps the team, for the colour of the difference.
const ON_OFF_ROWS = [
  { label: "Offensive rating", tip: "Points the team scores per 100 possessions", on: "onOrtg", off: "offOrtg", diff: "ortgDiff", higher: true },
  { label: "Defensive rating", tip: "Points the team allows per 100 possessions; lower is better", on: "onDrtg", off: "offDrtg", diff: "drtgDiff", higher: false },
  { label: "Net rating", tip: "Points scored minus points allowed per 100 possessions", on: "onNetRating", off: "offNetRating", diff: "netRatingDiff", higher: true },
];

function MinutesSplit({ onSeconds, offSeconds }) {
  const on = onSeconds ?? 0;
  const total = on + (offSeconds ?? 0);
  const share = total > 0 ? (on / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-base-content/20">
        <m.div className="h-full bg-primary" style={{ width: `${share}%`, transformOrigin: "left" }} {...barFill} />
      </div>
      <p className="muted mt-1 flex justify-between gap-2 text-xs tabular-nums">
        <span>
          <span className="font-semibold text-base-content">On court</span> {Math.round(minutes(onSeconds) ?? 0).toLocaleString()} min
        </span>
        <span>
          <span className="font-semibold text-base-content">Off court</span> {Math.round(minutes(offSeconds) ?? 0).toLocaleString()} min
        </span>
      </p>
    </div>
  );
}

function OnOffCard({ row, rank, isMain }) {
  const heading = row.clubName ?? row.clubCode;
  const net = row.netRatingDiff;
  return (
    <Panel className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h4 className="flex min-w-0 items-center gap-2 font-semibold">
          {row.crestUrl ? <RevealImage src={row.crestUrl} className="h-7 w-7 flex-none object-contain" /> : null}
          <span className="truncate">{heading}</span>
        </h4>
        <div className="text-left sm:text-right">
          <span className={`text-3xl font-black tabular-nums ${net === null ? "" : net > 0 ? "text-success" : "text-error"}`}>{formatSignedDecimal(net)}</span>
          {isMain && rank?.rank ? (
            <span className="ml-2 align-middle">
              <VerdictPill percentile={rank.percentile} />
            </span>
          ) : null}
          <p className="muted text-xs">net rating difference, per 100 possessions</p>
        </div>
      </div>
      {isSmallOnCourtSample(row.onSeconds) ? (
        <div className="mb-3">
          <SmallSampleLine seconds={row.onSeconds} />
        </div>
      ) : null}
      <MinutesSplit onSeconds={row.onSeconds} offSeconds={row.offSeconds} />
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="table table-sm" aria-label={`${heading}: ratings with him on and off the court`}>
          <thead>
            <tr>
              <th />
              {/* Short headings on a phone, so the four columns fit the card. */}
              <th className="text-right">
                <span className="sm:hidden">On</span>
                <span className="max-sm:hidden">On court</span>
              </th>
              <th className="text-right">
                <span className="sm:hidden">Off</span>
                <span className="max-sm:hidden">Off court</span>
              </th>
              <th className="text-right">
                <span className="sm:hidden">Diff.</span>
                <span className="max-sm:hidden">Difference</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ON_OFF_ROWS.map((entry) => {
              const diff = row[entry.diff];
              const helps = diff === null || diff === undefined || diff === 0 ? null : entry.higher ? diff > 0 : diff < 0;
              return (
                <tr key={entry.label}>
                  <th className="font-medium">
                    <HeaderTip tip={entry.tip}>{entry.label}</HeaderTip>
                  </th>
                  <td className="text-right tabular-nums">{formatDecimal(row[entry.on])}</td>
                  <td className="text-right tabular-nums">{formatDecimal(row[entry.off])}</td>
                  <td className={`text-right font-bold tabular-nums ${helps === null ? "" : helps ? "text-success" : "text-error"}`}>
                    {formatSignedDecimal(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function OnOffSection({ onOff, rank }) {
  // A club the player was never on the court for has no card.
  const rows = onOff.filter((row) => (row.onSeconds ?? 0) > 0);
  const mainClub = [...rows].sort((x, y) => (y.onSeconds ?? 0) - (x.onSeconds ?? 0))[0]?.clubCode;
  return (
    <section aria-label="On / off" className="flex min-w-0 flex-col gap-3">
      <h3 className="font-semibold">
        <HeaderTip tip="The team's ratings with the player on the court and off it">On / off</HeaderTip>
      </h3>
      {rows.length === 0 ? (
        <EmptyText>No on/off data for this scope.</EmptyText>
      ) : (
        // The cards share the column's height, so the column ends level with RAPM beside it.
        <div className="flex flex-1 flex-col gap-3 *:flex-1">
          {rows.map((row) => (
            <OnOffCard key={row.clubCode} row={row} rank={rank} isMain={row.clubCode === mainClub} />
          ))}
        </div>
      )}
    </section>
  );
}

// His estimated effect, drawn from the middle outwards.
function ImpactBar({ label, tip, value }) {
  const clamped = Math.max(-RAPM_SCALE, Math.min(RAPM_SCALE, value ?? 0));
  const half = (Math.abs(clamped) / RAPM_SCALE) * 50;
  const positive = clamped >= 0;
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.25rem] items-center gap-3 py-1.5 sm:grid-cols-[6rem_1fr_4rem]">
      <span className="text-sm font-medium">{tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}</span>
      <div aria-hidden="true" className="relative h-2.5 rounded-full bg-base-300">
        <span className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-base-content/40" />
        {value === null || value === undefined ? null : (
          <m.div
            className={`absolute top-0 h-full ${positive ? "rounded-r-full bg-success" : "rounded-l-full bg-error"}`}
            style={{ width: `${half}%`, [positive ? "left" : "right"]: "50%", transformOrigin: positive ? "left" : "right" }}
            {...barFill}
          />
        )}
      </div>
      <span className="text-right font-bold tabular-nums">{formatSignedDecimal(value)}</span>
    </div>
  );
}

function RapmSection({ rapm, rank }) {
  let body;
  if (!rapm) {
    body = <EmptyText>No RAPM estimate for this player.</EmptyText>;
  } else if (rapm.seconds === null || rapm.seconds < RAPM_MIN_SECONDS) {
    body = (
      <EmptyText>
        Sample too small to show: {formatDecimal(minutes(rapm.seconds), 0)} minutes tracked, at least {RAPM_MIN_SECONDS / 60} needed.
      </EmptyText>
    );
  } else {
    body = (
      <Panel className="flex flex-1 flex-col p-4">
        <p className="muted mb-1 text-xs font-bold tracking-wide uppercase">Points per 100 possessions against an average player</p>
        <ImpactBar label="Overall" tip="Regularized adjusted plus-minus: his estimated effect on the team's scoring margin" value={rapm.rapm} />
        <ImpactBar label="Offense" value={rapm.offense} />
        <ImpactBar label="Defense" tip="Positive means fewer points allowed" value={rapm.defense} />
        <div aria-hidden="true" className="muted grid grid-cols-[4.5rem_1fr_3.25rem] gap-3 text-[0.65rem] tabular-nums sm:grid-cols-[6rem_1fr_4rem]">
          <span />
          <span className="flex justify-between">
            <span>
              −{RAPM_SCALE}
              <span className="max-sm:hidden"> worse</span>
            </span>
            <span>0</span>
            <span>
              <span className="max-sm:hidden">better </span>+{RAPM_SCALE}
            </span>
          </span>
          <span />
        </div>
        {/* Where the overall estimate sits among the league's ranked players, on the scorecard's gauge. */}
        {rank?.rank ? (
          <div className="mt-4 border-t border-base-300 pt-3">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-semibold">Among the league</span>
              <span className="muted text-xs">
                {ordinal(rank.rank)} of {rank.of} with at least {rank.minMinutes} minutes
                {rank.spread ? ` · median ${STATS.rapm.format(rank.spread.p50)}` : ""}
              </span>
            </p>
            <AdvancedGauge percentile={rank.percentile} spread={rank.spread} format={STATS.rapm.format} label="RAPM" />
          </div>
        ) : null}
        <p className="muted mt-auto pt-3 text-xs">
          {formatDecimal(minutes(rapm.seconds), 0)} minutes tracked over {rapm.possessionsOffense ?? EM_DASH} offensive and{" "}
          {rapm.possessionsDefense ?? EM_DASH} defensive possessions. An estimate, not a measurement: whole season, shrunk toward zero.
          Differences of a few tenths mean little.
        </p>
      </Panel>
    );
  }

  return (
    <section aria-label="RAPM" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          <HeaderTip tip="Regularized adjusted plus-minus">RAPM</HeaderTip>
        </h3>
        {rank?.rank ? (
          <span className="flex items-center gap-2 text-sm font-bold tabular-nums">
            <VerdictPill percentile={rank.percentile} />
            <span className={rankTier({ rank: rank.rank, of: rank.of }).text}>
              {ordinal(rank.rank)} of {rank.of} players
            </span>
          </span>
        ) : rank ? (
          <span className="muted text-sm">Not ranked: under {rank.minMinutes} minutes</span>
        ) : null}
      </div>
      {body}
    </section>
  );
}

function ImpactSection({ onOff, rapm, ranks }) {
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="IMPACT" title="The team with him on the floor" />
      {/* Side by side from xl, both columns the height of the taller one. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OnOffSection onOff={onOff} rank={ranks?.onOffNet} />
        <RapmSection rapm={rapm} rank={ranks?.rapm} />
      </div>
      {onOff.some((row) => (row.onSeconds ?? 0) > 0) ? (
        <p className="muted text-xs">
          On / off is in points per 100 possessions. The off-court side is the club&apos;s other stints in this scope, so a star on a deep
          team can look worse than he is. A traded player has one card per club.
        </p>
      ) : null}
    </section>
  );
}

export default function PlayerAdvancedSection({ seasonCode, personKey }) {
  const [scope, setScope] = useState(null);

  const query = useQuery({
    queryKey: ["player-advanced", seasonCode, personKey, scope],
    queryFn: () => getPlayerAdvanced(seasonCode, personKey, { scope: scope ?? undefined }),
    placeholderData: keepPreviousData,
  });

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced player stats" skeleton={<PlayerAdvancedSkeleton />} />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced player stats." onRetry={() => query.refetch()} />;
  }

  const { scopes, rounds, onOff, rapm, ranks, earlySeason } = query.data;
  const activeScope = query.data.scope;
  if (!activeScope || rounds.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {earlySeason ? <EarlySeasonNote /> : null}
        <EmptyText>Advanced stats are not available yet for this player.</EmptyText>
        {rapm ? <RapmSection rapm={rapm} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TabStrip
        ariaLabel="Advanced stats scope"
        level={2}
        scrolling
        panelId="player-advanced-panel"
        activeKey={activeScope}
        onChange={setScope}
        className="w-fit"
        tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
      />
      {earlySeason ? <EarlySeasonNote /> : null}
      <TabPanel id="player-advanced-panel" focusKey={activeScope} scroll={false}>
        <m.div className="flex flex-col gap-8" variants={sectionContainer} initial="hidden" animate="show" key={activeScope}>
          <m.div variants={sectionItem}>
            <Scorecard rounds={rounds} ranks={ranks} rapm={rapm} onOff={onOff} />
          </m.div>
          <m.div variants={sectionItem}>
            <RoundTrend key={activeScope} rounds={rounds} ranks={ranks} />
          </m.div>
          <m.div variants={sectionItem}>
            <ImpactSection onOff={onOff} rapm={rapm} ranks={ranks} />
          </m.div>
        </m.div>
      </TabPanel>
    </div>
  );
}
