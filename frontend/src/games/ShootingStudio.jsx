import { useEffect, useRef, useState } from "react";
import EmptyText from "../lib/EmptyText";
import { formatCount, formatMissing, formatPercentage, formatPeriod } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import HeatmapLegend from "../lib/HeatmapLegend";
import LabelledSelect from "../lib/LabelledSelect";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import ShootingCourt from "../lib/ShootingCourt";
import ShootingLegend from "../lib/ShootingLegend";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { stickyBottomOf } from "../standings/raceSizing";
import FilterDisclosure from "./FilterDisclosure";
import { paintPoints, periodNumberForMinute, shootingPercentage, teamCode, teamName } from "./gameUtils";
import { PlayContextComparison, PlayerShooting, ShootingByQuarter } from "./ShootingTables";
import { TeamName } from "./TeamLabel";
import ZoneComparison from "./ZoneComparison";

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

const FT_TIP = "Free throws come from the box score: the whole game, for the team or the chosen player. The period, shot and play-context filters don't apply to them";

// One team's side of the comparison: its 2PT, 3PT, FT, eFG% and paint points over its own court, as markers or as zones.
// `freeThrows` is the box score's made and attempted, since free throws are not in the shot data.
function TeamComparisonPanel({ team, shots, teams, mode, freeThrows, freeThrowsTip }) {
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
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm lg:grid-cols-5">
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
          <p className="eyebrow">
            <HeaderTip tip={freeThrowsTip}>FT</HeaderTip>
          </p>
          <p className="tabular-nums">
            {freeThrows && Number(freeThrows.attempted) > 0 ? (
              <>
                <span>{`${formatCount(freeThrows.made)}-${formatCount(freeThrows.attempted)}`}</span>{" "}
                <span className="max-sm:block">({formatPercentage(shootingPercentage(freeThrows.made, freeThrows.attempted))})</span>
              </>
            ) : (
              formatMissing(null)
            )}
          </p>
        </div>
        <div>
          <p className="eyebrow">eFG%</p>
          <p className="tabular-nums">{formatPercentage(effectiveFg)}</p>
        </div>
        <div>
          <p className="eyebrow">
            <HeaderTip tip="Points from made shots in the restricted area and the paint">Paint pts</HeaderTip>
          </p>
          <p className="tabular-nums">{formatMissing(paintPoints(shots, team?.clubCode))}</p>
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

// The game page's Shooting tab, also the team page's, which passes the opt-in props: `freeThrows(teamIndex, playerFilter)`
// returns the court header's { made, attempted } (or null) in place of the box score, with `freeThrowsTip` saying where they
// come from; `playerFilterTeams` and `playerTableTeams` list the sides (0 home, 1 away) that get a player list in the
// filters and a player table; `initialPresentation` is the presentation it opens on; `title` and `emptyText` replace the
// game's wording.
export default function ShootingStudio({
  shots,
  localTeam,
  roadTeam,
  boxScore,
  freeThrows = null,
  freeThrowsTip = FT_TIP,
  playerFilterTeams = [0, 1],
  playerTableTeams = [0, 1],
  initialPresentation = "map",
  title = "Shooting studio",
  emptyText = "Shot data isn't available for this game yet.",
}) {
  const [presentationMode, setPresentationMode] = useState(initialPresentation);
  // One player filter per team, home first: each one narrows only its own team's court and tables.
  const [playerFilters, setPlayerFilters] = useState(["all", "all"]);
  const [shotTypeFilter, setShotTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [contextFilter, setContextFilter] = useState("all");
  const [quarterPlaying, setQuarterPlaying] = useState(false);
  const filtersRef = useRef(null);

  if (shots.length === 0) {
    return <EmptyText>{emptyText}</EmptyText>;
  }

  function changeFilter(setter) {
    return (value) => {
      setQuarterPlaying(false);
      setter(value);
    };
  }

  const players = [...new Map(shots.map((shot) => [shot.personCode, { name: shot.playerName, clubCode: shot.clubCode }])).entries()].filter(
    ([code]) => code,
  );
  const teams = [localTeam, roadTeam];
  // The players in two lists, one per team, each with its own choice (back to everyone when that player isn't there).
  const playerGroups = teams.map((team, index) => {
    const teamPlayers = players.filter(([, player]) => player.clubCode === team?.clubCode);
    const filter = teamPlayers.some(([code]) => code === playerFilters[index]) ? playerFilters[index] : "all";
    return { team, players: teamPlayers, filter };
  });
  const playerFilterFor = (clubCode) => playerGroups.find(({ team }) => team?.clubCode === clubCode)?.filter ?? "all";
  const playerTest = (shot) => {
    const filter = playerFilterFor(shot.clubCode);
    return filter === "all" || shot.personCode === filter;
  };
  function changePlayerFilter(index, code) {
    changeFilter(setPlayerFilters)((current) => current.map((filter, other) => (other === index ? code : filter)));
  }

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

  const filteredShots = applySharedFilters(shots.filter(playerTest));

  // The tables under the zones: the filters, but never the result (a table of makes is all 100%) and never their own
  // dimension, so the quarter table shows every quarter, the play-context table every context and the player table everyone.
  const tableShots = ({ player = true, period = true, context = true }) =>
    shots.filter((shot) => {
      if (player && !playerTest(shot)) return false;
      if (!shotTypeTest(shot)) return false;
      if (period && periodFilter !== "all" && String(periodNumberForMinute(shot.minute)) !== periodFilter) return false;
      if (context && !contextTest(shot)) return false;
      return true;
    });

  // Free throws for the court header, from the box score: the team's chosen player's, else the team's.
  const freeThrowsFor = (team) => {
    const side = team === localTeam ? "local" : "road";
    const filter = playerFilterFor(team?.clubCode);
    if (freeThrows) return freeThrows(side === "local" ? 0 : 1, filter);
    const row =
      filter === "all"
        ? boxScore?.teamStats.find((stat) => stat.side === side && stat.statsKind === "total")
        : boxScore?.playerStats.find((stat) => stat.side === side && stat.personKey === filter);
    if (filter !== "all" && !row) return { made: 0, attempted: 0 };
    return row ? { made: row.freeThrowsMade, attempted: row.freeThrowsAttempted } : null;
  };

  // A name in the player table picks that player in its team's list and brings the courts into view, below the filter box
  // where it sticks (from xl).
  function selectPlayer(teamIndex, code) {
    changePlayerFilter(teamIndex, code);
    const courts = document.getElementById("shooting-presentation-panel");
    const bar = filtersRef.current;
    if (courts && bar) courts.style.scrollMarginTop = getComputedStyle(bar).position === "sticky" ? `${stickyBottomOf(bar) + 16}px` : "";
    if (courts) courts.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  const teamShots = (team) => filteredShots.filter((shot) => shot.clubCode === team?.clubCode);

  // The selects the filter row holds, for its column count.
  const selectCount = playerFilterTeams.length + (showsShotFilters ? 4 : 2);
  const filterColumns = { 2: "", 3: "sm:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-3 xl:grid-cols-5", 6: "lg:grid-cols-3 xl:grid-cols-6" }[selectCount];

  const activeFilters = [
    ...playerGroups.map(({ filter }) => filter !== "all"),
    showsShotFilters && shotTypeFilter !== "all",
    periodFilter !== "all",
    showsShotFilters && resultFilter !== "all",
    contextFilter !== "all",
  ].filter(Boolean).length;

  // The filters are a box of their own, a sibling of everything they filter, so from xl it can stay under the nav while
  // the courts and the tables below scroll by. Below sm it is just the Filters button.
  return (
    <div>
      <PanelHeader kicker="SHOOTING" title={title} />
      <TabStrip
        ariaLabel="Shooting presentation"
        panelId="shooting-presentation-panel"
        activeKey={presentationMode}
        onChange={changeFilter(setPresentationMode)}
        scrolling
        className="mb-4 lg:w-fit"
        tabs={PRESENTATION_MODES}
      />
      <Panel ref={filtersRef} className="shooting-filters mb-4 p-3 max-sm:contents">
        {/* The filters fill the row. Phones show the two player lists first, side by side; from lg the home team's list
            opens the row and the away team's closes it, each above its own court, with the shared filters between. */}
        <FilterDisclosure
          activeCount={activeFilters}
          className="max-sm:mb-4"
          gridClassName={`min-[24rem]:grid-cols-2 ${filterColumns}`}
        >
          {playerGroups.map(({ team, players: teamPlayers, filter }, index) =>
            playerFilterTeams.includes(index) ? (
              <LabelledSelect
                key={team?.clubCode ?? index}
                label={`${teamCode(team)} player`}
                labelClassName={index === 1 ? "lg:order-last" : ""}
                value={filter}
                onChange={(event) => changePlayerFilter(index, event.target.value)}
              >
                <option value="all">All players</option>
                {teamPlayers.map(([code, player]) => (
                  <option key={code} value={code}>
                    {player.name}
                  </option>
                ))}
              </LabelledSelect>
            ) : null,
          )}
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
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel className="p-3 sm:p-4">
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
              {teams.map((team, index) => (
                <TeamComparisonPanel
                  key={team?.clubCode ?? index}
                  team={team}
                  shots={teamShots(team)}
                  teams={teams}
                  mode={presentationMode === "zones" ? "heatmap" : "markers"}
                  freeThrows={freeThrowsFor(team)}
                  freeThrowsTip={freeThrowsTip}
                />
              ))}
            </div>
            <div className="mt-3">
              {presentationMode === "zones" ? <HeatmapLegend /> : <ShootingLegend teams={[localTeam, roadTeam]} />}
            </div>
          </TabPanel>
        </Panel>

        <ZoneComparison localTeam={localTeam} roadTeam={roadTeam} shots={filteredShots} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:gap-4">
          <ShootingByQuarter shots={tableShots({ period: false })} localTeam={localTeam} roadTeam={roadTeam} />
          <PlayContextComparison shots={tableShots({ context: false })} localTeam={localTeam} roadTeam={roadTeam} />
        </div>

        <PlayerShooting
          shots={tableShots({ player: false })}
          localTeam={localTeam}
          roadTeam={roadTeam}
          activePlayers={playerGroups.map(({ filter }) => filter)}
          onSelectPlayer={selectPlayer}
          selectableTeams={playerFilterTeams}
          teamIndexes={playerTableTeams}
        />
      </div>
    </div>
  );
}
