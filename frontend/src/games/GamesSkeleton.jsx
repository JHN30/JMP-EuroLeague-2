import { SkeletonPageHeader, SkeletonTabs } from "../lib/Skeleton";

// Games' skeletons, shared by the round's games (while they load) and the whole page (while its code or its phases load), so
// the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// A round's games: 10 in the modern league.
const ROUND_GAMES = 10;

// The round's game cards in the loaded grid (two columns once the box is 40rem wide).
export function FixturesSkeleton() {
  return (
    <div aria-hidden="true" className="fixture-box">
      <div className="skeleton mb-3 h-3 w-64 max-w-full" />
      <div className="fixture-grid">
        {Array.from({ length: ROUND_GAMES }, (_, index) => <div key={index} className="skeleton h-32 rounded-field" />)}
      </div>
    </div>
  );
}

// The whole page, laid out as `FixturesPage` lays it out: the header, the phase tabs, the round strip and the games.
export default function GamesSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <SkeletonTabs className="mb-2 w-72 sm:mb-4" />
      <SkeletonTabs className="mb-2 w-full sm:mb-6" />
      <FixturesSkeleton />
    </div>
  );
}
