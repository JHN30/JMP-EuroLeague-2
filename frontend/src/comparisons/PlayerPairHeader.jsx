import { Link } from "react-router";
import { Avatar } from "../leaders/LeaderParts";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { fullName } from "./playerLabels";

function PlayerCell({ entity, row, seasonCode }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Avatar imageUrl={row?.playerImageUrl ?? null} size="h-14 w-14" />
      <Link to={`/${seasonCode}/players/${entity.id}`} className="mt-1 font-semibold hover:underline">
        {fullName(row?.playerName ?? entity.label)}
      </Link>
      {row?.clubName ? (
        <p className="muted flex items-center justify-center gap-1.5 text-xs">
          {row.clubImageUrl ? <RevealImage src={row.clubImageUrl} className="h-4 w-4 flex-none object-contain" /> : null}
          <span>
            <ShortLabel short={row.clubTvCodes ?? row.clubCode} full={row.clubName} />
          </span>
        </p>
      ) : null}
    </div>
  );
}

// The two players at the top of a comparison tab, as the team tabs show the two clubs: a headshot over the name and the club. `rowA` and
// `rowB` are the players' season-statistics rows (headshot, club); until they arrive the names show alone.
export default function PlayerPairHeader({ seasonCode, entityA, entityB, rowA, rowB }) {
  return (
    <div role="group" aria-label="Players compared" className="grid grid-cols-2 gap-4">
      <PlayerCell entity={entityA} row={rowA} seasonCode={seasonCode} />
      <PlayerCell entity={entityB} row={rowB} seasonCode={seasonCode} />
    </div>
  );
}
