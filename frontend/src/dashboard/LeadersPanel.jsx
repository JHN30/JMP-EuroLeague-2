import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getLeaderStats } from "../lib/api";

const CATEGORIES = [
  { key: "pointsScored", label: "Points per game" },
  { key: "totalRebounds", label: "Rebounds per game" },
  { key: "assists", label: "Assists per game" },
];

function StatLeaderCard({ seasonCode, category }) {
  const query = useQuery({
    queryKey: ["leader-stats", seasonCode, "all", "perGame", category.key],
    queryFn: () =>
      getLeaderStats(seasonCode, { phase: "all", mode: "perGame", sort: category.key, order: "desc", limit: 1 }),
  });
  const leader = query.data?.players[0] ?? null;

  return (
    <div className="leader-card">
      <span className="cat">{category.label}</span>
      {query.isLoading ? (
        <span role="status" aria-label="Loading" className="loading loading-spinner loading-sm text-primary" />
      ) : query.isError ? (
        <span role="alert" className="muted text-sm">Could not load.</span>
      ) : !leader ? (
        <span role="status" className="muted text-sm">Not available yet.</span>
      ) : (
        <div className="leader-top">
          {leader.playerImageUrl ? (
            <img
              src={leader.playerImageUrl}
              alt=""
              className="h-9 w-9 flex-none rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <Link to={`/${seasonCode}/players/${leader.personKey}`} className="link link-hover block truncate font-medium">
              {leader.playerName ?? leader.personKey}
            </Link>
            <span className="muted block truncate text-sm">{leader.clubName ?? leader.clubCode}</span>
          </div>
          <span className="leader-value">{leader.traditional[category.key] ?? "-"}</span>
        </div>
      )}
    </div>
  );
}

export default function LeadersPanel() {
  const { seasonCode } = useParams();

  return (
    <section className="panel p-6">
      <div className="panel-header">
        <h2 className="panel-title">Statistical leaders</h2>
      </div>
      <div className="leaders-grid">
        {CATEGORIES.map((category) => (
          <StatLeaderCard key={category.key} seasonCode={seasonCode} category={category} />
        ))}
      </div>
    </section>
  );
}
