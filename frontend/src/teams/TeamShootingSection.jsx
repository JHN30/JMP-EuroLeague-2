import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { motion } from "motion/react";
import { getShots } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { efficiencyRamp } from "../lib/chartHelpers";
import EmptyText from "../lib/EmptyText";
import { formatCount, formatPercentage } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import HeatmapLegend from "../lib/HeatmapLegend";
import { barFill, listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShootingCourt from "../lib/ShootingCourt";
import ShootingLegend from "../lib/ShootingLegend";
import { GAME_SEGMENTS, RESULT_OPTIONS } from "../lib/shotFilters";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { situationRows, zoneExtremes, zoneRows } from "./teamShooting";

const PANEL_ID = "team-shooting-panel";
const COURT_MAX_WIDTH = "46rem";

const SIDE_TABS = (name) => [
  { key: "team", label: name },
  { key: "opponents", label: "Opponents" },
];
const PRESENTATION_TABS = [
  { key: "heatmap", label: "Zone heatmap" },
  { key: "markers", label: "Every attempt" },
];
const RESULT_TABS = [
  { key: "all", label: "All shots" },
  { key: "made", label: "Made" },
  { key: "missed", label: "Missed" },
];

const isMade = (shot) => shot.actionCode.endsWith("M");

function shootingLine(shots) {
  const made = shots.filter(isMade).length;
  return `${made}-${shots.length} (${formatPercentage(shots.length === 0 ? null : (made / shots.length) * 100)})`;
}

// Every played game's shot list, combined. Games are cached one by one, so a game seen on another page is not fetched twice.
function useSeasonShots(seasonCode, playedGames) {
  const queries = useQueries({
    queries: playedGames.map((game) => ({
      queryKey: ["shots", seasonCode, game.gameCode],
      queryFn: () => getShots(seasonCode, game.gameCode),
    })),
  });
  return {
    loading: queries.some((query) => query.isLoading),
    errored: queries.some((query) => query.isError),
    mappedGames: queries.filter((query) => query.isSuccess).length,
    shots: queries.flatMap((query) => query.data?.shots ?? []),
    retry: () => queries.forEach((query) => query.refetch()),
  };
}

function MetricCard({ label, value, detail }) {
  return (
    <Panel className="p-3 text-center">
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {detail ? <p className="muted text-xs">{detail}</p> : null}
    </Panel>
  );
}

// Shared by the zone table and the situation table, so their columns line up: name, a bar for the share, that share and
// two figures that differ by table. On a phone the name sits on its own line above the numbers.
const TABLE_GRID = "grid items-center gap-x-3 grid-cols-[1fr_3rem_4rem_3.5rem] sm:grid-cols-[11.5rem_1fr_3rem_4.5rem_3.5rem]";
const NAME_CELL = "col-span-4 flex min-w-0 items-center gap-2 sm:col-span-1";

// `dotValue` (optional) colours a dot before the name by that percentage, on the court's colour scale. `columns` are the
// two figures after the share: a header and how to print a row.
function BreakdownTable({ firstColumn, shareHeader = "Share", columns, rows, dotValue }) {
  const biggest = Math.max(...rows.map((row) => row.share), 0) || 1;

  return (
    <div>
      <div aria-hidden="true" className={`${TABLE_GRID} muted border-b border-base-300 pb-1 text-xs font-bold tracking-wide uppercase`}>
        <span className="col-span-4 sm:col-span-1">{firstColumn}</span>
        <span className="hidden sm:block" />
        <span className="hidden text-right sm:block">{shareHeader}</span>
        {columns.map((column) => (
          <span key={column.header} className="hidden text-right sm:block">
            {column.header}
          </span>
        ))}
      </div>
      <motion.ul variants={listContainer} initial="hidden" animate="show">
        {rows.map((row) => (
          <motion.li
            key={row.key}
            variants={listItem}
            className={`${TABLE_GRID} gap-y-1 border-b border-base-300 py-2 text-sm last:border-0`}
          >
            <span className={NAME_CELL}>
              {dotValue ? (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 flex-none rounded-full ring-1 ring-base-content/20"
                  style={{ backgroundColor: efficiencyRamp(dotValue(row)) }}
                />
              ) : null}
              <span className="truncate">{row.tip ? <HeaderTip tip={row.tip}>{row.label}</HeaderTip> : row.label}</span>
            </span>
            <div aria-hidden="true" className="h-2 min-w-0 overflow-hidden rounded-full bg-base-300">
              <motion.div
                className="h-full origin-left rounded-full bg-primary"
                style={{ width: `${(row.share / biggest) * 100}%` }}
                {...barFill}
              />
            </div>
            <span className="text-right tabular-nums">{Math.round(row.share * 100)}%</span>
            {columns.map((column) => (
              <span key={column.header} className={`text-right tabular-nums ${column.strong ? "font-semibold" : "muted"}`}>
                {column.render(row)}
              </span>
            ))}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

const ZONE_COLUMNS = [
  { header: "Made", render: (row) => `${row.made}-${row.attempts}` },
  { header: "FG%", render: (row) => formatPercentage(row.fg), strong: true },
];
const SITUATION_COLUMNS = [
  { header: "Made", render: (row) => row.made },
  { header: "Points", render: (row) => row.points, strong: true },
];

function ZonesPanel({ rows, side }) {
  const extremes = zoneExtremes(rows);
  // The hottest zone is good news for the club's own shooting and bad news when it is the opponents' shooting.
  const hotTone = side === "team" ? "stat-badge-positive" : "stat-badge-negative";
  const coldTone = side === "team" ? "stat-badge-negative" : "stat-badge-positive";

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="ZONES"
        title={side === "team" ? "Where the shots come from" : "Where opponents shoot from"}
        trailing={
          extremes ? (
            <div className="flex flex-wrap justify-end gap-2">
              <span className={`stat-badge ${hotTone}`}>
                Hottest: {extremes.hottest.label} · {formatPercentage(extremes.hottest.fg)}
              </span>
              <span className={`stat-badge ${coldTone}`}>
                Coldest: {extremes.coldest.label} · {formatPercentage(extremes.coldest.fg)}
              </span>
            </div>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <EmptyText>No located attempts.</EmptyText>
      ) : (
        <BreakdownTable
          firstColumn="Zone"
          shareHeader="Share"
          columns={ZONE_COLUMNS}
          rows={rows}
          dotValue={(row) => row.fg}
        />
      )}
      <p className="muted mt-3 text-sm">
        Most used first. The dot is the zone's FG% on the same colour scale as the court; the bar is its share of the shots.
        Hottest and coldest only count zones with a fair number of attempts.
      </p>
    </Panel>
  );
}

function SituationsPanel({ rows, side, name }) {
  const hasPoints = rows.some((row) => row.points > 0);

  return (
    <Panel as="section" className="p-4">
      <PanelHeader kicker="STYLE" title={side === "team" ? `How ${name} scores` : `How opponents score against ${name}`} />
      {hasPoints ? (
        <BreakdownTable firstColumn="Situation" shareHeader="Of pts" columns={SITUATION_COLUMNS} rows={rows} />
      ) : (
        <EmptyText>No made shots in this selection.</EmptyText>
      )}
      <p className="muted mt-3 text-sm">
        Share of the points from field goals. The feed only marks shots that scored, so there is no shooting percentage
        here. A basket can be in more than one group (a fast break off a turnover counts in both), and every basket that is
        none of them is half court.
      </p>
    </Panel>
  );
}

// The club's shots (or its opponents' shots against it) on a half court, with the zones and game situations they come
// from. Team-only for now: the Player page keeps its own chart.
export default function TeamShootingSection({ seasonCode, phaseCode, team, games }) {
  const [side, setSide] = useState("team");
  const [presentation, setPresentation] = useState("heatmap");
  const [gameSegment, setGameSegment] = useState("all");
  const [result, setResult] = useState("all");

  const playedGames = games.filter(
    (game) => game.phaseCode === phaseCode && game.played && game.localScore != null && game.roadScore != null,
  );
  const { loading, errored, mappedGames, shots, retry } = useSeasonShots(seasonCode, playedGames);
  const name = team.abbreviatedName ?? team.name ?? team.clubCode;

  if (playedGames.length === 0) {
    return <EmptyText>No played games yet this phase to map shot locations from.</EmptyText>;
  }
  if (loading) {
    return <AsyncState status="loading" label={`Aggregating ${formatCount(playedGames.length)} shooting charts`} />;
  }
  if (errored) {
    return <AsyncState status="error" message="Could not load season shot locations." onRetry={retry} />;
  }

  const segmentTest = GAME_SEGMENTS.find((segment) => segment.key === gameSegment)?.test ?? (() => true);
  // Makes and misses only mean something on the every-attempt view: on the heatmap a made-only zone is always 100%.
  const activeResult = presentation === "markers" ? result : "all";
  const resultTest = RESULT_OPTIONS.find((option) => option.key === activeResult)?.test ?? (() => true);
  const filtered = shots.filter(
    (shot) => (shot.clubCode === team.clubCode) === (side === "team") && segmentTest(shot) && resultTest(shot),
  );

  const twoPoint = filtered.filter((shot) => shot.actionCode.startsWith("2"));
  const threePoint = filtered.filter((shot) => shot.actionCode.startsWith("3"));
  const made = filtered.filter(isMade);
  const effectiveFg =
    filtered.length === 0 ? null : ((made.length + 0.5 * made.filter((shot) => shot.actionCode.startsWith("3")).length) / filtered.length) * 100;
  const pointsPerShot = filtered.length === 0 ? null : made.reduce((sum, shot) => sum + (shot.points ?? 0), 0) / filtered.length;

  const sideLabel = side === "team" ? name : "Opponents";
  // The court colours shots by club; one colour is enough when only one side is shown.
  const courtShots = filtered.map((shot) => ({ ...shot, clubCode: "SIDE" }));

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="SHOOTING"
        title={side === "team" ? `Where ${name} shoots` : `Where opponents shoot against ${name}`}
        trailing={
          <span className="stat-badge stat-badge-neutral">
            {formatCount(mappedGames)} games mapped · {formatCount(filtered.length)} attempts plotted
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TabStrip ariaLabel="Whose shots" panelId={PANEL_ID} activeKey={side} onChange={setSide} tabs={SIDE_TABS(name)} />
        <TabStrip ariaLabel="Presentation" panelId={PANEL_ID} activeKey={presentation} onChange={setPresentation} tabs={PRESENTATION_TABS} />
        {presentation === "markers" ? (
          <TabStrip ariaLabel="Result" panelId={PANEL_ID} activeKey={result} onChange={setResult} tabs={RESULT_TABS} />
        ) : null}
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Game segment
          <select
            className="select select-bordered select-sm"
            value={gameSegment}
            onChange={(event) => setGameSegment(event.target.value)}
          >
            {GAME_SEGMENTS.map((segment) => (
              <option key={segment.key} value={segment.key}>
                {segment.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TabPanel id={PANEL_ID} focusKey={`${side}-${presentation}-${activeResult}`} scroll={false}>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Field goals" value={shootingLine(filtered)} />
          <MetricCard label="Two-pointers" value={shootingLine(twoPoint)} />
          <MetricCard label="Three-pointers" value={shootingLine(threePoint)} />
          <MetricCard
            label="Effective FG%"
            value={formatPercentage(effectiveFg)}
            detail={pointsPerShot == null ? null : `${pointsPerShot.toFixed(2)} pts/shot`}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyText>No attempts match these filters.</EmptyText>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,46rem)_minmax(0,1fr)]">
            <div className="flex flex-col justify-center gap-3 rounded-field border border-base-300 bg-base-100/60 p-3">
              <ShootingCourt
                shots={courtShots}
                teams={[{ clubCode: "SIDE" }]}
                mode={presentation}
                resultColors
                maxWidth={COURT_MAX_WIDTH}
                ariaLabel={`${sideLabel} shot locations: ${formatCount(filtered.length)} attempts`}
              />
              {presentation === "heatmap" ? <HeatmapLegend /> : <ShootingLegend teams={[]} resultColors />}
            </div>
            <div className="flex flex-col gap-4">
              <ZonesPanel key={`zones-${side}`} rows={zoneRows(filtered)} side={side} />
              <SituationsPanel key={`situations-${side}`} rows={situationRows(filtered)} side={side} name={name} />
            </div>
          </div>
        )}
      </TabPanel>
    </Panel>
  );
}
