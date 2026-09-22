export default function LabelledSelect({ label, ariaLabel = label, labelClassName = "", className = "", children, ...selectProps }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium ${labelClassName}`}>
      <span>{label}</span>
      <select aria-label={ariaLabel} className={`select select-bordered select-sm ${className}`} {...selectProps}>
        {children}
      </select>
    </label>
  );
}
