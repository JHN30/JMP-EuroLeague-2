import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getLeaderStats, getSeasonStandings } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

function bestBy(entries, pick, isBetter) {
  let best = null;
  for (const entry of entries) {
    if (!entry.basic) continue;
    const value = pick(entry);
    if (value === null || value === undefined) continue;
    if (best === null || isBetter(value, best.value)) best = { entry, value };
  }
  return best;
}

function TeamLeaders({ seasonCode }) {
  const query = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const standings = query.data?.standings ?? [];
  const offense = bestBy(standings, (entry) => entry.basic.pointsFor, (a, b) => a > b);
  const defense = bestBy(standings, (entry) => entry.basic.pointsAgainst, (a, b) => a < b);

  return (
    <WidgetPanel
      title="Team leaders"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && !offense && !defense}
      emptyMessage="Not available yet."
    >
      <ul className="space-y-2">
        {offense ? (
          <li>
            <span className="muted mr-2">Best offense</span>
            <Link to={`/${seasonCode}/teams/${offense.entry.clubCode}`} className="link link-hover">
              {offense.entry.clubName ?? offense.entry.clubCode}
            </Link>
            <span className="muted ml-2">{offense.value} pts for</span>
          </li>
        ) : null}
        {defense ? (
          <li>
            <span className="muted mr-2">Best defense</span>
            <Link to={`/${seasonCode}/teams/${defense.entry.clubCode}`} className="link link-hover">
              {defense.entry.clubName ?? defense.entry.clubCode}
            </Link>
            <span className="muted ml-2">{defense.value} pts against</span>
          </li>
        ) : null}
      </ul>
    </WidgetPanel>
  );
}

function PlayerLeaders({ seasonCode }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, "all", "perGame"],
    queryFn: () => getLeaderStats(seasonCode, { phase: "all", mode: "perGame", limit: 5 }),
  });
  const players = query.data?.players ?? [];

  return (
    <WidgetPanel
      title="Player leaders"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && players.length === 0}
      emptyMessage="Not available yet."
    >
      <ol className="space-y-2">
        {players.map((player) => (
          <li key={player.personKey} className="flex items-center justify-between">
            <Link to={`/${seasonCode}/players/${player.personKey}`} className="link link-hover">
              {player.playerName ?? player.personKey}
            </Link>
            <span className="muted">{player.traditional.pointsScored ?? "-"} pts</span>
          </li>
        ))}
      </ol>
    </WidgetPanel>
  );
}

export default function LeadersPanel() {
  const { seasonCode } = useParams();

  return (
    <>
      <TeamLeaders seasonCode={seasonCode} />
      <PlayerLeaders seasonCode={seasonCode} />
    </>
  );
}
