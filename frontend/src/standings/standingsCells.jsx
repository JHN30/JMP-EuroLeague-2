import { Link } from "react-router";

// With a short name the cell shows it below sm and the full name from sm up; the link is named by the full name at every width.
export function ClubCell({ entry, seasonCode, shortName }) {
  const fullName = entry.clubName ?? entry.clubCode;
  return (
    <Link
      to={`/${seasonCode}/teams/${entry.clubCode}`}
      aria-label={shortName ? fullName : undefined}
      className="link link-hover flex min-w-0 items-center gap-2 font-medium"
    >
      {entry.crestUrl ? (
        <img
          src={entry.crestUrl}
          alt=""
          className="h-6 w-6 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {shortName ? (
        <>
          <span className="break-words text-xs leading-tight sm:hidden">{shortName}</span>
          <span className="hidden max-w-56 truncate sm:inline" title={fullName}>
            {fullName}
          </span>
        </>
      ) : (
        <span className="max-w-40 truncate sm:max-w-56" title={fullName}>
          {fullName}
        </span>
      )}
    </Link>
  );
}

export function PositionCell({ position, qualified }) {
  return (
    <span className="position-cell inline-flex items-center gap-1">
      <span className={`rank ${position === 1 ? "rank-1" : ""}`}>{position ?? "-"}</span>
      {qualified ? (
        <span className="badge badge-xs badge-secondary" title="Qualified">
          Q
        </span>
      ) : null}
    </span>
  );
}

const RESULT_WORD = { W: "win", L: "loss" };

export function FormCell({ form }) {
  const sorted = [...(form ?? [])].sort((a, b) => a.resultOrdinal - b.resultOrdinal);
  const label = sorted.length
    ? `Last ${sorted.length}: ${sorted.map((f) => RESULT_WORD[f.result] ?? "unknown").join(", ")}`
    : "No recent form recorded";

  return (
    <div className="flex gap-1" aria-label={label}>
      {sorted.map((f) => (
        <span
          key={f.resultOrdinal}
          className={`badge badge-xs ${f.result === "W" ? "badge-success" : f.result === "L" ? "badge-error" : "badge-ghost"}`}
          aria-hidden="true"
        >
          {f.result ?? "-"}
        </span>
      ))}
    </div>
  );
}

export function StandingsFooterBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-2 text-xs text-base-content/70">
      <span className="badge badge-outline badge-secondary badge-xs">Q</span>
      <span>= qualified for the next stage.</span>
      <span>Row order follows the official source standings.</span>
      <span>PF, PA and DIFF count regulation time only, as in the official standings; overtime points are not included.</span>
    </div>
  );
}
