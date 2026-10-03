import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getTeamAdvanced, getTeamLineups } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import { EASE_OUT, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import RatingsChart from "./RatingsChart";
import { fetchTeamRosterStats } from "./teamRosterStats";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };
const EM_DASH = "—";

const LINEUP_TABS = [
  { key: "5", label: "5-man" },
  { key: "3", label: "3-man" },
  { key: "2", label: "2-man" },
];
// 100 possessions is the sample worth showing; where no lineup of a size has reached it yet, "auto" falls back to 50.
const TARGET_POSSESSIONS = 100;
const FALLBACK_POSSESSIONS = 50;
const MINIMUM_CHOICES = [50, 100, 200, 300];
const LINEUP_LIMIT = 10;

function ratio(numerator, denominator) {
  if (numerator === null || numerator === undefined || !denominator) return null;
  return numerator / denominator;
}

const signedTone = (value) => (value === null || value === undefined ? "" : value >= 0 ? "text-success" : "text-error");

// A bar from the middle: green to the right for a positive value, red to the left for a negative one. `maxAbs` is the
// value that fills a half, so bars in one group share a scale.
function DivergingBar({ value, maxAbs }) {
  const half = value === null || value === undefined ? 0 : Math.min(50, (Math.abs(value) / maxAbs) * 50);
  const positive = (value ?? 0) >= 0;
  return (
    <div aria-hidden="true" className="relative h-2 w-full overflow-hidden rounded-full bg-base-300">
      <motion.div
        className={`absolute inset-y-0 rounded-full ${positive ? "bg-success" : "bg-error"}`}
        style={positive ? { left: "50%" } : { right: "50%" }}
        initial={{ width: 0 }}
        animate={{ width: `${half}%` }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
      />
      <span className="absolute inset-y-0 left-1/2 w-px bg-base-content/40" />
    </div>
  );
}

function RatingsCard({ trend }) {
  const rows = trend.filter((point) => point.offensiveRating !== null && point.defensiveRating !== null);
  const latest = rows.at(-1);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="RATINGS"
        title="Offense and defense through the season"
        trailing={
          latest ? (
            <span className={`stat-badge ${latest.netRating >= 0 ? "stat-badge-positive" : "stat-badge-negative"}`}>
              Net {formatSignedDecimal(latest.netRating)} after R{latest.round}
            </span>
          ) : null
        }
      />
      {rows.length < 2 ? (
        <EmptyText>Not enough rounds played yet to chart the ratings.</EmptyText>
      ) : (
        <>
          <RatingsChart
            rounds={rows.map((point) => `R${point.round}`)}
            offense={rows.map((point) => Number(point.offensiveRating.toFixed(1)))}
            defense={rows.map((point) => Number(point.defensiveRating.toFixed(1)))}
          />
          <p className="muted mt-3 text-sm">
            Points scored and allowed per 100 possessions, cumulative through each round. The shaded gap between the lines is
            the net rating: green when the offense is ahead of the defense, red when it is behind, and the wider the better.
          </p>
        </>
      )}
    </Panel>
  );
}

const SPLITS = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last5", label: "Last 5" },
  { key: "last10", label: "Last 10" },
];

function SplitCard({ label, split, maxAbs }) {
  const { games, wins, mov, ortg, drtg, net, pace } = split;
  return (
    <Panel className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className="muted text-xs">{games === 1 ? "1 game" : `${games} games`}</span>
      </div>
      {games > 0 ? (
        <>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-black tracking-tight tabular-nums">
              {wins}-{games - wins}
            </span>
            <span className={`text-lg font-bold tabular-nums ${signedTone(net)}`}>{formatSignedDecimal(net)}</span>
          </div>
          <div className="mt-1">
            <DivergingBar value={net} maxAbs={maxAbs} />
            <p className="muted mt-1 text-xs">Net rating</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="muted">Offense</dt>
            <dd className="text-right font-semibold tabular-nums">{formatDecimal(ortg)}</dd>
            <dt className="muted">Defense</dt>
            <dd className="text-right font-semibold tabular-nums">{formatDecimal(drtg)}</dd>
            <dt className="muted">Margin</dt>
            <dd className="text-right font-semibold tabular-nums">{formatSignedDecimal(mov)}</dd>
            <dt className="muted">Pace</dt>
            <dd className="text-right font-semibold tabular-nums">{formatDecimal(pace)}</dd>
          </dl>
        </>
      ) : (
        <p className="muted mt-3 text-sm">{EM_DASH}</p>
      )}
    </Panel>
  );
}

