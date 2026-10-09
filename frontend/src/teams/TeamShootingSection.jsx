import { useState } from "react";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import FilterDisclosure from "../games/FilterDisclosure";
import { formatCount, formatPercentage } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShootingBreakdown from "../lib/ShootingBreakdown";
import { PRESENTATION_TABS, RESULT_TABS, isMade, shootingLine, useSeasonShots } from "../lib/shootingData";
import { GAME_SEGMENTS, RESULT_OPTIONS } from "../lib/shotFilters";
import { situationRows, zoneRows } from "../lib/shotBreakdown";
import { TabPanel, TabStrip } from "../lib/TabStrip";

const PANEL_ID = "team-shooting-panel";

const SIDE_TABS = (name) => [
  { key: "team", label: name },
  { key: "opponents", label: "Opponents" },
];

// The club's shots (or its opponents' shots against it) on a half court, with the zones and game situations they come
// from. The player Shooting tab is the same layout over one player's shots.
export default function TeamShootingSection({ seasonCode, phaseCode, team, games }) {
  const [side, setSide] = useState("team");
  const [presentation, setPresentation] = useState("heatmap");
  const [gameSegment, setGameSegment] = useState("all");
  const [result, setResult] = useState("all");

  const playedGames = games.filter(
    (game) => game.phaseCode === phaseCode && game.played && game.localScore != null && game.roadScore != null,
  );
  const { loading, errored, shots, retry } = useSeasonShots(seasonCode, playedGames);
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

  // The segment and the result are the two filters that sit behind the Filters button below sm.
  const activeFilters = (gameSegment !== "all" ? 1 : 0) + (presentation === "markers" && result !== "all" ? 1 : 0);
  const sideLabel = side === "team" ? name : "Opponents";
  // The court colours shots by club; one colour is enough when only one side is shown.
  const courtShots = filtered.map((shot) => ({ ...shot, clubCode: "SIDE" }));

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="SHOOTING"
        title={side === "team" ? `Where ${name} shoots` : `Where opponents shoot against ${name}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TabStrip ariaLabel="Whose shots" panelId={PANEL_ID} activeKey={side} onChange={setSide} tabs={SIDE_TABS(name)} />
        <TabStrip ariaLabel="Presentation" panelId={PANEL_ID} activeKey={presentation} onChange={setPresentation} tabs={PRESENTATION_TABS} />
        {/* Below sm the result strip and the segment select are behind one button; from sm the wrapper and the grid vanish and the
            controls sit in this row as before. */}
        <FilterDisclosure activeCount={activeFilters} className="max-sm:w-full sm:contents" gridClassName="sm:contents">
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
        </FilterDisclosure>
      </div>

      <TabPanel id={PANEL_ID} focusKey={`${side}-${presentation}-${activeResult}`} scroll={false}>
        <ShootingBreakdown
          shots={filtered}
          courtShots={courtShots}
          presentation={presentation}
          replayKey={`${side}-${gameSegment}-${activeResult}`}
          courtLabel={`${sideLabel} shot locations: ${formatCount(filtered.length)} attempts`}
          cards={[
            { label: "Field goals", value: shootingLine(filtered) },
            { label: "Two-pointers", value: shootingLine(twoPoint) },
            { label: "Three-pointers", value: shootingLine(threePoint) },
            {
              label: "Effective FG%",
              value: formatPercentage(effectiveFg),
              detail: pointsPerShot == null ? null : `${pointsPerShot.toFixed(2)} pts/shot`,
            },
          ]}
          zoneRows={zoneRows(filtered)}
          situationRows={situationRows(filtered)}
          zonesTitle={side === "team" ? "Where the shots come from" : "Where opponents shoot from"}
          situationsTitle={side === "team" ? `How ${name} scores` : `How opponents score against ${name}`}
          favorable={side === "team"}
          resetKey={side}
          phoneLayout
          plainWording
        />
      </TabPanel>
    </Panel>
  );
}
