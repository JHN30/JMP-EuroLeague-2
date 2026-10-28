import { SkeletonChip } from "../lib/Skeleton";

// The team page's skeletons: the whole page (while its code or the team loads) and each tab and Overview panel (while its data
// loads), so the two always match. Each mirrors the loaded markup's grid, gaps and paddings. This file imports none of the
// page's code, so the page skeleton stays out of its bundle.

const range = (length) => Array.from({ length }, (_, index) => index);

// A panel's kicker and title, as `PanelHeader` draws them.
function PanelHead({ title = "w-48" }) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="skeleton h-3 w-20" />
      <div className={`skeleton h-6 max-w-full ${title}`} />
    </div>
  );
}

// A label over a value, as the snapshot and roster facts draw them.
function FactSkeleton({ value = "h-5 w-12" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="skeleton h-3 w-16" />
      <div className={`skeleton ${value}`} />
    </div>
  );
}

// The page top, as `TeamPage` lays it out: the way back, the header with the crest, the club's name, codes and facts and the
// next game, then the section tabs and the phase tabs.
function TeamTopSkeleton() {
  return (
    <>
      <div className="mb-1 flex h-8 items-center max-sm:hidden">
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="panel relative mb-6 overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <div className="flex flex-wrap items-center gap-4 max-sm:flex-col">
          <div className="skeleton size-16 flex-none rounded-box max-sm:size-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 max-sm:w-full max-sm:flex-none max-sm:items-center">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-7 w-56 max-w-full" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-80 max-w-full" />
            <div className="skeleton h-4 w-48 sm:hidden" />
          </div>
          <div className="ml-auto flex flex-col items-end gap-1.5 max-sm:ml-0 max-sm:w-full max-sm:items-center max-sm:border-t max-sm:border-base-300 max-sm:pt-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-4 w-36" />
          </div>
        </div>
      </div>
      <div className="skeleton mb-4 h-11 w-[34rem] max-w-full" />
      <div className="skeleton mb-6 h-10 w-56 max-w-full" />
    </>
  );
}