function SplitsCards({ splits }) {
  if (!splits) return null;
  const items = SPLITS.map(({ key, label }) => ({
    label,
    split: {
      games: splits[`${key}Games`],
      wins: splits[`${key}Wins`],
      mov: splits[`${key}Mov`],
      ortg: splits[`${key}OffensiveRating`],
      drtg: splits[`${key}DefensiveRating`],
      net: splits[`${key}NetRating`],
      pace: splits[`${key}Pace`],
    },
  }));
  const maxAbs = Math.max(5, ...items.map((item) => Math.abs(item.split.net ?? 0)));

  return (
    <section>
      <PanelHeader kicker="SPLITS" title="Home, away and recent form" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <SplitCard key={item.label} label={item.label} split={item.split} maxAbs={maxAbs} />
        ))}
      </div>
      <p className="muted mt-2 text-xs">
        State after round {splits.roundNumber}. Ratings are per 100 possessions; the bar is the net rating on one shared scale.
      </p>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

const TIME_SEGMENTS = [
  { key: "lead", label: "Leading", fill: "bg-success" },
  { key: "tied", label: "Tied", fill: "bg-base-content/35" },
  { key: "trail", label: "Trailing", fill: "bg-error" },
];

function GameFlowCard({ pbp }) {
  if (!pbp) return null;
  const seconds = { lead: pbp.timeLeadingSeconds, tied: pbp.timeTiedSeconds, trail: pbp.timeTrailingSeconds };
  const timed = Object.values(seconds).every((value) => value !== null);
  const total = timed ? seconds.lead + seconds.tied + seconds.trail : 0;

  const hasClutch = pbp.clutchPointsFor !== null && pbp.clutchPointsAgainst !== null && pbp.clutchSeconds > 0;
  const clutchTotal = hasClutch ? pbp.clutchPointsFor + pbp.clutchPointsAgainst : 0;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="PLAY BY PLAY" title="How games unfold" />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <p className="muted mb-2 text-xs font-bold uppercase tracking-wide">Time in the game</p>
          {total > 0 ? (
            <>
              <div className="mb-1 flex items-baseline justify-between text-lg font-bold tabular-nums">
                <span className="text-success">{formatFractionPercent(seconds.lead / total, 0)}</span>
                <span className="muted text-sm font-semibold">{formatFractionPercent(seconds.tied / total, 0)} tied</span>
                <span className="text-error">{formatFractionPercent(seconds.trail / total, 0)}</span>
              </div>
              <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-base-300">
                {TIME_SEGMENTS.map((segment) => (
                  <motion.div
                    key={segment.key}
                    className={segment.fill}
                    initial={{ width: 0 }}
                    animate={{ width: `${(seconds[segment.key] / total) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
                  />
                ))}
              </div>
              <p className="muted mt-2 text-sm">
                Share of game time spent leading, tied and trailing, over {pbp.timedGames === 1 ? "1 game" : `${pbp.timedGames} games`}.
              </p>
            </>
          ) : (
            <p className="muted text-sm">{EM_DASH}</p>
          )}
        </div>

        <div>
          <p className="muted mb-2 text-xs font-bold uppercase tracking-wide">Clutch points</p>
          {hasClutch ? (
            <>
              <div className="mb-1 flex items-baseline justify-between text-lg font-bold tabular-nums">
                <span className="text-success">{pbp.clutchPointsFor}</span>
                <span className="text-error">{pbp.clutchPointsAgainst}</span>
              </div>
              <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-base-300">
                <motion.div
                  className="bg-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${clutchTotal === 0 ? 50 : (pbp.clutchPointsFor / clutchTotal) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
                />
                <div className="flex-1 bg-error" />
              </div>
              <p className="muted mt-2 text-sm">
                Scored against allowed in {formatDecimal(pbp.clutchSeconds / 60, 0)} clutch minutes over{" "}
                {pbp.clutchGames === 1 ? "1 game" : `${pbp.clutchGames} games`}: the last five minutes with a margin of 5 or less.
              </p>
            </>
          ) : (
            <p className="muted text-sm">No clutch minutes yet.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-base-300 pt-4">
        <Fact label="Lead changes / game" value={formatDecimal(pbp.leadChangesPerGame)} />
        <Fact label="Ties / game" value={formatDecimal(pbp.tiesPerGame)} />
        <Fact label="Largest lead" value={formatDecimal(pbp.largestLead, 0)} />
        <Fact label="Longest run" value={pbp.longestRun === null ? EM_DASH : `${formatDecimal(pbp.longestRun, 0)} pts`} />
        <Fact label="Runs of 6+" value={pbp.runs6Plus ?? EM_DASH} />
        <Fact label="Assisted FG" value={formatFractionPercent(pbp.assistedFgPct, 0)} />
        <Fact label="Possessions / game" value={formatDecimal(ratio(pbp.countedPossessions, pbp.games))} />
        <Fact label="Possession length" value={pbp.avgPossessionSeconds === null ? EM_DASH : `${formatDecimal(pbp.avgPossessionSeconds)} s`} />
      </div>
    </Panel>
  );
}

function titleCase(text) {
  return text.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, lead, letter) => lead + letter.toUpperCase());
}

function initials(fullName) {
  const [last = "", first = ""] = fullName.split(",").map((part) => part.trim());
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function PlayerFace({ name, imageUrl }) {
  return (
    <span
      title={titleCase(name.split(",").reverse().join(" ").trim())}
      className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full bg-base-300 text-xs font-bold ring-2 ring-base-100"
    >
      {initials(name)}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full bg-base-300 object-cover object-top"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

function LineupRow({ lineup, photos, maxAbsNet, badges }) {
  const keys = lineup.lineup.split(",");
  const names = (lineup.lineupNames ?? "").split("; ");

  return (
    <motion.li
      variants={sectionItem}
      className="grid items-center gap-x-10 gap-y-2 border-b border-base-300 py-3 last:border-0 lg:grid-cols-[24rem_minmax(0,1fr)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {keys.map((key, index) => (
              <PlayerFace key={key} name={names[index] ?? key} imageUrl={photos?.get(key)?.playerImageUrl} />
            ))}
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span key={badge.label} className={`stat-badge ${badge.tone}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <p className="muted mt-1 truncate text-sm" title={lineup.lineupNames ?? undefined}>
          {names.map((name) => titleCase(name.split(",")[0])).join(" · ")}
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="muted text-xs font-bold uppercase tracking-wide">Net rating</span>
          <span className={`text-lg font-bold tabular-nums ${signedTone(lineup.netRating)}`}>
            {formatSignedDecimal(lineup.netRating)}
          </span>
        </div>
        <DivergingBar value={lineup.netRating} maxAbs={maxAbsNet} />
        <p className="muted mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums">
          <span>ORtg {formatDecimal(lineup.ortg)}</span>
          <span>DRtg {formatDecimal(lineup.drtg)}</span>
          <span>{lineup.possessionsFor ?? EM_DASH} poss</span>
          <span>{formatDecimal(ratio(lineup.seconds, 60), 0)} min</span>
          <span>{lineup.games} GP</span>
        </p>
      </div>
    </motion.li>
  );
}

function emptyLineupMessage(size, possessions) {
  const hint =
    size === 5
      ? "Five-man lineups usually need a dozen games or more to get there, so try the 3-man or 2-man view."
      : "It usually takes a few games.";
  return `No ${size}-man lineup has reached ${possessions} possessions yet. ${hint}`;
}

function LineupsCard({ seasonCode, clubCode, scope }) {
  const [size, setSize] = useState("5");
  const [choice, setChoice] = useState("auto");
  const sizeNumber = Number(size);
  const target = choice === "auto" ? TARGET_POSSESSIONS : Number(choice);

  const lineupsQuery = (minPossessions, enabled = true) => ({
    queryKey: ["team-lineups", seasonCode, clubCode, scope, sizeNumber, minPossessions],
    queryFn: () => getTeamLineups(seasonCode, clubCode, { scope, size: sizeNumber, minPossessions, limit: LINEUP_LIMIT }),
    placeholderData: keepPreviousData,
    enabled,
  });
  const primary = useQuery(lineupsQuery(target));
  // Only in auto: when no lineup of this size has 100 possessions yet, look at 50 instead of showing nothing.
  const useFallback = choice === "auto" && primary.isSuccess && !primary.isPlaceholderData && primary.data.lineups.length === 0;
  const fallback = useQuery(lineupsQuery(FALLBACK_POSSESSIONS, useFallback));
  const active = useFallback ? fallback : primary;
  const usedPossessions = useFallback ? FALLBACK_POSSESSIONS : target;

  // The roster's photos, by person key. Regular-season stats cover every player who has played for the club.
  const photosQuery = useQuery({
    queryKey: ["team-roster-stats", seasonCode, "RS", clubCode],
    queryFn: () => fetchTeamRosterStats(seasonCode, "RS", clubCode),
  });

  const lineups = active.data?.lineups ?? [];
  const maxAbsNet = Math.max(5, ...lineups.map((lineup) => Math.abs(lineup.netRating ?? 0)));
  const mostUsed = lineups.reduce((best, lineup) => ((lineup.possessionsFor ?? 0) > (best?.possessionsFor ?? -1) ? lineup : best), null);

  function badgesFor(lineup, index) {
    const badges = [];
    if (index === 0) badges.push({ label: "Best net rating", tone: "stat-badge-positive" });
    if (lineups.length > 1 && lineup === mostUsed) badges.push({ label: "Most used", tone: "stat-badge-neutral" });
    return badges;
  }

  return (
    <section>
      <PanelHeader kicker="LINEUPS" title="Best lineups" />
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TabStrip ariaLabel="Lineup size" panelId="team-lineups-panel" activeKey={size} onChange={setSize} tabs={LINEUP_TABS} />
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Minimum possessions
          <select
            className="select select-bordered select-sm"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value="auto">Auto (100, else 50)</option>
            {MINIMUM_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value}+
              </option>
            ))}
          </select>
        </label>
      </div>

      <TabPanel id="team-lineups-panel" focusKey={size} scroll={false}>
        {active.isLoading || (useFallback && fallback.isLoading) ? (
          <AsyncState status="loading" label="Loading lineups" compact />
        ) : active.isError ? (
          <AsyncState status="error" message="Could not load lineups." onRetry={() => active.refetch()} />
        ) : lineups.length === 0 ? (
          <EmptyText>{emptyLineupMessage(sizeNumber, usedPossessions)}</EmptyText>
        ) : (
          <Panel className="p-4">
            {useFallback ? (
              <p className="mb-2">
                <span className="stat-badge stat-badge-neutral">
                  No {sizeNumber}-man lineup has reached {TARGET_POSSESSIONS} possessions yet, so this shows {FALLBACK_POSSESSIONS}+
                </span>
              </p>
            ) : null}
            <motion.ul
              key={`${size}-${usedPossessions}`}
              variants={sectionContainer}
              initial="hidden"
              animate="show"
            >
              {lineups.map((lineup, index) => (
                <LineupRow
                  key={lineup.lineup}
                  lineup={lineup}
                  photos={photosQuery.data}
                  maxAbsNet={maxAbsNet}
                  badges={badgesFor(lineup, index)}
                />
              ))}
            </motion.ul>
          </Panel>
        )}
      </TabPanel>
      <p className="muted mt-2 text-xs">
        Ordered by net rating (points per 100 possessions) among lineups with at least {usedPossessions} possessions. Small
        samples swing a lot, so treat the top of a low minimum with care.
      </p>
    </section>
  );
}

function ShootingPointer({ onOpenShooting }) {
  if (!onOpenShooting) return null;
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="eyebrow mb-1">SHOOTING</p>
        <p className="text-sm">Shot zones, the court map and how opponents shoot against the club are on the Shooting tab.</p>
      </div>
      <button type="button" className="btn btn-sm btn-outline" onClick={onOpenShooting}>
        Open Shooting →
      </button>
    </Panel>
  );
}

export default function TeamAdvancedSection({ seasonCode, clubCode, onOpenShooting }) {
  const [scope, setScope] = useState(null);

  const query = useQuery({
    queryKey: ["team-advanced", seasonCode, clubCode, scope],
    queryFn: () => getTeamAdvanced(seasonCode, clubCode, { scope: scope ?? undefined }),
    placeholderData: keepPreviousData,
  });

  if (query.isLoading) return <AsyncState status="loading" label="Loading advanced team stats" />;
  if (query.isError) {
    return <AsyncState status="error" message="Could not load advanced team stats." onRetry={() => query.refetch()} />;
  }

  const { scopes, trend, splits, pbp } = query.data;
  const activeScope = query.data.scope;
  if (!activeScope || trend.length === 0) {
    return <EmptyText>Advanced stats are not available yet for this club.</EmptyText>;
  }

  return (
    <div className="flex flex-col gap-6">
      <TabStrip
        ariaLabel="Advanced stats scope"
        panelId="team-advanced-panel"
        activeKey={activeScope}
        onChange={setScope}
        className="w-fit"
        tabs={scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
      />
      <TabPanel id="team-advanced-panel" focusKey={activeScope}>
        <motion.div key={activeScope} className="flex flex-col gap-8" variants={sectionContainer} initial="hidden" animate="show">
          <motion.div variants={sectionItem}>
            <RatingsCard trend={trend} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <SplitsCards splits={splits} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <GameFlowCard pbp={pbp} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <LineupsCard seasonCode={seasonCode} clubCode={clubCode} scope={activeScope} />
          </motion.div>
          <motion.div variants={sectionItem}>
            <ShootingPointer onOpenShooting={onOpenShooting} />
          </motion.div>
        </motion.div>
      </TabPanel>
    </div>
  );
}
