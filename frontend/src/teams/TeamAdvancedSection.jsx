import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTeamAdvanced, getTeamLineups } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import TrendChart from "../comparisons/TrendChart";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };
const EM_DASH = "—";

const TREND_METRICS = [
  { key: "netRating", label: "Net rating" },
  { key: "offensiveRating", label: "Offensive rating" },
  { key: "defensiveRating", label: "Defensive rating" },
  { key: "srs", label: "SRS" },
  { key: "adjNetRating", label: "Opponent-adjusted net rating" },
];

const LINEUP_SIZES = [
  { value: 5, label: "5-man" },
  { value: 3, label: "3-man" },
  { value: 2, label: "2-man" },
];

const MIN_POSSESSIONS = [25, 50, 100, 200, 300];
const DEFAULT_MIN_POSSESSIONS = 100;
const LINEUP_LIMIT = 15;

function ratio(numerator, denominator) {
  if (numerator === null || numerator === undefined || !denominator) return null;
  return numerator / denominator;
}

function MetricTile({ label, value, hint }) {
  return (
    <Panel className="p-3">
      <span className="block text-lg font-semibold tabular-nums">{value}</span>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      {hint ? <span className="muted block text-xs">{hint}</span> : null}
    </Panel>
  );
}

function RatingTrendCard({ trend }) {
  const [metric, setMetric] = useState("netRating");
  const activeLabel = TREND_METRICS.find((entry) => entry.key === metric).label;

  const labels = useMemo(() => trend.map((point) => `R${point.round}`), [trend]);
  const series = useMemo(
    () => [
      {
        label: activeLabel,
        points: trend.map((point) => (point[metric] === null ? null : Number(point[metric].toFixed(1)))),
      },
    ],
    [trend, metric, activeLabel],
  );

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="TREND" title="Rating by round" />
      {trend.length < 2 ? (
        <EmptyText>Not enough rounds played yet to chart a trend.</EmptyText>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <LabelledSelect
              label="Metric"
              labelClassName="text-xs text-base-content/70"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {TREND_METRICS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </LabelledSelect>
            <p className="muted pb-1 text-xs">
              Cumulative through each round, per 100 possessions. A dash means no value for that round
              (SRS needs a connected schedule).
            </p>
          </div>
          <TrendChart title={activeLabel} labels={labels} series={series} />
        </>
      )}
    </section>
  );
}

const SPLIT_ROWS = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
  { key: "last5", label: "Last 5" },
  { key: "last10", label: "Last 10" },
];

