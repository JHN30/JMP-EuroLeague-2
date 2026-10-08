// A label that is the short one below sm, where there is little room, and the full one from sm. Below sm the full label stays in
// the page for screen readers (visually hidden) and the short one is hidden from them, so the name is read once. The wrapper is
// positioned so that the hidden copy cannot widen a scrolling row it sits in.
export default function ShortLabel({ short, full }) {
  return (
    <span className="relative">
      <span aria-hidden="true" className="sm:hidden">
        {short}
      </span>
      <span className="max-sm:sr-only">{full}</span>
    </span>
  );
}
