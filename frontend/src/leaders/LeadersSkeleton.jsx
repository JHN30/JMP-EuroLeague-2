import { SkeletonPageHeader, SkeletonRankedRows, SkeletonTabs } from "../lib/Skeleton";

// Leaders' skeletons, shared by each card and board (while its data loads) and the whole page (while its code loads), so the
// two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// A category card's top five, as `CategoryCard` draws them: a rank, a photo or crest, the name over the team, the value and
// the share bar under it.
export function CategoryRowsSkeleton() {
  return (
    <ol aria-hidden="true" className="flex flex-1 flex-col">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="border-b border-base-300 py-2 last:border-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="skeleton size-6 flex-none rounded-full" />
            <div className="skeleton size-10 flex-none rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="skeleton h-3.5 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-6 w-12 flex-none" />
          </div>
          <div className="skeleton mt-1.5 ml-10 h-1" />
        </li>
      ))}
    </ol>
  );
}

// A grid of `cards` category cards, as `CardGrid` lays them out.
function CardGridSkeleton({ cards }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="panel flex flex-col p-4">
          <div className="skeleton mb-1.5 h-3 w-16" />
          <div className="skeleton mb-3 h-5 w-40 max-w-full" />
          <CategoryRowsSkeleton />
          <div className="skeleton mt-3 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// The category cards under their toolbar and family title, as each tab's landing lays them out.
export function LandingSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="skeleton h-3 w-10" />
        <div className="skeleton h-10 w-44" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="skeleton h-5 w-40" />
        <CardGridSkeleton cards={6} />
      </div>
    </div>
  );
}

// A full leaderboard in its panel: the "Showing" line, then the ranked rows.
export function BoardSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-2 sm:p-3">
      <div className="skeleton mx-2 mb-3 h-3.5 w-48" />
      <SkeletonRankedRows rows={12} columns={3} rowClassName="h-14" />
    </div>
  );
}

// The player form section: its title and statistic tabs, then the hot list beside the movers from xl.
export function FormSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="skeleton h-6 w-44" />
        <SkeletonTabs className="w-72" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[3fr_2fr]">
        <div className="panel p-4">
          <SkeletonRankedRows rows={5} columns={2} rowClassName="h-14" />
        </div>
        <div className="panel p-4">
          <SkeletonRankedRows rows={6} columns={1} />
        </div>
      </div>
    </div>
  );
}

// The whole page, laid out as `LeadersPage` lays out the Players tab's cards.
export default function LeadersSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <SkeletonTabs className="mb-6 w-72" />
      <LandingSkeleton />
    </div>
  );
}
