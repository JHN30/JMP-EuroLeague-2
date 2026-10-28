import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { getBoxScore, getGame, getGameAdvanced, getGameLineups, getGameTeamFlow, getPlayByPlay, getShots } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import GamePageSkeleton, { BoxScoreSkeleton, BoxScoreTablesSkeleton, ComparisonRowsSkeleton, GameFlowSkeleton, GameShootingSkeleton, PlayByPlaySkeleton } from "./GamePageSkeleton";
import CompetitionContext from "../lib/CompetitionContext";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import BackLink from "../lib/BackLink";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import {
  formatCount,
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
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import ShootingCourt from "../lib/ShootingCourt";
import ShootingLegend from "../lib/ShootingLegend";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { sectionContainer, sectionItem } from "../lib/motion";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { AnimatedBody, AnimatedRow } from "../standings/motionTable";
import ScrollingTable from "../standings/ScrollingTable";
import { benchPoints, compareByName, hasMinutes, isStarter, paintPoints, teamName } from "./gameUtils";
import { PeriodTable, ScoreFlowChart } from "./gameFlow";
import { computeGameFlow, momentLabel, withRunningScore } from "./gameFlowData";
import { advancedColumns, attachAdvanced } from "./AdvancedBoxScore";
import FilterDisclosure from "./FilterDisclosure";
import FourFactors from "./FourFactors";
import ScoringProfile from "./ScoringProfile";
import MatchupHeader from "./MatchupHeader";
import TeamLabel, { TeamName } from "./TeamLabel";
import OverviewTab from "./OverviewTab";
import PlayerLink from "./PlayerLink";
import RotationsTab from "./RotationsTab";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import ZoneComparison from "./ZoneComparison";

const GAME_TABS = [
  { key: "overview", label: "Overview" },
  { key: "box-score", label: "Box score" },
  { key: "game-flow", label: "Game flow" },
  { key: "rotations", label: "Rotations" },
  { key: "comparison", label: "Team comparison" },
  { key: "shooting", label: "Shooting" },
  { key: "play-by-play", label: "Play-by-play" },
];

// A game that has not been played has only its preview: every other tab needs a played game.
const UNPLAYED_TABS = GAME_TABS.slice(0, 1);

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

// `highKey` marks the columns where the game's highest value is bolded; `teamKey` the counts the Team line can carry.
const BOX_SCORE_COLUMNS = [
  { label: "MIN", render: (row) => formatMinutes(row.timePlayed) },
  { label: "PTS", render: (row) => formatCount(row.points), highKey: "points" },
  { label: "2PT", render: (row) => madeAttempted(row.fieldGoalsMade2, row.fieldGoalsAttempted2) },
  { label: "3PT", render: (row) => madeAttempted(row.fieldGoalsMade3, row.fieldGoalsAttempted3) },
  { label: "FT", render: (row) => madeAttempted(row.freeThrowsMade, row.freeThrowsAttempted) },
  { label: "REB", render: (row) => formatCount(row.totalRebounds), highKey: "totalRebounds", teamKey: "totalRebounds" },
  { label: "OREB", render: (row) => formatCount(row.offensiveRebounds), highKey: "offensiveRebounds", teamKey: "offensiveRebounds" },
  { label: "DREB", render: (row) => formatCount(row.defensiveRebounds), highKey: "defensiveRebounds", teamKey: "defensiveRebounds" },
  { label: "AST", render: (row) => formatCount(row.assistances), highKey: "assistances", teamKey: "assistances" },
  { label: "STL", render: (row) => formatCount(row.steals), highKey: "steals", teamKey: "steals" },
  { label: "TO", render: (row) => formatCount(row.turnovers), teamKey: "turnovers" },
  { label: "BLK", render: (row) => formatCount(row.blocksFavour), highKey: "blocksFavour", teamKey: "blocksFavour" },
  { label: "BLKA", render: (row) => formatCount(row.blocksAgainst), teamKey: "blocksAgainst" },
  { label: "FC", render: (row) => formatCount(row.foulsCommited), teamKey: "foulsCommited" },
  { label: "FD", render: (row) => formatCount(row.foulsReceived), highKey: "foulsReceived", teamKey: "foulsReceived" },
  { label: "+/-", render: (row) => formatSignedDiff(row.plusMinus), highKey: "plusMinus" },
  { label: "PIR", render: (row) => formatCount(row.valuation), highKey: "valuation", teamKey: "valuation" },
];

const TEAM_LINE_TIP = "Team: rebounds, turnovers and other stats credited to the team rather than a player, such as a shot-clock violation";

// A Team line value, or null for a column the team row does not carry or a zero (left blank).
function teamLineValue(column, teamRow) {
  const value = column.teamKey ? teamRow?.[column.teamKey] : null;
  return Number.isFinite(value) && value !== 0 ? value : null;
}

// The feed's total +/- is the sum of the players' (five times the margin, or missing in early seasons): the margin
// itself is the side's total points minus the opponent's.
function withMargin(total, opponentTotal) {
  if (!total) return total;
  const margin = Number.isFinite(total.points) && Number.isFinite(opponentTotal?.points) ? total.points - opponentTotal.points : null;
  return { ...total, plusMinus: margin };
}

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
// A column or header group that opens a new group gets a dividing line down the whole table.
const groupDivider = (item) => (item.groupStart ? " col-group-start" : "");

function highValueOf(column, row) {
  return column.highValue ? column.highValue(row) : row[column.highKey];
}

function computeGameHighs(playerStats, columns) {
  const highs = {};
  const playedRows = playerStats.filter(hasMinutes);
  for (const column of columns) {
    if (!column.highKey && !column.highValue) continue;
    const values = playedRows.map((row) => highValueOf(column, row)).filter((value) => Number.isFinite(value));
    const max = values.length > 0 ? Math.max(...values) : 0;
    highs[column.label] = max > 0 ? max : null;
  }
  return highs;
}

// The first cell of a box score row. Below sm the cell is pinned narrow and folds as the table is swiped (index.css,
// `box-score-table`): at rest it shows the jersey number and the name, folded it shows the headshot. A player without a
// usable headshot keeps the jersey number.
function BoxScorePlayer({ player, seasonCode }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = Boolean(player.headshotUrl) && !photoFailed;

  return (
    <div className="relative flex min-w-0 items-center gap-2 max-sm:gap-1">
      <span className={`w-6 flex-none text-center text-xs text-base-content/60 ${hasPhoto ? "box-score-dorsal" : ""}`}>{player.dorsal ?? "-"}</span>
      {hasPhoto ? (
        <img
          src={player.headshotUrl}
          alt=""
          className="box-score-photo aspect-3/4 h-10 w-auto flex-none object-contain object-bottom"
          onError={() => setPhotoFailed(true)}
        />
      ) : null}
      <div className="box-score-name min-w-0">
        {/* Below sm the name and the Starter badge flow as text: a word is never cut (unless it is wider than the column), and
            the badge follows the last word or drops to the next line. From sm they sit side by side as before. */}
        <div className="flex items-center gap-1 max-sm:block">
          <PlayerLink
            seasonCode={seasonCode}
            player={player}
            noComma
            className="max-w-32 truncate sm:max-w-48 max-sm:overflow-visible max-sm:whitespace-normal max-sm:[overflow-wrap:break-word]"
          />
          {isStarter(player) ? (
            <span className="max-sm:ml-1 max-sm:inline-block max-sm:align-middle sm:contents">
              <HeaderTip tip="Starter: in the starting five">
                <span className="badge badge-primary badge-xs">S</span>
              </HeaderTip>
            </span>
          ) : null}
        </div>
        {player.positionName ? <div className="text-xs text-base-content/60 max-sm:hidden">{player.positionName}</div> : null}
      </div>
    </div>
  );
}

function BoxScoreTable({ players, teamTotal, teamRow, team, won, seasonCode, gameHighs, columns, groups }) {
  const rows = players.filter((row) => row.side === teamTotal?.side);
  const { played, didNotPlay } = orderRoster(rows);
  const name = teamName(team);
  const showTeamLine = columns.some((column) => teamLineValue(column, teamRow) !== null);

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
        <Panel className="p-2 max-sm:p-1">
          <ScrollingTable shrink={86}>
            <table className="data-table-sticky box-score-table table table-sm hover">
              <thead>
                {groups ? (
                  <tr>
                    <th />
                    {groups.map((group) => (
                      <th key={group.label} colSpan={group.span} className={`text-center text-xs font-semibold uppercase tracking-wide${groupDivider(group)}`}>
                        {group.label}
                      </th>
                    ))}
                  </tr>
                ) : null}
                <tr>
                  <th>
                    <span className="box-score-fade">Player</span>
                  </th>
                  {columns.map((column) => (
                    <th key={column.key ?? column.label} className={`num text-center${groupDivider(column)}`}>
                      <HeaderTip tip={column.tip ?? STAT_TIPS[column.label]}>{column.label}</HeaderTip>
                    </th>
                  ))}
                </tr>
              </thead>
              <AnimatedBody>
                {played.map((player) => (
                  <AnimatedRow key={player.personKey}>
                    <td>
                      <BoxScorePlayer player={player} seasonCode={seasonCode} />
                    </td>
                    {columns.map((column) => {
                      const high = gameHighs[column.label];
                      const isHigh = high != null && highValueOf(column, player) === high;
                      return (
                        <td key={column.key ?? column.label} className={`num text-center tabular-nums${isHigh ? " font-bold" : ""}${groupDivider(column)}`}>
                          {column.render(player)}
                        </td>
                      );
                    })}
                  </AnimatedRow>
                ))}
              </AnimatedBody>
              <tfoot>
                {showTeamLine ? (
                  <tr className="text-base-content/70">
                    <td>
                      <HeaderTip tip={TEAM_LINE_TIP}>
                        <span className="box-score-fade">Team</span>
                      </HeaderTip>
                    </td>
                    {columns.map((column) => {
                      const value = teamLineValue(column, teamRow);
                      return (
                        <td key={column.key ?? column.label} className={`num text-center tabular-nums${groupDivider(column)}`}>
                          {value === null ? null : formatCount(value)}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}
                <tr className="font-bold">
                  <td>
                    <span className="box-score-fade">Total</span>
                  </td>
                  {columns.map((column) => (
                    <td key={column.key ?? column.label} className={`num text-center tabular-nums${groupDivider(column)}`}>
                      {column.render(teamTotal)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </ScrollingTable>
          {didNotPlay.length > 0 ? (
            <p className="muted px-2 pt-2 pb-1 text-sm">
              <span className="font-semibold">Did not play:</span>{" "}
              {didNotPlay.map((player, index) => (
                <span key={player.personKey}>
                  {index > 0 ? ", " : ""}
                  <PlayerLink seasonCode={seasonCode} player={player} noComma />
                </span>
              ))}
            </p>
          ) : null}
        </Panel>
      )}
    </motion.div>
  );
}

const BOX_SCORE_VIEWS = [
  { key: "traditional", label: "Traditional" },
  { key: "advanced", label: "Advanced" },
];

function BoxScoreTab({ boxScore, game, seasonCode, localWon, roadWon, advancedQuery }) {
  const [view, setView] = useState("traditional");
  const advanced = view === "advanced" ? advancedQuery.data : null;
  const showAdvanced = advanced?.available === true;
  const advancedView = useMemo(
    () => (showAdvanced ? advancedColumns({ round: advanced.round, minSeasonMinutes: advanced.minSeasonMinutes }) : null),
    [showAdvanced, advanced],
  );
  const shown = showAdvanced ? attachAdvanced(boxScore, advanced) : boxScore;
  const columns = advancedView?.columns ?? BOX_SCORE_COLUMNS;
  const gameHighs = computeGameHighs(shown.playerStats, columns);
  const statsFor = (side, kind) => shown.teamStats.find((row) => row.side === side && row.statsKind === kind);
  const otherSide = (side) => (side === "local" ? "road" : "local");

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <TabStrip ariaLabel="Box score view" panelId="box-score-tables" activeKey={view} onChange={setView} className="w-fit" tabs={BOX_SCORE_VIEWS} />
      <div id="box-score-tables" className="flex flex-col gap-6">
        {view === "advanced" && advancedQuery.isLoading ? (
          <AsyncState status="loading" label="Loading advanced stats" skeleton={<BoxScoreTablesSkeleton />} />
        ) : view === "advanced" && advancedQuery.isError ? (
          <AsyncState status="error" message="Could not load advanced stats." onRetry={() => advancedQuery.refetch()} />
        ) : view === "advanced" && !showAdvanced ? (
          <EmptyText>Advanced stats are not available for this game yet.</EmptyText>
        ) : (
          ["local", "road"].map((side) => (
            <BoxScoreTable
              key={side}
              players={shown.playerStats}
              teamTotal={withMargin(statsFor(side, "total"), statsFor(otherSide(side), "total"))}
              teamRow={statsFor(side, "team")}
              team={side === "local" ? game.localTeam : game.roadTeam}
              won={side === "local" ? localWon : roadWon}
              seasonCode={seasonCode}
              gameHighs={gameHighs}
              columns={columns}
              groups={advancedView?.groups}
            />
          ))
        )}
      </div>
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

const PRESENTATION_MODES = [
  { key: "map", label: "Shot map" },
  { key: "zones", label: "Shooting zones" },
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
    <div className="playback-row flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-xs touch-target"
        onClick={() => {
          if (currentIndex >= periodOptions.length - 1) onSelect(periodOptions[0]);
          onPlayingChange(!playing);
        }}
      >
        {playing ? "Pause" : <ShortLabel short="Play" full="Animate quarters" />}
      </button>
      {periodOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === activeOption}
          className={`btn btn-xs touch-target ${option === activeOption ? "btn-primary" : "btn-outline"}`}
          onClick={() => {
            onPlayingChange(false);
            onSelect(option);
          }}
        >
          {option === "all" ? <ShortLabel short="Full" full="Full game" /> : formatPeriodOption(option)}
        </button>
      ))}
    </div>
  );
}

function miniShootingLine(shots, test) {
  const attempts = shots.filter(test);
  const made = attempts.filter((shot) => shot.actionCode.endsWith("M"));
  return [`${made.length}-${attempts.length}`, `(${formatPercentage(shootingPercentage(made.length, attempts.length))})`];
}

// "made-attempts (FG%)", with the percentage on its own line where a cell is narrow.
function MiniShootingLine({ shots, test }) {
  const [attempts, percentage] = miniShootingLine(shots, test);
  return (
    <>
      <span>{attempts}</span> <span className="max-sm:block">{percentage}</span>
    </>
  );
}

// Each court is as tall as the room left under the page's header, tabs and filters, so both teams sit in one screen.
const COURT_MAX_WIDTH = "max(18rem, calc(100svh - 20rem))";

// One team's side of the comparison: its 2PT/3PT/eFG line over its own court, as markers or as zones.
function TeamComparisonPanel({ team, shots, teams, mode }) {
  const twoPoint = (shot) => shot.actionCode.startsWith("2");
  const threePoint = (shot) => shot.actionCode.startsWith("3");
  const made = shots.filter((shot) => shot.actionCode.endsWith("M"));
  const effectiveFg =
    shots.length === 0 ? null : ((made.length + 0.5 * made.filter(threePoint).length) / shots.length) * 100;

  return (
    <Panel className="p-3 sm:p-4">
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
        <span className="font-semibold">
          <TeamName team={team} />
        </span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="eyebrow">2PT</p>
          <p className="tabular-nums">
            <MiniShootingLine shots={shots} test={twoPoint} />
          </p>
        </div>
        <div>
          <p className="eyebrow">3PT</p>
          <p className="tabular-nums">
            <MiniShootingLine shots={shots} test={threePoint} />
          </p>
        </div>
        <div>
          <p className="eyebrow">eFG%</p>
          <p className="tabular-nums">{formatPercentage(effectiveFg)}</p>
        </div>
      </div>
      <div className="rounded-field border border-base-300 bg-base-100/60 p-1 sm:p-2">
        <ShootingCourt
          shots={shots}
          teams={teams}
          mode={mode}
          maxWidth={COURT_MAX_WIDTH}
          compactBelow={340}
          ariaLabel={
            mode === "heatmap"
              ? `Shooting zones, ${teamName(team)}`
              : `Shot chart, ${teamName(team)}: ${formatCount(shots.length)} attempts shown`
          }
        />
      </div>
    </Panel>
  );
}

function ShootingTab({ shots, localTeam, roadTeam }) {
  const [presentationMode, setPresentationMode] = useState("map");
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

  const players = [...new Map(shots.map((shot) => [shot.personCode, shot.playerName])).entries()].filter(
    ([code]) => code,
  );
  const effectivePlayerFilter = players.some(([code]) => code === playerFilter) ? playerFilter : "all";

  const periodNumbers = [...new Set(shots.map((shot) => periodNumberForMinute(shot.minute)))].sort((a, b) => a - b);
  const periodOptions = ["all", ...periodNumbers.map(String)];
  // Shot type and result only make sense on the shot map: a heatmap of misses is all 0% and of makes all 100%, and the
  // zones already separate twos from threes. Their selects are hidden on the zones, so they must not filter there either.
  const showsShotFilters = presentationMode === "map";
  const shotTypeTest = showsShotFilters ? SHOT_TYPE_FILTERS.find((filter) => filter.key === shotTypeFilter)?.test ?? (() => true) : () => true;
  const resultTest = showsShotFilters ? RESULT_FILTERS.find((filter) => filter.key === resultFilter)?.test ?? (() => true) : () => true;
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

  const filteredShots = applySharedFilters(
    effectivePlayerFilter === "all" ? shots : shots.filter((shot) => shot.personCode === effectivePlayerFilter),
  );
  const teamShots = (team) => filteredShots.filter((shot) => shot.clubCode === team?.clubCode);

  const activeFilters = [
    effectivePlayerFilter !== "all",
    showsShotFilters && shotTypeFilter !== "all",
    periodFilter !== "all",
    showsShotFilters && resultFilter !== "all",
    contextFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-3 sm:p-4">
        <PanelHeader kicker="SHOOTING" title="Shooting studio" />
        <TabStrip
          ariaLabel="Shooting presentation"
          panelId="shooting-presentation-panel"
          activeKey={presentationMode}
          onChange={changeFilter(setPresentationMode)}
          scrolling
          className="mb-4 lg:w-fit"
          tabs={PRESENTATION_MODES}
        />
        <FilterDisclosure activeCount={activeFilters} gridClassName="min-[24rem]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <LabelledSelect
            label="Player"
            labelClassName="max-sm:col-span-full"
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
          {showsShotFilters ? (
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
          ) : null}
          <LabelledSelect
            label="Period"
            labelClassName="max-sm:hidden"
            value={periodFilter}
            onChange={(event) => changeFilter(setPeriodFilter)(event.target.value)}
          >
            <option value="all">Full game</option>
            {periodNumbers.map((periodNumber) => (
              <option key={periodNumber} value={String(periodNumber)}>
                {formatPeriod(periodNumber)}
              </option>
            ))}
          </LabelledSelect>
          {showsShotFilters ? (
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
          ) : null}
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
        </FilterDisclosure>

        <TabPanel id="shooting-presentation-panel" focusKey={presentationMode} scroll={false}>
          <div className="mb-3">
            <QuarterPlayback
              periodOptions={periodOptions}
              activeOption={periodFilter}
              onSelect={setPeriodFilter}
              playing={quarterPlaying}
              onPlayingChange={setQuarterPlaying}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[localTeam, roadTeam].map((team, index) => (
              <TeamComparisonPanel
                key={team?.clubCode ?? index}
                team={team}
                shots={teamShots(team)}
                teams={[localTeam, roadTeam]}
                mode={presentationMode === "zones" ? "heatmap" : "markers"}
              />
            ))}
          </div>
          <div className="mt-3">
            {presentationMode === "zones" ? <HeatmapLegend /> : <ShootingLegend teams={[localTeam, roadTeam]} />}
          </div>
        </TabPanel>
      </Panel>

      <ZoneComparison localTeam={localTeam} roadTeam={roadTeam} shots={filteredShots} />
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
  const who = (event.playerName ?? event.teamName ?? "Game event").replace(/\s*,\s*/g, " ");
  const label = PLAY_TYPE_LABELS[event.playType] ?? event.playType ?? "Event";
  const isScoring = SCORING_PLAY_TYPES.has(event.playType);

  return (
    <div
      className={`grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 px-2 py-1.5 sm:grid-cols-[3.5rem_1.5rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 sm:py-2 ${isScoring ? "bg-primary/6" : ""}`}
    >
      {/* Below sm the name, badge, detail and score are laid straight on this grid: the name and score on the first line, the badge and detail on the second. */}
      <div className="max-sm:row-span-2">
        <p className="text-xs font-bold text-primary uppercase">{formatPeriod(event.periodNumber)}</p>
        <p className="muted font-mono text-xs">{event.markerTime ?? "-"}</p>
      </div>
      {/* Always one cell, so rows without a crest (timeouts, period starts) keep the same columns. */}
      {crest ? (
        <img
          src={crest}
          alt=""
          className="hidden h-6 w-6 flex-none object-contain sm:block"
          onError={(eventTarget) => {
            eventTarget.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span aria-hidden="true" className="hidden h-6 w-6 sm:block" />
      )}
      <div className="min-w-0 max-sm:contents">
        <p className="flex flex-wrap items-center gap-2 max-sm:contents">
          <span className="font-medium break-words max-sm:col-[2/4] max-sm:text-sm max-sm:row-start-1 max-sm:min-w-0 sm:truncate">{who}</span>
          <span className="stat-badge stat-badge-neutral text-xs max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-start">{label}</span>
        </p>
        {event.playInfo ? (
          <p className="muted text-xs max-sm:col-[3/5] max-sm:row-start-2 max-sm:line-clamp-2 sm:truncate">{event.playInfo}</p>
        ) : null}
      </div>
      <div className="text-right tabular-nums max-sm:col-start-4 max-sm:row-start-1 max-sm:text-sm sm:min-w-[4.5rem]">
        {event.runningScoreA}
        <span className="muted px-0.5">:</span>
        {event.runningScoreB}
      </div>
    </div>
  );
}

function PlayByPlaySection({ events, localTeam, roadTeam }) {
  const [typeFilter, setTypeFilter] = useState("key");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

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
      <Panel className="p-3 sm:p-4">
        <PanelHeader
          kicker="LIVE LOG"
          title="Play-by-play"
          trailing={<span className="stat-badge stat-badge-neutral">{formatCount(filtered.length)} events</span>}
        />
        <FilterDisclosure
          activeCount={[typeFilter !== "key", periodFilter !== "all", teamFilter !== "all"].filter(Boolean).length}
          gridClassName="min-[24rem]:grid-cols-2 sm:grid-cols-3"
        >
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
          <LabelledSelect label="Team" labelClassName="max-sm:col-span-full" value={teamFilter} onChange={(event) => resetPaging(setTeamFilter)(event.target.value)}>
            <option value="all">Both teams</option>
            {localTeam?.clubCode ? <option value={localTeam.clubCode}>{teamName(localTeam)}</option> : null}
            {roadTeam?.clubCode ? <option value={roadTeam.clubCode}>{teamName(roadTeam)}</option> : null}
          </LabelledSelect>
        </FilterDisclosure>

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
    <Panel className={`p-4 max-sm:p-3 ${tone ? `border-${tone} bg-${tone}/10` : ""}`}>
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-2xl font-semibold max-sm:text-xl">{value}</p>
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
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <FlowMetric label="Lead changes" value={flow.leadChanges} detail={`${flow.ties} tie${flow.ties === 1 ? "" : "s"}`} />
      <FlowMetric
        label={<><TeamName team={localTeam} /> biggest lead</>}
        value={flow.localBiggest ? `+${flow.localBiggest.margin}` : "—"}
        detail={flow.localBiggest ? momentLabel(flow.localBiggest.moment) : "Never led"}
        tone="primary"
      />
      <FlowMetric
        label={<><TeamName team={roadTeam} /> biggest lead</>}
        value={flow.roadBiggest ? `+${flow.roadBiggest.margin}` : "—"}
        detail={flow.roadBiggest ? momentLabel(flow.roadBiggest.moment) : "Never led"}
        tone="secondary"
      />
      <FlowMetric
        label="Longest run"
        value={longerRun.run ? `${longerRun.run.points}-0` : "—"}
        detail={longerRun.run ? <><TeamName team={longerRun.team} /> · {momentLabel(longerRun.run.endMoment)}</> : "No runs yet"}
      />
    </div>
  );
}

function MomentCard({ title, team, detail, moment }) {
  return (
    <Panel className="flex items-start gap-3 p-4 max-sm:gap-2 max-sm:p-3">
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-8 w-8 flex-none object-contain max-sm:h-6 max-sm:w-6"
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
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <MomentCard
          title={<><TeamName team={localTeam} /> peak lead</>}
          team={localTeam}
          detail={flow.localBiggest ? `Up by ${flow.localBiggest.margin}` : "Never led"}
          moment={flow.localBiggest?.moment}
        />
        <MomentCard
          title={<><TeamName team={roadTeam} /> peak lead</>}
          team={roadTeam}
          detail={flow.roadBiggest ? `Up by ${flow.roadBiggest.margin}` : "Never led"}
          moment={flow.roadBiggest?.moment}
        />
        <MomentCard
          title={<><TeamName team={localTeam} /> best run</>}
          team={localTeam}
          detail={flow.localRun ? `${flow.localRun.points} unanswered points` : "No runs"}
          moment={flow.localRun?.endMoment}
        />
        <MomentCard
          title={<><TeamName team={roadTeam} /> best run</>}
          team={roadTeam}
          detail={flow.roadRun ? `${flow.roadRun.points} unanswered points` : "No runs"}
          moment={flow.roadRun?.endMoment}
        />
      </div>
    </div>
  );
}

function GameFlowTab({ events, periodScores, localTeam, roadTeam, forfeit }) {
  const flow = useMemo(
    () => computeGameFlow(events, localTeam?.clubCode, roadTeam?.clubCode),
    [events, localTeam?.clubCode, roadTeam?.clubCode],
  );

  return (
    <div className="flex flex-col gap-6">
      <FlowMetrics flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <ScoreFlowChart flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <PeriodTable periodScores={periodScores} localTeam={localTeam} roadTeam={roadTeam} forfeit={forfeit} />
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

// The Head to head rows in groups, by label. The rows are basic counts, so they carry no tips.
const COMPARISON_GROUPS = [
  { title: "Scoring", labels: ["Points", "Bench points", "Points in the paint"] },
  { title: "Shooting", labels: ["2PT", "3PT", "FT"] },
  { title: "Rebounds", labels: ["Rebounds", "Offensive rebounds", "Defensive rebounds"] },
  { title: "Ball and defense", labels: ["Assists", "Turnovers", "Steals", "Blocks", "Blocks against"] },
  { title: "Fouls and PIR", labels: ["Fouls committed", "Fouls drawn", "PIR"] },
];

const LOADING_MARK = (
  <span className="muted">
    <span aria-hidden="true">…</span>
    <span className="sr-only">Loading</span>
  </span>
);

// Each team's box-score totals on one line per stat, in groups. Bench points come from the players' starter flags and
// points in the paint from the shots, which load separately: their trouble only touches that row. A side with no value
// prints a dash and leaves both sides unhighlighted: it is not a 0 to beat.
function TeamComparisonRows({ localTotal, roadTotal, localTeam, roadTeam, playerStats, shotsQuery }) {
  if (!localTotal || !roadTotal) {
    return <EmptyText>Team totals weren't recorded for this game.</EmptyText>;
  }
  const paintFor = (team) => (shotsQuery.isSuccess ? paintPoints(shotsQuery.data.shots, team?.clubCode) : null);
  const counted = (label, valueA, valueB) => ({
    label,
    direction: valueA === null || valueB === null ? "neutral" : "higher",
    rawA: valueA,
    rawB: valueB,
    displayA: formatCount(valueA),
    displayB: formatCount(valueB),
  });
  const rows = new Map(
    [
      ...COMPARISON_ROWS.map((row) => {
        const [rawA, rawB] = [row.value(localTotal), row.value(roadTotal)];
        return {
          label: row.label,
          direction: rawA === null || rawB === null ? "neutral" : row.lowerIsBetter ? "lower" : "higher",
          rawA,
          rawB,
          displayA: row.render(localTotal),
          displayB: row.render(roadTotal),
        };
      }),
      counted("Bench points", benchPoints(playerStats, "local"), benchPoints(playerStats, "road")),
      {
        ...counted("Points in the paint", paintFor(localTeam), paintFor(roadTeam)),
        ...(shotsQuery.isLoading ? { missingText: LOADING_MARK } : {}),
      },
    ].map((row) => [row.label, row]),
  );

  return (
    <Panel className="flex flex-1 flex-col p-4 max-sm:p-3">
      <div className="mb-2 grid grid-cols-2 gap-4 max-sm:gap-2">
        <div className="flex justify-end">
          <TeamLabel team={localTeam} />
        </div>
        <TeamLabel team={roadTeam} />
      </div>
      {COMPARISON_GROUPS.map((group) => (
        // Each group grows by its number of rows, so the rows spread evenly when the panel is stretched.
        <section key={group.title} aria-label={group.title} className="mt-3 flex flex-col first-of-type:mt-0" style={{ flexGrow: group.labels.length }}>
          <h4 className="muted mb-0.5 text-center text-xs font-bold tracking-wide uppercase">{group.title}</h4>
          {group.labels.map((label) => (
            <ComparisonRow key={label} {...rows.get(label)} inline bars={false} />
          ))}
        </section>
      ))}
      {shotsQuery.isError ? (
        <p className="muted mt-3 flex flex-wrap items-center gap-2 text-sm">
          Points in the paint couldn't be loaded.
          <button type="button" className="btn btn-sm" onClick={() => shotsQuery.refetch()}>
            Retry
          </button>
        </p>
      ) : null}
    </Panel>
  );
}

// The box-score rows (left) and the Four Factors (right) sit side by side on wide screens and stack on narrow ones. The
// two panels are equally tall: the shorter one spreads its rows out evenly instead of leaving empty space at the bottom.
// They load separately, so trouble with one never hides the other.
function TeamComparisonTab({ game, boxScoreQuery, advancedQuery, teamFlowQuery, shotsQuery }) {
  const totalFor = (side) => boxScoreQuery.data?.teamStats.find((row) => row.side === side && row.statsKind === "total");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col">
        <PanelHeader kicker="BOX SCORE" title="Head to head" />
        {boxScoreQuery.isLoading ? (
          <AsyncState status="loading" label="Loading team comparison" skeleton={<ComparisonRowsSkeleton />} />
        ) : boxScoreQuery.isError ? (
          <AsyncState status="error" message="Could not load team comparison." onRetry={() => boxScoreQuery.refetch()} />
        ) : (
          <TeamComparisonRows
            localTotal={totalFor("local")}
            roadTotal={totalFor("road")}
            localTeam={game.localTeam}
            roadTeam={game.roadTeam}
            playerStats={boxScoreQuery.data.playerStats}
            shotsQuery={shotsQuery}
          />
        )}
      </section>
      <section className="flex flex-col">
        <PanelHeader kicker="FOUR FACTORS" title="Each team against its season average" />
        <FourFactors advancedQuery={advancedQuery} localTeam={game.localTeam} roadTeam={game.roadTeam} />
      </section>
      <section className="flex flex-col lg:col-span-2">
        <PanelHeader kicker="SCORING PROFILE" title="How each team scored and how the game was led" />
        <ScoringProfile teamFlowQuery={teamFlowQuery} localTeam={game.localTeam} roadTeam={game.roadTeam} />
      </section>
    </div>
  );
}

export default function GameDetailPage() {
  const { seasonCode, gameCode } = useParams();
  const cancelled = useSeasonFormat(seasonCode).data?.status === "cancelled";
  const [selectedTab, setTab] = useState("overview");

  const gameQuery = useQuery({
    queryKey: ["game", seasonCode, gameCode],
    queryFn: () => getGame(seasonCode, gameCode),
    retry: false,
  });
  const game = gameQuery.data?.game;
  // An unplayed game has no other tab, whichever one was last open.
  const tab = game?.played === false ? "overview" : selectedTab;
  useDocumentTitle(game ? `${teamName(game.localTeam)} vs ${teamName(game.roadTeam)}` : "Games");

  const boxScoreQuery = useQuery({
    queryKey: ["box-score", seasonCode, gameCode],
    queryFn: () => getBoxScore(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true,
  });

  const playByPlayQuery = useQuery({
    queryKey: ["play-by-play", seasonCode, gameCode],
    queryFn: () => getPlayByPlay(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "overview" || tab === "play-by-play" || tab === "game-flow" || tab === "rotations"),
  });

  // Advanced stats only decorate the box score and the best-player card: a failure here never hides either.
  const advancedQuery = useQuery({
    queryKey: ["game-advanced", seasonCode, gameCode],
    queryFn: () => getGameAdvanced(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "overview" || tab === "box-score" || tab === "comparison"),
    retry: false,
  });

  // The pipeline's score flow, shot splits and counted possessions: extra rows, never required by the page.
  const teamFlowQuery = useQuery({
    queryKey: ["game-team-flow", seasonCode, gameCode],
    queryFn: () => getGameTeamFlow(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "overview" || tab === "comparison"),
    retry: false,
  });

  // The pipeline's on-court intervals and five-man units feed the Rotations tab; the connections there use the play-by-play.
  const lineupsQuery = useQuery({
    queryKey: ["game-lineups", seasonCode, gameCode],
    queryFn: () => getGameLineups(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && tab === "rotations",
    retry: false,
  });

  const shotsQuery = useQuery({
    queryKey: ["shots", seasonCode, gameCode],
    queryFn: () => getShots(seasonCode, gameCode),
    enabled: gameQuery.isSuccess && game?.played === true && (tab === "shooting" || tab === "comparison"),
  });

  if (gameQuery.isLoading) return <AsyncState status="loading" label="Loading the game" skeleton={<GamePageSkeleton />} />;

  if (gameQuery.isError) {
    const notFound = gameQuery.error?.response?.status === 404;
    return (
      <div>
        <BackLink to={`/${seasonCode}/games`} label="Games" />
        {notFound ? (
          <EmptyText>Game not found.</EmptyText>
        ) : (
          <AsyncState status="error" message="Could not load this game." onRetry={() => gameQuery.refetch()} />
        )}
      </div>
    );
  }

  const localWon = game.played && game.localScore != null && game.roadScore != null && game.localScore > game.roadScore;
  const roadWon = game.played && game.localScore != null && game.roadScore != null && game.roadScore > game.localScore;

  // Back to the Games list on this game's round and phase, so a neighbouring game is one tap away.
  const listParams = new URLSearchParams();
  if (game.phaseCode && game.roundNumber) {
    listParams.set("phase", game.phaseCode);
    listParams.set("round", game.roundNumber);
  }
  const listQuery = listParams.size > 0 ? `?${listParams}` : "";

  return (
    <div>
      <BackLink to={`/${seasonCode}/games${listQuery}`} label="Games" />
      <MatchupHeader game={game} officials={gameQuery.data?.officials} venue={gameQuery.data?.venue} seasonCode={seasonCode} localWon={localWon} roadWon={roadWon} />
      <CompetitionContext seasonCode={seasonCode} gameCode={game.gameCode} game={game} />

      <TabStrip ariaLabel="Game detail" level={1} panelId="game-detail-panel" activeKey={tab} onChange={setTab} scrolling className="mb-4 lg:w-fit" tabs={game.played ? GAME_TABS : UNPLAYED_TABS} />

      <TabPanel id="game-detail-panel" focusKey={tab} scroll={false}>
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        {cancelled && !game.played ? <EmptyText>This fixture was not played because the season was cancelled. No result or performance statistics were recorded.</EmptyText> : <>
        {tab === "overview" ? <OverviewTab game={game} seasonCode={seasonCode} boxScoreQuery={boxScoreQuery} playByPlayQuery={playByPlayQuery} advancedQuery={advancedQuery} teamFlowQuery={teamFlowQuery} /> : null}

        {tab === "box-score" ? (
          boxScoreQuery.isLoading ? (
            <AsyncState status="loading" label="Loading the box score" skeleton={<BoxScoreSkeleton />} />
          ) : boxScoreQuery.isError ? (
            <AsyncState status="error" message="Could not load box score." onRetry={() => boxScoreQuery.refetch()} />
          ) : (
            <BoxScoreTab
              boxScore={boxScoreQuery.data}
              game={game}
              seasonCode={seasonCode}
              localWon={localWon}
              roadWon={roadWon}
              advancedQuery={advancedQuery}
            />
          )
        ) : null}

        {tab === "rotations" ? <RotationsTab game={game} seasonCode={seasonCode} boxScoreQuery={boxScoreQuery} playByPlayQuery={playByPlayQuery} lineupsQuery={lineupsQuery} /> : null}

        {tab === "game-flow" ? (
          boxScoreQuery.isLoading || playByPlayQuery.isLoading ? (
            <AsyncState status="loading" label="Loading game flow" skeleton={<GameFlowSkeleton />} />
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
              forfeit={game.gameStatus === "Walkover"}
            />
          )
        ) : null}
        {tab === "comparison" ? <TeamComparisonTab game={game} boxScoreQuery={boxScoreQuery} advancedQuery={advancedQuery} teamFlowQuery={teamFlowQuery} shotsQuery={shotsQuery} /> : null}

        {tab === "shooting" ? (
          boxScoreQuery.isLoading || shotsQuery.isLoading ? (
            <AsyncState status="loading" label="Loading shot chart" skeleton={<GameShootingSkeleton />} />
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
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}

        {tab === "play-by-play" ? (
          playByPlayQuery.isLoading ? (
            <AsyncState status="loading" label="Loading play-by-play" skeleton={<PlayByPlaySkeleton />} />
          ) : playByPlayQuery.isError ? (
            <AsyncState status="error" message="Could not load play-by-play." onRetry={() => playByPlayQuery.refetch()} />
          ) : (
            <PlayByPlaySection
              events={playByPlayQuery.data.events}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
            />
          )
        ) : null}
        </>}
        </motion.div>
      </TabPanel>
    </div>
  );
}
