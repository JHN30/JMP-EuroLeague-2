import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useParams } from "react-router";
import { getBoxScore, getGame, getGameAdvanced, getGameLineups, getGameTeamFlow, getPlayByPlay, getShots } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import GamePageSkeleton, { BoxScoreSkeleton, BoxScoreTablesSkeleton, GameFlowSkeleton, GameShootingSkeleton, PlayByPlaySkeleton } from "./GamePageSkeleton";
import CompetitionContext from "../lib/CompetitionContext";
import { useSeasonFormat } from "../lib/useSeasonFormat";
import BackLink from "../lib/BackLink";
import EmptyText from "../lib/EmptyText";
import {
  formatCount,
  formatMinutes,
  formatPeriod,
  formatSignedDiff,
} from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { sectionContainer, sectionItem } from "../lib/motion";
import { AnimatedBody, AnimatedRow } from "../standings/motionTable";
import ScrollingTable from "../standings/ScrollingTable";
import { compareByName, hasMinutes, isStarter, madeAttempted, shortTeamName, teamName } from "./gameUtils";
import { PeriodTable, ScoreFlowChart } from "./gameFlow";
import { computeGameFlow, momentLabel, withRunningScore } from "./gameFlowData";
import { advancedColumns, attachAdvanced } from "./AdvancedBoxScore";
import FilterDisclosure from "./FilterDisclosure";
import MatchupHeader from "./MatchupHeader";
import OverviewTab from "./OverviewTab";
import TeamComparisonTab from "./TeamComparisonTab";
import PlayerLink from "./PlayerLink";
import RotationsTab from "./RotationsTab";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import ShootingStudio from "./ShootingStudio";

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
    <m.div variants={sectionItem}>
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
    </m.div>
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
    <m.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
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
    </m.div>
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
      className={`grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 px-2 py-1.5 sm:grid-cols-[3.5rem_1.5rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 sm:py-2 lg:grid-cols-[5.5rem_1.5rem_minmax(0,1fr)_auto] lg:py-1 ${isScoring ? "bg-primary/6" : ""}`}
    >
      {/* Below sm the name, badge, detail and score are laid straight on this grid: the name and score on the first line, the badge and detail on the second.
          From lg the whole event is one line: the period beside the clock, and the detail after the badge, cut to fit. */}
      <div className="max-sm:row-span-2 lg:flex lg:items-baseline lg:gap-2">
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
      <div className="min-w-0 max-sm:contents lg:flex lg:items-center lg:gap-3">
        <p className="flex flex-wrap items-center gap-2 max-sm:contents lg:max-w-[60%] lg:min-w-0 lg:flex-none lg:flex-nowrap">
          <span className="font-medium break-words max-sm:col-[2/4] max-sm:text-sm max-sm:row-start-1 max-sm:min-w-0 sm:truncate lg:min-w-0">{who}</span>
          <span className="stat-badge stat-badge-neutral text-xs max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-start lg:flex-none">{label}</span>
        </p>
        {event.playInfo ? (
          <p className="muted text-xs max-sm:col-[3/5] max-sm:row-start-2 max-sm:line-clamp-2 sm:truncate lg:min-w-0 lg:flex-1" title={event.playInfo}>
            {event.playInfo}
          </p>
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

// `team` puts its crest before the label.
function FlowMetric({ label, value, detail, tone, team, className = "" }) {
  return (
    <Panel className={`p-4 max-sm:p-3 lg:p-3 ${tone ? `border-${tone} bg-${tone}/10` : ""} ${className}`}>
      {/* At least the crest's height, so a card without a crest (Lead changes) puts its value on the same line. */}
      <div className="mb-1 flex min-h-5 items-start gap-2">
        {team?.crestUrl ? (
          <img
            src={team.crestUrl}
            alt=""
            className="size-5 flex-none object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {/* Between lg and xl five cards in a row leave a label room for about one short line: each keeps two lines, so the
            values still line up when one wraps. */}
        <p className="eyebrow min-w-0 lg:max-xl:min-h-[2lh]">{label}</p>
      </div>
      <p className="text-2xl font-semibold max-sm:text-xl lg:text-xl">{value}</p>
      {detail ? <p className="muted mt-1 text-xs">{detail}</p> : null}
    </Panel>
  );
}

// A team in a tile's label: its TV code (else its abbreviated name) at every width, so five tiles in a row keep one-line
// labels; the full name stays for screen readers.
function TileTeam({ team }) {
  return (
    <>
      <span aria-hidden="true">{team?.tvCode ?? shortTeamName(team)}</span>
      <span className="sr-only">{teamName(team)}</span>
    </>
  );
}

// The game's headline numbers: lead changes, then each team's biggest lead and best run with the moment it came, in the
// team's colour from the lead tracker. Two columns from sm (home left, road right), one row from lg.
function FlowMetrics({ flow, localTeam, roadTeam }) {
  const biggestLead = (team, biggest) => (
    <FlowMetric
      label={<><TileTeam team={team} /> biggest lead</>}
      value={biggest ? `+${biggest.margin}` : "—"}
      detail={biggest ? momentLabel(biggest.moment) : "Never led"}
      tone={team === localTeam ? "primary" : "secondary"}
      team={team}
    />
  );
  const bestRun = (team, run) => (
    <FlowMetric
      label={<><TileTeam team={team} /> best run</>}
      value={run ? `${run.points}-0` : "—"}
      detail={run ? momentLabel(run.endMoment) : "No runs"}
      tone={team === localTeam ? "primary" : "secondary"}
      team={team}
    />
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 lg:gap-3">
      <FlowMetric label="Lead changes" value={flow.leadChanges} detail={`${flow.ties} tie${flow.ties === 1 ? "" : "s"}`} className="sm:col-span-2 lg:col-span-1" />
      {biggestLead(localTeam, flow.localBiggest)}
      {biggestLead(roadTeam, flow.roadBiggest)}
      {bestRun(localTeam, flow.localRun)}
      {bestRun(roadTeam, flow.roadRun)}
    </div>
  );
}

function GameFlowTab({ events, periodScores, localTeam, roadTeam, forfeit }) {
  const flow = useMemo(
    () => computeGameFlow(events, localTeam?.clubCode, roadTeam?.clubCode),
    [events, localTeam?.clubCode, roadTeam?.clubCode],
  );

  return (
    <div className="flex flex-col gap-6 lg:gap-4">
      <FlowMetrics flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <ScoreFlowChart flow={flow} localTeam={localTeam} roadTeam={roadTeam} />
      <PeriodTable periodScores={periodScores} localTeam={localTeam} roadTeam={roadTeam} forfeit={forfeit} />
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
        <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
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
            <ShootingStudio
              shots={shotsQuery.data.shots}
              localTeam={game.localTeam}
              roadTeam={game.roadTeam}
              boxScore={boxScoreQuery.data}
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
        </m.div>
      </TabPanel>
    </div>
  );
}
