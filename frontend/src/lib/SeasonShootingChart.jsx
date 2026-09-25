import { useQueries } from "@tanstack/react-query";
import { getShots } from "./api";
import AsyncState from "./AsyncState";
import EmptyText from "./EmptyText";
import { formatCount, formatPercentage } from "./format";
import HeatmapLegend from "./HeatmapLegend";
import LabelledSelect from "./LabelledSelect";
import Panel from "./Panel";
import PanelHeader from "./PanelHeader";
import ShootingCourt from "./ShootingCourt";
import ShootingLegend from "./ShootingLegend";
import { summarizeZones } from "./shotZones";

function periodNumberForMinute(minute) {
  if (minute == null) return 0;
  return minute <= 40 ? Math.ceil(minute / 10) : 4 + Math.ceil((minute - 40) / 5);
}

const GAME_SEGMENTS = [
  { key: "all", label: "Full game", test: () => true },
  { key: "h1", label: "First half", test: (shot) => periodNumberForMinute(shot.minute) <= 2 },
  { key: "h2", label: "Second half", test: (shot) => periodNumberForMinute(shot.minute) > 2 && periodNumberForMinute(shot.minute) <= 4 },
  { key: "q1", label: "Q1", test: (shot) => periodNumberForMinute(shot.minute) === 1 },
  { key: "q2", label: "Q2", test: (shot) => periodNumberForMinute(shot.minute) === 2 },
  { key: "q3", label: "Q3", test: (shot) => periodNumberForMinute(shot.minute) === 3 },
  { key: "q4", label: "Q4", test: (shot) => periodNumberForMinute(shot.minute) === 4 },
  { key: "ot", label: "Overtime", test: (shot) => periodNumberForMinute(shot.minute) > 4 },
];

const RESULT_OPTIONS = [
  { key: "all", label: "Makes and misses", test: () => true },
  { key: "made", label: "Made", test: (shot) => shot.actionCode.endsWith("M") },
  { key: "missed", label: "Missed", test: (shot) => shot.actionCode.endsWith("A") },
];

function shootingLine(attempts) {
  const made = attempts.filter((shot) => shot.actionCode.endsWith("M"));
  return `${made.length}-${attempts.length} (${formatPercentage(attempts.length === 0 ? null : (made.length / attempts.length) * 100)})`;
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

// Fetches every played game's shot list (already scoped to field-goal
// attempts by the game endpoint) and combines them client-side, matching
// this app's established pattern for season-wide aggregation from
// already-scoped per-game rows (e.g. Season Overview's full-season game
// fetch) rather than adding a new backend aggregate endpoint.
export default function SeasonShootingChart({ seasonCode, playedGames, ownerFilter, team, subjectLabel, presentation, onPresentationChange, gameSegment, onGameSegmentChange, result, onResultChange }) {
  const shotsQueries = useQueries({
    queries: playedGames.map((game) => ({
      queryKey: ["shots", seasonCode, game.gameCode],
      queryFn: () => getShots(seasonCode, game.gameCode),
    })),
  });

  const loading = shotsQueries.some((query) => query.isLoading);
  const errored = shotsQueries.some((query) => query.isError);
  const mappedGames = shotsQueries.filter((query) => query.isSuccess).length;

  if (playedGames.length === 0) {
    return <EmptyText>No played games yet this phase to map shot locations from.</EmptyText>;
  }
  if (loading) {
    return (
      <AsyncState
        status="loading"
        label={`Aggregating ${formatCount(playedGames.length)} shooting charts`}
      />
    );
  }
  if (errored) {
    return (
      <AsyncState
        status="error"
        message="Could not load season shot locations."
        onRetry={() => shotsQueries.forEach((query) => query.refetch())}
      />
    );
  }

  const ownShots = shotsQueries.flatMap((query) => query.data?.shots ?? []).filter(ownerFilter);
  const segmentTest = GAME_SEGMENTS.find((segment) => segment.key === gameSegment)?.test ?? (() => true);
  const resultTest = RESULT_OPTIONS.find((option) => option.key === result)?.test ?? (() => true);
  const filteredShots = ownShots.filter((shot) => segmentTest(shot) && resultTest(shot));

  const twoPoint = filteredShots.filter((shot) => shot.actionCode.startsWith("2"));
  const threePoint = filteredShots.filter((shot) => shot.actionCode.startsWith("3"));
  const made = filteredShots.filter((shot) => shot.actionCode.endsWith("M"));
  const totalPoints = made.reduce((sum, shot) => sum + (shot.points ?? 0), 0);
  const effectiveFg =
    filteredShots.length === 0 ? null : ((made.length + 0.5 * made.filter((s) => s.actionCode.startsWith("3")).length) / filteredShots.length) * 100;
  const pointsPerShot = filteredShots.length === 0 ? null : totalPoints / filteredShots.length;

  return (
    <div>
      <PanelHeader
        kicker="SEASON SHOOTING"
        title={`${subjectLabel} shot profile`}
        trailing={
          <span className="stat-badge stat-badge-neutral">
            {formatCount(mappedGames)} games mapped · {formatCount(filteredShots.length)} attempts plotted
          </span>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <LabelledSelect label="Presentation" value={presentation} onChange={(event) => onPresentationChange(event.target.value)}>
          <option value="heatmap">Zone heatmap</option>
          <option value="markers">Every attempt</option>
        </LabelledSelect>
        <LabelledSelect label="Game segment" value={gameSegment} onChange={(event) => onGameSegmentChange(event.target.value)}>
          {GAME_SEGMENTS.map((segment) => (
            <option key={segment.key} value={segment.key}>
              {segment.label}
            </option>
          ))}
        </LabelledSelect>
        <LabelledSelect label="Result" value={result} onChange={(event) => onResultChange(event.target.value)}>
          {RESULT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </LabelledSelect>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <MetricCard label="Field goals" value={shootingLine(filteredShots)} />
        <MetricCard label="Two-pointers" value={shootingLine(twoPoint)} />
        <MetricCard label="Three-pointers" value={shootingLine(threePoint)} />
        <MetricCard
          label="Effective FG%"
          value={formatPercentage(effectiveFg)}
          detail={pointsPerShot == null ? null : `${pointsPerShot.toFixed(2)} pts/shot`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-field border border-base-300 bg-base-100/60 p-2 sm:p-3">
          <ShootingCourt
            shots={filteredShots}
            teams={[team]}
            mode={presentation}
            ariaLabel={`${subjectLabel} shot locations: ${formatCount(filteredShots.length)} attempts`}
          />
        </div>
        <div className="flex flex-col gap-4">
          {presentation === "heatmap" ? <HeatmapLegend /> : <ShootingLegend teams={[team]} />}
          <Panel className="p-4">
            <PanelHeader kicker="ZONES" title="Zone efficiency" />
            <ul className="flex flex-col gap-2">
              {summarizeZones(filteredShots).map((row) => (
                <li key={row.zone} className="flex items-center justify-between gap-3 text-sm">
                  <span>{row.zone}</span>
                  <span className="tabular-nums">
                    {row.made}-{row.attempts} ({formatPercentage(row.attempts === 0 ? null : (row.made / row.attempts) * 100)})
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
