import { SkeletonPageHeader } from "../lib/Skeleton";

// Players' skeletons, shared by the list (while it loads) and the whole page (while its code loads), so the two always match.
// This file imports none of the page's code, so the page skeleton stays out of its bundle.

// Enough cards to fill a screen; the loaded page has up to 36.
const CARDS = 12;

// The summary line over the player cards in the loaded grid: a portrait over the name on a phone, beside it from sm.
export function PlayerListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton mb-3 h-3.5 w-48" />
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: CARDS }, (_, index) => (
          <li key={index} className="flex overflow-hidden rounded-box border border-base-300 bg-base-100 max-sm:flex-col sm:min-h-28">
            <div className="skeleton flex-none rounded-none max-sm:aspect-4/3 max-sm:w-full sm:w-24" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The whole page, laid out as `PlayersPage` lays it out: the header, the search field and the cards.
export default function PlayersSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <div className="skeleton mb-6 h-8 w-full max-w-xs" />
      <PlayerListSkeleton />
    </div>
  );
}
