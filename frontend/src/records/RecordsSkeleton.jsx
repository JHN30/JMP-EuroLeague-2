import { SkeletonBlock, SkeletonLines, SkeletonPageHeader, SkeletonRankedRows } from "../lib/Skeleton";

// Records' skeletons, shared by the record book and a record's detail (while their data loads) and the whole page (while its
// code loads), so the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// One record type of the book: its title and description over its headline cards (one column, two from sm, three from lg).
function BookSectionSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton mb-2 h-5 w-40" />
      <div className="skeleton mb-3 h-3.5 w-80 max-w-full" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="panel flex flex-col gap-3 p-5">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-9 w-20" />
            <div className="flex items-center gap-3">
              <div className="skeleton size-12 flex-none rounded-full" />
              <SkeletonLines lines={2} className="flex-1" />
            </div>
            <div className="skeleton h-3.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecordBookSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <BookSectionSkeleton />
      <BookSectionSkeleton />
    </div>
  );
}

// A record's detail: the podium (three cards from lg), the timeline chart and the Top 50.
export function RecordDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton mb-3 h-5 w-32" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-36" />)}
      </div>
      <SkeletonBlock className="mt-6 h-72" />
      <div className="panel mt-6 p-2">
        <SkeletonRankedRows rows={10} columns={2} rowClassName="h-12" />
      </div>
    </div>
  );
}

// The whole page, laid out as `RecordsPage` lays out the record book.
export default function RecordsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader description />
      </div>
      <RecordBookSkeleton />
    </div>
  );
}
