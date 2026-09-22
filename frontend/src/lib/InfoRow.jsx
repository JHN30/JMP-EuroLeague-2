export default function InfoRow({ primary, secondary, trailing }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-base-300 py-2">
      <div className="flex flex-col">
        {primary}
        {secondary ? <span className="muted text-sm">{secondary}</span> : null}
      </div>
      {trailing}
    </li>
  );
}