function SplitsCard({ splits }) {
  if (!splits) return null;
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="SPLITS" title="Home, away and recent form" />
      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>Split</th>
              <th>GP</th>
              <th>W-L</th>
              <th title="Average margin of victory">MOV</th>
              <th>ORtg</th>
              <th>DRtg</th>
              <th>Net</th>
              <th>Pace</th>
            </tr>
          </thead>
          <tbody>
            {SPLIT_ROWS.map(({ key, label }) => {
              const games = splits[`${key}Games`];
              const wins = splits[`${key}Wins`];
              return (
                <tr key={key}>
                  <td className="font-medium">{label}</td>
                  <td>{games}</td>
                  <td className="tabular-nums">{games > 0 ? `${wins}-${games - wins}` : EM_DASH}</td>
                  <td className="tabular-nums">{formatSignedDecimal(splits[`${key}Mov`])}</td>
                  <td className="tabular-nums">{formatDecimal(splits[`${key}OffensiveRating`])}</td>
                  <td className="tabular-nums">{formatDecimal(splits[`${key}DefensiveRating`])}</td>
                  <td className="font-semibold tabular-nums">{formatSignedDecimal(splits[`${key}NetRating`])}</td>
                  <td className="tabular-nums">{formatDecimal(splits[`${key}Pace`])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <p className="muted text-xs">State after round {splits.roundNumber}. Ratings are per 100 possessions.</p>
    </section>
  );
}

function timeShare(seconds, pbp) {
  const parts = [pbp.timeLeadingSeconds, pbp.timeTrailingSeconds, pbp.timeTiedSeconds];
  if (parts.some((part) => part === null)) return null;
  return ratio(seconds, parts[0] + parts[1] + parts[2]);
}

function PlayByPlayCard({ pbp }) {
  if (!pbp) return null;
  const perFlaggedGame = (total) => formatDecimal(ratio(total, pbp.flaggedGames));
  const clutchPoints =
    pbp.clutchPointsFor === null || pbp.clutchPointsAgainst === null
      ? EM_DASH
      : `${pbp.clutchPointsFor}-${pbp.clutchPointsAgainst}`;

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="PLAY BY PLAY" title="Game flow" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Possessions / game" value={formatDecimal(ratio(pbp.countedPossessions, pbp.games))} />
        <MetricTile
          label="Possession length"
          value={pbp.avgPossessionSeconds === null ? EM_DASH : `${formatDecimal(pbp.avgPossessionSeconds)} s`}
        />
        <MetricTile label="Lead changes / game" value={formatDecimal(pbp.leadChangesPerGame)} />
        <MetricTile label="Ties / game" value={formatDecimal(pbp.tiesPerGame)} />
        <MetricTile label="Largest lead" value={formatDecimal(pbp.largestLead, 0)} />
        <MetricTile label="Longest run" value={formatDecimal(pbp.longestRun, 0)} hint="Unanswered points" />
        <MetricTile label="Runs of 6+" value={pbp.runs6Plus ?? EM_DASH} />
        <MetricTile label="Assisted FG" value={formatFractionPercent(pbp.assistedFgPct)} />
        <MetricTile label="Time leading" value={formatFractionPercent(timeShare(pbp.timeLeadingSeconds, pbp))} />
        <MetricTile label="Time trailing" value={formatFractionPercent(timeShare(pbp.timeTrailingSeconds, pbp))} />
        <MetricTile
          label="Clutch points (for-against)"
          value={clutchPoints}
          hint={pbp.clutchSeconds === null ? undefined : `${formatDecimal(pbp.clutchSeconds / 60, 0)} clutch min`}
        />
        <MetricTile label="Fast-break pts / game" value={perFlaggedGame(pbp.fastBreakPoints)} />
        <MetricTile label="Second-chance pts / game" value={perFlaggedGame(pbp.secondChancePoints)} />
        <MetricTile label="Pts off turnovers / game" value={perFlaggedGame(pbp.pointsOffTurnoverPoints)} />
      </div>
      <p className="muted text-xs">
        Clutch is the last five minutes of regulation and overtime with a margin of 5 or less.
      </p>
    </section>
  );
}

function ShotZonesCard({ zones }) {
  if (zones.length === 0) return null;
  const maxShare = Math.max(...zones.map((zone) => zone.attemptShare ?? 0));

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="SHOOTING" title="Shot zones" />
      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Attempts</th>
              <th>Made</th>
              <th>FG%</th>
              <th>Pts / shot</th>
              <th>Share of attempts</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.zone}>
                <td className="font-medium">{zone.zone}</td>
                <td className="tabular-nums">{zone.attempts ?? EM_DASH}</td>
                <td className="tabular-nums">{zone.made ?? EM_DASH}</td>
                <td className="tabular-nums">{formatFractionPercent(zone.fgPct)}</td>
                <td className="tabular-nums">{formatDecimal(ratio(zone.points, zone.attempts), 2)}</td>
                <td className="stat-bar-cell">
                  {zone.attemptShare !== null && maxShare > 0 ? (
                    <span className="bar" aria-hidden="true">
                      <span className="bar-fill" style={{ width: `${(zone.attemptShare / maxShare) * 100}%` }} />
                    </span>
                  ) : null}
                  <span className="num-val">{formatFractionPercent(zone.attemptShare)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="muted text-xs">
        Zones are the feed&apos;s own letters (A-J); they have no names yet. A zone is listed only if the club
        shot from it.
      </p>
    </section>
  );
}

function LineupsCard({ seasonCode, clubCode, scope }) {
  const [size, setSize] = useState(5);
  const [minPossessions, setMinPossessions] = useState(DEFAULT_MIN_POSSESSIONS);

  const query = useQuery({
    queryKey: ["team-lineups", seasonCode, clubCode, scope, size, minPossessions],
    queryFn: () => getTeamLineups(seasonCode, clubCode, { scope, size, minPossessions, limit: LINEUP_LIMIT }),
    placeholderData: keepPreviousData,
  });

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="LINEUPS" title="Best lineups" />
      <div className="flex flex-wrap items-end gap-3">
        <LabelledSelect
          label="Lineup"
          labelClassName="text-xs text-base-content/70"
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        >
          {LINEUP_SIZES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </LabelledSelect>
        <LabelledSelect
          label="Minimum possessions"
          labelClassName="text-xs text-base-content/70"
          value={minPossessions}
          onChange={(event) => setMinPossessions(Number(event.target.value))}
        >
          {MIN_POSSESSIONS.map((value) => (
            <option key={value} value={value}>
              {value}+
            </option>
          ))}
        </LabelledSelect>
      </div>

      {query.isLoading ? (
        <AsyncState status="loading" label="Loading lineups" compact />
      ) : query.isError ? (
        <AsyncState status="error" message="Could not load lineups." onRetry={() => query.refetch()} />
      ) : query.data.lineups.length === 0 ? (
        <EmptyText>No {size}-man lineups with at least {minPossessions} possessions yet.</EmptyText>
      ) : (
        <Panel className="overflow-x-auto overscroll-x-contain p-2">
          <table className="table">
            <thead>
              <tr>
                <th>Lineup</th>
                <th>GP</th>
                <th>Min</th>
                <th title="Possessions on offense">Poss</th>
                <th>ORtg</th>
                <th>DRtg</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {query.data.lineups.map((lineup) => (
                <tr key={lineup.lineup}>
                  <td>
                    <ul className="text-sm">
                      {(lineup.lineupNames ?? lineup.lineup).split(lineup.lineupNames ? "; " : ",").map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </td>
                  <td>{lineup.games}</td>
                  <td className="tabular-nums">{formatDecimal(ratio(lineup.seconds, 60), 0)}</td>
                  <td className="tabular-nums">{lineup.possessionsFor ?? EM_DASH}</td>
                  <td className="tabular-nums">{formatDecimal(lineup.ortg)}</td>
                  <td className="tabular-nums">{formatDecimal(lineup.drtg)}</td>
                  <td className="font-semibold tabular-nums">{formatSignedDecimal(lineup.netRating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <p className="muted text-xs">
        Ordered by net rating (points per 100 possessions) among lineups with at least {minPossessions} possessions.
        Small samples swing a lot, so treat the top of a low minimum with care.
      </p>
    </section>
  );
}

export default function TeamAdvancedSection({ seasonCode, clubCode }) {
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

  const { scopes, trend, splits, pbp, zones } = query.data;
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
        <div className="flex flex-col gap-8">
          <RatingTrendCard key={activeScope} trend={trend} />
          <SplitsCard splits={splits} />
          <PlayByPlayCard pbp={pbp} />
          <ShotZonesCard zones={zones} />
          <LineupsCard seasonCode={seasonCode} clubCode={clubCode} scope={activeScope} />
        </div>
      </TabPanel>
    </div>
  );
}
