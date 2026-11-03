import { SkeletonBlock, SkeletonLines, SkeletonPageHeader, SkeletonRankedRows } from "../lib/Skeleton";

// Records' skeletons, shared by the record book and a record's detail (while their data loads) and the whole page (while its
// code loads), so the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// One record type of the book: its title over its six headline rows (the metric, the value, then the holder's picture and two lines).
function BookSectionSkeleton() {
  return (
    <div className="panel flex flex-col p-4 sm:p-5">
      <div className="skeleton mb-2 h-5 w-40" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 border-b border-base-300 py-2.5 last:border-0 sm:grid-cols-[7.5rem_4.5rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5 sm:contents">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-6 w-12 sm:ms-auto" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="skeleton size-8 flex-none rounded-full" />
            <SkeletonLines lines={2} className="flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordBookSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <BookSectionSkeleton key={index} />
      ))}
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

// The whole page, laid out as `RecordsPage` lays out the record book: the header, the Find any record panel, then the popular records
// under their heading.
export default function RecordsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader description />
      </div>
      <div className="panel mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-4 sm:p-5">
        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-3.5 w-full" />
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">
          <SkeletonBlock className="h-10 w-full sm:w-48" />
          <SkeletonBlock className="h-10 w-full sm:w-72" />
          <SkeletonBlock className="h-10 w-full sm:w-32" />
        </div>
      </div>
      <div className="mb-3 flex flex-col gap-2">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-3.5 w-96 max-w-full" />
      </div>
      <RecordBookSkeleton />
    </div>
  );
}
