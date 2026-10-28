import { SkeletonBlock, SkeletonChip, SkeletonLines, SkeletonPageHeader, SkeletonRankedRows, SkeletonTabs } from "../lib/Skeleton";

// Standings' skeletons, shared by each view (while its data loads) and the whole page (while its code or its phases load), so
// the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// A phase's clubs: 20 in the modern league.
const CLUBS = 20;

// The table in its panel, as `StandingsTable` draws it: the header row, then a row per club.
export function StandingsTableSkeleton({ columns = 8 }) {
  return (
    <div aria-hidden="true" className="panel p-2">
      <div className="flex h-12 items-center border-b border-base-300 px-2">
        <div className="skeleton h-3.5 w-1/3" />
      </div>
      <SkeletonRankedRows rows={CLUBS} columns={columns} rowClassName="h-13" />
    </div>
  );
}

// What the standings panel holds while the standings load: the KPI strip, the display tabs, the view switch and the table.
export function StandingsBodySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="kpi-strip kpi-strip-5">
        {Array.from({ length: 5 }, (_, index) => <SkeletonChip key={index} />)}
      </div>
      <SkeletonTabs className="w-56" />
      <SkeletonTabs className="w-full sm:w-96" />
      <StandingsTableSkeleton />
    </div>
  );
}

// The Advanced display: its scope, round and view switches over the table.
export function AdvancedStandingsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <SkeletonTabs className="w-full sm:w-96" />
      <SkeletonTabs className="w-full sm:w-80" />
      <StandingsTableSkeleton columns={10} />
    </div>
  );
}

// The Race display: the four insight cards, the playback bar, then the chart beside the round's table from lg.
export function RaceSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-24" />)}
      </div>
      <SkeletonTabs className="w-full" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[2fr_1fr]">
        <SkeletonBlock className="h-112" />
        <div className="panel p-2">
          <SkeletonRankedRows rows={CLUBS} columns={2} rowClassName="h-[1.3rem]" />
        </div>
      </div>
    </div>
  );
}

// A breakdown (winning margins, ahead/behind): its legend over a table of the clubs.
export function BreakdownSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <SkeletonLines lines={2} />
      <StandingsTableSkeleton columns={6} />
    </div>
  );
}

// The whole page while its code or its phases load, laid out as `StandingsPage` lays out the Table display.
export default function StandingsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <SkeletonTabs className="mb-4 w-72" />
      <StandingsBodySkeleton />
    </div>
  );
}
