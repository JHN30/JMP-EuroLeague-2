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
      <div className="grid grid-cols-2 gap-4">
        {offense ? (
          <div className="rounded-field border border-base-300 p-3">
            <span className="muted text-xs font-semibold uppercase tracking-wide">Best offense</span>
            <div className="stat-callout">
              <span className="value">{offense.value}</span>
              <span className="label">Points for</span>
            </div>
            <Link to={`/${seasonCode}/teams/${offense.entry.clubCode}`} className="link link-hover text-sm font-medium">
              {offense.entry.clubName ?? offense.entry.clubCode}
            </Link>
          </div>
        ) : null}
        {defense ? (
          <div className="rounded-field border border-base-300 p-3">
            <span className="muted text-xs font-semibold uppercase tracking-wide">Best defense</span>
            <div className="stat-callout">
              <span className="value">{defense.value}</span>
              <span className="label">Points against</span>
            </div>
            <Link to={`/${seasonCode}/teams/${defense.entry.clubCode}`} className="link link-hover text-sm font-medium">
              {defense.entry.clubName ?? defense.entry.clubCode}
            </Link>
          </div>
        ) : null}
      </div>
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
        {players.map((player, index) => (
          <li key={player.personKey} className="flex items-center gap-3">
            <span className={`rank ${index === 0 ? "rank-1" : ""}`}>{index + 1}</span>
            <Link to={`/${seasonCode}/players/${player.personKey}`} className="link link-hover flex-1 font-medium">
              {player.playerName ?? player.personKey}
            </Link>
            {index === 0 ? <span className="stat-badge stat-badge-leader">Leader</span> : null}
            <span className="font-semibold tabular-nums">{player.traditional.pointsScored ?? "-"} pts</span>
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
