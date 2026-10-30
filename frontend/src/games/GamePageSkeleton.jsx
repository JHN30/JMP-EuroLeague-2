import { SkeletonPanelHead } from "../lib/Skeleton";

// The game page's skeletons: the whole page (while its code or the game loads) and each tab and panel (while its data loads),
// so the two always match. Each mirrors the loaded markup's grid, gaps and paddings. This file imports none of the page's
// code, so the page skeleton stays out of its bundle.

const range = (length) => Array.from({ length }, (_, index) => index);

// A panel of `rows` table rows under its heading row; `head` is the heading row's height.
function TableSkeleton({ rows, rowClassName = "h-9", head = "h-11", avatar = false }) {
  return (
    <div className="panel p-3">
      <div className={`flex items-center gap-3 border-b border-base-300 ${head}`}>
        <div className="skeleton h-3 w-16" />
        <div className="skeleton ml-auto h-3 w-2/3" />
      </div>
      {range(rows).map((index) => (
        <div key={index} className={`flex items-center gap-3 border-b border-base-300 last:border-0 ${rowClassName}`}>
          {avatar ? <div className="skeleton size-8 flex-none rounded-full" /> : null}
          <div className="skeleton h-3.5 w-28" />
          <div className="skeleton ml-auto h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// A section heading over its content, as the game tabs lay out their sections (one line from lg).
function Section({ title, children }) {
  return (
    <div>
      <SkeletonPanelHead title={title} compact />
      {children}
    </div>
  );
}

// A block of a panel's loaded size: `className` sets its height.
export function PanelBlockSkeleton({ className = "h-48" }) {
  return <div aria-hidden="true" className={`skeleton w-full rounded-box ${className}`} />;
}

// Two blocks side by side from sm, as the two teams' cards sit.
export function TwoBlocksSkeleton({ className = "h-44", breakpoint = "sm" }) {
  return (
    <div aria-hidden="true" className={`grid grid-cols-1 gap-4 ${breakpoint === "lg" ? "lg:grid-cols-2" : "sm:grid-cols-2"}`}>
      <PanelBlockSkeleton className={className} />
      <PanelBlockSkeleton className={className} />
    </div>
  );
}

// One team's side of the matchup header: the crest over the code.
function HeaderSide() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="skeleton size-14 rounded-box sm:size-20 lg:size-16" />
      <div className="skeleton h-6 w-16 sm:w-24" />
    </div>
  );
}

// The page top, as `GameDetailPage` lays it out: the way back, the matchup header (two clubs either side of the score, the
// round line, then the arena, attendance and officials: two columns below sm, one row from it), then the tabs.
function GameTopSkeleton() {
  return (
    <>
      <div className="mb-1 flex h-8 items-center max-sm:hidden">
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="panel relative mb-6 overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-6">
          <HeaderSide />
          <div className="flex flex-col items-center gap-2">
            <div className="skeleton h-8 w-28 sm:h-12 sm:w-44" />
            <div className="skeleton h-3 w-10" />
          </div>
          <HeaderSide />
        </div>
        <div className="skeleton mx-auto mt-4 h-4 w-48" />
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-base-300 pt-3 sm:grid-cols-3">
          {range(3).map((index) => (
            <div key={index} className={`flex flex-col items-center gap-1.5 ${index === 2 ? "max-sm:col-span-2" : ""}`}>
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-5 w-28 sm:w-36" />
            </div>
          ))}
        </div>
      </div>
      <div className="skeleton mb-4 h-11 w-[46rem] max-w-full" />
    </>
  );
}

// The Overview tab, as `OverviewTab` lays it out: the line score, the two team cards with the key stats between them (under
// them below lg) and the score flow, each under its heading; from lg the line score and the score flow share the top row.
export function GameOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-4">
      <div className="lg:col-start-1 lg:row-start-1">
        <Section title="w-36">
          <TableSkeleton rows={3} />
        </Section>
      </div>
      <div className="lg:col-span-2 lg:row-start-2">
        <Section title="w-64">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
            <PanelBlockSkeleton className="h-[27rem] lg:col-start-1 lg:row-start-1 lg:h-auto" />
            <PanelBlockSkeleton className="h-[27rem] lg:col-start-3 lg:row-start-1 lg:h-auto" />
            <PanelBlockSkeleton className="h-[33rem] sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1" />
          </div>
        </Section>
      </div>
      <div className="lg:col-start-2 lg:row-start-1">
        <Section title="w-28">
          <PanelBlockSkeleton className="h-64" />
        </Section>
      </div>
    </div>
  );
}

// The two teams' box score tables, each under its team line (crest, name, coach and player count).
export function BoxScoreTablesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {range(2).map((team) => (
        <div key={team}>
          <div className="mb-3 flex h-10 items-center gap-3">
            <div className="skeleton size-7 rounded-full" />
            <div className="skeleton h-5 w-40" />
            <div className="skeleton ml-auto h-3 w-16" />
          </div>
          <TableSkeleton rows={12} rowClassName="h-14" head="h-12" avatar />
          <div className="mt-2 flex flex-col gap-2 px-3">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The Box score tab: the view tabs over the two teams' tables.
export function BoxScoreSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="skeleton h-9 w-48" />
      <BoxScoreTablesSkeleton />
    </div>
  );
}

// The Game flow tab: the five headline cards, the lead tracker and the line score.
export function GameFlowSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6 lg:gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 lg:gap-3">
        {range(5).map((index) => (
          <PanelBlockSkeleton key={index} className={`h-32 max-sm:h-24 lg:h-[6.5rem] ${index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-32" />
        <div className="skeleton h-[21.5rem] w-full max-sm:h-68" />
      </div>
      <TableSkeleton rows={3} />
    </div>
  );
}

// The rotations: each team's timeline panel, one row a player, side by side from xl.
export function RotationsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 xl:grid-cols-2">
      <PanelBlockSkeleton className="h-[23rem] max-sm:h-[42rem]" />
      <PanelBlockSkeleton className="h-[24.5rem] max-sm:h-[47rem]" />
    </div>
  );
}

// Team comparison rows: the two sides' numbers either side of the label.
export function ComparisonRowsSkeleton({ rows = 19 }) {
  return (
    <div aria-hidden="true" className="panel p-4">
      <div className="mx-auto mb-3 skeleton h-6 w-72 max-w-full" />
      {range(rows).map((index) => (
        <div key={index} className="grid h-13 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-base-300 last:border-0">
          <div className="skeleton ml-auto h-5 w-14" />
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

// The Shooting tab: the heading and view tabs, the filter box, the two teams' shot maps, then the zone comparison.
export function GameShootingSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div>
        <SkeletonPanelHead title="w-36" />
        <div className="skeleton mb-4 h-9 w-56" />
        <div className="panel mb-4 grid grid-cols-2 gap-3 p-3 max-sm:hidden lg:grid-cols-3 xl:grid-cols-6">
          {range(6).map((index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <div className="skeleton h-3.5 w-20" />
              <div className="skeleton h-8 w-full" />
            </div>
          ))}
        </div>
        <div className="skeleton h-8 w-full sm:hidden" />
      </div>
      <div className="panel p-4">
        <div className="skeleton mb-4 h-7 w-80 max-w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelBlockSkeleton className="h-[41.5rem] max-sm:h-[28rem]" />
          <PanelBlockSkeleton className="h-[41.5rem] max-sm:h-[28rem]" />
        </div>
        <div className="skeleton mx-auto mt-4 h-4 w-64" />
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-36" />
        <div className="skeleton mb-2 h-16 w-full" />
        {range(15).map((index) => (
          <div key={index} className="flex h-8 items-center gap-3 border-b border-base-300 last:border-0">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton ml-auto h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The Play-by-play tab: the live log panel with its filters, then the events (sixty at first) and the button for more.
export function PlayByPlaySkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <SkeletonPanelHead title="w-28" />
      <div className="mb-3 grid gap-4 sm:grid-cols-3">
        {range(3).map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="skeleton h-3.5 w-20" />
            <div className="skeleton h-8 w-full" />
          </div>
        ))}
      </div>
      {range(60).map((index) => (
        <div key={index} className="flex h-[3.55rem] items-center gap-3 border-b border-base-300 last:border-0 lg:h-[2.1rem]">
          <div className="flex w-10 flex-col gap-1.5">
            <div className="skeleton h-3 w-6" />
            <div className="skeleton h-3 w-10" />
          </div>
          <div className="skeleton size-6 flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="skeleton h-4 w-48 max-w-full" />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="skeleton h-4 w-12" />
        </div>
      ))}
      <div className="skeleton mx-auto mt-4 h-8 w-32" />
    </div>
  );
}

// The whole page while its code or the game loads: the page top over the Overview tab, where a game page opens.
export default function GamePageSkeleton() {
  return (
    <div aria-hidden="true">
      <GameTopSkeleton />
      <GameOverviewSkeleton />
    </div>
  );
}
