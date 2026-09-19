import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { getSeasonStandings } from "../lib/api";
import { WidgetPanel } from "./Dashboard";

function parseWins(last10) {
  if (!last10) return null;
  const wins = Number(last10.split("-")[0]);
  return Number.isFinite(wins) ? wins : null;
}

export default function FormWatch() {
  const { seasonCode } = useParams();
  const query = useQuery({
    queryKey: ["standings", seasonCode, "RS"],
    queryFn: () => getSeasonStandings(seasonCode, "RS"),
  });
  const standings = query.data?.standings ?? [];

  const withForm = standings
    .map((entry) => ({ entry, wins: parseWins(entry.basic?.lastTenRecord) }))
    .filter((item) => item.wins !== null);

  let hot = null;
  let cold = null;
  for (const item of withForm) {
    if (hot === null || item.wins > hot.wins) hot = item;
    if (cold === null || item.wins < cold.wins) cold = item;
  }
  const hasSpread = hot && cold && hot.entry.clubCode !== cold.entry.clubCode;

  return (
    <WidgetPanel
      title="Form watch"
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && !hasSpread}
      emptyMessage="Not enough games played yet."
    >
      {hasSpread ? (
        <div>
          <div className="form-watch-row">
            <span className="fw-icon hot">&#9650;</span>
            <div className="fw-body">
              <Link to={`/${seasonCode}/teams/${hot.entry.clubCode}`} className="fw-team link link-hover">
                {hot.entry.clubName ?? hot.entry.clubCode}
              </Link>
              <div className="fw-streak">Last 10: {hot.entry.basic.lastTenRecord}</div>
            </div>
          </div>
          <div className="form-watch-row">
            <span className="fw-icon cold">&#9660;</span>
            <div className="fw-body">
              <Link to={`/${seasonCode}/teams/${cold.entry.clubCode}`} className="fw-team link link-hover">
                {cold.entry.clubName ?? cold.entry.clubCode}
              </Link>
              <div className="fw-streak">Last 10: {cold.entry.basic.lastTenRecord}</div>
            </div>
          </div>
        </div>
      ) : null}
    </WidgetPanel>
  );
}
