export default function InfoTile({ label, value }) {
  return (
    <div>
      <dt className="muted text-sm">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
