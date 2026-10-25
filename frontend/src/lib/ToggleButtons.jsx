// A short choice (Totals or per game) as buttons, the chosen one filled: with so few choices the whole choice stays in view. The label sits
// above it like a select's, so it lines up in a toolbar row; the buttons are as tall as a select beside them, and touch-sized below sm.
export default function ToggleButtons({ label, ariaLabel, choices, value, onChange, panelId }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-base-content/70">
      <span className="ms-2" aria-hidden="true">
        {label}
      </span>
      <div role="group" aria-label={ariaLabel} className="flex gap-2">
        {choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            aria-pressed={choice.key === value}
            aria-controls={panelId}
            className={`btn max-sm:h-11 ${choice.key === value ? "btn-primary" : "btn-outline"}`}
            onClick={() => onChange(choice.key)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
