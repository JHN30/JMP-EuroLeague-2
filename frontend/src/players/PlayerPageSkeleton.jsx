import { SkeletonPanelHead } from "../lib/Skeleton";

// The player page's skeletons: the whole page (while its code or the player loads) and each tab and Overview panel (while its
// data loads), so the two always match. Each mirrors the loaded markup's grid, gaps and paddings. This file imports none of
// the page's code, so the page skeleton stays out of its bundle. The Shooting tab uses the shared `SkeletonShooting`.

const range = (length) => Array.from({ length }, (_, index) => index);

// A label over a value, as the hero and the tabs' fact rows draw them.
function FactSkeleton({ value = "h-5 w-12" }) {
  return (
    <div className="flex flex-col gap-1.5 max-sm:items-center">
      <div className="skeleton h-3 w-14" />
      <div className={`skeleton ${value}`} />
    </div>
  );
}

// A table of `rows` rows under its heading row, as the season and role tables draw them; `title` adds a panel heading.
function TableSkeleton({ rows, title = null }) {
  return (
    <div className="panel p-4">
      {title ? <SkeletonPanelHead title={title} /> : null}
      <div className="flex h-10 items-center gap-3 border-b border-base-300">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton ml-auto h-3 w-2/3" />
      </div>
      {range(rows).map((index) => (
        <div key={index} className="flex h-10 items-center gap-3 border-b border-base-300 last:border-0">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton ml-auto h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// A row of stat cards, as the season line and the career summary draw them: a label, the number, a bar and a note.
function StatCards({ count = 7 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {range(count).map((index) => (
        <div key={index} className="rounded-box border border-base-300 bg-base-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-8" />
          </div>
          <div className="skeleton mt-1.5 h-7 w-14" />
          <div className="skeleton mt-3 h-1 w-full" />
          <div className="skeleton mt-1.5 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// The page top, as `PlayerPage` lays it out: the way back, the hero (portrait, name and number, clubs, facts and the compare
// button), then the section tabs.
function PlayerTopSkeleton() {
  return (
    <>
      <div className="mb-1 flex h-8 items-center max-sm:hidden">
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="panel relative mb-6 grid overflow-hidden sm:grid-cols-[11rem_1fr]">
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary" />
        <div className="skeleton rounded-none max-sm:mx-auto max-sm:mt-5 max-sm:aspect-4/5 max-sm:w-36 max-sm:rounded-box sm:row-span-2 sm:w-full" />
        <div className="flex min-w-0 flex-col items-center gap-1 p-3 pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-6 sm:pb-0">
          <div className="flex flex-col gap-2 max-sm:items-center">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-3.5 w-20" />
            <div className="skeleton h-8 w-56 max-w-full lg:h-12" />
          </div>
          <div className="skeleton h-8 w-14 sm:h-14 sm:w-20" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 p-3 max-sm:items-center sm:px-6 sm:pt-4 sm:pb-6">
          <div className="skeleton h-8 w-44" />
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 sm:justify-start">
            {range(5).map((index) => (
              <FactSkeleton key={index} />
            ))}
          </div>
          <div className="skeleton h-8 w-52 max-sm:w-full" />
        </div>
      </div>
      <div className="skeleton mb-4 h-11 w-[38rem] max-w-full" />
    </>
  );
}

// The form panel's body while the recent games load: the four deltas, a bar per game over its crest, and the best game.
export function FormBodySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
        {range(4).map((index) => (
          <FactSkeleton key={index} value="h-6 w-10" />
        ))}
      </div>
      <div className="flex h-44 items-end gap-3">
        {[45, 80, 45, 15, 30, 15, 60].map((height, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="skeleton w-full max-w-8 rounded-sm" style={{ height: `${height}%` }} />
            <div className="skeleton size-5 flex-none rounded-full" />
          </div>
        ))}
      </div>
      <div className="skeleton mt-4 h-10 w-full" />
    </div>
  );
}

// The Overview tab, as `PlayerOverviewSection` lays it out: the season line, the profile beside the form, then shooting.
export function PlayerOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <StatCards />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <SkeletonPanelHead title="w-20" />
          <div className="skeleton mx-auto aspect-square w-full max-w-64 rounded-full" />
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="skeleton h-6 w-60 max-w-full" />
            <div className="skeleton h-6 w-56 max-w-full" />
          </div>
        </div>
        <div className="panel p-4">
          <SkeletonPanelHead title="w-32" />
          <FormBodySkeleton />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <SkeletonPanelHead title="w-24" />
          <div className="flex flex-col gap-3">
            {range(3).map((index) => (
              <div key={index} className="flex h-6 items-center gap-3">
                <div className="skeleton h-4 w-8" />
                <div className="skeleton h-2 flex-1 rounded-full" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-base-300 pt-4">
            {range(2).map((index) => (
              <FactSkeleton key={index} value="h-7 w-16" />
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <SkeletonPanelHead title="w-52" />
          <div className="skeleton h-5 w-full rounded-full" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {range(3).map((index) => (
              <FactSkeleton key={index} value="h-7 w-16" />
            ))}
          </div>
          <div className="skeleton mt-4 h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// The radar comparing the player's profile across seasons, while every season's rankings load.
export function CareerRadarSkeleton() {
  return <div aria-hidden="true" className="skeleton mx-auto aspect-square w-full max-w-md rounded-full" />;
}

// The Season by season tab, as `PlayerCareerSection` lays it out: the career summary, the season table, the trend cards, the
// highs beside the profile by season, the role table and the clubs.
export function PlayerCareerSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <StatCards />
      <div>
        <TableSkeleton rows={6} />
        <div className="skeleton mt-2 h-3 w-3/4" />
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-20" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {range(12).map((index) => (
            <div key={index} className="skeleton h-34 rounded-box max-sm:h-40" />
          ))}
        </div>
        <div className="skeleton mt-3 h-3 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel p-4">
          <SkeletonPanelHead title="w-28" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {range(8).map((index) => (
              <div key={index} className="skeleton h-28 rounded-box" />
            ))}
          </div>
          <div className="skeleton mt-3 h-3 w-2/3" />
        </div>
        <div className="panel p-4">
          <SkeletonPanelHead title="w-36" />
          <div className="skeleton h-8 w-44" />
          <div className="skeleton mt-3 h-4 w-3/4" />
        </div>
      </div>
      <TableSkeleton rows={5} title="w-44" />
      <div className="panel p-4">
        <SkeletonPanelHead title="w-36" />
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {range(5).map((index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-5 w-44" />
              <div className="skeleton h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// One stat group of the Statistics tab: its heading row, then label, number, bar and league rank on each row.
function StatGroupSkeleton({ rows }) {
  return (
    <div>
      <div className="flex h-11 items-center border-b border-base-300">
        <div className="skeleton h-4 w-24" />
      </div>
      {range(rows).map((index) => (
        <div key={index} className="flex h-11 items-center gap-3 border-b border-base-300 last:border-0 max-sm:h-13">
          <div className="skeleton h-3.5 w-28" />
          <div className="skeleton h-4 w-10" />
          <div className="skeleton h-2 flex-1 rounded-full" />
          <div className="skeleton h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

// The Statistics tab's panel while the season's numbers load: the heading, the league highlights, then the stat groups in two
// columns from xl.
export function PlayerStatisticsSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <SkeletonPanelHead title="w-56" />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="skeleton h-7 w-36" />
        <div className="skeleton h-7 w-28" />
        <div className="skeleton h-7 w-40" />
      </div>
      <div className="grid gap-x-10 gap-y-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <StatGroupSkeleton rows={13} />
          <StatGroupSkeleton rows={7} />
        </div>
        <div className="flex flex-col gap-6">
          <StatGroupSkeleton rows={9} />
          <StatGroupSkeleton rows={5} />
          <StatGroupSkeleton rows={4} />
        </div>
      </div>
      <div className="skeleton mt-4 h-4 w-3/4" />
    </div>
  );
}

// The Advanced tab, as `PlayerAdvancedSection` lays it out: the scope tabs, then the scorecard (a summary over six rated
// cards), the round-by-round chart, on and off the floor, and the adjusted plus-minus.
export function PlayerAdvancedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="skeleton h-10 w-56 max-w-full" />
      <div className="flex flex-col gap-8">
        <div>
          <SkeletonPanelHead title="w-28" />
          <div className="skeleton mb-3 h-14 w-full rounded-box" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {range(6).map((index) => (
              <div key={index} className="skeleton h-60 rounded-box" />
            ))}
          </div>
          <div className="skeleton mt-3 h-3 w-28" />
          <div className="skeleton mt-3 h-12 w-full rounded-box" />
        </div>
        <div>
          <SkeletonPanelHead title="w-48" />
          <div className="skeleton mb-3 h-9 w-[30rem] max-w-full" />
          <div className="panel p-4">
            <div className="skeleton h-72 w-full" />
            <div className="skeleton mt-4 h-5 w-56" />
          </div>
        </div>
        <div>
          <SkeletonPanelHead title="w-60" />
          <div className="skeleton h-72 w-full rounded-box max-sm:h-96" />
          <div className="skeleton mt-3 h-3 w-3/4" />
        </div>
        <div>
          <SkeletonPanelHead title="w-64" />
          <div className="skeleton h-60 w-full rounded-box max-sm:h-72" />
        </div>
      </div>
    </div>
  );
}

// The Games tab, as `PlayerGamesSection` lays it out: a bar per game with its badges and stat tabs, the four splits (home,
// away, wins, losses), then the box scores with their filters.
export function PlayerGamesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="panel p-4">
        <SkeletonPanelHead title="w-44" />
        <div className="mb-3 flex gap-2">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-28 rounded-full" />
        </div>
        <div className="skeleton mb-3 h-9 w-64 max-w-full" />
        <div className="skeleton h-44 w-full" />
        <div className="skeleton mt-3 h-4 w-3/4 max-sm:h-12 max-sm:w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {range(4).map((index) => (
          <div key={index} className="skeleton h-28 rounded-box" />
        ))}
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-28" />
        <div className="skeleton mb-3 h-9 w-72 max-w-full" />
        <div className="skeleton mb-3 h-10 w-56" />
        <div className="flex h-10 items-center gap-3 border-b border-base-300">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton ml-auto h-3 w-2/3" />
        </div>
        {range(8).map((index) => (
          <div key={index} className="flex h-13 items-center gap-3 border-b border-base-300 last:border-0">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton ml-auto h-4 w-2/3" />
          </div>
        ))}
        <div className="skeleton mt-3 h-4 w-2/3" />
      </div>
    </div>
  );
}

// The whole page while its code or the player loads: the page top over the Overview tab, where a player page opens.
export default function PlayerPageSkeleton() {
  return (
    <div aria-hidden="true">
      <PlayerTopSkeleton />
      <PlayerOverviewSkeleton />
    </div>
  );
}
