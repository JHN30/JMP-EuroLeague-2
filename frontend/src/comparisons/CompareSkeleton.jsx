import { useSearchParams } from "react-router";
import { SkeletonPage, SkeletonPageHeader } from "../lib/Skeleton";

// Compare's skeletons, shared by the upcoming games (while they load) and the whole page (while its code, its phases or its
// teams load), so the two always match. This file imports none of the page's code, so the page skeleton stays out of its bundle.

// A round's games: 10 in the modern league.
const ROUND_GAMES = 10;

// One club of a game row: the crest, then bars for the short name and the record (reversed for the away club).
function SideSkeleton({ alignEnd = false }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${alignEnd ? "flex-row-reverse" : ""}`}>
      <span className="skeleton size-7 flex-none rounded-full sm:size-8" />
      <span className={`flex h-8 min-w-0 flex-col justify-center gap-1.5 ${alignEnd ? "items-end" : ""}`}>
        <span className="skeleton block h-3.5 w-12 max-w-full" />
        <span className="skeleton block h-3 w-8" />
      </span>
    </span>
  );
}

// A section panel's kicker and title bars, as the Compare panels draw them.
function PanelHeading({ titleClassName = "w-24" }) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="skeleton h-3 w-28" />
      <div className={`skeleton my-0.5 h-6 max-w-full ${titleClassName}`} />
    </div>
  );
}

// The upcoming games panel, laid out as `CompareFixtures` lays it out: the round's name over its games as compact rows (home
// club, date and time, away club), in two columns from lg.
export function UpcomingGamesSkeleton() {
  return (
    <div aria-hidden="true" className="panel p-4">
      <PanelHeading />
      <ul className="grid gap-2 lg:grid-cols-2">
        {Array.from({ length: ROUND_GAMES }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-center gap-1.5 rounded-field border border-base-300 bg-base-100 px-2 py-2 sm:grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)_1rem] sm:gap-2 sm:px-3"
          >
            <SideSkeleton />
            <span className="flex flex-col items-center gap-1.5">
              <span className="skeleton block h-3 w-12" />
              <span className="skeleton block h-3 w-9" />
            </span>
            <SideSkeleton alignEnd />
            <span className="hidden sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The two pickers with the swap button between them: a label bar over each box.
function PickersSkeleton() {
  const picker = (
    <div className="flex flex-col gap-2">
      <div className="skeleton h-3.5 w-16" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {picker}
      <div className="skeleton mx-auto size-8 sm:mt-7" />
      {picker}
    </div>
  );
}

// The whole page, laid out as `ComparisonsPage` lays out its landing: the header, the Teams and Players tabs, then the upcoming
// games over the team pickers (or the player pickers alone). An opened comparison keeps the generic page skeleton.
export default function CompareSkeleton() {
  const [searchParams] = useSearchParams();
  const players = searchParams.get("view") === "players";
  const opened = players
    ? searchParams.get("playerA") && searchParams.get("playerB")
    : searchParams.get("teamA") && searchParams.get("teamB");
  if (opened) return <SkeletonPage />;

  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <SkeletonPageHeader />
      </div>
      {/* The Teams and Players tabs, as tall as the level-1 tab strip with its underline. */}
      <div className="skeleton mb-6 h-11 w-36" />
      {players ? (
        <div className="mb-6">
          <PickersSkeleton />
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-6">
          <UpcomingGamesSkeleton />
          <div className="panel p-4">
            <PanelHeading titleClassName="w-52" />
            <PickersSkeleton />
          </div>
        </div>
      )}
    </div>
  );
}
