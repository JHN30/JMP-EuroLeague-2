import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { getAdvancedLeaders } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import StatBarCell from "./StatBarCell";
import { barWidthScale } from "./statBarScale";

const SCOPE_LABELS = { RS: "Regular season", all: "All games", PS: "Postseason" };
const MIN_MINUTES_OPTIONS = [0, 20, 50, 100, 300, 500, 1000];

// `value` is the ranked number; `extras` are the other columns for that metric.
const METRICS = {
  per: {
    label: "PER",
    title: "Player efficiency rating",
    valueLabel: "PER",
    format: (entry) => formatDecimal(entry.value),
    extras: [],
    sample: "Minutes played",
    note: "League mean is 15 within the scope and round.",
  },
  winSharesPer48: {
    label: "Win Shares / 48",
    title: "Win Shares per 48 minutes",
    valueLabel: "WS/48",
    format: (entry) => formatDecimal(entry.value, 3),
    extras: [{ label: "WS", render: (entry) => formatDecimal(entry.winShares, 2) }],
    sample: "Minutes played",
    note: "Ranked by rate, so the minutes minimum matters.",
  },
  rapm: {
    label: "RAPM",
    title: "Regularized adjusted plus-minus",
    valueLabel: "RAPM",
    format: (entry) => formatSignedDecimal(entry.value),
    extras: [
      { label: "Offense", render: (entry) => formatSignedDecimal(entry.offense) },
      { label: "Defense", render: (entry) => formatSignedDecimal(entry.defense) },
    ],
    sample: "Minutes tracked",
    showGames: false,
    note:
      "An estimate, not a measurement: points per 100 possessions relative to an average player, whole season, " +
      "shrunk toward zero. A positive defense means fewer points allowed. Differences of a few tenths mean little.",
  },
  onOff: {
    label: "On/off net rating",
    title: "On/off net rating difference",
    valueLabel: "Net diff",
    format: (entry) => formatSignedDecimal(entry.value),
    extras: [
      { label: "On net", render: (entry) => formatSignedDecimal(entry.onNetRating) },
      { label: "Off net", render: (entry) => formatSignedDecimal(entry.offNetRating) },
    ],
    sample: "Minutes on court",
    note:
      "Club net rating with the player on court minus off court, per 100 possessions. A player who never sat has " +
      "no off value and does not rank. A traded player appears once per club.",
  },
};

function minutesOptions(effective) {
  return MIN_MINUTES_OPTIONS.includes(effective)
    ? MIN_MINUTES_OPTIONS
    : [...MIN_MINUTES_OPTIONS, effective].sort((a, b) => a - b);
}

export default function AdvancedLeaderboard({ seasonCode }) {
  const [metric, setMetric] = useState("per");
  const [scope, setScope] = useState(null);
  const [minMinutes, setMinMinutes] = useState(null);
  const config = METRICS[metric];

  const query = useQuery({
    queryKey: ["advanced-leaders", seasonCode, metric, scope, minMinutes],
    queryFn: () =>
      getAdvancedLeaders(seasonCode, {
        metric,
        scope: scope ?? undefined,
        minMinutes: minMinutes ?? undefined,
      }),
    placeholderData: keepPreviousData,
  });

  function changeMetric(next) {
    setMetric(next);
    setMinMinutes(null);
  }

  const data = query.data;
  const entries = (data?.entries ?? []).filter((entry) => entry.value !== null);
  const barScale = barWidthScale(entries.map((entry) => entry.value));

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Advanced metric" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(METRICS).map(([key, entry]) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            className={`btn btn-sm ${metric === key ? "btn-primary" : "btn-ghost bg-base-100"}`}
            onClick={() => changeMetric(key)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <AsyncState status="loading" label="Loading the leaderboard" />
      ) : query.isError ? (
        <AsyncState status="error" message="Could not load the leaderboard." onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            {metric === "rapm" ? (
              <span className="muted pb-1 text-sm">RAPM covers the whole season.</span>
            ) : (
              <TabStrip
                ariaLabel="Advanced leaders scope"
                panelId="advanced-leaders-panel"
                activeKey={data.scope ?? ""}
                onChange={setScope}
                className="w-fit"
                tabs={data.scopes.map((code) => ({ key: code, label: SCOPE_LABELS[code] ?? code }))}
              />
            )}
            <LabelledSelect
              label={`Minimum ${config.sample.toLowerCase()}`}
              labelClassName="text-xs text-base-content/70"
              value={data.minMinutes}
              onChange={(event) => setMinMinutes(Number(event.target.value))}
            >
              {minutesOptions(data.minMinutes).map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? "No minimum" : `${value}+ min`}
                  {value === data.defaultMinMinutes ? " (default)" : ""}
                </option>
              ))}
            </LabelledSelect>
          </div>

          {data.earlySeason ? (
            <p className="rounded-field border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <span className="font-semibold">Not reliable yet:</span> only {data.roundsPlayed} round
              {data.roundsPlayed === 1 ? "" : "s"} played this season, so these rankings are mostly noise.
            </p>
          ) : null}

          <TabPanel id="advanced-leaders-panel" focusKey={`${metric}-${data.scope}`}>
            {entries.length === 0 ? (
              <EmptyText>
                No players with at least {data.minMinutes} minutes yet. Lower the minimum to see more.
              </EmptyText>
            ) : (
              <Panel className="overflow-x-auto overscroll-x-contain p-2">
                <table className="table">
                  <caption className="sr-only">{config.title}</caption>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Team</th>
                      {config.showGames === false ? null : <th>GP</th>}
                      <th>Min</th>
                      {config.extras.map((extra) => (
                        <th key={extra.label}>{extra.label}</th>
                      ))}
                      <th>{config.valueLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={`${entry.personKey}-${entry.clubCode ?? ""}`}>
                        <td>
                          <span className={`rank ${index === 0 ? "rank-1" : ""}`}>{index + 1}</span>
                        </td>
                        <td>
                          <Link
                            to={`/${seasonCode}/players/${entry.personKey}`}
                            className="link link-hover block max-w-40 truncate font-medium sm:max-w-56"
                            title={entry.playerName ?? entry.personKey}
                          >
                            {entry.playerName ?? entry.personKey}
                          </Link>
                        </td>
                        <td>
                          {entry.clubCode ? (
                            <Link to={`/${seasonCode}/teams/${entry.clubCode}`} className="link link-hover">
                              {entry.clubCode}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        {config.showGames === false ? null : <td className="tabular-nums">{entry.games ?? "—"}</td>}
                        <td className="tabular-nums">{formatDecimal(entry.seconds === null ? null : entry.seconds / 60, 0)}</td>
                        {config.extras.map((extra) => (
                          <td key={extra.label} className="tabular-nums">
                            {extra.render(entry)}
                          </td>
                        ))}
                        <StatBarCell widthPct={barScale(entry.value)}>
                          <span className="text-primary font-semibold tabular-nums">{config.format(entry)}</span>
                        </StatBarCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </TabPanel>

          <p className="muted text-xs">
            Top {data.entries.length} by {config.valueLabel}, {data.minMinutes === 0 ? "with no minimum" : `at least ${data.minMinutes} minutes`}.{" "}
            {config.note}
          </p>
        </>
      )}
    </div>
  );
}
