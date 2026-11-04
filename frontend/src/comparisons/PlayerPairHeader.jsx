import { Link } from "react-router";
import { Avatar } from "../leaders/LeaderParts";
import { formatPerGame } from "../lib/format";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { statNumber } from "../players/playerOverview";
import { fullName } from "./playerLabels";

function Club({ row, className = "" }) {
  if (!row?.clubName) return null;
  return (
    <p className={`muted flex items-center gap-1.5 text-xs ${className}`}>
      {row.clubImageUrl ? <RevealImage src={row.clubImageUrl} className="h-4 w-4 flex-none object-contain" /> : null}
      <span>
        <ShortLabel short={row.clubTvCodes ?? row.clubCode} full={row.clubName} />
      </span>
    </p>
  );
}

function PlayerCell({ entity, row, seasonCode }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Avatar imageUrl={row?.playerImageUrl ?? null} size="h-14 w-14" />
      <Link to={`/${seasonCode}/players/${entity.id}`} className="mt-1 font-semibold hover:underline">
        {fullName(row?.playerName ?? entity.label)}
      </Link>
      <Club row={row} className="justify-center" />
    </div>
  );
}

// "Forward · 27 · 34 games (30 starts) · 28.4 min", leaving out what the row does not have.
function detailLine(row) {
  const games = statNumber(row?.traditional?.gamesPlayed);
  const starts = statNumber(row?.traditional?.gamesStarted);
  const minutes = statNumber(row?.traditional?.minutesPlayed);
  const played = games ? `${games} games${starts != null ? ` (${starts} starts)` : ""} · ${formatPerGame(minutes)} min` : "Has not played yet";
  return [row?.positionName, row?.playerAge ? String(row.playerAge) : null, played].filter(Boolean).join(" · ");
}

// A side of the compact header: the headshot beside the name, club and details from sm (mirrored for B), over them below sm.
function CompactCell({ entity, row, seasonCode, mirrored }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 ${mirrored ? "sm:flex-row-reverse sm:text-right" : "sm:text-left"}`}>
      <Avatar imageUrl={row?.playerImageUrl ?? null} size="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="min-w-0">
        <Link to={`/${seasonCode}/players/${entity.id}`} className="block font-bold hover:underline">
          {fullName(row?.playerName ?? entity.label)}
        </Link>
        <Club row={row} className={`justify-center ${mirrored ? "sm:justify-end" : "sm:justify-start"}`} />
        <p className="muted text-xs tabular-nums">{detailLine(row)}</p>
      </div>
    </div>
  );
}

// The two players at the top of a comparison tab, as the team tabs show the two clubs: a headshot over the name and the club. `rowA` and
// `rowB` are the players' season-statistics rows (headshot, club); until they arrive the names show alone. `compact` lays each side out
// on one line from sm, with the position, age, games, starts and minutes from the rows.
export default function PlayerPairHeader({ seasonCode, entityA, entityB, rowA, rowB, compact = false }) {
  if (compact) {
    return (
      <div role="group" aria-label="Players compared" className="grid grid-cols-2 gap-4">
        <CompactCell entity={entityA} row={rowA} seasonCode={seasonCode} />
        <CompactCell entity={entityB} row={rowB} seasonCode={seasonCode} mirrored />
      </div>
    );
  }
  return (
    <div role="group" aria-label="Players compared" className="grid grid-cols-2 gap-4">
      <PlayerCell entity={entityA} row={rowA} seasonCode={seasonCode} />
      <PlayerCell entity={entityB} row={rowB} seasonCode={seasonCode} />
    </div>
  );
}
