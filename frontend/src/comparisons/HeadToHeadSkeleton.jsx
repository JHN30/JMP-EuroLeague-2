import { SkeletonPageHeader, SkeletonPanelHead } from "../lib/Skeleton";

// The Head-to-head page's skeletons: the whole page (while its code, the seasons or the clubs load) and the history (while the
// two clubs' meetings load), so the two always match. This file imports none of the page's code, so the page skeleton stays
// out of its bundle.

const range = (length) => Array.from({ length }, (_, index) => index);

// A panel with its heading over `rows` lines of a label and a figure.
function LinesPanel({ rows, title = "w-40" }) {
  return (
    <div className="panel p-4">
      <SkeletonPanelHead title={title} />
      <div className="flex flex-col gap-3">
        {range(rows).map((index) => (
          <div key={index} className="flex h-5 items-center justify-between gap-3">
            <div className="skeleton h-3.5 w-36" />
            <div className="skeleton h-3.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The series figures under the pickers while the meetings load: three figures and the last ten meetings.
export function SeriesFiguresSkeleton() {
  return (
    <div aria-hidden="true" className="mt-3 flex flex-col gap-3 border-t border-base-300 pt-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:gap-x-8">
        {range(3).map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 lg:w-[22rem]">
        {range(10).map((index) => (
          <div key={index} className="skeleton h-11 rounded-field sm:h-7 sm:w-9" />
        ))}
      </div>
    </div>
  );
}

// The history of two clubs' meetings below the series header: the records beside the margin chart, the notable meetings, the season
// breakdown in two columns from lg, then the latest meetings.
export function HeadToHeadHistorySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <LinesPanel rows={9} title="w-48" />
        <div className="panel p-4">
          <SkeletonPanelHead title="w-36" />
          <div className="skeleton h-40 w-full lg:h-[calc(100%-3.5rem)]" />
        </div>
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {range(4).map((index) => (
            <div key={index} className="skeleton h-[6.5rem] rounded-box" />
          ))}
        </div>
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-40" />
        <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
          {range(8).map((index) => (
            <div key={index} className="flex h-5 items-center gap-3">
              <div className="skeleton h-3.5 w-16" />
              <div className="skeleton h-3.5 w-8" />
              <div className="skeleton h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-28" />
        <div className="flex flex-col gap-2">
          {range(12).map((index) => (
            <div key={index} className="flex h-7 items-center justify-between gap-3 max-sm:h-11">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-3.5 w-40 max-w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// The whole page, as `HeadToHeadPage` lays it out: the way back, the header, the series header with the two club pickers and the
// swap between them, then the history.
export default function HeadToHeadSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-1 flex h-8 items-center max-sm:hidden">
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      <div className="panel mb-6 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
          <div className="skeleton h-8 w-full sm:w-80" />
          <div className="skeleton mx-auto size-8 max-sm:size-11" />
          <div className="skeleton h-8 w-full sm:w-80 sm:justify-self-end" />
        </div>
      </div>
      <HeadToHeadHistorySkeleton />
    </div>
  );
}
