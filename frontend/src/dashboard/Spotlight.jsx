import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonGames, getSeasonStandings } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

function formatDateTime(scheduledAt) {
  if (!scheduledAt) return "TBD";
  return new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function teamLabel(team) {
  return team?.name ?? team?.abbreviatedName ?? "TBD";
}

function SpotlightTeam({ team, standingByClubCode, align }) {
  const entry = team?.clubCode ? standingByClubCode.get(team.clubCode) : null;
  const record = entry?.basic ? `${entry.basic.gamesWon}-${entry.basic.gamesLost}` : null;
  const last10 = entry?.basic?.lastTenRecord ?? null;

  return (
    <div className={`spotlight-team${align === "right" ? " right" : ""}`}>
      {team?.crestUrl ? (
        <img
          src={team.crestUrl}
          alt=""
          className="h-10 w-10 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div>
        <div className="spotlight-name">{teamLabel(team)}</div>
        <div className="spotlight-record">
          {record ?? "–"}
          {last10 ? ` · Last 10: ${last10}` : ""}
        </div>
      </div>
    </div>
  );
}

export default function Spotlight() {
  const { seasonCode } = useParams();

  const nextGameQuery = useQuery({
    queryKey: ["games", seasonCode, "scheduled", "asc", "spotlight"],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 1 }),
  });
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });

  const nextGame = nextGameQuery.data?.games[0] ?? null;
  const standingByClubCode = new Map(
    (standingsQuery.data?.standings ?? []).map((entry) => [entry.clubCode, entry]),
  );

  return (
    <WidgetPanel
      title="Next game"
      isLoading={nextGameQuery.isLoading || standingsQuery.isLoading}
      isError={nextGameQuery.isError}
      onRetry={() => nextGameQuery.refetch()}
      isEmpty={nextGameQuery.isSuccess && !nextGame}
      emptyMessage="No games scheduled yet."
    >
      {nextGame ? (
        <div className="spotlight-body">
          <div className="spotlight-matchup">
            <SpotlightTeam team={nextGame.localTeam} standingByClubCode={standingByClubCode} align="left" />
            <span className="spotlight-vs">VS</span>
            <SpotlightTeam team={nextGame.roadTeam} standingByClubCode={standingByClubCode} align="right" />
          </div>
          <div className="spotlight-meta">
            <span>{formatDateTime(nextGame.scheduledAt)}</span>
            <Link to={`/${seasonCode}/games/${nextGame.gameCode}`} className="panel-link">
              Game details &rarr;
            </Link>
          </div>
        </div>
      ) : null}
    </WidgetPanel>
  );
}
