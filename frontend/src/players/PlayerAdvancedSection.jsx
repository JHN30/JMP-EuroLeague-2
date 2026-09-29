import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPlayerAdvanced } from "../lib/api";
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

// Samples below these are hidden. On/off is raw (a player's on-court stints against his club's other stints),
// so it needs far more time than RAPM, whose ridge penalty already pulls small samples toward zero.
const ON_OFF_MIN_SECONDS = 300 * 60;
const RAPM_MIN_SECONDS = 20 * 60;

const TREND_METRICS = [
  { key: "per", label: "PER", digits: 1 },
  { key: "winShares", label: "Win Shares", digits: 2 },
  { key: "winSharesPer48", label: "Win Shares / 48", digits: 3 },
  { key: "usgPct", label: "USG%", digits: 1, percent: true },
];

function minutes(seconds) {
  return seconds === null || seconds === undefined ? null : seconds / 60;
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

function EarlySeasonNote({ roundsPlayed }) {
  return (
    <p className="rounded-field border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <span className="font-semibold">Not reliable yet:</span> only {roundsPlayed} round{roundsPlayed === 1 ? "" : "s"} played
      this season, so this is mostly noise.
    </p>
  );
}

function RoundTrend({ rounds }) {
  const [metricKey, setMetricKey] = useState("usgPct");
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

  if (rounds.length < 2) return <EmptyText>Not enough rounds yet to chart a trend.</EmptyText>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <LabelledSelect
          label="Metric"
          labelClassName="text-xs text-base-content/70"
          value={metricKey}
          onChange={(event) => setMetricKey(event.target.value)}
        >
          {TREND_METRICS.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </LabelledSelect>
        <p className="muted pb-1 text-xs">Cumulative through each round, never a per-round value.</p>
      </div>
      <TrendChart title={metric.label} labels={labels} series={series} />
    </div>
  );
}

function SeasonTiles({ rounds }) {
  const latest = rounds[rounds.length - 1];
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="RATINGS" title={`After round ${latest.round}`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="PER" value={formatDecimal(latest.per)} hint="League mean is 15" />
        <MetricTile label="Win Shares" value={formatDecimal(latest.winShares, 2)} />
        <MetricTile label="WS / 48" value={formatDecimal(latest.winSharesPer48, 3)} />
        <MetricTile label="USG%" value={formatFractionPercent(latest.usgPct)} />
        <MetricTile label="Games" value={latest.gamesPlayed} />
        <MetricTile label="Minutes" value={formatDecimal(minutes(latest.secondsPlayed), 0)} />
      </div>
    </section>
  );
}

function OnOffCard({ row }) {
  const onMinutes = minutes(row.onSeconds);
  const offMinutes = minutes(row.offSeconds);
  const heading = row.clubName ?? row.clubCode;

  if (onMinutes === null || row.onSeconds < ON_OFF_MIN_SECONDS) {
    return (
      <Panel className="p-4">
        <h3 className="font-semibold">{heading}</h3>
        <p className="muted mt-1 text-sm">
          Sample too small to show: {formatDecimal(onMinutes, 0)} minutes on court, at least {ON_OFF_MIN_SECONDS / 60} needed.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <h3 className="px-2 pt-2 font-semibold">{heading}</h3>
      <table className="table">
        <thead>
          <tr>
            <th />
            <th>ORtg</th>
            <th>DRtg</th>
            <th>Net</th>
            <th>Poss</th>
            <th>Min</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">On court</td>
            <td className="tabular-nums">{formatDecimal(row.onOrtg)}</td>
            <td className="tabular-nums">{formatDecimal(row.onDrtg)}</td>
            <td className="font-semibold tabular-nums">{formatSignedDecimal(row.onNetRating)}</td>
            <td className="tabular-nums">{row.onPossessionsFor ?? EM_DASH}</td>
            <td className="tabular-nums">{formatDecimal(onMinutes, 0)}</td>
          </tr>
          <tr>
            <td className="font-medium">Off court</td>
            <td className="tabular-nums">{formatDecimal(row.offOrtg)}</td>
            <td className="tabular-nums">{formatDecimal(row.offDrtg)}</td>
            <td className="font-semibold tabular-nums">{formatSignedDecimal(row.offNetRating)}</td>
            <td className="tabular-nums">{row.offPossessionsFor ?? EM_DASH}</td>
            <td className="tabular-nums">{formatDecimal(offMinutes, 0)}</td>
          </tr>
          <tr>
            <td className="font-medium">Difference</td>
            <td className="tabular-nums">{formatSignedDecimal(row.ortgDiff)}</td>
            <td className="tabular-nums" title="A higher DRtg means a worse defense">
              {formatSignedDecimal(row.drtgDiff)}
            </td>
            <td className="font-semibold tabular-nums">{formatSignedDecimal(row.netRatingDiff)}</td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

function OnOffSection({ onOff, earlySeason, roundsPlayed }) {
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader kicker="ON / OFF" title="Team rating with and without him" />
      {onOff.length === 0 ? (
        <EmptyText>No on/off data for this scope.</EmptyText>
      ) : (
        <>
          {earlySeason ? <EarlySeasonNote roundsPlayed={roundsPlayed} /> : null}
          <div className="flex flex-col gap-3">
            {onOff.map((row) => (
              <OnOffCard key={row.clubCode} row={row} />
            ))}
          </div>
          <p className="muted text-xs">
            Points per 100 possessions. The off-court row is the club&apos;s other stints in this scope; a higher
            DRtg difference means a worse defense while he plays. A traded player has one card per club.
          </p>
        </>
      )}
    </section>
  );
}

function RapmSection({ rapm, earlySeason, roundsPlayed }) {
  let body;
  if (!rapm) {
    body = <EmptyText>No RAPM estimate for this player.</EmptyText>;
  } else if (rapm.seconds === null || rapm.seconds < RAPM_MIN_SECONDS) {
    body = (
      <EmptyText>
        Sample too small to show: {formatDecimal(minutes(rapm.seconds), 0)} minutes tracked, at least{" "}
        {RAPM_MIN_SECONDS / 60} needed.
      </EmptyText>
    );
  } else {
    body = (
      <>
        {earlySeason ? <EarlySeasonNote roundsPlayed={roundsPlayed} /> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MetricTile label="RAPM" value={formatSignedDecimal(rapm.rapm)} />
          <MetricTile label="Offense" value={formatSignedDecimal(rapm.offense)} />
          <MetricTile label="Defense" value={formatSignedDecimal(rapm.defense)} hint="Positive = fewer points allowed" />
          <MetricTile label="Minutes" value={formatDecimal(minutes(rapm.seconds), 0)} hint="Sample" />
          <MetricTile
            label="Possessions"
            value={`${rapm.possessionsOffense ?? EM_DASH} / ${rapm.possessionsDefense ?? EM_DASH}`}
            hint="Offense / defense"
          />
        </div>
        <p className="muted text-xs">
          An estimate, not a measurement: points per 100 possessions relative to an average player, whole season,
          shrunk toward zero. Differences of a few tenths mean little.
        </p>
      </>
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

  const { scopes, rounds, onOff, rapm, earlySeason, roundsPlayed } = query.data;
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
      <TabPanel id="player-advanced-panel" focusKey={activeScope}>
        <div className="flex flex-col gap-8">
          <SeasonTiles rounds={rounds} />
          <RoundTrend key={activeScope} rounds={rounds} />
          <OnOffSection onOff={onOff} earlySeason={earlySeason} roundsPlayed={roundsPlayed} />
          <RapmSection rapm={rapm} earlySeason={earlySeason} roundsPlayed={roundsPlayed} />
        </div>
      </TabPanel>
    </div>
  );
}
