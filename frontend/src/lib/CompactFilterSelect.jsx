export default function CompactFilterSelect({ label, className = "", children, ...selectProps }) {
  return (
    <select aria-label={label} className={`select select-bordered select-sm ${className}`} {...selectProps}>
      {children}
    </select>
  );
}
