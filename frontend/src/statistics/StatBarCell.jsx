// `numbersOnPhone` leaves the bar out below sm and lets the cell be as narrow as its number.
export default function StatBarCell({ widthPct, numbersOnPhone = false, children }) {
  return (
    <td className={`stat-bar-cell ${numbersOnPhone ? "stat-bar-cell-numbers" : ""}`}>
      {widthPct !== null ? (
        <span className="bar" aria-hidden="true">
          <span className="bar-fill" style={{ width: `${widthPct}%` }} />
        </span>
      ) : null}
      <span className="num-val">{children}</span>
    </td>
  );
}
