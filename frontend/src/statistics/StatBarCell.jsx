export default function StatBarCell({ widthPct, children }) {
  return (
    <td className="stat-bar-cell">
      {widthPct !== null ? (
        <span className="bar">
          <span className="bar-fill" style={{ width: `${widthPct}%` }} />
        </span>
      ) : null}
      <span className="num-val">{children}</span>
    </td>
  );
}
