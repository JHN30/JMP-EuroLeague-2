import { SkeletonChip, SkeletonPageHeader, SkeletonPanel } from "../lib/Skeleton";

// Home's skeletons, shared by each panel (while its data loads) and the whole Home page (while its code loads), so the two
// always match. This file imports none of Home's code, so the page skeleton stays out of Home's bundle.

// Upcoming games and Latest scores show this many games on a phone before "Show more".
export const VISIBLE_ON_MOBILE = 5;

// A round's games, and the height of a loaded game card.
const ROUND_GAMES = 10;
const CARD = "match-card skeleton h-[6.6rem]";

// Five stacked cards below sm (the rest wait behind "Show more"), all ten in the grid from sm, as in the loaded panel.
export function UpcomingGamesSkeleton() {
  return (
    <div className="games-row" aria-hidden="true">
      {Array.from({ length: VISIBLE_ON_MOBILE }, (_, index) => <div key={index} className={CARD} />)}
      <div className="contents max-sm:hidden">
        {Array.from({ length: ROUND_GAMES - VISIBLE_ON_MOBILE }, (_, index) => <div key={index} className={CARD} />)}
      </div>
    </div>
  );
}

// The table's rows as the loaded snapshot draws them: a rank, the club and its record, 1.75rem tall with a 0.25rem gap.
export function LeagueTableSkeleton() {
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <div key={index} className="flex h-7 items-center gap-3">
          <div className="skeleton size-6 flex-none rounded-full" />
          <div className="skeleton h-4 flex-1" />
          <div className="skeleton h-4 w-12 flex-none" />
        </div>
      ))}
    </div>
  );
}

export function LatestScoresSkeleton() {
  return (
    // The box is the container the list's two-column rule measures, as in the loaded panel.
    <div className="games-list-box" aria-hidden="true">
      <div className="games-list">
        {Array.from({ length: VISIBLE_ON_MOBILE }, (_, index) => <div key={index} className={CARD} />)}
        {/* The rest wait behind "Show all" on a phone. A wrapper hides them, since the card's own display rule would win
            over a utility on the card; from sm it adds no box of its own, so the cards stay in the list's grid. */}
        <div className="contents max-sm:hidden">
          {Array.from({ length: ROUND_GAMES - VISIBLE_ON_MOBILE }, (_, index) => <div key={index} className={CARD} />)}
        </div>
      </div>
    </div>
  );
}

// The whole Home page while its code loads, laid out as `Dashboard` lays out the loaded page.
export default function HomeSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6 lg:gap-4">
      <SkeletonPageHeader description />
      <SkeletonPanel>
        <UpcomingGamesSkeleton />
      </SkeletonPanel>
      {/* From lg the table panel takes the scores panel's height, as the loaded table does (it scrolls inside). */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-4">
        <div className="lg:relative">
          <SkeletonPanel className="overflow-hidden lg:absolute lg:inset-0">
            <LeagueTableSkeleton />
          </SkeletonPanel>
        </div>
        <SkeletonPanel>
          <LatestScoresSkeleton />
        </SkeletonPanel>
      </div>
      <div className="kpi-strip kpi-strip-4">
        {Array.from({ length: 4 }, (_, index) => <SkeletonChip key={index} />)}
      </div>
      <SkeletonPanel>
        <div className="skeleton mb-2 h-4 w-28" />
        <div className="leaders-row">
          {Array.from({ length: 4 }, (_, index) => <SkeletonChip key={index} image="person" />)}
        </div>
      </SkeletonPanel>
      <SkeletonPanel>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton h-7" />)}
        </div>
      </SkeletonPanel>
    </div>
  );
}
