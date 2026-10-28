import { SkeletonPageHeader } from "../lib/Skeleton";

// Teams' skeletons, shared by the list (while it loads) and the whole page (while its code loads), so the two always match.
// This file imports none of the page's code, so the page skeleton stays out of its bundle.

// A season's clubs: 20 in the modern league.
const CLUBS = 20;

// The club cards in the loaded grid: a crest over the name on a phone, beside it from sm.
export function TeamListSkeleton() {
  return (
    <ul aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: CLUBS }, (_, index) => (
        <li key={index} className="card card-border bg-base-100">
          <div className="card-body items-center gap-2 p-3 sm:flex-row sm:gap-3 sm:p-4">
            <div className="skeleton size-10 flex-none rounded-full" />
            <div className="flex w-full min-w-0 flex-col items-center gap-1.5 sm:items-start">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TeamsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <TeamListSkeleton />
    </div>
  );
}
