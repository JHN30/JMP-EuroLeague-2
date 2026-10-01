import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getBoxScore, getGame, getPlayByPlay, getShots } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import {
  formatCount,
  formatDateTime as formatDateTimeShared,
  formatMinutes,
  formatMissing,
  formatPercentage,
  formatPeriod,
  formatSignedDiff,
} from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import HeatmapLegend from "../lib/HeatmapLegend";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PageHeader from "../lib/PageHeader";
import PanelHeader from "../lib/PanelHeader";
import ShootingCourt from "../lib/ShootingCourt";
import ShootingLegend from "../lib/ShootingLegend";
import { summarizeZones } from "../lib/shotZones";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { sectionContainer, sectionItem } from "../lib/motion";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { AnimatedBody, AnimatedRow } from "../standings/motionTable";
import { compareByName, hasMinutes, isStarter, teamName } from "./gameUtils";
import { PeriodTable, ScoreFlowChart } from "./gameFlow";
import { computeGameFlow, momentLabel, withRunningScore } from "./gameFlowData";
import OverviewTab from "./OverviewTab";
import PlayerLink from "./PlayerLink";
import { TabPanel, TabStrip } from "../lib/TabStrip";

const GAME_TABS = [
  { key: "overview", label: "Overview" },
  { key: "box-score", label: "Box score" },
  { key: "game-flow", label: "Game flow" },
  { key: "comparison", label: "Team comparison" },
  { key: "shooting", label: "Shooting" },
  { key: "play-by-play", label: "Play-by-play" },
];

function formatDateTime(scheduledAt) {
  return formatDateTimeShared(scheduledAt, { dateStyle: "full" });
}

function madeAttempted(made, attempted) {
  if (made == null && attempted == null) return formatMissing(null);
  return `${formatMissing(made)}-${formatMissing(attempted)}`;
}

// Hover tip per box score stat: the full name first, then a short explanation.
const STAT_TIPS = {
  MIN: "Minutes: time on the court",
  PTS: "Points: total points scored",
  "2PT": "Two-pointers: made-attempted",
  "3PT": "Three-pointers: made-attempted",
  FT: "Free throws: made-attempted",
  REB: "Rebounds: offensive plus defensive",
  OREB: "Offensive rebounds: rebounds taken off the team's own misses",
  DREB: "Defensive rebounds: rebounds taken off the opponent's misses",
  AST: "Assists: passes that lead straight to a made basket",
  STL: "Steals: balls taken away from the opponent",
  TO: "Turnovers: possessions given away without a shot",
  BLK: "Blocks: opponent shots blocked",
  BLKA: "Blocks against: this player's shots blocked by the opponent",
  FC: "Fouls committed",
  FD: "Fouls drawn: fouls committed against this player",
  "+/-": "Plus/minus: the team's point difference while this player was on the court",
  PIR: "Performance Index Rating: the EuroLeague efficiency score. Points, rebounds, assists, steals, blocks and fouls drawn, minus misses, turnovers, blocks against and fouls committed",
};

// `highKey` marks the columns where the game's highest value is bolded.
const BOX_SCORE_COLUMNS = [
  { label: "MIN", render: (row) => formatMinutes(row.timePlayed) },
  { label: "PTS", render: (row) => formatCount(row.points), highKey: "points" },
  { label: "2PT", render: (row) => madeAttempted(row.fieldGoalsMade2, row.fieldGoalsAttempted2) },
  { label: "3PT", render: (row) => madeAttempted(row.fieldGoalsMade3, row.fieldGoalsAttempted3) },
  { label: "FT", render: (row) => madeAttempted(row.freeThrowsMade, row.freeThrowsAttempted) },
  { label: "REB", render: (row) => formatCount(row.totalRebounds), highKey: "totalRebounds" },
  { label: "OREB", render: (row) => formatCount(row.offensiveRebounds), highKey: "offensiveRebounds" },
  { label: "DREB", render: (row) => formatCount(row.defensiveRebounds), highKey: "defensiveRebounds" },
  { label: "AST", render: (row) => formatCount(row.assistances), highKey: "assistances" },
  { label: "STL", render: (row) => formatCount(row.steals), highKey: "steals" },
  { label: "TO", render: (row) => formatCount(row.turnovers) },
  { label: "BLK", render: (row) => formatCount(row.blocksFavour), highKey: "blocksFavour" },
  { label: "BLKA", render: (row) => formatCount(row.blocksAgainst) },
  { label: "FC", render: (row) => formatCount(row.foulsCommited) },
  { label: "FD", render: (row) => formatCount(row.foulsReceived), highKey: "foulsReceived" },
  { label: "+/-", render: (row) => formatSignedDiff(row.plusMinus), highKey: "plusMinus" },
  { label: "PIR", render: (row) => formatCount(row.valuation), highKey: "valuation" },
];

