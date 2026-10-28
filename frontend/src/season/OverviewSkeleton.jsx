import { SkeletonChip, SkeletonLines, SkeletonPageHeader, SkeletonPanel } from "../lib/Skeleton";

// The season Overview's skeletons, shared by the summary (while it loads) and the whole page (while its code or its phases
// load), so the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// The summary: the hero's two club cards, then the phase story's cards (two columns from sm, four from xl).
export function SummarySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="season-hero-kpis grid grid-cols-2 gap-3 sm:gap-4">
        <SkeletonChip />
        <SkeletonChip />
      </div>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton mb-2 h-5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="panel flex h-44 flex-col gap-2 p-4">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-32" />
              <SkeletonLines lines={2} className="mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// The whole page, laid out as `SeasonOverviewPage` lays it out: the header, the summary and the leaders' cards.
export default function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SummarySkeleton />
      <SkeletonPanel>
        <div className="season-leaders-grid">
          {Array.from({ length: 6 }, (_, index) => <SkeletonChip key={index} image="person" />)}
        </div>
      </SkeletonPanel>
    </div>
  );
}
