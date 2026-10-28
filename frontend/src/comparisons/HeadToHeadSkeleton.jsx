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

// The history of two clubs' meetings: the series record between the clubs, the four headline cards, the margins and
// momentum, the notable meetings and the season breakdown, then every meeting.
export function HeadToHeadHistorySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="panel flex h-28 items-center max-sm:h-40 justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="skeleton size-12 rounded-box" />
          <div className="skeleton h-5 w-56 max-sm:hidden" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="skeleton h-9 w-20" />
          <div className="skeleton h-3 w-32 max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-56 max-sm:hidden" />
          <div className="skeleton size-12 rounded-box" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {range(4).map((index) => (
          <div key={index} className="skeleton h-[4.75rem] rounded-box" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-4">
          <SkeletonPanelHead title="w-36" />
          <div className="skeleton h-72 w-full" />
        </div>
        <LinesPanel rows={3} title="w-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LinesPanel rows={6} />
        <LinesPanel rows={14} />
      </div>
      <div className="panel p-4">
        <SkeletonPanelHead title="w-56" />
        <div className="flex flex-col gap-2">
          {range(28).map((index) => (
            <div key={index} className="flex h-[2.85rem] items-center justify-between max-sm:h-[3.6rem] gap-3 rounded-field border border-base-300 px-3">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-3.5 w-48 max-w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// The whole page, as `HeadToHeadPage` lays it out: the way back, the header, the two club pickers with the swap between them,
// then the history.
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
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
          <div className="skeleton h-8 w-full sm:w-80" />
          <div className="skeleton mx-auto size-8 max-sm:size-11" />
          <div className="skeleton h-8 w-full sm:w-80 sm:justify-self-end" />
        </div>
      </div>
      <HeadToHeadHistorySkeleton />
    </div>
  );
}
