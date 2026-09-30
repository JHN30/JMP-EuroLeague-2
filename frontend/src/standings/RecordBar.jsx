import { formatShare, parseRecord, recordGames, recordShare } from "./breakdownUtils";

// A W-L record with a bar under it: the green part is the win share, the rest is losses. The numbers stay visible.
// Accepts "16-3" text or a { w, l } record; a missing or empty record shows a dash.
export default function RecordBar({ record, label }) {
  const parsed = typeof record === "string" ? parseRecord(record) : record;
  if (!parsed || recordGames(parsed) === 0) return <span className="muted">—</span>;

  return (
    <div className="record-bar" title={`${label ? `${label}: ` : ""}${parsed.w} wins, ${parsed.l} losses (${formatShare(parsed)})`}>
      <span className="record-bar-num">
        {parsed.w}-{parsed.l}
      </span>
      <span className="record-bar-track" aria-hidden="true">
        <i style={{ width: `${(recordShare(parsed) * 100).toFixed(1)}%` }} />
      </span>
    </div>
  );
}
