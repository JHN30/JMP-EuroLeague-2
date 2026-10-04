import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getPlayerAdvanced } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import { barFill, listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import TrendChart from "../comparisons/TrendChart";
import { ordinal, rankTier } from "../teams/teamLeague";
import AdvancedGauge, { VerdictPill } from "./AdvancedGauge";
import { verdictFor } from "./advancedVerdict";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };
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

function EarlySeasonNote({ roundsPlayed }) {
  return (
    <p className="rounded-field border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <span className="font-semibold">Not reliable yet:</span> only {roundsPlayed} round{roundsPlayed === 1 ? "" : "s"} played
      this season, so this is mostly noise.
    </p>
  );
}

// ---- Scorecard: every stat with a verdict, a gauge against the league and what it means ----

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

function ScoreCard({ statKey, value, rank, hint }) {
  const stat = STATS[statKey];
  const ranked = rank?.rank ? rank : null;
  const verdict = ranked ? verdictFor(ranked.percentile, stat.neutral) : null;

  return (
    <motion.div className="flex flex-col rounded-box border border-base-300 bg-base-100 p-4" variants={listItem}>
      <div className="flex items-center justify-between gap-2">
        <span className="muted text-xs font-bold uppercase tracking-wide">
          <HeaderTip tip={stat.tip}>{stat.label}</HeaderTip>
        </span>
        {ranked ? <VerdictPill percentile={ranked.percentile} neutral={stat.neutral} /> : null}
      </div>
      <p className="mt-1 text-4xl font-black leading-none tabular-nums">{value === null || value === undefined ? EM_DASH : stat.format(value)}</p>
      {ranked ? (
        <>
          <AdvancedGauge percentile={ranked.percentile} spread={ranked.spread} format={stat.format} neutral={stat.neutral} label={stat.label} />
          <p className="mt-1 text-sm">
            <span className="font-semibold">{verdict.label}</span>
            <span className="muted">
              {" "}
              · {ordinal(ranked.rank)} of {ranked.of}
              {ranked.spread ? ` · league median ${stat.format(ranked.spread.p50)}` : ""}
            </span>
          </p>
        </>
      ) : (
        <p className="muted mt-3 text-sm">{rank ? `Not ranked: under ${rank.minMinutes} minutes played.` : (hint ?? "")}</p>
      )}
      <p className="muted mt-3 text-xs leading-snug">{stat.what}</p>
    </motion.div>
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
        <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
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
    // The on/off section hides a sample under the minimum, so the scorecard does too.
    onOffNet: mainOnOff && (mainOnOff.onSeconds ?? 0) >= ON_OFF_MIN_SECONDS ? mainOnOff.netRatingDiff : null,
  };
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="SCORECARD" title={`After round ${latest.round}`} />
      <ScorecardSummary ranks={ranks} />
      <motion.div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" variants={listContainer} initial="hidden" animate="show">
        {SCORECARD.map((key) => (
          <ScoreCard
            key={key}
            statKey={key}
            value={values[key]}
            rank={ranks?.[key]}
            hint={key === "onOffNet" && onOff.length === 0 ? "No on/off data for this scope." : undefined}
          />
        ))}
      </motion.div>
      <p className="muted text-xs">
        {latest.gamesPlayed} games, {formatDecimal(minutes(latest.secondsPlayed), 0)} minutes.
      </p>
      <ReadingGuide minMinutes={ranks?.per?.minMinutes ?? 100} />
    </section>
  );
}

// ---- Trend: how a rating built up round by round ----