// Starters first, then the bench, each by minutes. Players with no minutes are listed apart, unless nobody on the team
// has minutes (a box score without them), in which case everyone is shown by name.
function orderRoster(rows) {
  if (!rows.some(hasMinutes)) return { played: [...rows].sort(compareByName), didNotPlay: [] };
  const played = rows
    .filter(hasMinutes)
    .sort((left, right) => Number(isStarter(right)) - Number(isStarter(left)) || right.timePlayed - left.timePlayed || compareByName(left, right));
  const didNotPlay = rows.filter((row) => !hasMinutes(row)).sort(compareByName);
  return { played, didNotPlay };
}

// The game-high per column, over players of both teams who played. A column with no positive value has no high.
function computeGameHighs(playerStats) {
  const highs = {};
  const playedRows = playerStats.filter(hasMinutes);
  for (const { highKey } of BOX_SCORE_COLUMNS) {
    if (!highKey) continue;
    const values = playedRows.map((row) => row[highKey]).filter((value) => Number.isFinite(value));
    const max = values.length > 0 ? Math.max(...values) : 0;
    highs[highKey] = max > 0 ? max : null;
  }
  return highs;
}

function BoxScoreTable({ players, teamTotal, team, won, seasonCode, gameHighs }) {
  const rows = players.filter((row) => row.side === teamTotal?.side);
  const { played, didNotPlay } = orderRoster(rows);
  const name = teamName(team);

  return (
    <motion.div variants={sectionItem}>
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
          <table className="data-table-sticky table table-sm hover">
            <thead>
              <tr>
                <th>Player</th>
                {BOX_SCORE_COLUMNS.map(({ label }) => (
                  <th key={label} className="num text-center">
                    <HeaderTip tip={STAT_TIPS[label]}>{label}</HeaderTip>
                  </th>
                ))}
              </tr>
            </thead>
            <AnimatedBody>
              {played.map((player) => (
                <AnimatedRow key={player.personKey}>
                  <td>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-6 flex-none text-center text-xs text-base-content/60">
                        {player.dorsal ?? "-"}
                      </span>
                      {player.headshotUrl ? (
                        <img
                          src={player.headshotUrl}
                          alt=""
                          className="aspect-3/4 h-10 w-auto flex-none object-contain object-bottom"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <PlayerLink seasonCode={seasonCode} player={player} className="max-w-32 truncate sm:max-w-48" />
                          {isStarter(player) ? (
                            <HeaderTip tip="Starter: in the starting five">
                              <span className="badge badge-primary badge-xs">S</span>
                            </HeaderTip>
                          ) : null}
                        </div>
                        {player.positionName ? (
                          <div className="text-xs text-base-content/60">{player.positionName}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {BOX_SCORE_COLUMNS.map(({ label, render, highKey }) => {
                    const isHigh = highKey && gameHighs[highKey] != null && player[highKey] === gameHighs[highKey];
                    return (
                      <td key={label} className={`num text-center tabular-nums${isHigh ? " font-bold" : ""}`}>
                        {render(player)}
                      </td>
                    );
                  })}
                </AnimatedRow>
              ))}
            </AnimatedBody>
            <tfoot>
              <tr className="font-bold">
                <td>Total</td>
                {BOX_SCORE_COLUMNS.map(({ label, render }) => (
                  <td key={label} className="num text-center tabular-nums">
                    {render(teamTotal)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
          {didNotPlay.length > 0 ? (
            <p className="muted px-2 pt-2 pb-1 text-sm">
              <span className="font-semibold">Did not play:</span>{" "}
              {didNotPlay.map((player, index) => (
                <span key={player.personKey}>
                  {index > 0 ? ", " : ""}
                  <PlayerLink seasonCode={seasonCode} player={player} />
                </span>
              ))}
            </p>
          ) : null}
        </Panel>
      )}
    </motion.div>
  );
}

function BoxScoreTab({ boxScore, game, seasonCode, localWon, roadWon }) {
  const gameHighs = computeGameHighs(boxScore.playerStats);
  const totalFor = (side) => boxScore.teamStats.find((row) => row.side === side && row.statsKind === "total");

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <BoxScoreTable
        players={boxScore.playerStats}
        teamTotal={totalFor("local")}
        team={game.localTeam}
        won={localWon}
        seasonCode={seasonCode}
        gameHighs={gameHighs}
      />
      <BoxScoreTable
        players={boxScore.playerStats}
        teamTotal={totalFor("road")}
        team={game.roadTeam}
        won={roadWon}
        seasonCode={seasonCode}
        gameHighs={gameHighs}
      />
    </motion.div>
  );
}

function shootingPercentage(made, attempted) {
  const attemptedNum = Number(attempted);
  if (!attemptedNum) return null;
  return (Number(made) / attemptedNum) * 100;
}

function periodNumberForMinute(minute) {
  if (minute == null) return 0;
  return minute <= 40 ? Math.ceil(minute / 10) : 4 + Math.ceil((minute - 40) / 5);
}

const SHOT_TYPE_FILTERS = [
  { key: "all", label: "All shots", test: () => true },
  { key: "2", label: "2-pointers", test: (shot) => shot.actionCode.startsWith("2") },
  { key: "3", label: "3-pointers", test: (shot) => shot.actionCode.startsWith("3") },
];

const RESULT_FILTERS = [
  { key: "all", label: "Makes and misses", test: () => true },
  { key: "made", label: "Made", test: (shot) => shot.actionCode.endsWith("M") },
  { key: "missed", label: "Missed", test: (shot) => shot.actionCode.endsWith("A") },
];

const PLAY_CONTEXT_FILTERS = [
  { key: "all", label: "All possessions", test: () => true },
  { key: "fastbreak", label: "Fast breaks", test: (shot) => shot.fastbreak },
  { key: "secondChance", label: "Second chances", test: (shot) => shot.secondChance },
  { key: "offTurnover", label: "Off turnovers", test: (shot) => shot.pointsOffTurnover },
];

function ZoneSummary({ shots }) {
  const rows = summarizeZones(shots);

  return (
    <Panel className="p-4">
      <PanelHeader kicker="ZONES" title="Zone summary" />
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.zone} className="flex items-center justify-between gap-3 text-sm">
            <span>{row.zone}</span>
            <span className="tabular-nums">
              {row.made}-{row.attempts} ({formatPercentage(shootingPercentage(row.made, row.attempts))})
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const PRESENTATION_MODES = [
  { key: "map", label: "Shot map" },
  { key: "heatmap", label: "Zone heatmap" },
  { key: "comparison", label: "Shooting comparison" },
  { key: "replay", label: "Replay" },
];

function formatPeriodOption(option) {
  return option === "all" ? "Full game" : formatPeriod(Number(option));
}

// Mirrors `RacePlayback.jsx`'s controlled playback/reduced-motion pattern:
// the parent owns `playing` and hands it down, so any other filter change
// can stop it by the same setter.
function QuarterPlayback({ periodOptions, activeOption, onSelect, playing, onPlayingChange }) {
  const reducedMotion = usePrefersReducedMotion();
  const currentIndex = periodOptions.indexOf(activeOption);

  useEffect(() => {
    if (reducedMotion || !playing) return undefined;
    const interval = setInterval(() => {
      const index = periodOptions.indexOf(activeOption);
      if (index >= periodOptions.length - 1) {
        onPlayingChange(false);
        return;
      }
      onSelect(periodOptions[index + 1]);
    }, 1100);
    return () => clearInterval(interval);
  }, [playing, reducedMotion, periodOptions, activeOption, onSelect, onPlayingChange]);

  if (reducedMotion) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-xs touch-target"
          onClick={() => onSelect(periodOptions[Math.min(currentIndex + 1, periodOptions.length - 1)])}
          disabled={currentIndex >= periodOptions.length - 1}
        >
          Next quarter
        </button>
        <span className="muted text-xs">{formatPeriodOption(activeOption)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-xs touch-target"
        onClick={() => {
          if (currentIndex >= periodOptions.length - 1) onSelect(periodOptions[0]);
          onPlayingChange(!playing);
        }}
      >
        {playing ? "Pause" : "Animate quarters"}
      </button>
      {periodOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={`btn btn-xs touch-target ${option === activeOption ? "btn-primary" : "btn-outline"}`}
          onClick={() => {
            onPlayingChange(false);
            onSelect(option);
          }}
        >
          {formatPeriodOption(option)}
        </button>
      ))}
    </div>
  );
}

function ReplayPanel({ shots, localTeam, roadTeam }) {
  const madeShots = shots.filter((shot) => shot.actionCode.endsWith("M"));
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const clampedIndex = Math.min(index, Math.max(madeShots.length - 1, 0));
  const atEnd = clampedIndex >= madeShots.length - 1;
  const isAnimating = playing && !reducedMotion && !atEnd;

  useEffect(() => {
    if (!isAnimating) return undefined;
    const timeout = setTimeout(() => setIndex((current) => current + 1), 850);
    return () => clearTimeout(timeout);
  }, [isAnimating]);

  if (madeShots.length === 0) {
    return <EmptyText>No made shots match these filters yet.</EmptyText>;
  }

  const current = madeShots[clampedIndex];
  const isLocal = current.clubCode === localTeam?.clubCode;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
        <ShootingCourt
          shots={[current]}
          teams={[localTeam, roadTeam]}
          highlightedShotId={current.shotOrdinal}
          ariaLabel={`Replay: shot ${clampedIndex + 1} of ${madeShots.length}`}
        />
      </div>
      <Panel className="flex flex-col gap-3 p-4">
        <span className="stat-badge stat-badge-neutral w-fit">
          {clampedIndex + 1}/{madeShots.length}
        </span>
        <div>
          <p className="font-medium">{current.playerName ?? (isLocal ? teamName(localTeam) : teamName(roadTeam))}</p>
          <p className="muted text-sm">
            {formatPeriod(periodNumberForMinute(current.minute))} {current.markerTime ?? ""} ·{" "}
            {current.actionCode.startsWith("3") ? "3PT" : "2PT"}
          </p>
        </div>
        <p className="text-2xl font-semibold text-primary tabular-nums">
          {current.pointsA ?? "-"}-{current.pointsB ?? "-"}
        </p>
        <input
          type="range"
          className="range range-primary range-xs"
          min={0}
          max={Math.max(madeShots.length - 1, 0)}
          value={clampedIndex}
          onChange={(event) => {
            setPlaying(false);
            setIndex(Number(event.target.value));
          }}
        />
        {reducedMotion ? (
          <button
            type="button"
            className="btn btn-sm touch-target"
            onClick={() => setIndex((i) => Math.min(i + 1, madeShots.length - 1))}
            disabled={clampedIndex >= madeShots.length - 1}
          >
            Next make
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm touch-target"
            onClick={() => {
              if (atEnd) {
                setIndex(0);
                setPlaying(true);
              } else {
                setPlaying((p) => !p);
              }
            }}
          >
            {isAnimating ? "Pause" : atEnd ? "Replay" : "Play"}
          </button>
        )}
      </Panel>
    </div>
  );
}

function miniShootingLine(shots, test) {
  const attempts = shots.filter(test);
  const made = attempts.filter((shot) => shot.actionCode.endsWith("M"));
  return `${made.length}-${attempts.length} (${formatPercentage(shootingPercentage(made.length, attempts.length))})`;
}

function TeamComparisonPanel({ team, shots }) {
  const twoPoint = (shot) => shot.actionCode.startsWith("2");
  const threePoint = (shot) => shot.actionCode.startsWith("3");
  const made = shots.filter((shot) => shot.actionCode.endsWith("M"));
  const effectiveFg =
    shots.length === 0 ? null : ((made.length + 0.5 * made.filter(threePoint).length) / shots.length) * 100;

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center gap-2">
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
        <span className="font-semibold">{teamName(team)}</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="eyebrow">2PT</p>
          <p className="tabular-nums">{miniShootingLine(shots, twoPoint)}</p>
        </div>
        <div>
          <p className="eyebrow">3PT</p>
          <p className="tabular-nums">{miniShootingLine(shots, threePoint)}</p>
        </div>
        <div>
          <p className="eyebrow">eFG%</p>
          <p className="tabular-nums">{formatPercentage(effectiveFg)}</p>
        </div>
      </div>
      <div className="rounded-field border border-base-300 bg-base-100/60 p-2">
        <ShootingCourt shots={shots} teams={[team]} mode="heatmap" ariaLabel={`${teamName(team)} shooting zones`} />
      </div>
    </Panel>
  );
}

function ShootingTab({ shots, teamStats, localTeam, roadTeam }) {
  const [presentationMode, setPresentationMode] = useState("map");
  const [teamFilter, setTeamFilter] = useState("both");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [shotTypeFilter, setShotTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [contextFilter, setContextFilter] = useState("all");
  const [quarterPlaying, setQuarterPlaying] = useState(false);

  if (shots.length === 0) {
    return <EmptyText>Shot data isn't available for this game yet.</EmptyText>;
  }

  function changeFilter(setter) {
    return (value) => {
      setQuarterPlaying(false);
      setter(value);
    };
  }

  const isComparison = presentationMode === "comparison";
  const teamFilteredShots =
    teamFilter === "both" || isComparison ? shots : shots.filter((shot) => shot.clubCode === teamFilter);
  const players = [...new Map(teamFilteredShots.map((shot) => [shot.personCode, shot.playerName])).entries()].filter(
    ([code]) => code,
  );
  const effectivePlayerFilter = players.some(([code]) => code === playerFilter) ? playerFilter : "all";

  const periodNumbers = [...new Set(shots.map((shot) => periodNumberForMinute(shot.minute)))].sort((a, b) => a - b);
  const periodOptions = ["all", ...periodNumbers.map(String)];
  const shotTypeTest = SHOT_TYPE_FILTERS.find((filter) => filter.key === shotTypeFilter)?.test ?? (() => true);
  const resultTest = RESULT_FILTERS.find((filter) => filter.key === resultFilter)?.test ?? (() => true);
  const contextTest = PLAY_CONTEXT_FILTERS.find((filter) => filter.key === contextFilter)?.test ?? (() => true);

  function applySharedFilters(list) {
    return list.filter((shot) => {
      if (!shotTypeTest(shot)) return false;
      if (periodFilter !== "all" && String(periodNumberForMinute(shot.minute)) !== periodFilter) return false;
      if (!resultTest(shot)) return false;
      if (!contextTest(shot)) return false;
      return true;
    });
  }

  const playerFilteredShots =
    effectivePlayerFilter === "all"
      ? teamFilteredShots
      : teamFilteredShots.filter((shot) => shot.personCode === effectivePlayerFilter);
  const filteredShots = applySharedFilters(playerFilteredShots);

  const totals = teamStats.filter((row) => row.statsKind === "total");
  const boxScoreAttempted = totals.reduce((sum, row) => sum + (Number(row.fieldGoalsAttemptedTotal) || 0), 0);
  const reconciles = boxScoreAttempted > 0 && boxScoreAttempted === shots.length;

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-4">
        <PanelHeader
          kicker="SHOOTING"
          title="Shooting studio"
          trailing={
            <span className={`stat-badge ${reconciles ? "stat-badge-success" : "stat-badge-warning"}`}>
              {reconciles ? "Box score matched" : "Partial chart coverage"} · {formatCount(shots.length)} plotted
            </span>
          }
        />
        <TabStrip
          ariaLabel="Shooting presentation"
          panelId="shooting-presentation-panel"
          activeKey={presentationMode}
          onChange={changeFilter(setPresentationMode)}
          className="mb-4 w-fit"
          tabs={PRESENTATION_MODES}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isComparison ? null : (
            <LabelledSelect label="Team" value={teamFilter} onChange={(event) => changeFilter(setTeamFilter)(event.target.value)}>
              <option value="both">Both teams</option>
              {localTeam?.clubCode ? <option value={localTeam.clubCode}>{teamName(localTeam)}</option> : null}
              {roadTeam?.clubCode ? <option value={roadTeam.clubCode}>{teamName(roadTeam)}</option> : null}
            </LabelledSelect>
          )}
          <LabelledSelect
            label="Player"
            value={effectivePlayerFilter}
            onChange={(event) => changeFilter(setPlayerFilter)(event.target.value)}
          >
            <option value="all">All players</option>
            {players.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect
            label="Shot type"
            value={shotTypeFilter}
            onChange={(event) => changeFilter(setShotTypeFilter)(event.target.value)}
          >
            {SHOT_TYPE_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect label="Period" value={periodFilter} onChange={(event) => changeFilter(setPeriodFilter)(event.target.value)}>
            <option value="all">Full game</option>
            {periodNumbers.map((periodNumber) => (
              <option key={periodNumber} value={String(periodNumber)}>
                {formatPeriod(periodNumber)}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect
            label="Result"
            value={resultFilter}
            onChange={(event) => changeFilter(setResultFilter)(event.target.value)}
          >
            {RESULT_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </LabelledSelect>
          <LabelledSelect
            label="Play context"
            value={contextFilter}
            onChange={(event) => changeFilter(setContextFilter)(event.target.value)}
          >
            {PLAY_CONTEXT_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </LabelledSelect>
        </div>

        <TabPanel id="shooting-presentation-panel" focusKey={presentationMode} scroll={false}>
          {presentationMode === "map" || presentationMode === "heatmap" ? (
            <>
              <div className="mb-3">
                <QuarterPlayback
                  periodOptions={periodOptions}
                  activeOption={periodFilter}
                  onSelect={setPeriodFilter}
                  playing={quarterPlaying}
                  onPlayingChange={setQuarterPlaying}
                />
              </div>
              <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
                <ShootingCourt
                  shots={filteredShots}
                  teams={[localTeam, roadTeam]}
                  mode={presentationMode === "heatmap" ? "heatmap" : "markers"}
                  ariaLabel={`Shot chart: ${formatCount(filteredShots.length)} of ${formatCount(shots.length)} attempts shown`}
                />
              </div>
              <div className="mt-3">
                {presentationMode === "heatmap" ? <HeatmapLegend /> : <ShootingLegend teams={[localTeam, roadTeam]} />}
              </div>
            </>
          ) : null}

          {presentationMode === "comparison" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamComparisonPanel team={localTeam} shots={applySharedFilters(shots.filter((shot) => shot.clubCode === localTeam?.clubCode))} />
              <TeamComparisonPanel team={roadTeam} shots={applySharedFilters(shots.filter((shot) => shot.clubCode === roadTeam?.clubCode))} />
            </div>
          ) : null}

          {presentationMode === "replay" ? (
            <ReplayPanel shots={filteredShots} localTeam={localTeam} roadTeam={roadTeam} />
          ) : null}
        </TabPanel>
      </Panel>

      {presentationMode !== "comparison" ? <ZoneSummary shots={filteredShots} /> : null}
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
  return `${madeAttempted(made, attempted)} (${formatPercentage(pct)})`;
}

const COMPARISON_ROWS = [
  { label: "Points", render: (row) => formatCount(row.points), value: (row) => Number(row.points) },
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
  { label: "Rebounds", render: (row) => formatCount(row.totalRebounds), value: (row) => Number(row.totalRebounds) },
  { label: "Offensive rebounds", render: (row) => formatCount(row.offensiveRebounds), value: (row) => Number(row.offensiveRebounds) },
  { label: "Defensive rebounds", render: (row) => formatCount(row.defensiveRebounds), value: (row) => Number(row.defensiveRebounds) },
  { label: "Assists", render: (row) => formatCount(row.assistances), value: (row) => Number(row.assistances) },
  { label: "Steals", render: (row) => formatCount(row.steals), value: (row) => Number(row.steals) },
  { label: "Turnovers", render: (row) => formatCount(row.turnovers), value: (row) => Number(row.turnovers), lowerIsBetter: true },
  { label: "Blocks", render: (row) => formatCount(row.blocksFavour), value: (row) => Number(row.blocksFavour) },
  { label: "Blocks against", render: (row) => formatCount(row.blocksAgainst), value: (row) => Number(row.blocksAgainst), lowerIsBetter: true },
  { label: "Fouls committed", render: (row) => formatCount(row.foulsCommited), value: (row) => Number(row.foulsCommited), lowerIsBetter: true },
  { label: "Fouls drawn", render: (row) => formatCount(row.foulsReceived), value: (row) => Number(row.foulsReceived) },
  { label: "PIR", render: (row) => formatCount(row.valuation), value: (row) => Number(row.valuation) },
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
        <AnimatedBody>
          {COMPARISON_ROWS.map((row) => {
            const localValue = row.value(localTotal);
            const roadValue = row.value(roadTotal);
            const validComparison = Number.isFinite(localValue) && Number.isFinite(roadValue) && localValue !== roadValue;
            const localBetter = validComparison && (row.lowerIsBetter ? localValue < roadValue : localValue > roadValue);
            const roadBetter = validComparison && !localBetter;

            return (
              <AnimatedRow key={row.label}>
                <td className={`text-right tabular-nums ${localBetter ? "font-semibold text-primary" : ""}`}>
                  {row.render(localTotal)}
                </td>
                <td className="muted text-center text-xs font-bold tracking-wide uppercase opacity-65">
                  {STAT_TIPS[row.label] ? <HeaderTip tip={STAT_TIPS[row.label]}>{row.label}</HeaderTip> : row.label}
                </td>
                <td className={`text-left tabular-nums ${roadBetter ? "font-semibold text-primary" : ""}`}>
                  {row.render(roadTotal)}
                </td>
              </AnimatedRow>
            );
          })}
        </AnimatedBody>
      </table>
    </Panel>
  );
}

export default function GameDetailPage() {
  const { seasonCode, gameCode } = useParams();
  const [tab, setTab] = useState("overview");

  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    retry: false,
  });
  const game = gameQuery.data?.game;
  useDocumentTitle(game ? `${teamName(game.localTeam)} vs ${teamName(game.roadTeam)}` : "Games");

  const boxScoreQuery = useQuery({
    queryKey: ["box-score", seasonCode, gameCode],
    queryFn: () => getBoxScore(seasonCode, gameCode),
    enabled: gameQuery.isSuccess,
  });

  const playByPlayQuery = useQuery({
    queryKey: ["play-by-play", seasonCode, gameCode],
    queryFn: () => getPlayByPlay(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "overview" || tab === "play-by-play" || tab === "game-flow"),
  });

  const shotsQuery = useQuery({
    queryKey: ["shots", seasonCode, gameCode],
    queryFn: () => getShots(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && tab === "shooting",
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

      <TabStrip ariaLabel="Game detail" panelId="game-detail-panel" activeKey={tab} onChange={setTab} className="mb-4 w-fit" tabs={GAME_TABS} />

      <TabPanel id="game-detail-panel" focusKey={tab} scroll={false}>
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        {tab === "overview" ? <OverviewTab game={game} seasonCode={seasonCode} boxScoreQuery={boxScoreQuery} playByPlayQuery={playByPlayQuery} /> : null}

        {tab === "box-score" ? (
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading the box score" />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load box score." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <BoxScoreTab
              boxScore={boxScoreQuery.data}
              game={game}
              seasonCode={seasonCode}
              localWon={localWon}
              roadWon={roadWon}
            />
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
          !game.played ? (
            <EmptyText>Shot data isn't available until this game is played.</EmptyText>
          ) : boxScoreQuery.isLoading || shotsQuery.isLoading ? (
            <AsyncState status="loading" label="Loading shot chart" />
          ) : boxScoreQuery.isError || shotsQuery.isError ? (
            <AsyncState
              status="error"
              message="Could not load shot chart."
              onRetry={() => {
                boxScoreQuery.refetch();
                shotsQuery.refetch();
              }}
            />
          ) : (
            <ShootingTab
              shots={shotsQuery.data.shots}
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
        </motion.div>
      </TabPanel>
    </div>
  );
}
