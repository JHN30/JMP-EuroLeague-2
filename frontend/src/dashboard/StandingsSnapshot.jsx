import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

export default function StandingsSnapshot() {
  const { seasonCode } = useParams();
  const query = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });

  const top5 = query.data?.standings.slice(0, 5) ?? [];

  return (
    <WidgetPanel
      title="Standings"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && top5.length === 0}
      emptyMessage="Standings not available yet."
    >
      <ol className="space-y-2">
        {top5.map((entry) => (
          <li key={entry.clubCode} className="flex items-center justify-between">
            <span>
              <span className="muted mr-2">{entry.basic?.position ?? "-"}</span>
              {entry.clubName ?? entry.clubCode}
            </span>
            <span className="muted">
              {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
            </span>
          </li>
        ))}
      </ol>
      <Link to={`/${seasonCode}/standings`} className="btn btn-sm btn-ghost mt-4">
        View full standings
      </Link>
    </WidgetPanel>
  );
}
