import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSeasonStandings } from "../lib/api";
import Panel from "../lib/Panel";
import { teamCode, teamName } from "./gameUtils";

const DATE_FORMAT = { weekday: "short", day: "numeric", month: "short", year: "numeric" };

function formatGameDate(scheduledAt) {
  return scheduledAt ? new Date(scheduledAt).toLocaleDateString(undefined, DATE_FORMAT) : "TBD";
}

function formatTipOff(scheduledAt) {
  return scheduledAt ? new Date(scheduledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "TBD";
}

// The crest in a fixed slot, so a club with no crest, or one that fails to load, leaves the layout as it is.
function Crest({ team }) {
  const [failed, setFailed] = useState(false);
  const slot = "h-12 w-12 flex-none sm:h-20 sm:w-20";
  if (!team?.crestUrl || failed) return <div aria-hidden="true" className={slot} />;
  return <img src={team.crestUrl} alt="" className={`${slot} object-contain`} onError={() => setFailed(true)} />;
}

function Side({ team, position, won }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:gap-2">
      <Crest team={team} />
      <p className={`text-lg leading-tight font-bold sm:text-2xl ${won ? "text-primary" : ""}`} title={team ? teamName(team) : undefined}>
        {teamCode(team)}
        {position != null ? (
          <span className="muted ms-1 inline-block font-normal">
            <span aria-hidden="true">({position})</span>
            <span className="sr-only">, league position {position}</span>
          </span>
        ) : null}
      </p>
    </div>
  );
}

// The game page's header, laid out like EuroLeague's: each club's crest, TV code and current league position at its end of the
// card, the score (or the tip-off time) in the middle and the round and date in one line under them. The position is the
// club's place in the latest regular-season standings, shown for a regular-season game once those have loaded; without it
// the brackets are left out, with no error and no placeholder.
export default function MatchupHeader({ game, seasonCode, localWon, roadWon }) {
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
    enabled: game.phaseCode === "RS",
  });
  const positions = new Map((standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry.basic?.position ?? null]));
  const positionOf = (team) => (game.phaseCode === "RS" && team?.clubCode ? (positions.get(team.clubCode) ?? null) : null);
  const round = game.roundName ?? (game.roundNumber ? `Round ${game.roundNumber}` : game.phaseName);

  return (
    <Panel as="section" className="relative mb-6 overflow-hidden p-4 sm:p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <h1 className="sr-only">
        {teamName(game.localTeam)} vs {teamName(game.roadTeam)}
      </h1>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-6">
        <Side team={game.localTeam} position={positionOf(game.localTeam)} won={localWon} />
        <div className="flex flex-col items-center gap-1 text-center">
          {game.played ? (
            <>
              <p className="text-3xl leading-none font-extrabold tabular-nums sm:text-5xl">
                <span className={localWon ? "text-primary" : ""}>{game.localScore ?? "-"}</span>
                <span className="muted px-1 font-normal sm:px-2"> - </span>
                <span className={roadWon ? "text-primary" : ""}>{game.roadScore ?? "-"}</span>
              </p>
              <p className="muted text-xs font-semibold tracking-wide uppercase">Final</p>
            </>
          ) : (
            <>
              <p className="text-3xl leading-none font-extrabold tabular-nums sm:text-5xl">{formatTipOff(game.scheduledAt)}</p>
              <span className="stat-badge stat-badge-neutral inline-flex">{game.gameStatus ?? "Scheduled"}</span>
            </>
          )}
        </div>
        <Side team={game.roadTeam} position={positionOf(game.roadTeam)} won={roadWon} />
      </div>
      <p className="muted mt-3 text-center text-sm">
        {round} · {formatGameDate(game.scheduledAt)}
      </p>
    </Panel>
  );
}