function RoundTrend({ rounds }) {
  const [metricKey, setMetricKey] = useState("per");
  const metric = TREND_METRICS.find((entry) => entry.key === metricKey);

  const labels = useMemo(() => rounds.map((point) => `R${point.round}`), [rounds]);
  const series = useMemo(
    () => [
      {
        label: metric.label,
        points: rounds.map((point) => {
          const value = point[metric.key];
          if (value === null) return null;
          return Number((metric.percent ? value * 100 : value).toFixed(metric.digits));
        }),
      },
    ],
    [rounds, metric],
  );

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="ROUND BY ROUND" title="How the ratings built up" />
      {rounds.length < 2 ? (
        <EmptyText>Not enough rounds yet to chart a trend.</EmptyText>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TabStrip
              ariaLabel="Rating to chart"
              panelId="player-advanced-trend"
              activeKey={metricKey}
              onChange={setMetricKey}
              className="w-fit"
              tabs={TREND_METRICS.map((entry) => ({ key: entry.key, label: entry.label }))}
            />
            <p className="muted text-xs">Running value through each round, never a single round.</p>
          </div>
          <div id="player-advanced-trend">
            <TrendChart title={metric.label} labels={labels} series={series} collapseTable />
          </div>
        </>
      )}
    </section>
  );
}

// ---- On / off: the team's rating with the player on the floor and off it ----

function OnOffCard({ row, rank, isMain }) {
  const onMinutes = minutes(row.onSeconds);
  const offMinutes = minutes(row.offSeconds);
  const heading = row.clubName ?? row.clubCode;
  const crest = row.crestUrl ? <RevealImage src={row.crestUrl} className="h-7 w-7 flex-none object-contain" /> : null;

  if (onMinutes === null || row.onSeconds < ON_OFF_MIN_SECONDS) {
    return (
      <Panel className="p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          {crest}
          {heading}
        </h3>
        <p className="muted mt-1 text-sm">
          Sample too small to show: {formatDecimal(onMinutes, 0)} minutes on court, at least {ON_OFF_MIN_SECONDS / 60} needed.
        </p>
      </Panel>
    );
  }

  const net = row.netRatingDiff;
  const better = net !== null && net > 0;
  return (
    <Panel className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          {crest}
          {heading}
        </h3>
        <div className="text-right">
          <span className={`text-3xl font-black tabular-nums ${net === null ? "" : better ? "text-success" : "text-error"}`}>
            {formatSignedDecimal(net)}
          </span>
          {isMain && rank?.rank ? (
            <span className="ml-2 align-middle">
              <VerdictPill percentile={rank.percentile} />
            </span>
          ) : null}
          <p className="muted text-xs">net rating with him on court, per 100 possessions</p>
        </div>
      </div>
      <p className="muted mb-1 grid grid-cols-2 gap-4 text-center text-xs font-bold tracking-wide uppercase">
        <span>On court · {formatDecimal(onMinutes, 0)} min</span>
        <span>Off court · {formatDecimal(offMinutes, 0)} min</span>
      </p>
      <motion.div className="flex flex-col" variants={listContainer} initial="hidden" animate="show">
        <ComparisonRow
          label="Offensive rating"
          tip="Points the team scores per 100 possessions"
          direction="higher"
          animated
          rawA={row.onOrtg}
          rawB={row.offOrtg}
          displayA={formatDecimal(row.onOrtg)}
          displayB={formatDecimal(row.offOrtg)}
        />
        <ComparisonRow
          label="Defensive rating"
          tip="Points the team allows per 100 possessions"
          direction="lower"
          animated
          rawA={row.onDrtg}
          rawB={row.offDrtg}
          displayA={formatDecimal(row.onDrtg)}
          displayB={formatDecimal(row.offDrtg)}
        />
      </motion.div>
      <p className="muted mt-2 text-xs">
        With him on the court the offense is {formatSignedDecimal(row.ortgDiff)} ({row.ortgDiff >= 0 ? "better" : "worse"}) and the defense is{" "}
        {formatSignedDecimal(row.drtgDiff)} ({row.drtgDiff <= 0 ? "better, fewer points allowed" : "worse, more points allowed"}), against the
        club&apos;s stints without him.
      </p>
    </Panel>
  );
}

function OnOffSection({ onOff, rank, earlySeason, roundsPlayed }) {
  const mainClub = [...onOff].sort((x, y) => (y.onSeconds ?? 0) - (x.onSeconds ?? 0))[0]?.clubCode;
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="ON / OFF" title="Team rating with and without him" />
      {onOff.length === 0 ? (
        <EmptyText>No on/off data for this scope.</EmptyText>
      ) : (
        <>
          {earlySeason ? <EarlySeasonNote roundsPlayed={roundsPlayed} /> : null}
          <div className={`grid gap-3 ${onOff.length > 1 ? "xl:grid-cols-2" : ""}`}>
            {onOff.map((row) => (
              <OnOffCard key={row.clubCode} row={row} rank={rank} isMain={row.clubCode === mainClub} />
            ))}
          </div>
          <p className="muted text-xs">
            Points per 100 possessions. The off-court side is the club&apos;s other stints in this scope, so a star on a deep team can look
            worse than he is. A traded player has one card per club.
          </p>
        </>
      )}
    </section>
  );
}

