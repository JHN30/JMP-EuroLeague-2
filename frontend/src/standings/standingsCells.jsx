import { Link } from "react-router";
import ResultBadge from "../lib/ResultBadge";
import Crest from "../lib/Crest";
import { teamPath } from "../lib/pagePaths";

// With a short name the cell shows it below sm and the full name from sm up; the link is named by the full name at every width.
export function ClubCell({ entry, seasonCode, shortName }) {
  const fullName = entry.clubName ?? entry.clubCode;
  return (
    <Link
      to={teamPath(seasonCode, { clubCode: entry.clubCode, name: entry.clubName })}
      aria-label={shortName ? fullName : undefined}
      className="link link-hover flex min-w-0 items-center gap-2 font-medium"
    >
      <Crest url={entry?.crestUrl} className="h-6 w-6 flex-none" animate={false} />
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
        <ResultBadge key={f.resultOrdinal} won={f.result === "W" ? true : f.result === "L" ? false : null} size="xs" aria-hidden="true" />
      ))}
    </div>
  );
}

export function StandingsFooterBadges({ showQualification = true }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-2 text-xs text-base-content/70">
      {showQualification ? <><span className="badge badge-outline badge-secondary badge-xs">Q</span><span>= qualified for the next stage.</span></> : null}
      <span>Row order follows the official source standings.</span>
      <span>PF, PA and DIFF count regulation time only, as in the official standings; overtime points are not included.</span>
    </div>
  );
}
