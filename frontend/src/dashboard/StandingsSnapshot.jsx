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

  const top10 = query.data?.standings.slice(0, 10) ?? [];

  return (
    <WidgetPanel
      kicker="STANDINGS"
      title="Standings"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && top10.length === 0}
      emptyMessage="Standings not available yet."
    >
      <ol className="space-y-2">
        {top10.map((entry) => (
          <li key={entry.clubCode} className="flex items-center gap-3">
            <span className={`rank ${entry.basic?.position === 1 ? "rank-1" : ""}`}>
              {entry.basic?.position ?? "-"}
            </span>
            <span className="flex flex-1 items-center gap-2 font-medium">
              {entry.crestUrl ? (
                <img
                  src={entry.crestUrl}
                  alt=""
                  className="h-8 w-8 flex-none object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              {entry.clubName ?? entry.clubCode}
            </span>
            <span className="muted font-semibold tabular-nums">
              {entry.basic?.gamesWon ?? "-"}-{entry.basic?.gamesLost ?? "-"}
            </span>
          </li>
        ))}
      </ol>
      <Link to={`/${seasonCode}/standings`} className="panel-link mt-4 inline-block">
        View full standings &rarr;
      </Link>
    </WidgetPanel>
  );
}
