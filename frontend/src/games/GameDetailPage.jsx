import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getBoxScore, getCoverage, getGame, getPlayByPlay } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import DataCoveragePanel from "../lib/DataCoveragePanel";
import EmptyText from "../lib/EmptyText";
import {
  formatCount,
  formatDateTime as formatDateTimeShared,
  formatMinutes,
  formatPercentage,
  formatPeriod,
  formatSignedDiff,
} from "../lib/format";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { useActiveTheme, themeColor } from "../lib/useActiveTheme";

const GAME_TABS = [
  { key: "box-score", label: "Box score" },
  { key: "game-flow", label: "Game flow" },
  { key: "comparison", label: "Team comparison" },
  { key: "shooting", label: "Shooting" },
  { key: "play-by-play", label: "Play-by-play" },
];

function formatDateTime(scheduledAt) {
  return formatDateTimeShared(scheduledAt, { dateStyle: "full" });
}

function teamName(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

function madeAttempted(made, attempted) {
  if (made == null && attempted == null) return "-";
  return `${made ?? "-"}-${attempted ?? "-"}`;
}

const BOX_SCORE_COLUMNS = [
  ["MIN", (row) => formatMinutes(row.timePlayed)],
  ["PTS", (row) => row.points ?? "-"],
  ["2PT", (row) => madeAttempted(row.fieldGoalsMade2, row.fieldGoalsAttempted2)],
  ["3PT", (row) => madeAttempted(row.fieldGoalsMade3, row.fieldGoalsAttempted3)],
  ["FT", (row) => madeAttempted(row.freeThrowsMade, row.freeThrowsAttempted)],
  ["REB", (row) => row.totalRebounds ?? "-"],
  ["OREB", (row) => row.offensiveRebounds ?? "-"],
  ["DREB", (row) => row.defensiveRebounds ?? "-"],
  ["AST", (row) => row.assistances ?? "-"],
  ["STL", (row) => row.steals ?? "-"],
  ["TO", (row) => row.turnovers ?? "-"],
  ["BLK", (row) => row.blocksFavour ?? "-"],
  ["BLKA", (row) => row.blocksAgainst ?? "-"],
  ["FC", (row) => row.foulsCommited ?? "-"],
  ["FD", (row) => row.foulsReceived ?? "-"],
  ["+/-", (row) => formatSignedDiff(row.plusMinus)],
  ["PIR", (row) => row.valuation ?? "-"],
];

function BoxScoreTable({ players, teamTotal, team, won }) {
  const rows = players.filter((row) => row.side === teamTotal?.side);
  const name = teamName(team);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {team?.crestUrl ? (
          <img
            src={team.crestUrl}
            alt=""
            className="h-8 w-8 flex-none object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <h3 className="font-semibold">{name}</h3>
        {won ? <span className="badge badge-primary badge-sm">Winner</span> : null}
        {teamTotal?.coachName ? <span className="muted text-sm">Coach: {teamTotal.coachName}</span> : null}
        <span className="badge badge-ghost badge-sm ml-auto">{rows.length} players</span>
      </div>

      {rows.length === 0 || !teamTotal ? (
        <EmptyText>Box score not available yet.</EmptyText>
      ) : (
        <Panel className="overflow-x-auto overscroll-x-contain p-2">
          <table className="data-table-sticky table table-sm">
            <thead>
              <tr>
                <th>Player</th>
                {BOX_SCORE_COLUMNS.map(([label]) => (
                  <th key={label} className="num text-center">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((player) => {
                const started = Boolean(player.started ?? player.startedAlt);
                return (
                  <tr key={player.personKey}>
                    <td>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-6 flex-none text-center text-xs text-base-content/60">
                          {player.dorsal ?? "-"}
                        </span>
                        {player.headshotUrl ? (
                          <img
                            src={player.headshotUrl}
                            alt=""
                            className="h-8 w-8 flex-none rounded-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className="max-w-32 truncate sm:max-w-48"
                              title={player.personName ?? player.personKey}
                            >
                              {player.personName ?? player.personKey}
                            </span>
                            {started ? <span className="badge badge-primary badge-xs">S</span> : null}
                          </div>
                          {player.positionName ? (
                            <div className="text-xs text-base-content/60">{player.positionName}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {BOX_SCORE_COLUMNS.map(([label, render]) => (
                      <td key={label} className="num text-center tabular-nums">
                        {render(player)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td>Total</td>
                {BOX_SCORE_COLUMNS.map(([label, render]) => (
                  <td key={label} className="num text-center tabular-nums">
                    {render(teamTotal)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </Panel>
      )}
    </div>
  );
}

function shootingPercentage(made, attempted) {
  const attemptedNum = Number(attempted);
  if (!attemptedNum) return null;
  return (Number(made) / attemptedNum) * 100;
}

function ShootingSplitsSection({ teamStats, localTeam, roadTeam }) {
  const totals = teamStats.filter((row) => row.statsKind === "total");

  if (totals.length === 0) {
    return <EmptyText>Shooting splits aren't available until this game is played.</EmptyText>;
  }

  const splits = [
    ["2PT", "fieldGoalsMade2", "fieldGoalsAttempted2"],
    ["3PT", "fieldGoalsMade3", "fieldGoalsAttempted3"],
    ["FT", "freeThrowsMade", "freeThrowsAttempted"],
  ];

  return (
    <div>
      <p className="muted mb-3 text-sm">
        Shot-location data isn't tracked for this archive - these are the box-score shooting splits.
      </p>
      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>Team</th>
              {splits.map(([label]) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.map((row) => {
              const name = row.side === "local" ? teamName(localTeam) : teamName(roadTeam);
              return (
                <tr key={row.side}>
                  <td className="font-medium">
                    <span className="block max-w-40 truncate sm:max-w-56" title={name}>
                      {name}
                    </span>
                  </td>
                  {splits.map(([label, madeField, attemptedField]) => (
                    <td key={label} className="tabular-nums">
                      {row[madeField] ?? "-"}-{row[attemptedField] ?? "-"} (
                      {formatPercentage(shootingPercentage(row[madeField], row[attemptedField]))})
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

const PLAY_TYPE_LABELS = {
  "2FGM": "Score", "3FGM": "Score", FTM: "Score",
  "2FGA": "Miss", "3FGA": "Miss", FTA: "Miss",
  TO: "Turnover",
  ST: "Steal",
  AG: "Blocked", FV: "Block",
  CM: "Foul", OF: "Offensive foul", CMT: "Technical foul", CMU: "Unsportsmanlike foul",
  CMD: "Disqualifying foul", CMTI: "Throw-in foul", C: "Coach foul", B: "Bench foul",
  RV: "Foul drawn",
  D: "Def. rebound", O: "Off. rebound",
  AS: "Assist",
  IN: "Sub in", OUT: "Sub out",
  TOUT: "Timeout", TOUT_TV: "TV timeout",
  BP: "Period start", EP: "Period end", EG: "Game end",
  JB: "Jump ball", CCH: "Challenge",
};

const SCORING_PLAY_TYPES = new Set(["2FGM", "3FGM", "FTM"]);
const KEY_PLAY_TYPES = new Set(["2FGM", "3FGM", "FTM", "TO", "ST", "AG", "FV", "TOUT", "TOUT_TV"]);
const FOUL_PLAY_TYPES = new Set(["CM", "OF", "CMT", "CMU", "C", "B", "CMD", "CMTI"]);
const SUBSTITUTION_PLAY_TYPES = new Set(["IN", "OUT"]);

const EVENT_TYPE_FILTERS = [
  { key: "key", label: "Key plays", test: (type) => KEY_PLAY_TYPES.has(type) },
  { key: "scoring", label: "Scoring", test: (type) => SCORING_PLAY_TYPES.has(type) },
  { key: "all", label: "All events", test: () => true },
  { key: "fouls", label: "Fouls", test: (type) => FOUL_PLAY_TYPES.has(type) },
  { key: "substitutions", label: "Substitutions", test: (type) => SUBSTITUTION_PLAY_TYPES.has(type) },
];

const PAGE_STEP = 60;

function withRunningScore(events) {
  // `pointsA`/`pointsB` are only populated on scoring rows; forward-fill the
  // running score across non-scoring rows for a continuous score column.
  let scoreA = 0;
  let scoreB = 0;
  return events.map((event) => {
    if (event.pointsA != null) scoreA = event.pointsA;
    if (event.pointsB != null) scoreB = event.pointsB;
    return { ...event, runningScoreA: scoreA, runningScoreB: scoreB };
  });
}

function PlayByPlayRow({ event, localTeam, roadTeam }) {
  const isLocal = event.clubCode === localTeam?.clubCode;
  const isRoad = event.clubCode === roadTeam?.clubCode;
  const crest = isLocal ? localTeam?.crestUrl : isRoad ? roadTeam?.crestUrl : null;
  const who = event.playerName ?? event.teamName ?? "Game event";
  const label = PLAY_TYPE_LABELS[event.playType] ?? event.playType ?? "Event";
  const isScoring = SCORING_PLAY_TYPES.has(event.playType);

  return (
    <div
      className={`grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2 sm:grid-cols-[3.5rem_auto_minmax(0,1fr)_auto] ${isScoring ? "bg-primary/6" : ""}`}
    >
      <div>
        <p className="text-xs font-bold text-primary uppercase">{formatPeriod(event.periodNumber)}</p>
        <p className="muted font-mono text-xs">{event.markerTime ?? "-"}</p>
      </div>
      {crest ? (
        <img
          src={crest}
          alt=""
          className="hidden h-6 w-6 flex-none object-contain sm:block"
          onError={(eventTarget) => {
            eventTarget.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{who}</span>
          <span className="stat-badge stat-badge-neutral text-xs">{label}</span>
        </p>
        {event.playInfo ? <p className="muted truncate text-xs">{event.playInfo}</p> : null}
      </div>
      <div className="text-right tabular-nums">
        {event.runningScoreA}
        <span className="muted px-0.5">:</span>
        {event.runningScoreB}
      </div>
    </div>
  );
}

function PlayByPlaySection({ played, events, localTeam, roadTeam }) {
  const [typeFilter, setTypeFilter] = useState("key");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  if (!played) {
    return <EmptyText>Play-by-play isn't available until this game is played.</EmptyText>;
  }
  if (events.length === 0) {
    return <EmptyText>Play-by-play isn't available for this game yet.</EmptyText>;
  }

  const periodNumbers = [...new Set(events.map((event) => event.periodNumber))].sort((a, b) => a - b);
  const withScores = withRunningScore(events);
  const typeTest = EVENT_TYPE_FILTERS.find((filter) => filter.key === typeFilter)?.test ?? (() => true);

  const filtered = withScores.filter((event) => {
    if (!typeTest(event.playType)) return false;
    if (periodFilter !== "all" && String(event.periodNumber) !== periodFilter) return false;
    if (teamFilter !== "all" && event.clubCode !== teamFilter) return false;
    return true;
  });

  const newestFirst = [...filtered].reverse();
  const visible = newestFirst.slice(0, visibleCount);

  function resetPaging(setter) {
    return (value) => {
      setter(value);
      setVisibleCount(PAGE_STEP);
    };
  }

  return (
    <div>
      <Panel className="p-4">
        <PanelHeader
          kicker="LIVE LOG"
          title="Play-by-play"
          trailing={<span className="stat-badge stat-badge-neutral">{formatCount(filtered.length)} events</span>}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <LabelledSelect label="Event type" value={typeFilter} onChange={(event) => resetPaging(setTypeFilter)(event.target.value)}>
            {EVENT_TYPE_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect label="Period" value={periodFilter} onChange={(event) => resetPaging(setPeriodFilter)(event.target.value)}>
            <option value="all">All periods</option>
            {periodNumbers.map((periodNumber) => (
              <option key={periodNumber} value={String(periodNumber)}>
                {formatPeriod(periodNumber)}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect label="Team" value={teamFilter} onChange={(event) => resetPaging(setTeamFilter)(event.target.value)}>
            <option value="all">Both teams</option>
            {localTeam?.clubCode ? <option value={localTeam.clubCode}>{teamName(localTeam)}</option> : null}
            {roadTeam?.clubCode ? <option value={roadTeam.clubCode}>{teamName(roadTeam)}</option> : null}
          </LabelledSelect>
        </div>

        {visible.length === 0 ? (
          <EmptyText>No events match these filters.</EmptyText>
        ) : (
          <div className="divide-y divide-base-300">
            {visible.map((event) => (
              <PlayByPlayRow
                key={`${event.periodNumber}-${event.eventOrdinal}`}
                event={event}
                localTeam={localTeam}
                roadTeam={roadTeam}
              />
            ))}
          </div>
        )}

        {newestFirst.length > visibleCount ? (
          <div className="mt-4 border-t border-base-300 pt-4 text-center">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setVisibleCount((count) => count + PAGE_STEP)}
            >
              Show {PAGE_STEP} more
            </button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function PeriodTable({ periodScores, localTeam, roadTeam }) {
  if (periodScores.length === 0) {
    return <EmptyText>Period scores aren't available until this game is played.</EmptyText>;
  }

  const periodNumbers = [...new Set(periodScores.map((row) => row.periodNumber))].sort((a, b) => a - b);

  const byPeriod = (side) => periodNumbers.map((periodNumber) => {
    const entry = periodScores.find((row) => row.side === side && row.periodNumber === periodNumber);
    return entry?.score ?? null;
  });

  const localScores = byPeriod("local");
  const roadScores = byPeriod("road");
  const margins = periodNumbers.map((_, index) => {
    const local = localScores[index];
    const road = roadScores[index];
    return local != null && road != null ? local - road : null;
  });

  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <table className="table">
        <thead>
          <tr>
            <th>Team</th>
            {periodNumbers.map((periodNumber) => (
              <th key={periodNumber} className="text-center">
                {formatPeriod(periodNumber)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">{teamName(localTeam)}</td>
            {localScores.map((score, index) => (
              <td key={periodNumbers[index]} className="text-center tabular-nums">
                {score ?? "-"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="font-medium">{teamName(roadTeam)}</td>
            {roadScores.map((score, index) => (
              <td key={periodNumbers[index]} className="text-center tabular-nums">
                {score ?? "-"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="muted">Margin</td>
            {margins.map((margin, index) => (
              <td key={periodNumbers[index]} className="muted text-center tabular-nums">
                {margin == null ? "-" : formatSignedDiff(margin)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

const SCORE_VALUE = { "2FGM": 2, "3FGM": 3, FTM: 1 };

function eventMoment(event) {
  return { periodNumber: event.periodNumber, markerTime: event.markerTime, scoreA: event.runningScoreA, scoreB: event.runningScoreB };
}

function momentLabel(moment) {
  return `${formatPeriod(moment.periodNumber)} ${moment.markerTime ?? ""} · ${moment.scoreA}-${moment.scoreB}`.trim();
}

// A run is a streak of consecutive scoring plays by one club with no
// scoring play by the other club in between; non-scoring events (fouls,
// rebounds, turnovers) don't break it.
function computeGameFlow(events, localClubCode, roadClubCode) {
  const scoringEvents = withRunningScore(events).filter((event) => SCORE_VALUE[event.playType]);

  let leadChanges = 0;
  let ties = 0;
  let priorSign = 0;
  let localBiggest = null;
  let roadBiggest = null;

  for (const event of scoringEvents) {
    const margin = event.runningScoreA - event.runningScoreB;
    const sign = margin > 0 ? 1 : margin < 0 ? -1 : 0;
    if (sign === 0) ties += 1;
    if (sign !== 0 && priorSign !== 0 && sign !== priorSign) leadChanges += 1;
    if (sign !== 0) priorSign = sign;
    if (margin > 0 && (!localBiggest || margin > localBiggest.margin)) {
      localBiggest = { margin, moment: eventMoment(event) };
    }
    if (margin < 0 && (!roadBiggest || -margin > roadBiggest.margin)) {
      roadBiggest = { margin: -margin, moment: eventMoment(event) };
    }
  }

  let localRun = null;
  let roadRun = null;
  let currentSide = null;
  let currentPoints = 0;
  let currentStart = null;
  let currentEnd = null;
  function flushRun() {
    if (!currentSide || currentPoints === 0) return;
    const record = { points: currentPoints, startMoment: currentStart, endMoment: currentEnd };
    if (currentSide === "local" && (!localRun || currentPoints > localRun.points)) localRun = record;
    if (currentSide === "road" && (!roadRun || currentPoints > roadRun.points)) roadRun = record;
  }
  for (const event of scoringEvents) {
    const side = event.clubCode === localClubCode ? "local" : event.clubCode === roadClubCode ? "road" : null;
    if (!side) continue;
    if (side !== currentSide) {
      flushRun();
      currentSide = side;
      currentPoints = 0;
      currentStart = eventMoment(event);
    }
    currentPoints += SCORE_VALUE[event.playType];
    currentEnd = eventMoment(event);
  }
  flushRun();

  return { leadChanges, ties, localBiggest, roadBiggest, localRun, roadRun, scoringEvents };
}

function FlowMetric({ label, value, detail, tone }) {
  return (
    <Panel className={`p-4 ${tone ? `border-${tone} bg-${tone}/10` : ""}`}>
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {detail ? <p className="muted mt-1 text-xs">{detail}</p> : null}
    </Panel>
  );
}

function FlowMetrics({ flow, localTeam, roadTeam }) {
  const longerRun =
    (flow.localRun?.points ?? 0) >= (flow.roadRun?.points ?? 0)
      ? { team: localTeam, run: flow.localRun }
      : { team: roadTeam, run: flow.roadRun };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FlowMetric label="Lead changes" value={flow.leadChanges} detail={`${flow.ties} tie${flow.ties === 1 ? "" : "s"}`} />
      <FlowMetric
        label={`${teamName(localTeam)} biggest lead`}
        value={flow.localBiggest ? `+${flow.localBiggest.margin}` : "—"}
        detail={flow.localBiggest ? momentLabel(flow.localBiggest.moment) : "Never led"}
        tone="primary"
      />
      <FlowMetric
        label={`${teamName(roadTeam)} biggest lead`}
        value={flow.roadBiggest ? `+${flow.roadBiggest.margin}` : "—"}
        detail={flow.roadBiggest ? momentLabel(flow.roadBiggest.moment) : "Never led"}
        tone="secondary"
      />
      <FlowMetric
        label="Longest run"
        value={longerRun.run ? `${longerRun.run.points}-0` : "—"}
        detail={longerRun.run ? `${teamName(longerRun.team)} · ${momentLabel(longerRun.run.endMoment)}` : "No runs yet"}
      />
    </div>
  );
}

function MomentCard({ title, team, detail, moment }) {
  return (
    <Panel className="flex items-start gap-3 p-4">
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-8 w-8 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="muted text-sm">{detail}</p>
        {moment ? <p className="muted text-xs">{momentLabel(moment)}</p> : null}
      </div>
    </Panel>
  );
}

function TurningPoints({ flow, localTeam, roadTeam }) {
  return (
    <div>
      <PanelHeader kicker="MOMENTS" title="Turning points" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MomentCard
          title={`${teamName(localTeam)} peak lead`}
          team={localTeam}
          detail={flow.localBiggest ? `Up by ${flow.localBiggest.margin}` : "Never led"}
          moment={flow.localBiggest?.moment}
        />
        <MomentCard
          title={`${teamName(roadTeam)} peak lead`}
          team={roadTeam}
          detail={flow.roadBiggest ? `Up by ${flow.roadBiggest.margin}` : "Never led"}
          moment={flow.roadBiggest?.moment}
        />
        <MomentCard
          title={`${teamName(localTeam)} best run`}
          team={localTeam}
          detail={flow.localRun ? `${flow.localRun.points} unanswered points` : "No runs"}
          moment={flow.localRun?.endMoment}
        />
        <MomentCard
          title={`${teamName(roadTeam)} best run`}
          team={roadTeam}
          detail={flow.roadRun ? `${flow.roadRun.points} unanswered points` : "No runs"}
          moment={flow.roadRun?.endMoment}
        />
      </div>
    </div>
  );
}

// Draws a dashed vertical line at each period's first scoring-event index,
// labelling the period on the x-axis at that same position. Kept as one
// small inline plugin instead of adding an annotation-plugin dependency.
function periodBoundaryPlugin(boundaryIndexes) {
  return {
    id: "periodBoundaries",
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.strokeStyle = "color-mix(in srgb, currentColor 30%, transparent)";
      ctx.setLineDash([4, 4]);
      for (const index of boundaryIndexes) {
        const x = scales.x.getPixelForValue(index);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

function ScoreFlowChart({ flow, localTeam, roadTeam }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();
  const { scoringEvents } = flow;

  const margins = scoringEvents.map((event) => event.runningScoreA - event.runningScoreB);
  const boundaryIndexes = [];
  let lastPeriod = null;
  scoringEvents.forEach((event, index) => {
    if (event.periodNumber !== lastPeriod) {
      boundaryIndexes.push(index);
      lastPeriod = event.periodNumber;
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || margins.length < 2) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const successColor = themeColor(canvas, "--color-success");
    const errorColor = themeColor(canvas, "--color-error");
    const successFill = `color-mix(in srgb, ${successColor} 18%, transparent)`;
    const errorFill = `color-mix(in srgb, ${errorColor} 18%, transparent)`;
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: scoringEvents.map((_, index) => index),
        datasets: [
          {
            data: margins,
            borderColor: primary,
            segment: {
              borderColor: (context) => (context.p1.parsed.y >= 0 ? successColor : errorColor),
              backgroundColor: (context) => (context.p1.parsed.y >= 0 ? successFill : errorFill),
            },
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: (context) => ((context.parsed?.y ?? 0) >= 0 ? successColor : errorColor),
            fill: "origin",
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: textColor,
              callback: (value, index) =>
                boundaryIndexes.includes(index) ? formatPeriod(scoringEvents[index].periodNumber) : "",
              autoSkip: false,
              maxRotation: 0,
            },
            grid: { display: false },
          },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: (items) => momentLabel(eventMoment(scoringEvents[items[0].dataIndex])),
              label: (context) => {
                const value = context.parsed.y;
                const leader = value > 0 ? teamName(localTeam) : value < 0 ? teamName(roadTeam) : null;
                return leader ? `${leader} by ${Math.abs(value)}` : "Tied";
              },
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
      plugins: [periodBoundaryPlugin(boundaryIndexes)],
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringEvents, theme, localTeam, roadTeam]);

  if (margins.length < 2) {
    return <EmptyText>Not enough play-by-play yet to chart game flow.</EmptyText>;
  }

  return (
    <Panel className="p-4">
      <PanelHeader kicker="FLOW" title="Score differential" />
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className="relative h-64 w-full">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Running score margin (${teamName(localTeam)} minus ${teamName(roadTeam)}) across every scoring play`}
          />
        </div>
      </div>
    </Panel>
  );
}

function GameFlowTab({ events, periodScores, localTeam, roadTeam }) {
  const flow = useMemo(
    () => computeGameFlow(events, localTeam?.clubCode, roadTeam?.clubCode),
    [events, localTeam?.clubCode, roadTeam?.clubCode],
  );

  return (
    <div className="flex flex-col gap-6">
      <FlowMetrics flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <ScoreFlowChart flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <PeriodTable periodScores={periodScores} localTeam={localTeam} roadTeam={roadTeam} />
      <TurningPoints flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
    </div>
  );
}

function shootingCell(made, attempted) {
  const pct = shootingPercentage(made, attempted);
  return `${made ?? "-"}-${attempted ?? "-"} (${formatPercentage(pct)})`;
}

const COMPARISON_ROWS = [
  { label: "Points", render: (row) => row.points ?? "-", value: (row) => Number(row.points) },
  {
    label: "2PT",
    render: (row) => shootingCell(row.fieldGoalsMade2, row.fieldGoalsAttempted2),
    value: (row) => shootingPercentage(row.fieldGoalsMade2, row.fieldGoalsAttempted2),
  },
  {
    label: "3PT",
    render: (row) => shootingCell(row.fieldGoalsMade3, row.fieldGoalsAttempted3),
    value: (row) => shootingPercentage(row.fieldGoalsMade3, row.fieldGoalsAttempted3),
  },
  {
    label: "FT",
    render: (row) => shootingCell(row.freeThrowsMade, row.freeThrowsAttempted),
    value: (row) => shootingPercentage(row.freeThrowsMade, row.freeThrowsAttempted),
  },
  { label: "Rebounds", render: (row) => row.totalRebounds ?? "-", value: (row) => Number(row.totalRebounds) },
  { label: "Offensive rebounds", render: (row) => row.offensiveRebounds ?? "-", value: (row) => Number(row.offensiveRebounds) },
  { label: "Defensive rebounds", render: (row) => row.defensiveRebounds ?? "-", value: (row) => Number(row.defensiveRebounds) },
  { label: "Assists", render: (row) => row.assistances ?? "-", value: (row) => Number(row.assistances) },
  { label: "Steals", render: (row) => row.steals ?? "-", value: (row) => Number(row.steals) },
  { label: "Turnovers", render: (row) => row.turnovers ?? "-", value: (row) => Number(row.turnovers), lowerIsBetter: true },
  { label: "Blocks", render: (row) => row.blocksFavour ?? "-", value: (row) => Number(row.blocksFavour) },
  { label: "Blocks against", render: (row) => row.blocksAgainst ?? "-", value: (row) => Number(row.blocksAgainst), lowerIsBetter: true },
  { label: "Fouls committed", render: (row) => row.foulsCommited ?? "-", value: (row) => Number(row.foulsCommited), lowerIsBetter: true },
  { label: "Fouls drawn", render: (row) => row.foulsReceived ?? "-", value: (row) => Number(row.foulsReceived) },
  { label: "PIR", render: (row) => row.valuation ?? "-", value: (row) => Number(row.valuation) },
];

function TeamComparisonTable({ localTotal, roadTotal, localTeam, roadTeam }) {
  if (!localTotal || !roadTotal) {
    return <EmptyText>Team comparison isn't available until this game is played.</EmptyText>;
  }

  return (
    <Panel className="overflow-x-auto overscroll-x-contain p-2">
      <table className="table">
        <thead>
          <tr>
            <th className="text-right">{teamName(localTeam)}</th>
            <th className="text-center">Stat</th>
            <th className="text-left">{teamName(roadTeam)}</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => {
            const localValue = row.value(localTotal);
            const roadValue = row.value(roadTotal);
            const validComparison = Number.isFinite(localValue) && Number.isFinite(roadValue) && localValue !== roadValue;
            const localBetter = validComparison && (row.lowerIsBetter ? localValue < roadValue : localValue > roadValue);
            const roadBetter = validComparison && !localBetter;

            return (
              <tr key={row.label}>
                <td className={`text-right tabular-nums ${localBetter ? "font-semibold text-primary" : ""}`}>
                  {row.render(localTotal)}
                </td>
                <td className="muted text-center text-xs font-bold tracking-wide uppercase opacity-65">{row.label}</td>
                <td className={`text-left tabular-nums ${roadBetter ? "font-semibold text-primary" : ""}`}>
                  {row.render(roadTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

export default function GameDetailPage() {
  const { seasonCode, gameCode } = useParams();
  const [tab, setTab] = useState("box-score");

  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    retry: false,
  });
  const game = gameQuery.data?.game;
  useDocumentTitle(game ? `${teamName(game.localTeam)} vs ${teamName(game.roadTeam)}` : "Fixtures and results");

  const boxScoreQuery = useQuery({
    queryKey: ["box-score", seasonCode, gameCode],
    queryFn: () => getBoxScore(seasonCode, gameCode),
    enabled: gameQuery.isSuccess,
  });

  const coverageQuery = useQuery({
    queryKey: ["coverage", seasonCode, gameCode],
    queryFn: () => getCoverage(seasonCode, { gameCode }),
    enabled: gameQuery.isSuccess,
  });

  const playByPlayQuery = useQuery({
    queryKey: ["play-by-play", seasonCode, gameCode],
    queryFn: () => getPlayByPlay(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "play-by-play" || tab === "game-flow"),
  });

  if (gameQuery.isLoading) return <AsyncState status="loading" label="Loading the game" />;

  if (gameQuery.isError) {
    const notFound = gameQuery.error?.response?.status === 404;
    return notFound ? (
      <EmptyText>Game not found.</EmptyText>
    ) : (
      <AsyncState status="error" message="Could not load this game." onRetry={() => gameQuery.refetch()} />
    );
  }

  const localWon = game.played && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
  const roadWon = game.played && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;

  return (
    <div>
      <PageHeader
        kicker="MATCHUP"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-3 ${localWon ? "text-primary" : ""}`}>
              {game.localTeam?.crestUrl ? (
                <img
                  src={game.localTeam.crestUrl}
                  alt=""
                  className="h-12 w-12 flex-none object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              {teamName(game.localTeam)}
            </span>
            <span className="muted mx-2 text-lg font-normal">vs</span>
            <span className={`flex items-center gap-3 ${roadWon ? "text-primary" : ""}`}>
              {game.roadTeam?.crestUrl ? (
                <img
                  src={game.roadTeam.crestUrl}
                  alt=""
                  className="h-12 w-12 flex-none object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              {teamName(game.roadTeam)}
            </span>
          </span>
        }
        description={
          <p className="muted">
            {game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName)} · {formatDateTime(game.scheduledAt)}
          </p>
        }
      >
        {game.played ? (
          <div className="stat-callout">
            <span className="value">
              {game.localScore ?? "-"} - {game.roadScore ?? "-"}
            </span>
            <span className="label">Final</span>
          </div>
        ) : (
          <span className="stat-badge stat-badge-neutral inline-flex">{game.gameStatus ?? "Scheduled"}</span>
        )}
      </PageHeader>

      <div className="mb-6">
        {coverageQuery.isLoading ? (
          <AsyncState status="loading" label="Loading game data coverage" compact />
        ) : coverageQuery.isError ? (
          <AsyncState status="error" inline message="Could not load this game's data coverage." />
        ) : (
          <DataCoveragePanel coverage={coverageQuery.data} />
        )}
      </div>

      <TabStrip ariaLabel="Game detail" panelId="game-detail-panel" activeKey={tab} onChange={setTab} className="mb-4 w-fit" tabs={GAME_TABS} />

      <TabPanel id="game-detail-panel" focusKey={tab}>
        {tab === "box-score" ? (
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading the box score" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load box score." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <BoxScoreTable
                players={boxScoreQuery.data.playerStats}
                teamTotal={boxScoreQuery.data.teamStats.find((row) => row.side === "local" && row.statsKind === "total")}
                team={game.localTeam}
                won={localWon}
              />
              <BoxScoreTable
                players={boxScoreQuery.data.playerStats}
                teamTotal={boxScoreQuery.data.teamStats.find((row) => row.side === "road" && row.statsKind === "total")}
                team={game.roadTeam}
                won={roadWon}
              />
            </div>
          )
        ) : null}

        {tab === "game-flow" ? (
          !game.played ? (
            <EmptyText>Game flow isn't available until this game is played.</EmptyText>
          ) : boxScoreQuery.isLoading || playByPlayQuery.isLoading ? (
            <AsyncState status="loading" label="Loading game flow" />
          ) : boxScoreQuery.isError || playByPlayQuery.isError ? (
            <AsyncState
              status="error"
              message="Could not load game flow."
              onRetry={() => {
                boxScoreQuery.refetch();
                playByPlayQuery.refetch();
              }}
            />
          ) : (
            <GameFlowTab
              events={playByPlayQuery.data.events}
              periodScores={boxScoreQuery.data.periodScores}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}
        {tab === "comparison" ? (
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading team comparison" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load team comparison." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <TeamComparisonTable
              localTotal={boxScoreQuery.data.teamStats.find((row) => row.side === "local" && row.statsKind === "total")}
              roadTotal={boxScoreQuery.data.teamStats.find((row) => row.side === "road" && row.statsKind === "total")}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}

        {tab === "shooting" ? (
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading shooting splits" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load shooting splits." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <ShootingSplitsSection
              teamStats={boxScoreQuery.data.teamStats}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}

        {tab === "play-by-play" ? (
          !game.played ? (
            <PlayByPlaySection played={false} events={[]} localTeam={game.localTeam} roadTeam={game.roadTeam} />
          ) : playByPlayQuery.isLoading ? (
            <AsyncState status="loading" label="Loading play-by-play" />
          ) : playByPlayQuery.isError ? (
            <AsyncState status="error" message="Could not load play-by-play." onRetry={() => playByPlayQuery.refetch()} />
          ) : (
            <PlayByPlaySection
              played={game.played}
              events={playByPlayQuery.data.events}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}
      </TabPanel>
    </div>
  );
}
