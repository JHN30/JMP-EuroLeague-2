import { useSearchParams } from "react-router";
import { SkeletonPageHeader, SkeletonPanelHead } from "../lib/Skeleton";

// Compare's skeletons: the landing's upcoming games, an opened comparison's sections, and the whole page (while its code, its
// phases or its teams load), so the page and its parts always match. This file imports none of the page's code, so the page
// skeleton stays out of its bundle.

const range = (length) => Array.from({ length }, (_, index) => index);

// A round's games: 10 in the modern league.
const ROUND_GAMES = 10;

// One club of a game row: the crest, then bars for the short name and the record (reversed for the away club).
function SideSkeleton({ alignEnd = false }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${alignEnd ? "flex-row-reverse" : ""}`}>
      <span className="skeleton size-7 flex-none rounded-full sm:size-8" />
      <span className={`flex h-8 min-w-0 flex-col justify-center gap-1.5 ${alignEnd ? "items-end" : ""}`}>
        <span className="skeleton block h-3.5 w-12 max-w-full" />
        <span className="skeleton block h-3 w-8" />
      </span>
    </span>
  );
}

// A section panel's kicker and title bars, as the Compare panels draw them.
function PanelHeading({ titleClassName = "w-24" }) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="skeleton h-3 w-28" />
      <div className={`skeleton my-0.5 h-6 max-w-full ${titleClassName}`} />
    </div>
  );
}

// The upcoming games panel, laid out as `CompareFixtures` lays it out: the round's name over its games as compact rows (home
// club, date and time, away club), in two columns from lg.
export function UpcomingGamesSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <PanelHeading />
      <ul className="grid gap-2 lg:grid-cols-2">
        {Array.from({ length: ROUND_GAMES }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)_1rem] sm:gap-2 sm:px-3"
          >
            <SideSkeleton />
            <span className="flex flex-col items-center gap-1.5">
              <span className="skeleton block h-3 w-12" />
              <span className="skeleton block h-3 w-9" />
            </span>
            <SideSkeleton alignEnd />
            <span className="hidden sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The two pickers with the swap button between them: a label bar over each box.
function PickersSkeleton() {
  const picker = (
    <div className="flex flex-col gap-2">
      <div className="skeleton h-3.5 w-16" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {picker}
      <div className="skeleton mx-auto size-8 sm:mt-7" />
      {picker}
    </div>
  );
}

// ---- An opened comparison ----

// Rows of a comparison: the label over the two sides' numbers, each over its bar.
function ComparisonRows({ rows, rowClassName = "h-[4.8rem]" }) {
  return range(rows).map((index) => (
    <div key={index} className={`flex flex-col justify-center gap-2 border-b border-base-300 last:border-0 ${rowClassName}`}>
      <div className="skeleton mx-auto h-3 w-24" />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-end gap-1.5">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  ));
}

// Groups of comparison rows, each under its grey heading strip, as the statistics tables draw them.
function ComparisonGroups({ groups, rowClassName }) {
  return groups.map((rows, group) => (
    <div key={group}>
      <div className="skeleton -mx-3 h-9 rounded-none" />
      <ComparisonRows rows={rows} rowClassName={rowClassName} />
    </div>
  ));
}

// The pair of clubs or players over a section's rows: a crest or face over the name, either side.
function PairStrip() {
  return (
    <div className="mb-3 grid grid-cols-2 gap-4 pt-2">
      {range(2).map((side) => (
        <div key={side} className="flex flex-col items-center gap-2">
          <div className="skeleton size-10 rounded-full" />
          <div className="skeleton h-4 w-28 max-w-full" />
          <div className="skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// A list of `rows` rows, each a face or crest, a name with a line under it and a figure.
function ListRows({ rows, rowClassName = "h-13" }) {
  return range(rows).map((index) => (
    <div key={index} className={`flex items-center gap-3 border-b border-base-300 last:border-0 ${rowClassName}`}>
      <div className="skeleton size-8 flex-none rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="skeleton h-4 w-36 max-w-full" />
        <div className="skeleton h-3 w-20" />
      </div>
      <div className="skeleton h-4 w-24" />
    </div>
  ));
}

// One side of the pair header: the crest or portrait over the name and a line under it.
function PairSide({ players }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`skeleton flex-none ${players ? "h-24 w-20 rounded-box sm:h-28 sm:w-24" : "size-16 rounded-box sm:size-20"}`} />
      <div className="skeleton h-5 w-28 max-w-full sm:w-40" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

// The top of an opened comparison: the way back, the pair header (two clubs or players either side), then the section tabs
// beside the selects.
function OpenedTop({ players }) {
  return (
    <>
      <div className="mb-1 flex h-8 items-center max-sm:hidden">
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="panel relative mb-6 overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
          <PairSide players={players} />
          <div className="skeleton h-6 w-8" />
          <PairSide players={players} />
        </div>
        {players ? null : (
          <div className="mt-4 flex justify-center border-t border-base-300 pt-3">
            <div className="skeleton h-8 w-48" />
          </div>
        )}
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="skeleton h-11 w-96 max-w-full" />
        <div className="skeleton h-14 w-44 max-sm:w-full" />
      </div>
    </>
  );
}

// A panel heading with the line of explanation under it, as most comparison panels have.
function HeadWithNote({ title }) {
  return (
    <>
      <SkeletonPanelHead title={title} />
      <div className="skeleton -mt-2 mb-4 h-3.5 w-80 max-w-full" />
    </>
  );
}

// The team Overview's recent form panel body: each club's last five games, then the home and away records.
export function TeamFormBodySkeleton() {
  return (
    <div aria-hidden="true">
      <SkeletonPanelHead title="w-48" />
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {range(2).map((side) => (
          <div key={side} className="flex flex-col gap-2.5">
            <div className="skeleton h-5 w-40" />
            {range(5).map((index) => (
              <div key={index} className="flex h-6 items-center gap-2">
                <div className="skeleton size-5 rounded-full" />
                <div className="skeleton h-3.5 w-28" />
                <div className="skeleton ml-auto h-3.5 w-12" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ComparisonRows rows={2} />
      </div>
    </div>
  );
}

// The team Overview's players to watch panel body: each club's three top scorers and the compare button.
export function TeamWatchBodySkeleton() {
  return (
    <div aria-hidden="true">
      <HeadWithNote title="w-32" />
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {range(2).map((side) => (
          <div key={side}>
            <div className="skeleton mb-2 h-5 w-32" />
            <ListRows rows={3} rowClassName="h-14" />
          </div>
        ))}
      </div>
      <div className="skeleton mt-4 h-8 w-72 max-w-full" />
    </div>
  );
}

// The matchup panel: each club's measures ranked higher, side by side.
export function TeamMatchupSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <HeadWithNote title="w-56" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="skeleton h-44 rounded-box" />
        <div className="skeleton h-44 rounded-box" />
      </div>
    </div>
  );
}

// The team Overview, as `CompareTeamOverview` lays it out: the matchup, recent form, players to watch and the meetings.
export function TeamOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <TeamMatchupSkeleton />
      <div className="panel p-4">
        <TeamFormBodySkeleton />
      </div>
      <div className="panel p-4">
        <TeamWatchBodySkeleton />
      </div>
      <div className="panel p-4">
        <HeadWithNote title="w-28" />
        {range(2).map((index) => (
          <div key={index} className="flex h-9 items-center justify-between border-b border-base-300 last:border-0">
            <div className="skeleton h-3.5 w-36" />
            <div className="skeleton h-3.5 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The team Statistics section: the pair over eight groups of comparison rows.
export function TeamStatsSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-3">
      <PairStrip />
      <ComparisonGroups groups={[3, 3, 4, 6, 5, 4, 8, 4]} rowClassName="h-[4.25rem]" />
    </div>
  );
}

// The "Most impactful players" tables while their numbers load: each club's top five.
export function ImpactRowsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
      {range(2).map((side) => (
        <div key={side} className="panel p-3">
          <div className="skeleton mb-3 h-9 w-40" />
          <div className="skeleton h-8 w-full" />
          <ListRows rows={5} rowClassName="h-12 max-sm:h-10" />
        </div>
      ))}
    </div>
  );
}

// The Rosters section: the squads compared, the most impactful players, then each squad's table.
export function RostersSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="panel p-3">
        <PairStrip />
        <ComparisonRows rows={6} rowClassName="h-[4.6rem]" />
      </div>
      <div>
        <HeadWithNote title="w-52" />
        <ImpactRowsSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {range(2).map((side) => (
          <div key={side} className="panel p-3">
            <div className="skeleton mb-3 h-9 w-40" />
            <div className="skeleton h-8 w-full" />
            <ListRows rows={18} rowClassName="h-12 max-sm:h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A chart panel: its heading and note over the chart.
function ChartPanel({ chart = "h-60" }) {
  return (
    <div className="panel p-4">
      <HeadWithNote title="w-36" />
      <div className="skeleton -mt-2 mb-4 h-3.5 w-2/3 sm:hidden" />
      <div className={`skeleton w-full ${chart}`} />
    </div>
  );
}

// The Trends section, as both comparisons lay it out: the last games against the season, two charts, a wide chart, then a
// chart for each side.
export function TrendsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="panel p-4">
        <SkeletonPanelHead title="w-64" />
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="skeleton h-44 rounded-box" />
          <div className="skeleton h-44 rounded-box" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel />
        <ChartPanel />
      </div>
      <ChartPanel />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel chart="h-56" />
        <ChartPanel chart="h-56" />
      </div>
    </div>
  );
}

// The player Overview's form panel body while the recent games load: each player's averages and last five games.
export function PlayerFormBodySkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {range(2).map((side) => (
        <div key={side} className="flex flex-col gap-2.5">
          <div className="skeleton h-5 w-44" />
          <div className="flex gap-4">
            {range(4).map((index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="skeleton h-3 w-8" />
                <div className="skeleton h-5 w-10" />
              </div>
            ))}
          </div>
          {range(5).map((index) => (
            <div key={index} className="flex h-5 items-center gap-2">
              <div className="skeleton size-5 rounded-full" />
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton ml-auto h-3.5 w-28" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// The player Overview, as `ComparePlayerOverview` lays it out: the profile radar between the two players, the season line,
// then recent form.
export function PlayerOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="panel p-4">
        <SkeletonPanelHead title="w-20" />
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="skeleton h-28 w-full rounded-box max-sm:h-36" />
          <div className="skeleton mx-auto size-64 rounded-full" />
          <div className="skeleton h-28 w-full rounded-box max-sm:h-36" />
        </div>
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-28" />
        <PairStrip />
        <ComparisonRows rows={7} rowClassName="h-[4.8rem]" />
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-32" />
        <PlayerFormBodySkeleton />
      </div>
    </div>
  );
}

// The player Statistics table: the pair over groups of comparison rows.
export function PlayerStatsSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-3">
      <PairStrip />
      <ComparisonGroups groups={[9, 8, 8, 7]} rowClassName="h-[3.4rem]" />
    </div>
  );
}

// The player Advanced section: the pair over the overall, per-100 and rate rows.
export function PlayerAdvancedSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-3">
      <PairStrip />
      <ComparisonGroups groups={[9, 15, 10]} rowClassName="h-[4.8rem]" />
    </div>
  );
}

// The whole page, laid out as `ComparisonsPage` lays it out: the landing (the header, the Teams and Players tabs, then the
// upcoming games over the team pickers, or the player pickers alone), or, with both sides in the address, the opened
// comparison's top over its Overview.
export default function CompareSkeleton() {
  const [searchParams] = useSearchParams();
  const players = searchParams.get("view") === "players";
  const opened = players
    ? searchParams.get("playerA") && searchParams.get("playerB")
    : searchParams.get("teamA") && searchParams.get("teamB");
  if (opened) {
    return (
      <div aria-hidden="true">
        <OpenedTop players={players} />
        {players ? <PlayerOverviewSkeleton /> : <TeamOverviewSkeleton />}
      </div>
    );
  }

  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      {/* The Teams and Players tabs, as tall as the level-1 tab strip with its underline. */}
      <div className="skeleton mb-6 h-11 w-36" />
      {players ? (
        <div className="mb-6">
          <PickersSkeleton />
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-6">
          <UpcomingGamesSkeleton />
          <div className="panel p-4">
            <PanelHeading titleClassName="w-52" />
            <PickersSkeleton />
          </div>
        </div>
      )}
    </div>
  );
}
