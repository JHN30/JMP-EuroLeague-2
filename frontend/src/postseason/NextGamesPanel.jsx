import { Link } from "react-router";
import { formatShortDate } from "../lib/format";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import { ordinal } from "../teams/teamLeague";

function Club({ entry, team }) {
  const crestUrl = team?.crestUrl ?? entry?.crestUrl;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="muted w-8 flex-none text-right text-xs tabular-nums">{entry ? ordinal(entry.basic.position) : ""}</span>
      {crestUrl ? <RevealImage src={crestUrl} className="h-5 w-5 flex-none object-contain" /> : <span className="h-5 w-5 flex-none" />}
      <span className="min-w-0 truncate font-semibold">{team?.abbreviatedName ?? entry?.clubName}</span>
    </span>
  );
}

// "Games that move the bracket": the next round's games between clubs near a qualification line. Each opens Compare for it.
export default function NextGamesPanel({ seasonCode, round, games, standings, teams }) {
  if (games.length === 0) return null;
  const info = new Map(teams.map((team) => [team.clubCode, team]));
  const place = new Map(standings.map((entry) => [entry.clubCode, entry]));
  return (
    <Panel className="p-4">
      <PanelHeader compact kicker={"NEXT ROUND · ROUND " + round} title="Games that move the bracket" />
      <ul className="flex flex-col" aria-label="Games that move the bracket">
        {games.map((game) => (
          <li key={game.gameCode} className="border-b border-base-300 last:border-0">
            <Link
              to={"/" + seasonCode + "/compare?view=teams&teamA=" + encodeURIComponent(game.localClubCode) + "&teamB=" + encodeURIComponent(game.roadClubCode) + "&game=" + game.gameCode}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-field px-1 py-2 hover:bg-base-200 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <span className="muted text-xs max-sm:col-span-2">{formatShortDate(game.scheduledAt)}</span>
              <Club entry={place.get(game.localClubCode)} team={info.get(game.localClubCode)} />
              <span className="badge badge-sm whitespace-nowrap sm:order-last">{game.line}</span>
              <Club entry={place.get(game.roadClubCode)} team={info.get(game.roadClubCode)} />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
