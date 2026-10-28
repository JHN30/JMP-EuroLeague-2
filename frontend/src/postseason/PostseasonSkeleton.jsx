import { SkeletonBlock, SkeletonLines, SkeletonPageHeader, SkeletonPanel, SkeletonRankedRows } from "../lib/Skeleton";

// The Postseason page while its code or its data loads, laid out as `PostseasonPage` lays out a modern season: the header, the
// stage steps, the bracket and the qualification race. One shape for every format; it does not draw each bracket family.
// This file imports none of the page's code, so it stays out of the page's bundle.
export default function PostseasonSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <div className="panel p-4">
        <div className="skeleton mb-1 h-3 w-24" />
        <div className="skeleton mb-4 h-6 w-64 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <SkeletonLines key={index} lines={2} />)}
        </div>
      </div>
      <div className="skeleton h-3.5 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[3, 3, 2, 1].map((matchups, column) => (
          <div key={column} className="flex flex-col gap-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mb-2 h-5 w-32" />
            {Array.from({ length: matchups }, (_, index) => <SkeletonBlock key={index} className="h-28" />)}
          </div>
        ))}
      </div>
      <div className="skeleton h-3.5 w-56" />
      <SkeletonPanel>
        <SkeletonRankedRows rows={10} columns={3} />
      </SkeletonPanel>
    </div>
  );
}
