import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { getBoxScore, getCoverage, getGame } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import DataCoveragePanel from "../lib/DataCoveragePanel";
import EmptyText from "../lib/EmptyText";
import {
  formatDateTime as formatDateTimeShared,
  formatMinutes,
  formatPercentage,
  formatPeriod,
  formatSignedDiff,
} from "../lib/format";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { TabPanel, TabStrip } from "../lib/TabStrip";

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

function PlayByPlaySection({ periodScores, localTeam, roadTeam }) {
  if (periodScores.length === 0) {
    return <EmptyText>Play-by-play isn't available until this game is played.</EmptyText>;
  }

  const periodNumbers = [...new Set(periodScores.map((row) => row.periodNumber))].sort((a, b) => a - b);

  return (
    <div>
      <p className="muted mb-3 text-sm">
        Play-by-play isn't tracked for this archive - here's the period-level scoring flow instead.
      </p>
      <Panel className="overflow-x-auto overscroll-x-contain p-2">
        <table className="table">
          <thead>
            <tr>
              <th>Team</th>
              {periodNumbers.map((periodNumber) => (
                <th key={periodNumber}>{formatPeriod(periodNumber)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["local", "road"].map((side) => {
              const name = side === "local" ? teamName(localTeam) : teamName(roadTeam);
              const bySide = periodScores.filter((row) => row.side === side);
              return (
                <tr key={side}>
                  <td className="font-medium">
                    <span className="block max-w-40 truncate sm:max-w-56" title={name}>
                      {name}
                    </span>
                  </td>
                  {periodNumbers.map((periodNumber) => {
                    const entry = bySide.find((row) => row.periodNumber === periodNumber);
                    return (
                      <td key={periodNumber} className="tabular-nums">
                        {entry?.score ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
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

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function themeColor(el, variable) {
  return getComputedStyle(el).getPropertyValue(variable).trim();
}

function computeRunningMargins(periodScores) {
  const periodNumbers = [...new Set(periodScores.map((row) => row.periodNumber))].sort((a, b) => a - b);
  const runningMargins = [];
  let localCumulative = 0;
  let roadCumulative = 0;
  for (const periodNumber of periodNumbers) {
    const local = periodScores.find((row) => row.side === "local" && row.periodNumber === periodNumber)?.score;
    const road = periodScores.find((row) => row.side === "road" && row.periodNumber === periodNumber)?.score;
    if (local == null || road == null) {
      runningMargins.push(null);
      continue;
    }
    localCumulative += local;
    roadCumulative += road;
    runningMargins.push(localCumulative - roadCumulative);
  }
  return { periodNumbers, runningMargins };
}

function GameFlowChart({ periodScores, localTeam, roadTeam }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const theme = useActiveTheme();

  const { periodNumbers, runningMargins } = useMemo(() => computeRunningMargins(periodScores), [periodScores]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || periodNumbers.length < 1) return undefined;

    const primary = themeColor(canvas, "--color-primary");
    const textColor = themeColor(canvas, "--color-base-content");
    const successColor = themeColor(canvas, "--color-success");
    const errorColor = themeColor(canvas, "--color-error");
    const gridColor = `color-mix(in srgb, ${textColor} 20%, transparent)`;

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: periodNumbers.map((n) => formatPeriod(n)),
        datasets: [
          {
            label: "Score margin",
            data: runningMargins,
            borderColor: primary,
            segment: {
              borderColor: (context) => {
                const value = context.p1.parsed.y;
                return value >= 0 ? successColor : errorColor;
              },
            },
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: (context) => {
              const value = context.parsed?.y;
              return value >= 0 ? successColor : errorColor;
            },
            fill: false,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "nearest",
            intersect: true,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                const leader = value > 0 ? teamName(localTeam) : value < 0 ? teamName(roadTeam) : null;
                return leader ? `${leader} by ${Math.abs(value)}` : "Tied";
              },
            },
          },
        },
        interaction: { mode: "nearest", intersect: true },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [periodNumbers, runningMargins, theme, localTeam, roadTeam]);

  if (periodNumbers.length < 1) {
    return <EmptyText>Game flow isn't available until this game is played.</EmptyText>;
  }

  return (
    <Panel className="p-4">
      <h3 className="mb-3 font-semibold">Score margin by period</h3>
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <div className="relative h-64 w-full">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Running score margin (${teamName(localTeam)} minus ${teamName(roadTeam)}) after each period`}
          />
        </div>
      </div>
    </Panel>
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
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading game flow" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load game flow." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <div className="flex flex-col gap-6">
              <PeriodTable
                periodScores={boxScoreQuery.data.periodScores}
                localTeam={game.localTeam}
                roadTeam={game.roadTeam}
              />
              <GameFlowChart
                periodScores={boxScoreQuery.data.periodScores}
                localTeam={game.localTeam}
                roadTeam={game.roadTeam}
              />
            </div>
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
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading play-by-play" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load play-by-play." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <PlayByPlaySection
              periodScores={boxScoreQuery.data.periodScores}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}
      </TabPanel>
    </div>
  );
}
