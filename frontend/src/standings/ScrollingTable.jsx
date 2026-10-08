// Swiping this far (px) takes the team column from its name down to the crest. The CSS reads --collapse, 0 to 1, below sm.
const COLLAPSE_DISTANCE = 36;
// How much narrower the table gets once the team column is down to the crest: 2.75rem for the Standings tables (5rem down to
// 2.25rem, `.pinned-table` in index.css); the Box score's player column passes its own 5.375rem.
const DEFAULT_SHRINK = 44;

// The scrolling box around a standings table. It reports how far the table has been swiped sideways as --collapse, so the
// pinned team column (`pinned-table` in index.css) narrows with the finger. It is written straight to the element: a React
// state update on every scroll event would re-render the whole table.
// A table that barely overflows is left alone: collapsing would shrink it until it no longer overflowed, the scroll position
// would be clamped back, and the column would stop half way. The overflow it would have without any collapse is
// recovered from the current one plus what the collapse has taken off.
export default function ScrollingTable({ children, shrink = DEFAULT_SHRINK }) {
  return (
    <div
      className="standings-scroll overflow-x-auto overscroll-x-contain"
      onScroll={(event) => {
        const box = event.currentTarget;
        const current = Number(box.style.getPropertyValue("--collapse")) || 0;
        const natural = box.scrollWidth - box.clientWidth + current * shrink;
        const canCollapse = natural >= shrink + COLLAPSE_DISTANCE;
        box.style.setProperty("--collapse", String(canCollapse ? Math.min(1, box.scrollLeft / COLLAPSE_DISTANCE) : 0));
      }}
    >
      {children}
    </div>
  );
}
