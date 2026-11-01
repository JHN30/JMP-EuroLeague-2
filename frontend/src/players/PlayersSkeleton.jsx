import { SkeletonPageHeader } from "../lib/Skeleton";

// Players' skeletons, shared by the list (while it loads) and the whole page (while its code loads), so the two always match.
// This file imports none of the page's code, so the page skeleton stays out of its bundle.

// Enough cards to fill a screen (two full rows at every width); the loaded page has up to 60.
const CARDS = 20;

// The summary line over the player cards in the loaded grid: a portrait over the name on a phone, beside it from sm.
export function PlayerListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton mb-3 h-3.5 w-48" />
      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: CARDS }, (_, index) => (
          <li key={index} className="flex overflow-hidden rounded-box border border-base-300 bg-base-100 max-sm:flex-col sm:min-h-22">
            <div className="skeleton flex-none rounded-none max-sm:aspect-4/3 max-sm:w-full sm:w-18" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2.5 py-2 sm:px-3">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The whole page, laid out as `PlayersPage` lays it out: the header, the search and filters row and the cards.
export default function PlayersSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="skeleton h-8 w-full sm:max-w-xs sm:flex-1" />
        <div className="skeleton h-8 flex-1 sm:w-48 sm:flex-none" />
        <div className="skeleton h-8 flex-1 sm:w-36 sm:flex-none" />
      </div>
      <PlayerListSkeleton />
    </div>
  );
}
