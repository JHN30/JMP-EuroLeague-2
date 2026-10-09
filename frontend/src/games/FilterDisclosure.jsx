import { useId, useState } from "react";

// A tab's filter selects. Below sm they sit behind one button that says how many differ from their default, so they do not
// push the content off the screen; from sm they are always shown. Closing the button never resets a filter.
// `className` replaces the wrapper's default bottom margin, for a caller that lays the disclosure out among other controls.
export default function FilterDisclosure({ activeCount, gridClassName = "", className = "mb-4", children }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-sm btn-outline touch-target w-full justify-between sm:hidden"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{activeCount > 0 ? `Filters · ${activeCount} active` : "Filters"}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      <div id={contentId} className={`grid gap-3 max-sm:mt-3 ${open ? "" : "max-sm:hidden"} ${gridClassName}`}>
        {children}
      </div>
    </div>
  );
}