// The phase snapshot: the record over its win bar and the last results, points scored and allowed as paired bars, then the
// facts row.
export function SnapshotSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4 sm:p-5">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <div className="skeleton h-10 w-28" />
              <div className="skeleton h-4 w-16" />
            </div>
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-2.5 w-full rounded-full" />
          <div className="mt-3 flex items-center gap-3">
            <div className="skeleton h-3 w-12" />
            <div className="flex gap-1">
              {range(5).map((index) => (
                <div key={index} className="skeleton size-6 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            {range(2).map((index) => (
              <div key={index} className="grid h-5 grid-cols-[4.5rem_1fr_3rem] items-center gap-3">
                <div className="skeleton h-4 w-14" />
                <div className="skeleton h-2.5 w-full rounded-full" />
                <div className="skeleton ml-auto h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-base-300 pt-4 sm:flex sm:flex-wrap sm:gap-x-8">
        <div className="max-sm:col-span-2">
          <FactSkeleton value="h-5 w-24" />
        </div>
        {range(4).map((index) => (
          <FactSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

// The four leader cards, in the loaded grid (a swipe row below sm).
export function TeamLeadersSkeleton() {
  return (
    <div aria-hidden="true" className="team-leaders-grid grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {range(4).map((index) => (
        <SkeletonChip key={index} image="person" />
      ))}
    </div>
  );
}

// Where the club ranks: two columns of groups, each a heading over ranked lines with a bar under each.
export function LeagueProfileSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <PanelHead title="w-64" />
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {[5, 5].map((rows, group) => (
          <div key={group}>
            <div className="skeleton mb-1 h-3 w-20" />
            {range(rows).map((index) => (
              <div key={index} className="py-2">
                <div className="mb-1 flex h-5 items-center justify-between gap-2">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-3.5 w-16" />
                </div>
                <div className="skeleton h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="skeleton mt-3 h-4 w-3/4" />
    </div>
  );
}

// A panel of compact game lines (recent form, upcoming games): round, opponent, then the result or the time.
function GameLinesSkeleton({ rows = 5 }) {
  return (
    <div className="panel flex flex-col p-4">
      <PanelHead title="w-32" />
      <div className="flex flex-col gap-2">
        {range(rows).map((index) => (
          <div key={index} className="flex h-[2.375rem] items-center gap-3 rounded-field border border-base-300 bg-base-200 px-3 max-sm:h-14">
            <div className="skeleton h-3 w-12 flex-none max-sm:hidden" />
            <div className="skeleton h-4 w-28" />
            <div className="skeleton ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The quick comparison: the tabs, the two clubs, then the comparison rows.
export function QuickCompareSkeleton() {
  return (
    <div aria-hidden="true" className="panel flex flex-col p-4">
      <PanelHead title="w-36" />
      <div className="skeleton mb-3 h-9 w-56 max-w-full" />
      <div className="mb-1 grid grid-cols-2 gap-4">
        <div className="skeleton ml-auto h-6 w-24" />
        <div className="skeleton h-6 w-24" />
      </div>
      {range(5).map((index) => (
        <div key={index} className="grid h-[5.75rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-base-300">
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-3 w-20" />
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-12" />
            <div className="skeleton h-1.5 w-full rounded-full" />
          </div>
        </div>
      ))}
      <div className="skeleton mt-3 h-4 w-3/4" />
    </div>
  );
}

// The Overview tab, as `OverviewSection` lays it out.
export function TeamOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SnapshotSkeleton />
      <TeamLeadersSkeleton />
      <LeagueProfileSkeleton />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <GameLinesSkeleton />
          <GameLinesSkeleton />
        </div>
        <QuickCompareSkeleton />
      </div>
    </div>
  );
}

// One stat group of the Statistics tab: the group's heading row, then its rows (label, rank, the two numbers and their bars).
function StatGroupSkeleton({ rows }) {
  return (
    <div>
      <div className="flex h-6 items-center border-b border-base-300 pb-1">
        <div className="skeleton h-4 w-24" />
      </div>
      {range(rows).map((index) => (
        <div key={index} className="flex h-9 items-center gap-3 border-b border-base-300 last:border-0 max-sm:h-14">
          <div className="skeleton h-3.5 w-28 max-sm:hidden" />
          <div className="skeleton h-2 flex-1 rounded-full" />
          <div className="skeleton h-4 w-10" />
          <div className="skeleton h-4 w-10" />
          <div className="skeleton h-2 flex-1 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// The Statistics tab: one panel, the traditional numbers beside the shooting and advanced ones from xl.
export function TeamStatisticsSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <PanelHead title="w-72" />
      <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
        <StatGroupSkeleton rows={10} />
        <div className="flex flex-col gap-6">
          <StatGroupSkeleton rows={3} />
          <StatGroupSkeleton rows={6} />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full sm:hidden" />
        <div className="skeleton h-4 w-full sm:hidden" />
        <div className="skeleton h-4 w-2/3 sm:hidden" />
      </div>
    </div>
  );
}

// The Roster tab: the squad facts, the view tabs, then the players by position as portrait cards.
export function TeamRosterSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="panel mb-4 grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:flex sm:flex-wrap sm:gap-x-10">
        {range(4).map((index) => (
          <FactSkeleton key={index} value="h-6 w-14" />
        ))}
      </div>
      <div className="skeleton mb-4 h-9 w-36" />
      <div className="flex flex-col gap-8">
        {[8, 7, 3, 6].map((cards, section) => (
          <div key={section}>
            <div className="skeleton mb-3 h-6 w-28" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {range(cards).map((index) => (
                <div key={index} className="flex min-h-28 overflow-hidden rounded-box border border-base-300 bg-base-100 sm:min-h-34">
                  <div className="skeleton w-20 flex-none rounded-none sm:w-28" />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="skeleton h-2.5 w-14" />
                        <div className="skeleton h-5 w-24 max-w-full" />
                      </div>
                      <div className="skeleton h-7 w-9" />
                    </div>
                    <div className="skeleton h-3 w-28 max-w-full" />
                    <div className="skeleton h-3 w-32 max-w-full" />
                    <div className="skeleton h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// A column of the Games tab: its heading, the filter tabs on the results side, then game rows with the opponent's crest.
function GameColumnSkeleton({ tabs = false }) {
  return (
    <div className="panel p-4">
      <PanelHead title="w-32" />
      {tabs ? <div className="skeleton mb-3 h-9 w-48" /> : null}
      <div className="flex flex-col gap-2">
        {range(8).map((index) => (
          <div key={index} className="flex items-center gap-3 rounded-field border border-base-300 bg-base-200 p-3">
            <div className="skeleton size-10 flex-none rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="skeleton h-4 w-32 max-w-full" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="skeleton mt-3 h-8 w-full" />
    </div>
  );
}

// The Games tab: the margin strip over the next games beside the latest results.
export function TeamGamesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="panel p-4">
        <PanelHead title="w-44" />
        <div className="skeleton h-48 w-full max-sm:h-56" />
        <div className="skeleton mt-2 h-4 w-60 max-w-full" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
        <GameColumnSkeleton />
        <GameColumnSkeleton tabs />
      </div>
    </div>
  );
}

// Rows of zone or situation figures, as the shooting tables draw them.
function FigureRows({ rows }) {
  return range(rows).map((index) => (
    <div key={index} className="flex h-[1.8rem] items-center gap-3 border-b max-sm:h-[3.3rem] border-base-300 last:border-0">
      <div className="skeleton h-3.5 w-28" />
      <div className="skeleton h-2 flex-1 rounded-full" />
      <div className="skeleton h-3.5 w-10" />
      <div className="skeleton h-3.5 w-10" />
    </div>
  ));
}

// The Shooting tab: the panel's controls, the four headline cards, then the court beside the zone and situation tables.
export function TeamShootingSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <PanelHead title="w-56" />
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="skeleton h-9 w-44" />
        <div className="skeleton h-9 w-44" />
        <div className="skeleton h-8 w-52 max-sm:w-full" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {range(4).map((index) => (
          <div key={index} className="panel flex flex-col items-center gap-2 p-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-6 w-24 max-sm:h-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        {/* The court over its legend; below sm the legend wraps to a second line. */}
        <div className="skeleton aspect-[7/8] w-full max-sm:aspect-[4/5]" />
        <div className="flex flex-col gap-4">
          {[14, 3].map((rows, table) => (
            <div key={table} className="panel p-3">
              <PanelHead title="w-48" />
              {/* Below sm the zones' hottest and coldest badges sit under the title. */}
              {table === 0 ? <div className="skeleton mb-4 h-14 w-56 sm:hidden" /> : null}
              <FigureRows rows={rows} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lineup rows: five faces and the lineup's names, then its figures and net-rating bar.
export function LineupRowsSkeleton({ rows = 5 }) {
  return (
    <div aria-hidden="true" className="panel p-4">
      {range(rows).map((index) => (
        <div
          key={index}
          className="grid items-center gap-x-10 gap-y-2 border-b border-base-300 py-3 last:border-0 lg:grid-cols-[24rem_minmax(0,1fr)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {range(5).map((face) => (
                <div key={face} className="skeleton size-9 rounded-full border-2 border-base-100" />
              ))}
            </div>
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-2 flex-1 rounded-full" />
            <div className="skeleton h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The Advanced tab: the scope tabs, then the ratings chart, the four split cards, how games unfold and the best lineups.
export function TeamAdvancedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="skeleton h-10 w-56 max-w-full" />
      <div className="flex flex-col gap-8">
        <div className="panel p-4">
          <PanelHead title="w-72" />
          <div className="skeleton h-[16.5rem] w-full sm:h-[20.5rem]" />
          <div className="skeleton mt-3 h-4 w-96 max-w-full" />
          <div className="mt-2 flex flex-col gap-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full sm:hidden" />
            <div className="skeleton h-4 w-full sm:hidden" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
        <div>
          <PanelHead title="w-60" />
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {range(4).map((index) => (
              <div key={index} className="skeleton h-44 rounded-box" />
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <PanelHead title="w-40" />
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-base-300 pt-4 sm:grid-cols-4">
            {range(8).map((index) => (
              <FactSkeleton key={index} />
            ))}
          </div>
        </div>
        <div>
          <PanelHead title="w-32" />
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="skeleton h-9 w-40" />
            <div className="skeleton h-8 w-64 max-w-full" />
          </div>
          <LineupRowsSkeleton />
        </div>
      </div>
    </div>
  );
}

// The whole page while its code or the team loads: the page top over the Overview tab, where a team page opens.
export default function TeamPageSkeleton() {
  return (
    <div aria-hidden="true">
      <TeamTopSkeleton />
      <TeamOverviewSkeleton />
    </div>
  );
}
