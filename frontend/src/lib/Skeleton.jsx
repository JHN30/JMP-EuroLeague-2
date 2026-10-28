import LeaderPhoto from "./LeaderPhoto";

// Placeholders shaped like the content they stand in for, on daisyUI's `skeleton`. They are decoration only (hidden from
// screen readers): the loading status around them, from `AsyncState`, says what is loading.

// `lines` text lines; the last one is shorter, as a paragraph's usually is.
export function SkeletonLines({ lines = 3, className = "" }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className={`skeleton h-3.5 ${index === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

// A card, a photo or a chart: its size comes from `className`.
export function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// A table of `rows` rows by `columns` columns, the first column wider, as a name column usually is.
export function SkeletonTable({ rows = 5, columns = 4, className = "" }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-3">
          <div className="skeleton h-4 flex-[3]" />
          {Array.from({ length: columns - 1 }, (_, column) => (
            <div key={column} className="skeleton h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Ranked rows, as the standings tables, leaderboards and record lists draw them: a rank, a crest or photo, the name and
// `columns` figures, each row `rowClassName` tall (the loaded row's height). Below sm only the first three figures show, as
// the loaded tables scroll the rest out of view.
export function SkeletonRankedRows({ rows = 10, columns = 3, className = "", rowClassName = "h-10" }) {
  return (
    <div aria-hidden="true" className={`flex flex-col ${className}`}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={`flex items-center gap-2 border-b border-base-300 px-2 last:border-0 sm:gap-3 ${rowClassName}`}>
          <div className="skeleton size-6 flex-none rounded-full" />
          <div className="skeleton size-7 flex-none rounded-full" />
          <div className="skeleton h-4 min-w-0 flex-1" />
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className={`skeleton h-4 w-8 flex-none sm:w-12 ${column >= 3 ? "max-sm:hidden" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// A row of tabs or a select, as the pages draw their view switches: `className` sets its width.
export function SkeletonTabs({ className = "w-64" }) {
  return <div aria-hidden="true" className={`skeleton h-9 max-w-full ${className}`} />;
}

// A card of a KPI strip or leaders row while it loads: its label (or a bar in its place), bars for the name and the value,
// and the image box the loaded card has (a round crest, or the person silhouette), so the card keeps its loaded size.
// Other props (a loading status, say) go on the card.
export function SkeletonChip({ label = null, image = "crest", ...rest }) {
  return (
    <div className="kpi-chip" {...rest}>
      <div className="kpi-chip-body">
        {label ? <span className="label">{label}</span> : <span aria-hidden="true" className="skeleton mb-1 block h-3 w-20" />}
        <span aria-hidden="true" className="skeleton my-1 block h-4 w-28 max-w-full" />
        {image === "person" ? <span aria-hidden="true" className="skeleton block h-3 w-24 max-w-full" /> : null}
        <span aria-hidden="true" className="skeleton mt-1 block h-7 w-14" />
      </div>
      {image === "person" ? (
        <LeaderPhoto imageUrl={null} />
      ) : (
        <div aria-hidden="true" className="kpi-chip-image flex aspect-square items-center justify-center">
          <div className="skeleton aspect-square w-3/5 rounded-full" />
        </div>
      )}
    </div>
  );
}

// A page's header panel, as `PageHeader` draws it: the accent line, then bars for the kicker, the title and, with
// `description`, the line under it.
export function SkeletonPageHeader({ description = false }) {
  return (
    <div aria-hidden="true" className="panel relative flex flex-col gap-2 overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-56 max-w-full" />
      {description ? <div className="skeleton mt-1 h-4 w-72 max-w-full" /> : null}
    </div>
  );
}

// A section panel, as the pages draw them: bars for its kicker and title over `children`.
export function SkeletonPanel({ className = "", children }) {
  return (
    <div aria-hidden="true" className={`panel flex flex-col p-4 sm:p-5 lg:p-6 ${className}`}>
      <div className="mb-4 flex flex-col gap-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-5 w-44 max-w-full" />
      </div>
      {children}
    </div>
  );
}

// A page while its code loads, for the pages without a skeleton of their own: a header over a table and a chart panel.
export function SkeletonPage() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonPanel>
        <SkeletonTable rows={6} />
      </SkeletonPanel>
      <SkeletonPanel>
        <SkeletonBlock className="h-48 w-full" />
      </SkeletonPanel>
    </div>
  );
}