// ---- RAPM: his estimated effect, drawn from the middle outwards ----

function ImpactBar({ label, tip, value }) {
  const clamped = Math.max(-RAPM_SCALE, Math.min(RAPM_SCALE, value ?? 0));
  const half = (Math.abs(clamped) / RAPM_SCALE) * 50;
  const positive = clamped >= 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3 py-2">
      <span className="text-sm font-medium">{tip ? <HeaderTip tip={tip}>{label}</HeaderTip> : label}</span>
      <div aria-hidden="true" className="relative h-2.5 rounded-full bg-base-300">
        <span className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-base-content/40" />
        {value === null || value === undefined ? null : (
          <motion.div
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

function RapmSection({ rapm, rank, earlySeason, roundsPlayed }) {
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
      <Panel className="p-4">
        {earlySeason ? <EarlySeasonNote roundsPlayed={roundsPlayed} /> : null}
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="muted text-xs font-bold tracking-wide uppercase">Points per 100 possessions against an average player</span>
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
        <ImpactBar label="Overall" tip="Regularized adjusted plus-minus: his estimated effect on the team's scoring margin" value={rapm.rapm} />
        <ImpactBar label="Offense" value={rapm.offense} />
        <ImpactBar label="Defense" tip="Positive means fewer points allowed" value={rapm.defense} />
        <div aria-hidden="true" className="muted grid grid-cols-[6rem_1fr_4rem] gap-3 text-[0.65rem] tabular-nums">
          <span />
          <span className="flex justify-between">
            <span>−{RAPM_SCALE} worse</span>
            <span>0</span>
            <span>better +{RAPM_SCALE}</span>
          </span>
          <span />
        </div>
        <p className="muted mt-3 text-xs">
          {formatDecimal(minutes(rapm.seconds), 0)} minutes tracked over {rapm.possessionsOffense ?? EM_DASH} offensive and{" "}
          {rapm.possessionsDefense ?? EM_DASH} defensive possessions. An estimate, not a measurement: whole season, shrunk toward zero.
          Differences of a few tenths mean little.
        </p>
      </Panel>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="RAPM" title="Regularized adjusted plus-minus" />
      {body}
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

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced player stats" />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced player stats." onRetry={() => query.refetch()} />;
  }

  const { scopes, rounds, onOff, rapm, ranks, earlySeason, roundsPlayed } = query.data;
  const activeScope = query.data.scope;
  if (!activeScope || rounds.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <EmptyText>Advanced stats are not available yet for this player.</EmptyText>
        {rapm ? <RapmSection rapm={rapm} earlySeason={earlySeason} roundsPlayed={roundsPlayed} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TabStrip
        ariaLabel="Advanced stats scope"
        panelId="player-advanced-panel"
        activeKey={activeScope}
        onChange={setScope}
        className="w-fit"
        tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
      />
      <TabPanel id="player-advanced-panel" focusKey={activeScope} scroll={false}>
        <motion.div className="flex flex-col gap-8" variants={sectionContainer} initial="hidden" animate="show" key={activeScope}>
          <motion.div variants={sectionItem}>
            <Scorecard rounds={rounds} ranks={ranks} rapm={rapm} onOff={onOff} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <RoundTrend key={activeScope} rounds={rounds} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <OnOffSection onOff={onOff} rank={ranks?.onOffNet} earlySeason={earlySeason} roundsPlayed={roundsPlayed} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <RapmSection rapm={rapm} rank={ranks?.rapm} earlySeason={earlySeason} roundsPlayed={roundsPlayed} />
          </motion.div>
        </motion.div>
      </TabPanel>
    </div>
  );
}
