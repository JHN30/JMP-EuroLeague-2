// The label text is inset by 0.5rem, like the text of a tab strip, so it lines up with the tabs above it.
// A labelled native select for choosing one of a few views. The Standings page shows it below sm in place of tab strips, so
// the choice stays one control with the label above it and the platform's own picker.
export default function ViewSelect({ label, value, options, onChange, className = "" }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-xs text-base-content/70 ${className}`}>
      <span className="ms-2">{label}</span>
      <select className="select select-bordered w-full text-sm text-base-content" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
