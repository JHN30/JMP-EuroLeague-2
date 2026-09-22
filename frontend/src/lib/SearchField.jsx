export default function SearchField({ label, className = "", ...inputProps }) {
  return (
    <input
      type="search"
      aria-label={label}
      className={`input input-bordered input-sm w-full max-w-xs ${className}`}
      {...inputProps}
    />
  );
}
